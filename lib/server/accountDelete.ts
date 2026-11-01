import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

/** A sign-in older than this must be repeated before an account can be deleted. */
export const REAUTH_WINDOW_SECONDS = 10 * 60

export type DeleteResult =
  | { status: 200; body: { ok: true } }
  | { status: 401 | 429 | 500; body: { error: 'unauthorized' | 'reauth_required' | 'rate_limited' | 'server_error' } }

function decodePayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1]
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

/** Newest sign-in time (unix seconds) recorded in the token's `amr` claim, or null. */
export function lastSignInAt(token: string): number | null {
  const amr = decodePayload(token)?.amr
  if (!Array.isArray(amr)) return null
  const times = amr
    .map((a) => (a && typeof a === 'object' ? Number((a as { timestamp?: unknown }).timestamp) : NaN))
    .filter((n) => Number.isFinite(n))
  return times.length ? Math.max(...times) : null
}

/**
 * Deletes the account that owns `token` — never anyone named in a request body. The caller's
 * identity comes from Supabase verifying the token; the delete needs a sign-in within the last
 * 10 minutes and is rate limited in the database.
 */
export async function deleteAccount(
  admin: SupabaseClient,
  authorization: string | null,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<DeleteResult> {
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  if (!token) return { status: 401, body: { error: 'unauthorized' } }

  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return { status: 401, body: { error: 'unauthorized' } }

  const signedInAt = lastSignInAt(token)
  if (signedInAt === null || nowSeconds - signedInAt > REAUTH_WINDOW_SECONDS) {
    return { status: 401, body: { error: 'reauth_required' } }
  }

  const limit = await admin.rpc('consume_rate_limit', {
    p_user_id: data.user.id,
    p_bucket: 'account_delete',
    p_max: 5,
    p_window: '1 hour',
  })
  if (limit.error) return { status: 429, body: { error: 'rate_limited' } }

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id)
  if (deleteError) return { status: 500, body: { error: 'server_error' } }
  return { status: 200, body: { ok: true } }
}
