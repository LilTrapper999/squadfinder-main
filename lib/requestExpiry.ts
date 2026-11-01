import { REQUEST_EXPIRY_DAYS } from './site'

const DAY_MS = 86_400_000

/**
 * Whole days left before a pending request expires (0 = within the next 24 hours), or null when the
 * send time is unknown. The database does the real expiring; this is only the countdown on the card.
 */
export function daysUntilExpiry(sentAt: string | undefined, now: number = Date.now()): number | null {
  if (!sentAt) return null
  const sent = Date.parse(sentAt)
  if (Number.isNaN(sent)) return null
  return Math.max(0, Math.floor((sent + REQUEST_EXPIRY_DAYS * DAY_MS - now) / DAY_MS))
}
