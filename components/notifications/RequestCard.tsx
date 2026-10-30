'use client'

import { useState } from 'react'
import { useT } from '@/context/I18nContext'
import { MatchScores, SquadRequest } from '@/lib/types'
import { scoreToColour } from '@/lib/matchColour'
import { CATEGORY_LABEL, ScoreCategory, describeAnswers } from '@/lib/profileAnswers'

interface RequestCardProps {
  request: SquadRequest
  /** Live scores from calculateMatch — the sender vs. the current user */
  scores: MatchScores
  /** Render the answers popup on the left instead of the right (last grid column) */
  flipPopup: boolean
  /** Stack the answers popup under the scores instead of floating it beside the card */
  inlinePopup: boolean
  onAccept: () => void
  onDecline: () => void
  onDeclineAndBlock: () => void
}

type Outcome = 'accepted' | 'declined' | 'blocked'

/** How long the confirmation strip shows before the card leaves the list */
const OUTCOME_DELAY = 900

function Bar({ value }: { value: number }) {
  return (
    <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.08)' }}>
      <div style={{ height: '100%', borderRadius: '3px', backgroundColor: scoreToColour(value), width: `${value}%`, transition: 'width 0.5s ease' }} />
    </div>
  )
}

// ─── Answers popup ──────────────────────────────────────────────────────────

function AnswersPanel({
  request,
  category,
  score,
  onClose,
}: {
  request: SquadRequest
  category: ScoreCategory
  score: number
  onClose: () => void
}) {
  const { t } = useT()
  const groups = describeAnswers(request.profile, category)
  const showGroupTitles = groups.length > 1

  return (
    <div
      style={{
        backgroundColor: '#111318',
        border: '1px solid rgba(232,160,32,0.4)',
        borderRadius: '10px',
        padding: '16px',
        boxShadow: '0 0 24px rgba(232,160,32,0.25), 0 8px 32px rgba(0,0,0,0.6)',
      }}
    >
      {/* Panel header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
        <p
          className="sub-heading"
          style={{
            margin: 0,
            fontSize: '14px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#e8a020',
          }}
        >
          {t(CATEGORY_LABEL[category])}
        </p>
        <button
          onClick={onClose}
          aria-label={t('Close answers')}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '15px',
            lineHeight: 1,
            cursor: 'pointer',
            padding: '2px 4px',
            fontFamily: 'inherit',
          }}
        >
          ✕
        </button>
      </div>
      <p style={{ margin: '0 0 12px', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
        {t("{name}'s answers", { name: request.senderUsername })} · <span style={{ color: scoreToColour(score), fontWeight: 600 }}>{t('{score}% match', { score })}</span>
      </p>

      {/* Answer groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '340px', overflowY: 'auto' }}>
        {groups.map((group) => (
          <div key={group.title}>
            {showGroupTitles && (
              <p
                style={{
                  margin: '0 0 8px',
                  fontFamily: 'var(--font-rajdhani), sans-serif',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#e8a020',
                }}
              >
                {t(group.title)}
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {group.items.map((item) => (
                <div key={item.label}>
                  <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#8b95a5' }}>{t(item.label)}</p>
                  {item.values.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
                      {t('No answer given')}
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {item.values.map((value) => (
                        <span
                          key={value}
                          style={{
                            fontSize: '11px',
                            color: 'rgba(255,255,255,0.85)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(232,160,32,0.08)',
                            border: '1px solid rgba(232,160,32,0.2)',
                          }}
                        >
                          {t(value)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Card ───────────────────────────────────────────────────────────────────

export default function RequestCard({
  request,
  scores,
  flipPopup,
  inlinePopup,
  onAccept,
  onDecline,
  onDeclineAndBlock,
}: RequestCardProps) {
  // Which score readout is expanded — null when the answers popup is closed
  const { t } = useT()
  const [openCategory, setOpenCategory] = useState<ScoreCategory | null>(null)
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

  const scoreByCategory: Record<ScoreCategory, number> = {
    overall: scores.overall,
    gamesmanship: scores.gamesmanship,
    vibe: scores.vibeCheck,
    comms: scores.comms,
  }

  function toggleCategory(category: ScoreCategory) {
    setOpenCategory((prev) => (prev === category ? null : category))
  }

  // The confirmation strip stays up briefly, then the parent drops the card from the list.
  function handleAction(result: Outcome, commit: () => void) {
    if (outcome) return
    setOutcome(result)
    setOpenCategory(null)
    setTimeout(commit, OUTCOME_DELAY)
  }

  const borderColor =
    outcome === 'accepted' ? '#22c55e' :
    outcome ? '#ef4444' :
    'rgba(255,255,255,0.08)'

  const popup = openCategory && (
    <AnswersPanel
      request={request}
      category={openCategory}
      score={scoreByCategory[openCategory]}
      onClose={() => setOpenCategory(null)}
    />
  )

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

        {/* Overall — click to see every answer they gave */}
        <button
          onClick={() => toggleCategory('overall')}
          aria-expanded={openCategory === 'overall'}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            background: openCategory === 'overall' ? 'rgba(232,160,32,0.08)' : 'none',
            border: '1px solid',
            borderColor: openCategory === 'overall' ? 'rgba(232,160,32,0.35)' : 'transparent',
            borderRadius: '6px',
            padding: '6px 8px',
            margin: '0 -8px 8px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
            <span className="sub-heading" style={{ fontSize: '13px', fontWeight: 600 }}>{t('Overall Match')}</span>
            <span style={{ fontSize: '22px', fontWeight: 700, color: scoreToColour(scores.overall), fontFamily: 'var(--font-rajdhani), sans-serif', lineHeight: 1 }}>
              {scores.overall}%
            </span>
          </div>
          <Bar value={scores.overall} />
        </button>

        {/* Sub-scores — click any percentage for that category's answers */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {([
            { category: 'gamesmanship' as const, value: scores.gamesmanship },
            { category: 'vibe' as const,         value: scores.vibeCheck },
            { category: 'comms' as const,        value: scores.comms },
          ]).map(({ category, value }) => {
            const isOpen = openCategory === category
            return (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                aria-expanded={isOpen}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: isOpen ? 'rgba(232,160,32,0.08)' : 'none',
                  border: '1px solid',
                  borderColor: isOpen ? 'rgba(232,160,32,0.35)' : 'transparent',
                  borderRadius: '6px',
                  padding: '5px 8px',
                  margin: '0 -8px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: isOpen ? '#e8a020' : '#8b95a5' }}>{t(CATEGORY_LABEL[category])}</span>
                  <span style={{ fontSize: '12px', color: scoreToColour(value), fontWeight: 600 }}>{value}%</span>
                </div>
                <Bar value={value} />
              </button>
            )
          })}
        </div>

        <p style={{ margin: '0 0 14px', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
          {t('Tap any percentage to see their answers.')}
        </p>

        {/* Inline answers popup — narrow viewports have no room beside the card */}
        {inlinePopup && popup && <div style={{ marginBottom: '14px' }}>{popup}</div>}

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

      {/* Floating answers popup — sits beside the card, flipping to the left in the last
          column so it stays inside the scroll container instead of being clipped. */}
      {!inlinePopup && popup && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            width: '300px',
            zIndex: 60,
            ...(flipPopup
              ? { right: 'calc(100% + 14px)' }
              : { left: 'calc(100% + 14px)' }),
          }}
        >
          {popup}
        </div>
      )}
    </div>
  )
}
