'use client'

import { useState } from 'react'
import { Game } from '@/lib/types'

interface GameTileProps {
  game: Game
  selected: boolean
  onSelect: () => void
}

export default function GameTile({ game, selected, onSelect }: GameTileProps) {
  const [hovered, setHovered] = useState(false)
  const [imgError, setImgError] = useState(false)

  const showImg = !!game.logoUrl && !imgError

  return (
    <button
      className={`game-tile${selected ? ' selected' : ''}`}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        aspectRatio: '1 / 1',
        backgroundColor: '#1a1d26',
        border: `${selected ? '2px' : '1px'} solid ${
          selected
            ? '#e8a020'
            : hovered
            ? 'rgba(232,160,32,0.4)'
            : 'rgba(255,255,255,0.08)'
        }`,
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        padding: 0,
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        boxShadow: selected
          ? 'inset 0 0 20px rgba(232,160,32,0.06)'
          : 'none',
      }}
    >
      {/* Selected overlay */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(232,160,32,0.15)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}

      {/* Logo image — top 70% */}
      <div style={{ flex: '0 0 70%', position: 'relative', overflow: 'hidden' }}>
        {showImg ? (
          <img
            className="game-tile-image"
            src={game.logoUrl}
            alt={game.name}
            onError={() => setImgError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'center',
              display: 'block',
              background: '#0a0b0f',
              padding: '8px',
              filter: hovered ? 'brightness(1.1)' : 'brightness(1)',
              transition: 'filter 0.15s ease',
            }}
          />
        ) : (
          /* Placeholder when no image */
          <div
            style={{
              width: '100%',
              height: '100%',
              background: '#1a1d26',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-rajdhani), sans-serif',
              fontWeight: 700,
              fontSize: '14px',
              color: 'rgba(255,255,255,0.6)',
              textAlign: 'center',
              padding: '8px',
            }}
          >
            {game.name}
          </div>
        )}
      </div>

      {/* Name + mark — bottom 30% */}
      <div
        style={{
          flex: '0 0 30%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px 6px',
          backgroundColor: selected ? 'rgba(232,160,32,0.06)' : 'rgba(0,0,0,0.3)',
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <p
          className="sub-heading game-tile-name"
          style={{
            margin: 0,
            fontSize: '11px',
            textAlign: 'center',
            lineHeight: 1.2,
            letterSpacing: '0.03em',
            transition: 'color 0.15s',
            color: selected ? '#e8a020' : undefined,
          }}
        >
          {game.name}{' '}
          <sup className="game-tile-mark" style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>
            {game.mark}
          </sup>
        </p>
      </div>
    </button>
  )
}
