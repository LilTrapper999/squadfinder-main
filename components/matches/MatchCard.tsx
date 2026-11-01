'use client'

import { useState } from 'react'
import { Ally, MatchBreakdown, MatchCandidate, OutboundRequest } from '@/lib/types'
import { useT } from '@/context/I18nContext'
import { ERROR_MESSAGES, toRpcError } from '@/lib/db/rpc'
import ScoreBars from '@/components/notifications/ScoreBars'

interface MatchCardProps {
  candidate: MatchCandidate
  /** 1-based position — the card is only ever "Match 01" until the request is accepted */
  index: number
  breakdown: MatchBreakdown
  /** The request the user sent to this candidate, if any */
  request: OutboundRequest | undefined
  /** The revealed ally, once the request was accepted */
  ally: Ally | undefined
  onSend: (matchRef: string) => Promise<void>
  onWithdraw: (requestId: string) => Promise<void>
}

const pad = (n: number) => String(n).padStart(2, '0')

export default function MatchCard({ candidate, index, breakdown, request, ally, onSend, onWithdraw }: MatchCardProps) {
  const { t } = useT()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gone, setGone] = useState(false)
  const [copied, setCopied] = useState(false)

  const label = t('Match {n}', { n: pad(index) })
  const accepted = request?.status === 'accepted' && !!ally
  const pending = request?.status === 'pending'
  const declined = request?.status === 'declined'
  const expired = request?.status === 'expired'
  const unavailable = gone || candidate.status === 'offline'

  async function run(action: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      const err = toRpcError(e)
      // "No longer available" is a normal state (also what a block looks like), not an error.
      if (err.code === 'unavailable') setGone(true)
      else setError(t(ERROR_MESSAGES[err.code]))
    } finally {
      setBusy(false)
    }
  }

  async function copyUsername() {
    if (!ally) return
    try {
      await navigator.clipboard.writeText(ally.username)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked (e.g. insecure context) — the username is visible to copy by hand.
    }
  }

  const searching = candidate.status === 'searching'
  const statusColor = searching ? '#e8a020' : candidate.status === 'online' ? '#22c55e' : 'rgba(255,255,255,0.55)'
  const statusText = searching ? t('Searching for a squad') : candidate.status === 'online' ? t('Online') : t('Offline')
  const borderColor = accepted ? '#22c55e' : declined ? '#ef4444' : 'rgba(255,255,255,0.08)'

  const ctaStyle = (primary: boolean, disabled = false): React.CSSProperties => ({
    width: '100%',
    minHeight: '44px',
    padding: '10px',
    borderRadius: '6px',
    border: `1px solid ${disabled ? 'rgba(255,255,255,0.12)' : '#e8a020'}`,
    backgroundColor: disabled ? 'rgba(255,255,255,0.03)' : primary ? '#e8a020' : 'transparent',
    color: disabled ? '#8b95a5' : primary ? '#0a0b0f' : '#e8a020',
    fontSize: '13px',
    fontWeight: 700,
    cursor: disabled || busy ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--font-rajdhani), sans-serif',
    letterSpacing: '0.04em',
  })

  return (
    <div
      className={`match-card${accepted ? ' accepted' : ''}`}
      style={{
        backgroundColor: '#1a1d26',
        border: `1px solid ${borderColor}`,
        borderRadius: '12px',
        padding: '20px',
        transition: 'border-color 0.2s ease, opacity 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        opacity: unavailable && !accepted ? 0.5 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px', gap: '8px' }}>
        <h3 className="main-heading" style={{ fontSize: '18px', letterSpacing: '0.05em', textTransform: accepted ? 'none' : 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{accepted ? ally!.username : label}</span>
          {accepted && (
            <button
              type="button"
              onClick={copyUsername}
              aria-label={t('Copy username')}
              title={copied ? t('Copied!') : t('Copy username')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#22c55e' : 'rgba(255,255,255,0.6)', padding: '4px', display: 'flex' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {copied ? <polyline points="20 6 9 17 4 12" /> : (<><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>)}
              </svg>
            </button>
          )}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
          <div aria-hidden="true" style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: statusColor }} />
          <span className="sub-heading" style={{ fontSize: '11px', color: statusColor, whiteSpace: 'nowrap' }}>{statusText}</span>
        </div>
      </div>

      {/* Every percentage opens the popup showing how it was reached. Until the match is
          accepted the other player is only ever "Match 01" — never their username. */}
      <ScoreBars
        scores={{ overall: breakdown.scores.overall, gamesmanship: breakdown.scores.gamesmanship, vibe: breakdown.scores.vibeCheck, comms: breakdown.scores.comms }}
        breakdown={breakdown}
        displayName={accepted ? ally!.username : label}
      />

      <div
        className="comms-info-row"
        style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '4px 0', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '4px', marginBottom: '14px' }}
      >
        <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', color: candidate.profile.willingToSpeak ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.62)' }}>
          <span aria-hidden="true">🎙</span> {candidate.profile.willingToSpeak ? t('Mic on') : t('Mic off')}
        </span>
        <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', color: candidate.profile.willingToChat ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.62)' }}>
          <span aria-hidden="true">💬</span> {candidate.profile.willingToChat ? t('Types') : t('No text')}
        </span>
      </div>

      <p style={{ margin: '0 0 14px', fontSize: '11px', color: 'rgba(255,255,255,0.62)' }}>
        {t('Tap any percentage to see how it was scored.')}
      </p>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {!request && !gone && (
          <button type="button" disabled={unavailable || busy} onClick={() => run(() => onSend(candidate.matchRef))} style={ctaStyle(true, unavailable)}>
            {unavailable ? t('Player Offline') : busy ? t('Waiting...') : t('Request to Squad')}
          </button>
        )}
        {!request && gone && (
          <p role="status" style={{ margin: 0, fontSize: '13px', color: '#8b95a5' }}>{t('This player is no longer available.')}</p>
        )}

        {pending && (
          <>
            <div role="status" style={{ padding: '10px', borderRadius: '6px', border: '1px solid rgba(232,160,32,0.4)', backgroundColor: 'rgba(232,160,32,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span aria-hidden="true" style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid rgba(232,160,32,0.3)', borderTopColor: '#e8a020', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ color: '#e8a020', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-rajdhani), sans-serif', letterSpacing: '0.04em' }}>{t('Waiting...')}</span>
            </div>
            <button type="button" disabled={busy} onClick={() => run(() => onWithdraw(request!.id))} style={ctaStyle(false)}>
              {t('Withdraw')}
            </button>
          </>
        )}

        {accepted && (
          <>
            <div role="status" style={{ padding: '9px 14px', borderRadius: '6px', border: '1px solid rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.08)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span aria-hidden="true" style={{ color: '#22c55e', fontSize: '14px' }}>✓</span>
              <span style={{ color: '#22c55e', fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-rajdhani), sans-serif' }}>{t('Squad Accepted')}</span>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
              {t('You are now allies. Add them in-game with the username above.')}
            </p>
            <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.62)' }}>
              {t("Only share what you're comfortable with. You can block or report any player.")}
            </p>
          </>
        )}

        {request?.status === 'accepted' && !ally && (
          <p role="status" style={{ margin: 0, fontSize: '13px', color: '#22c55e' }}>{t('Squad Accepted')}</p>
        )}

        {declined && (
          <>
            <div role="status" style={{ padding: '9px 14px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span aria-hidden="true" style={{ color: '#ef4444', fontSize: '14px' }}>✗</span>
              <span style={{ color: '#ef4444', fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-rajdhani), sans-serif' }}>{t('Squad Declined')}</span>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
              {t('This player declined your request. You can try again in 1 hour.')}
            </p>
          </>
        )}

        {expired && (
          <>
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{t('Your request expired without a reply.')}</p>
            <button type="button" disabled={busy} onClick={() => run(() => onSend(candidate.matchRef))} style={ctaStyle(true)}>
              {t('Send again')}
            </button>
          </>
        )}

        {error && <p role="alert" style={{ margin: 0, fontSize: '12px', color: '#fca5a5' }}>{error}</p>}
      </div>
    </div>
  )
}
