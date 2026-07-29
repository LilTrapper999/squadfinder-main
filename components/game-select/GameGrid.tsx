'use client'

// ⚠️ HARD RULE: Games with a real logoUrl MUST render before games without one.
// Within each group, sort A→Z by name.
// The imported arrays from mockData.ts are pre-sorted — do NOT re-sort here.
// DO NOT render games in any other order.

import { useRef, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Game, GameCategory } from '@/lib/types'
import { GAMES_BY_CATEGORY, GAME_QUESTIONS } from '@/lib/mockData'
import { useApp } from '@/context/AppContext'
import { gameKey, isProfileComplete } from '@/lib/profileAnswers'
import { useWindowWidth } from '@/lib/useWindowWidth'
import GameTile from './GameTile'
import GameAlliesPanel from './GameAlliesPanel'

const MOBILE_BREAKPOINT = 768

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

export default function GameGrid({
  category,
  onCategoryChange,
  selectedGame,
  closingGame,
  panelClosing,
  onGameSelect,
}: GameGridProps) {
  const router = useRouter()
  const { setSelectedVersion, isReturningUser, profileAnswers } = useApp()
  const games = GAMES_BY_CATEGORY[category] ?? []
  const gridRef = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(3)
  const [hoverTab, setHoverTab] = useState<GameCategory | null>(null)
  const [hoverBtn, setHoverBtn] = useState(false)
  const width = useWindowWidth()
  const isMobile = width < MOBILE_BREAKPOINT

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

  // Every game now has exactly one version (each version is its own tile) — lock it in.
  useEffect(() => {
    setSelectedVersion(selectedGame ? selectedGame.versions[0] ?? null : null)
  }, [selectedGame?.id])

  // Keep the selected tile in view — picking a game further down the grid shouldn't leave it
  // scrolled off-screen while the page is still scrolled up top.
  useEffect(() => {
    if (!selectedGame) return
    document
      .getElementById(`game-tile-${selectedGame.id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedGame?.id])

  function handleFindSquad() {
    // Returning users skip build-profile only when they actually have a complete profile for
    // THIS game. "Returning" says nothing about the game just picked — sending them straight
    // to matches was letting them match on required answers they had never given.
    const key = gameKey(selectedGame)
    const complete = isProfileComplete(key, profileAnswers, GAME_QUESTIONS[key])
    router.push(isReturningUser && complete ? '/squad-matches' : '/build-profile')
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
          padding: isMobile ? '16px 16px 0' : '20px 24px 0',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        <h2
          className="main-heading"
          style={{ fontSize: 'clamp(24px, 6vw, 40px)', alignSelf: 'flex-start', verticalAlign: 'top', margin: 0 }}
        >
          CHOOSE YOUR BATTLEFIELD
        </h2>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '16px' }}>
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
                  padding: isMobile ? '8px 12px' : '12px 20px',
                  backgroundColor: isActive
                    ? 'rgba(232,160,32,0.08)'
                    : isHovered
                    ? 'rgba(255,255,255,0.03)'
                    : 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${isActive ? '#e8a020' : 'transparent'}`,
                  color: isActive ? '#e8a020' : isHovered ? '#d0d8e4' : '#8b95a5',
                  fontSize: 'clamp(14px, 3.2vw, 26px)',
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

      {/* Body — scrollable grid + allies panel; stacks vertically on narrow viewports since the
          panel's fixed width would otherwise crush the grid down to almost nothing */}
      <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: isMobile ? 'auto' : 'hidden', position: 'relative' }}>
        <div
          ref={gridRef}
          style={{
            flex: isMobile ? '0 0 auto' : 1,
            minWidth: 0,
            overflowY: 'auto',
            maxHeight: isMobile ? '55vh' : undefined,
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

        {/* RH panel — this game's allies, replacing the old version picker */}
        {(selectedGame || closingGame) && (
          <GameAlliesPanel game={selectedGame ?? closingGame} closing={panelClosing} />
        )}
      </div>

      {/* Footer — a strip dedicated solely to the CTA */}
      {selectedGame && (
        <div
          style={{
            flexShrink: 0,
            padding: isMobile ? '12px 16px' : '16px 24px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
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
  )
}
