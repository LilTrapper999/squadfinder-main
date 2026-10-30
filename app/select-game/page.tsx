'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Game, GameCategory } from '@/lib/types'
import { useApp } from '@/context/AppContext'
import GameGrid from '@/components/game-select/GameGrid'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import HeaderActions from '@/components/ui/HeaderActions'
import { useT } from '@/context/I18nContext'

export default function SelectGamePage() {
  const router = useRouter()
  const { t } = useT()
  const { setSelectedGame, selectedGame } = useApp()
  const [activeCategory, setActiveCategory] = useState<GameCategory>('extraction')
  const [localGame, setLocalGame] = useState<Game | null>(selectedGame)
  // Kept mounted just long enough to play the slide-out transition after deselect
  const [closingGame, setClosingGame] = useState<Game | null>(null)
  const [panelClosing, setPanelClosing] = useState(false)

  function handleGameSelect(game: Game) {
    if (localGame?.id === game.id) {
      // Deselect — tile highlight clears immediately, panel animates out and unmounts after
      setClosingGame(game)
      setPanelClosing(true)
      setLocalGame(null)
      setSelectedGame(null)
      setTimeout(() => {
        setPanelClosing(false)
        setClosingGame(null)
      }, 200) // matches VersionSelector's CSS transition duration
    } else {
      setClosingGame(null)
      setPanelClosing(false)
      setLocalGame(game)
      setSelectedGame(game)
    }
  }

  function handleCategoryChange(category: GameCategory) {
    // A game picked in one tab (e.g. Extraction Shooters) shouldn't stay "selected" after
    // switching to a different tab (e.g. FPS) where it isn't even listed.
    if (localGame) {
      setClosingGame(localGame)
      setPanelClosing(true)
      setLocalGame(null)
      setSelectedGame(null)
      setTimeout(() => {
        setPanelClosing(false)
        setClosingGame(null)
      }, 200)
    }
    setActiveCategory(category)
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <AnimatedBackground />
      {/* Top bar */}
      <div
        style={{
          height: '52px',
          backgroundColor: '#111318',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: '24px',
          flexShrink: 0,
        }}
      >
        {/* Bell lives on every page — see TopNav for the pages that don't draw their own bar */}
        <span
          style={{
            fontFamily: 'var(--font-rajdhani), sans-serif',
            fontSize: '16px',
            fontWeight: 700,
            color: '#e8a020',
            letterSpacing: '0.05em',
          }}
        >
          SQUADFINDER
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'none',
              border: 'none',
              color: '#4a5568',
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {t('← Back')}
          </button>
          <span style={{ color: '#4a5568', fontSize: '12px' }}>/</span>
          <span style={{ color: '#8b95a5', fontSize: '13px' }}>{t('Select Game')}</span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <HeaderActions />
        </div>
      </div>

      {/* Single full-width tab panel — category tabs + version panel now live inside GameGrid */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <GameGrid
          category={activeCategory}
          onCategoryChange={handleCategoryChange}
          selectedGame={localGame}
          closingGame={closingGame}
          panelClosing={panelClosing}
          onGameSelect={handleGameSelect}
        />
      </div>
    </div>
  )
}
