import { describe, expect, it } from 'vitest'
import { daysUntilExpiry } from '@/lib/requestExpiry'
import { REQUEST_EXPIRY_DAYS } from '@/lib/site'

const DAY = 86_400_000
const now = Date.parse('2026-11-01T12:00:00Z')
const sentAgo = (ms: number) => new Date(now - ms).toISOString()

describe('daysUntilExpiry', () => {
  it('counts whole days left from the send time', () => {
    expect(daysUntilExpiry(sentAgo(0), now)).toBe(REQUEST_EXPIRY_DAYS)
    expect(daysUntilExpiry(sentAgo(3 * DAY + 3600_000), now)).toBe(REQUEST_EXPIRY_DAYS - 4)
  })

  it('reaches 0 inside the final day and never goes negative', () => {
    expect(daysUntilExpiry(sentAgo(REQUEST_EXPIRY_DAYS * DAY - 3600_000), now)).toBe(0)
    expect(daysUntilExpiry(sentAgo(REQUEST_EXPIRY_DAYS * DAY + 5 * DAY), now)).toBe(0)
  })

  it('is null when the send time is missing or unreadable', () => {
    expect(daysUntilExpiry(undefined, now)).toBeNull()
    expect(daysUntilExpiry('not a date', now)).toBeNull()
  })
})
