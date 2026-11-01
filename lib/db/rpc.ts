// Shared RPC plumbing: one call helper and one place that turns database error text into
// a stable code the UI can translate. Raw Postgres messages never reach the user (U-13).

import { supabase } from '@/lib/supabase/client'

export type RpcErrorCode =
  | 'unavailable' // "This player is no longer available" — also what a block looks like (D2)
  | 'profile_incomplete'
  | 'too_many_pending'
  | 'daily_limit'
  | 'pair_limit'
  | 'rate_limited'
  | 'not_authenticated'
  | 'username_unavailable'
  | 'reauth_required'
  | 'network'
  | 'unknown'

export class RpcError extends Error {
  constructor(public code: RpcErrorCode, public raw: string) {
    super(code)
    this.name = 'RpcError'
  }
}

const PATTERNS: [RegExp, RpcErrorCode][] = [
  [/no longer available/i, 'unavailable'],
  [/complete your profile/i, 'profile_incomplete'],
  [/too many pending/i, 'too_many_pending'],
  [/daily request limit/i, 'daily_limit'],
  [/contacted this player too many times/i, 'pair_limit'],
  [/too many requests|slow down|rate limit/i, 'rate_limited'],
  [/not authenticated|jwt expired|invalid jwt|jwt/i, 'not_authenticated'],
  [/username isn'?t available/i, 'username_unavailable'],
  [/reauth_required/i, 'reauth_required'],
  [/failed to fetch|networkerror|network request failed|load failed/i, 'network'],
]

export function classifyError(message: string): RpcErrorCode {
  for (const [re, code] of PATTERNS) if (re.test(message)) return code
  return 'unknown'
}

export function toRpcError(e: unknown): RpcError {
  if (e instanceof RpcError) return e
  const raw = e instanceof Error ? e.message : typeof e === 'string' ? e : ''
  return new RpcError(classifyError(raw), raw)
}

/** English source strings for t(). Keep in step with the dictionaries. */
export const ERROR_MESSAGES: Record<RpcErrorCode, string> = {
  unavailable: 'This player is no longer available.',
  profile_incomplete: 'Finish your profile for this game first.',
  too_many_pending: 'You have too many pending requests. Withdraw some or wait for replies.',
  daily_limit: 'Daily request limit reached. Try again tomorrow.',
  pair_limit: "You've already asked this player recently.",
  rate_limited: 'Too many requests. Please slow down.',
  not_authenticated: 'Your session expired. Please sign in again.',
  username_unavailable: "That username isn't available.",
  reauth_required: 'Please sign in again to confirm this.',
  network: "You seem to be offline. Check your connection and try again.",
  unknown: 'Something went wrong. Try again.',
}

export async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  let result
  try {
    result = await supabase.rpc(fn, args)
  } catch (e) {
    throw toRpcError(e)
  }
  if (result.error) throw toRpcError(new Error(result.error.message))
  return result.data as T
}
