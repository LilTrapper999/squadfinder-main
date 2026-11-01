// Abuse reports (D-03). The reporter never receives a user id back; reports are reviewed through
// the open_reports SQL view by whoever operates the project.

import { rpc } from '@/lib/db/rpc'

export type ReportReason =
  | 'harassment'
  | 'hate'
  | 'inappropriate_username'
  | 'impersonation'
  | 'spam'
  | 'cheating'
  | 'other'

/** Reason codes with their English labels (passed through t() where they are shown). */
export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'harassment', label: 'Harassment or threats' },
  { value: 'hate', label: 'Hate speech' },
  { value: 'inappropriate_username', label: 'Inappropriate username' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'spam', label: 'Spam or advertising' },
  { value: 'cheating', label: 'Cheating' },
  { value: 'other', label: 'Something else' },
]

export const REPORT_DETAILS_MAX = 1000

export const reportAlly = (allyId: string, reason: ReportReason, details?: string) =>
  rpc<void>('report_ally', { p_ally_id: allyId, p_reason: reason, p_details: details?.trim() || null })

export const reportRequest = (requestId: string, reason: ReportReason, details?: string) =>
  rpc<void>('report_request', { p_request_id: requestId, p_reason: reason, p_details: details?.trim() || null })
