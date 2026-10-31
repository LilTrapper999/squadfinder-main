'use client'

import { useState } from 'react'
import { useT } from '@/context/I18nContext'
import { MatchBreakdown, SquadRequest } from '@/lib/types'
import ScoreBars from './ScoreBars'

interface RequestCardProps {
  request: SquadRequest
  /** Live scores plus how each was reached (explainMatch) — the sender vs. the current user */
  breakdown: MatchBreakdown
  onAccept: () => void
  onDecline: () => void
  onDeclineAndBlock: () => void
}

type Outcome = 'accepted' | 'declined' | 'blocked'

/** How long the confirmation strip shows before the card leaves the list */
const OUTCOME_DELAY = 900

// ─── Card ───────────────────────────────────────────────────────────────────

export default function RequestCard({
  request,
  breakdown,
  onAccept,
  onDecline,
  onDeclineAndBlock,
}: RequestCardProps) {
  const { t } = useT()
  const { scores } = breakdown
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [hoverAccept, setHoverAccept] = useState(false)

  const statusDotColor =
    request.senderStatus === 'ingame' ? '#22c55e' :
    request.senderStatus === 'searching' ? '#e8a020' :
    'rgba(255,255,255,0.3)'

  const statusText =
    request.senderStatus === 'ingame' ? t('Live — {game}', { game: request.senderStatusGame ?? t('In Game') }) :
    request.senderStatus === 'searching' ? t('Searching for a squad') :
    t('Offline')

  // The confirmation strip stays up briefly, then the parent drops the card from the list.
  function handleAction(result: Outcome, commit: () => void) {
    if (outcome) return
    setOutcome(result)
    setTimeout(commit, OUTCOME_DELAY)
  }

  const borderColor =
    outcome === 'accepted' ? '#22c55e' :
    outcome ? '#ef4444' :
    'rgba(255,255,255,0.08)'

  return (
    <div style={{ position: 'relative' }}>
      <div
        className="match-card"
        style={{
          backgroundColor: '#1a1d26',
          border: `1px solid ${borderColor}`,
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          transition: 'border-color 0.2s ease',
        }}
      >
        {/* Header: username left, status right */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px', gap: '8px' }}>
          <h3 className="main-heading" style={{ fontSize: '18px', letterSpacing: '0.05em', textTransform: 'none' }}>
            {request.senderUsername}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: statusDotColor }} />
            <span className="sub-heading" style={{ fontSize: '11px', color: statusDotColor, whiteSpace: 'nowrap' }}>{statusText}</span>
          </div>
        </div>

        {/* Every percentage opens the popup explaining how it was reached */}
        <ScoreBars
          scores={{ overall: scores.overall, gamesmanship: scores.gamesmanship, vibe: scores.vibeCheck, comms: scores.comms }}
          breakdown={breakdown}
          displayName={request.senderUsername}
        />

        {/* Comms info — plain badges, not a score (same as the squad-matches card) */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '4px 0', borderTop: '1px solid rgba(255,255,255,0.06)', marginBottom: '10px' }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', color: request.profile.willingToSpeak ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.28)' }}>
            🎙 {request.profile.willingToSpeak ? t('Mic on') : t('Mic off')}
          </span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', color: request.profile.willingToChat ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.28)' }}>
            💬 {request.profile.willingToChat ? t('Types') : t('No text')}
          </span>
        </div>

        <p style={{ margin: '0 0 14px', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
          {t('Tap any percentage to see how it was scored.')}
        </p>

        {/* Actions */}
        <div style={{ marginTop: 'auto' }}>
          {outcome ? (
            <div
              style={{
                padding: '9px 14px',
                borderRadius: '6px',
                border: `1px solid ${outcome === 'accepted' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                backgroundColor: outcome === 'accepted' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ color: outcome === 'accepted' ? '#22c55e' : '#ef4444', fontSize: '14px' }}>
                {outcome === 'accepted' ? '✓' : '✗'}
              </span>
              <span
                style={{
                  color: outcome === 'accepted' ? '#22c55e' : '#ef4444',
                  fontSize: '14px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-rajdhani), sans-serif',
                }}
              >
                {outcome === 'accepted' ? t('Accepted — now allies') : outcome === 'blocked' ? t('Declined & blocked') : t('Declined')}
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => handleAction('accepted', onAccept)}
                onMouseEnter={() => setHoverAccept(true)}
                onMouseLeave={() => setHoverAccept(false)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #e8a020',
                  backgroundColor: hoverAccept ? '#f0b030' : '#e8a020',
                  color: '#0a0b0f',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-rajdhani), sans-serif',
                  letterSpacing: '0.04em',
                  transition: 'all 0.15s ease',
                }}
              >
                {t('Accept')}
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  onClick={() => handleAction('declined', onDecline)}
                  style={{
                    padding: '9px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backgroundColor: 'transparent',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-rajdhani), sans-serif',
                    letterSpacing: '0.03em',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {t('Decline')}
                </button>
                <button
                  onClick={() => handleAction('blocked', onDeclineAndBlock)}
                  style={{
                    padding: '9px',
                    borderRadius: '6px',
                    border: '1px solid #ef4444',
                    backgroundColor: 'rgba(239,68,68,0.08)',
                    color: '#ef4444',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-rajdhani), sans-serif',
                    letterSpacing: '0.03em',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('Decline & Block')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
