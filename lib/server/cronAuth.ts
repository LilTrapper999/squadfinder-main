import 'server-only'
import crypto from 'node:crypto'

const digest = (v: string) => crypto.createHash('sha256').update(v).digest()

/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Fails closed when the secret is
 * missing, and compares digests in constant time so the check leaks nothing about the secret.
 */
export function isAuthorizedCron(request: Request, secret: string | undefined = process.env.CRON_SECRET): boolean {
  if (!secret) return false
  const header = request.headers.get('authorization') ?? ''
  return crypto.timingSafeEqual(digest(header), digest(`Bearer ${secret}`))
}

/** The one response every failed cron/API call gets: no detail about why. */
export const unauthorized = () =>
  new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } })
