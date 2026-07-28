'use client'

import { Game } from '@/lib/types'
import { useApp } from '@/context/AppContext'
import { useWindowWidth } from '@/lib/useWindowWidth'
import { AllyCard } from '@/components/matches/AlliesPanel'

interface GameAlliesPanelProps {
  game: Game | null
  closing?: boolean
}

const PANEL_WIDTH = 280
const MOBILE_BREAKPOINT = 768

export default function GameAlliesPanel({ game, closing = false }: GameAlliesPanelProps) {
  const { allies } = useApp()
  const isMobile = useWindowWidth() < MOBILE_BREAKPOINT

  if (!game) return null

  const gameAllies = allies.filter((a) => a.gameId === game.id)

  // Below the breakpoint this panel stacks under the grid instead of sitting beside it —
  // full width, capped height, border moves from left to top to match the new edge.
  const openStyle: React.CSSProperties = isMobile
    ? {
        width: '100%',
        minWidth: 0,
        maxHeight: '35vh',
        backgroundColor: '#111318',
        color: '#ffffff',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
        zIndex: 2,
        opacity: 1,
        transition: 'opacity 200ms ease',
      }
    : {
        width: `${PANEL_WIDTH}px`,
        minWidth: `${PANEL_WIDTH}px`,
        height: '100%',
        backgroundColor: '#111318',
        color: '#ffffff',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
        zIndex: 2,
        opacity: 1,
        transition: 'width 200ms ease, opacity 200ms ease',
      }

  return (
    <div
      style={
        closing
          ? {
              width: 0,
              minWidth: 0,
              maxWidth: 0,
              height: isMobile ? 0 : '100%',
              backgroundColor: '#111318',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              padding: 0,
              opacity: 0,
              flexShrink: 0,
              position: 'relative',
              zIndex: 2,
              transition: 'width 200ms ease, opacity 200ms ease',
            }
          : openStyle
      }
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        <p
          className="sub-heading"
          style={{
            margin: '0 0 4px',
            fontFamily: 'var(--font-rajdhani), sans-serif',
            fontWeight: 700,
            fontSize: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Your Allies ({gameAllies.length})
        </p>
        <p
          style={{
            margin: 0,
            fontSize: '11px',
            color: 'rgba(255,255,255,0.35)',
            lineHeight: 1.3,
            overflowWrap: 'break-word',
          }}
        >
          {game.name}
        </p>
      </div>

      {/* Scrollable ally list — scoped to this specific game/version */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '12px', paddingBottom: '12px' }}>
        {gameAllies.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: '32px 20px',
              opacity: 0.4,
              textAlign: 'center',
            }}
          >
            <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#ffffff', fontFamily: 'var(--font-rajdhani), sans-serif', fontWeight: 700 }}>
              No allies yet.
            </p>
            <p style={{ margin: 0, fontSize: '12px', color: '#8b95a5', lineHeight: 1.5 }}>
              Squad up here and they&apos;ll show up in this list.
            </p>
          </div>
        ) : (
          gameAllies.map((ally) => <AllyCard key={ally.id} ally={ally} />)
        )}
      </div>
    </div>
  )
}
