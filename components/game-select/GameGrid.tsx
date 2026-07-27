'use client'

// ⚠️ HARD RULE: Games with a real logoUrl MUST render before games without one.
// Within each group, sort A→Z by name.
// The imported arrays from mockData.ts are pre-sorted — do NOT re-sort here.
// DO NOT render games in any other order.

import { useRef, useEffect, useState } from 'react'
import { Game, GameCategory } from '@/lib/types'
import { GAMES_BY_CATEGORY } from '@/lib/mockData'
import GameTile from './GameTile'

interface GameGridProps {
  category: GameCategory
  selectedGame: Game | null
  onGameSelect: (game: Game) => void
}

function computeCols(width: number): number {
  const raw = width / 160
  const floored = Math.floor(raw)
  const fraction = raw - floored
  const cols = fraction >= 0.6 ? floored + 1 : floored
  return Math.min(Math.max(cols, 2), 6)
}

export default function GameGrid({ category, selectedGame, onGameSelect }: GameGridProps) {
  const games = GAMES_BY_CATEGORY[category] ?? []
  const gridRef = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(3)

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

  return (
    <div
      className="game-grid-panel"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0d0f14',
        color: 'rgba(255,255,255,0.9)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
        flex: 1,
        minWidth: 0,
        position: 'relative',
        zIndex: 2,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        <h2 className="main-heading" style={{ fontSize: '20px' }}>
          CHOOSE YOUR BATTLEFIELD
        </h2>
      </div>

      {/* Scrollable grid */}
      <div
        ref={gridRef}
        style={{
          flex: 1,
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
    </div>
  )
}
