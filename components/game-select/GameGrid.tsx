'use client'

// ⚠️ HARD RULE: Games with a real logoUrl MUST render before games without one.
// Within each group, sort A→Z by name.
// The imported arrays from mockData.ts are pre-sorted — do NOT re-sort here.
// DO NOT render games in any other order.

import { useRef, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Game, GameCategory, GameVersion } from '@/lib/types'
import { GAMES_BY_CATEGORY } from '@/lib/mockData'
import { useApp } from '@/context/AppContext'
import GameTile from './GameTile'
import VersionSelector from './VersionSelector'

interface GameGridProps {
  category: GameCategory
  onCategoryChange: (cat: GameCategory) => void
  selectedGame: Game | null
  closingGame: Game | null
  panelClosing: boolean
  onGameSelect: (game: Game) => void
}

const CATEGORIES: { id: GameCategory; label: string }[] = [
  { id: 'extraction', label: 'Extraction Shooters' },
  { id: 'competitive', label: 'Competitive FPS' },
  { id: 'fps', label: 'FPS' },
]

function computeCols(width: number): number {
  const raw = width / 160
  const floored = Math.floor(raw)
  const fraction = raw - floored
  const cols = fraction >= 0.6 ? floored + 1 : floored
  return Math.min(Math.max(cols, 2), 6)
}

// A version choice is only needed when there's more than one to pick between —
// either multiple listed versions, or multiple platforms with differing versions.
function needsVersionChoice(game: Game): boolean {
  return game.versions.length > 1 || !!(game.platforms && game.platforms.length > 1)
}

function defaultVersionFor(game: Game): GameVersion | null {
  if (game.platforms && game.platforms.length > 0) {
    return game.platformVersions?.[game.platforms[0]]?.[0] ?? game.versions[0] ?? null
  }
  return game.versions[0] ?? null
}

export default function GameGrid({
  category,
  onCategoryChange,
  selectedGame,
  closingGame,
  panelClosing,
  onGameSelect,
}: GameGridProps) {
  const router = useRouter()
  const { setSelectedVersion } = useApp()
  const games = GAMES_BY_CATEGORY[category] ?? []
  const gridRef = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(3)
  const [hoverTab, setHoverTab] = useState<GameCategory | null>(null)
  const [hoverBtn, setHoverBtn] = useState(false)

  useEffect(() => {
    if (!gridRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCols(computeCols(entry.contentRect.width))
      }
    })
    observer.observe(gridRef.current)
    // Set initial
    setCols(computeCols(gridRef.current.offsetWidth))
    return () => observer.disconnect()
  }, [])

  // Single-version games skip the picker entirely — lock in the only option automatically.
  useEffect(() => {
    if (selectedGame && !needsVersionChoice(selectedGame)) {
      setSelectedVersion(defaultVersionFor(selectedGame))
    } else if (!selectedGame) {
      setSelectedVersion(null)
    }
  }, [selectedGame?.id])

  const showVersionPanel =
    !!(selectedGame && needsVersionChoice(selectedGame)) ||
    !!(closingGame && needsVersionChoice(closingGame))
  const showDirectCta = !!selectedGame && !needsVersionChoice(selectedGame)

  function handleFindSquad() {
    router.push('/build-profile')
  }

  return (
    <div
      className="game-grid-panel"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0d0f14',
        color: 'rgba(255,255,255,0.9)',
        overflow: 'hidden',
        flex: 1,
        minWidth: 0,
        position: 'relative',
        zIndex: 2,
      }}
    >
      {/* Header — heading (top aligned) + category tabs (replaces the old LH sidebar) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          padding: '20px 24px 0',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        <h2
          className="main-heading"
          style={{ fontSize: '40px', alignSelf: 'flex-start', verticalAlign: 'top', margin: 0 }}
        >
          CHOOSE YOUR BATTLEFIELD
        </h2>

        <div style={{ display: 'flex', gap: '4px', marginTop: '16px' }}>
          {CATEGORIES.map((cat) => {
            const isActive = cat.id === category
            const isHovered = cat.id === hoverTab
            return (
              <button
                key={cat.id}
                className={`category-tab${isActive ? ' active' : ''}`}
                onClick={() => onCategoryChange(cat.id)}
                onMouseEnter={() => setHoverTab(cat.id)}
                onMouseLeave={() => setHoverTab(null)}
                style={{
                  padding: '10px 18px',
                  backgroundColor: isActive
                    ? 'rgba(232,160,32,0.08)'
                    : isHovered
                    ? 'rgba(255,255,255,0.03)'
                    : 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${isActive ? '#e8a020' : 'transparent'}`,
                  color: isActive ? '#e8a020' : isHovered ? '#d0d8e4' : '#8b95a5',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-rajdhani), sans-serif',
                  letterSpacing: '0.05em',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Body — scrollable grid + (optional) version panel, both live inside this tab */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <div
          ref={gridRef}
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: 'auto',
            padding: '16px',
          }}
        >
          <div
            className="game-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap: '10px',
            }}
          >
            {games.map((game) => (
              <GameTile
                key={game.id}
                game={game}
                selected={selectedGame?.id === game.id}
                onSelect={() => onGameSelect(game)}
              />
            ))}
          </div>
        </div>

        {/* RH version panel — only when the selected tile has multiple versions to choose from */}
        {showVersionPanel && (
          <VersionSelector game={selectedGame ?? closingGame} closing={panelClosing} />
        )}

        {/* Single-version tiles skip the picker — go straight to the CTA */}
        {showDirectCta && (
          <div style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: 3 }}>
            <button
              onClick={handleFindSquad}
              onMouseEnter={() => setHoverBtn(true)}
              onMouseLeave={() => setHoverBtn(false)}
              style={{
                padding: '13px 28px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: hoverBtn ? '#f0b030' : '#e8a020',
                color: '#0a0b0f',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-rajdhani), sans-serif',
                letterSpacing: '0.05em',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 20px rgba(232,160,32,0.3)',
              }}
            >
              Find My Squad →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
