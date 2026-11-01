'use client'

import { useId, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { useT } from '@/context/I18nContext'
import { ERROR_MESSAGES, toRpcError } from '@/lib/db/rpc'
import { REPORT_DETAILS_MAX, REPORT_REASONS, reportAlly, reportRequest, type ReportReason } from '@/lib/db/reports'

export type ReportTarget = { kind: 'ally'; allyId: string } | { kind: 'request'; requestId: string }

interface ReportDialogProps {
  target: ReportTarget
  /** The in-game name shown in the title; a proper noun, never translated. */
  name: string
  onClose: () => void
  /** Called after a successful report when "Also block" was ticked. Errors are shown in the dialog. */
  onAlsoBlock?: () => Promise<void>
}

export default function ReportDialog({ target, name, onClose, onAlsoBlock }: ReportDialogProps) {
  const { t } = useT()
  const fieldId = useId()
  const errorId = useId()
  const [reason, setReason] = useState<ReportReason | ''>('')
  const [details, setDetails] = useState('')
  const [alsoBlock, setAlsoBlock] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function submit() {
    if (!reason || busy) return
    setBusy(true)
    setError(null)
    try {
      if (target.kind === 'ally') await reportAlly(target.allyId, reason, details)
      else await reportRequest(target.requestId, reason, details)
      if (alsoBlock && onAlsoBlock) await onAlsoBlock()
      setDone(true)
    } catch (e) {
      setError(t(ERROR_MESSAGES[toRpcError(e).code]))
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <Dialog title={t('Report sent')} onClose={onClose}>
        <p style={{ margin: '0 0 18px', color: 'rgba(255,255,255,0.8)', fontSize: '14px', lineHeight: 1.5 }}>
          {t("Thanks. We'll review it. The player isn't told who reported them.")}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button data-autofocus onClick={onClose}>{t('Done')}</Button>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog title={t('Report {name}', { name })} onClose={onClose} busy={busy}>
      <fieldset style={{ border: 'none', margin: 0, padding: 0 }} disabled={busy}>
        <legend style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', marginBottom: '8px', padding: 0 }}>
          {t('What is the problem?')}
        </legend>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {REPORT_REASONS.map((r) => (
            <label
              key={r.value}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px', cursor: 'pointer', fontSize: '14px' }}
            >
              <input
                type="radio"
                name={`reason-${fieldId}`}
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                style={{ accentColor: '#e8a020', width: '18px', height: '18px' }}
              />
              {t(r.label)}
            </label>
          ))}
        </div>
      </fieldset>

      <label htmlFor={fieldId} style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.75)', margin: '14px 0 6px' }}>
        {t('Details (optional)')}
      </label>
      <textarea
        id={fieldId}
        value={details}
        maxLength={REPORT_DETAILS_MAX}
        onChange={(e) => setDetails(e.target.value)}
        disabled={busy}
        rows={3}
        aria-describedby={error ? errorId : undefined}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          resize: 'vertical',
          backgroundColor: '#0a0b0f',
          color: '#ffffff',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '6px',
          padding: '10px',
          fontSize: '14px',
          fontFamily: 'inherit',
        }}
      />

      {onAlsoBlock && (
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px', cursor: 'pointer', fontSize: '14px', marginTop: '6px' }}>
          <input
            type="checkbox"
            checked={alsoBlock}
            onChange={(e) => setAlsoBlock(e.target.checked)}
            disabled={busy}
            style={{ accentColor: '#e8a020', width: '18px', height: '18px' }}
          />
          {t('Also block this player')}
        </label>
      )}

      <div id={errorId} role="alert" style={{ minHeight: error ? undefined : 0, color: '#fca5a5', fontSize: '13px', margin: error ? '8px 0 0' : 0 }}>
        {error}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
        <Button variant="ghost" onClick={onClose} disabled={busy}>{t('Cancel')}</Button>
        <Button onClick={submit} disabled={!reason || busy}>{busy ? t('Sending…') : t('Send report')}</Button>
      </div>
    </Dialog>
  )
}
