'use client'

import { useState } from 'react'
import { useT } from '@/context/I18nContext'
import { MatchBreakdown } from '@/lib/types'
import { scoreToColour } from '@/lib/matchColour'
import { CATEGORY_LABEL, ScoreCategory } from '@/lib/profileAnswers'
import dynamic from 'next/dynamic'

// Only fetched when someone opens a score; most visits never do.
const ScoreBreakdownModal = dynamic(() => import('./ScoreBreakdownModal'), { ssr: false })

interface ScoreBarsProps {
  scores: { overall: number; gamesmanship: number; vibe: number; comms: number }
  /** Without a breakdown the bars still render, just not clickable */
  breakdown?: MatchBreakdown
  /** Who the popup says you're compared with — a username, or the anonymous "Match 01" label */
  displayName: string
}

function Bar({ value }: { value: number }) {
  return (
    <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.08)' }}>
      <div style={{ height: '100%', borderRadius: '3px', backgroundColor: scoreToColour(value), width: `${value}%`, transition: 'width 0.5s ease' }} />
    </div>
  )
}

/**
 * The Overall bar plus the Gamesmanship / Vibe Check / Comms Style bars shared by the
 * squad-matches card and the notifications card. Every percentage opens the breakdown popup.
 */
export default function ScoreBars({ scores, breakdown, displayName }: ScoreBarsProps) {
  const { t } = useT()
  // Which score's breakdown popup is open — null when closed
  const [openCategory, setOpenCategory] = useState<ScoreCategory | null>(null)
  const [hovered, setHovered] = useState<ScoreCategory | null>(null)

  const interactive = !!breakdown

  function rowProps(category: ScoreCategory, value: number) {
    return {
      disabled: !interactive,
      onClick: () => setOpenCategory(category),
      onMouseEnter: () => setHovered(category),
      onMouseLeave: () => setHovered(null),
      'aria-haspopup': 'dialog' as const,
      'aria-label': interactive
        ? t('{label}: {score}% — see how it was scored', { label: t(CATEGORY_LABEL[category]), score: value })
        : undefined,
    }
  }

  const rowStyle = (category: ScoreCategory, padding: string, margin: string) => {
    const active = interactive && hovered === category
    return {
      display: 'block',
      width: '100%',
      textAlign: 'left' as const,
      background: active ? 'rgba(232,160,32,0.08)' : 'none',
      border: '1px solid',
      borderColor: active ? 'rgba(232,160,32,0.35)' : 'transparent',
      borderRadius: '6px',
      padding,
      margin,
      cursor: interactive ? 'pointer' : 'default',
      fontFamily: 'inherit',
      color: 'inherit',
      transition: 'all 0.15s ease',
    }
  }

  const chevron = (size: string) =>
    interactive && (
      <span aria-hidden="true" style={{ marginLeft: '4px', fontSize: size, color: 'rgba(255,255,255,0.62)' }}>›</span>
    )

  return (
    <>
      {/* Overall */}
      <button {...rowProps('overall', scores.overall)} style={rowStyle('overall', '6px 8px', '0 -8px 8px')}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
          <span className="sub-heading" style={{ fontSize: '13px', fontWeight: 600 }}>{t('Overall Match')}</span>
          <span style={{ fontSize: '22px', fontWeight: 700, color: scoreToColour(scores.overall), fontFamily: 'var(--font-rajdhani), sans-serif', lineHeight: 1 }}>
            {scores.overall}%{chevron('16px')}
          </span>
        </div>
        <Bar value={scores.overall} />
      </button>

      {/* Sub-scores */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {([
          { category: 'gamesmanship' as const, value: scores.gamesmanship },
          { category: 'vibe' as const,         value: scores.vibe },
          { category: 'comms' as const,        value: scores.comms },
        ]).map(({ category, value }) => (
          <button key={category} {...rowProps(category, value)} style={rowStyle(category, '5px 8px', '0 -8px')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: interactive && hovered === category ? '#e8a020' : '#8b95a5' }}>{t(CATEGORY_LABEL[category])}</span>
              <span style={{ fontSize: '12px', color: scoreToColour(value), fontWeight: 600 }}>
                {value}%{chevron('inherit')}
              </span>
            </div>
            <Bar value={value} />
          </button>
        ))}
      </div>

      {openCategory && breakdown && (
        <ScoreBreakdownModal
          category={openCategory}
          breakdown={breakdown}
          senderUsername={displayName}
          onClose={() => setOpenCategory(null)}
        />
      )}
    </>
  )
}
