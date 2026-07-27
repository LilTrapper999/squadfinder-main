'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Game, GameVersion } from '@/lib/types'
import { useApp } from '@/context/AppContext'

interface VersionSelectorProps {
  game: Game | null
  closing?: boolean
}

// Matches Sidebar's fixed min-width — used to keep the game grid at a usable width.
const SIDEBAR_WIDTH = 180
const MIN_GRID_WIDTH = 400
const PANEL_MIN_WIDTH = 180
const PANEL_MAX_WIDTH = 320

export default function VersionSelector({ game, closing = false }: VersionSelectorProps) {
  const router = useRouter()
  const { setSelectedVersion } = useApp()
  const [selected, setSelected] = useState<GameVersion | null>(null)
  const [activePlatform, setActivePlatform] = useState<string | null>(null)
  const [hoverVersion, setHoverVersion] = useState<string | null>(null)
  const [hoverBtn, setHoverBtn] = useState(false)
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1280
  )

  useEffect(() => {
    function onResize() {
      setViewportWidth(window.innerWidth)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const panelMaxWidth = Math.max(
    PANEL_MIN_WIDTH,
    Math.min(PANEL_MAX_WIDTH, viewportWidth - SIDEBAR_WIDTH - MIN_GRID_WIDTH)
  )

  // Reset when game changes
  useEffect(() => {
    setSelected(null)
    setSelectedVersion(null)
    // Default to first platform if available
    if (game?.platforms && game.platforms.length > 0) {
      setActivePlatform(game.platforms[0])
    } else {
      setActivePlatform(null)
    }
  }, [game?.id])

  // Determine which version list to show
  const versions: GameVersion[] = game
    ? activePlatform && game.platformVersions?.[activePlatform]
      ? game.platformVersions[activePlatform]
      : game.versions
    : []

  function handleVersionClick(version: GameVersion) {
    setSelected(version)
    setSelectedVersion(version)
  }

  function handlePlatformSwitch(platform: string) {
    setActivePlatform(platform)
    setSelected(null)
    setSelectedVersion(null)
  }

  function handleFindSquad() {
    if (!selected) return
    router.push('/build-profile')
  }

  if (!game) {
    return null
  }

  return (
    <div
      className={`version-panel${closing ? ' closing' : ''}`}
      style={
        closing
          ? {
              width: 0,
              minWidth: 0,
              maxWidth: 0,
              height: '100%',
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
          : {
              width: 'fit-content',
              minWidth: `${PANEL_MIN_WIDTH}px`,
              maxWidth: `${panelMaxWidth}px`,
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
      }
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        <h2
          className="main-heading"
          style={{
            margin: 0,
            fontSize: '14px',
            whiteSpace: 'nowrap',
          }}
        >
          LOCK YOUR PATCH — {game.name.toUpperCase()}
        </h2>
      </div>

      {/* Platform toggle (only when game has platforms) */}
      {game.platforms && game.platforms.length > 1 && (
        <div
          style={{
            padding: '12px 16px 8px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            flexShrink: 0,
          }}
        >
          <div
            className="platform-selector"
            style={{
              display: 'flex',
              gap: '4px',
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderRadius: '6px',
              padding: '3px',
            }}
          >
            {game.platforms.map((platform) => {
              const isActive = activePlatform === platform
              return (
                <button
                  key={platform}
                  className={`platform-btn${isActive ? ' active' : ''}`}
                  onClick={() => handlePlatformSwitch(platform)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: isActive ? '#e8a020' : 'transparent',
                    color: isActive ? '#0a0b0f' : 'rgba(255,255,255,0.5)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-rajdhani), sans-serif',
                    letterSpacing: '0.05em',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {platform}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Version list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
        {versions.map((version) => {
          const isSelected = selected?.id === version.id
          const isHovered = hoverVersion === version.id
          return (
            <button
              key={version.id}
              className={`version-item${isSelected ? ' selected' : ''}`}
              onClick={() => handleVersionClick(version)}
              onMouseEnter={() => setHoverVersion(version.id)}
              onMouseLeave={() => setHoverVersion(null)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '12px 24px',
                backgroundColor: isSelected
                  ? 'rgba(232,160,32,0.08)'
                  : isHovered
                  ? 'rgba(255,255,255,0.03)'
                  : 'transparent',
                border: 'none',
                borderLeft: `3px solid ${isSelected ? '#e8a020' : 'transparent'}`,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: isSelected ? '#e8a020' : '#d0d8e4',
                    fontWeight: isSelected ? 500 : 400,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {version.label}
                </p>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#4a5568',
                    flexShrink: 0,
                    fontFamily: 'var(--font-rajdhani), sans-serif',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {version.date}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* CTA */}
      <div
        style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        <button
          disabled={!selected}
          onClick={handleFindSquad}
          onMouseEnter={() => setHoverBtn(true)}
          onMouseLeave={() => setHoverBtn(false)}
          style={{
            width: '100%',
            padding: '13px 20px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: !selected
              ? 'rgba(255,255,255,0.04)'
              : hoverBtn
              ? '#f0b030'
              : '#e8a020',
            color: !selected ? '#4a5568' : '#0a0b0f',
            fontSize: '14px',
            fontWeight: 600,
            cursor: selected ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font-rajdhani), sans-serif',
            letterSpacing: '0.05em',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          {selected ? 'Find My Squad →' : 'Select a version first'}
        </button>
      </div>
    </div>
  )
}
