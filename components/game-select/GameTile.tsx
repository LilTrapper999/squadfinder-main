'use client'

import { useState } from 'react'
import { Game } from '@/lib/types'
import { useT } from '@/context/I18nContext'

interface GameTileProps {
  game: Game
  selected: boolean
  onSelect: () => void
  /** How many players are currently looking for a team in this game */
  lookingCount?: number
}

export default function GameTile({ game, selected, onSelect, lookingCount = 0 }: GameTileProps) {
  const { t } = useT()
  const [hovered, setHovered] = useState(false)
  const [imgError, setImgError] = useState(false)

  const showImg = !!game.logoUrl && !imgError

  return (
    <button
      id={`game-tile-${game.id}`}
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

      {/* Players currently looking for a team in this game (live presence count) */}
      <div
        title={t('{count} looking for a team', { count: lookingCount })}
        style={{
          position: 'absolute',
          top: '6px',
          left: '6px',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 6px',
          borderRadius: '10px',
          backgroundColor: 'rgba(10,11,15,0.75)',
          border: `1px solid ${lookingCount > 0 ? 'rgba(34,197,94,0.45)' : 'rgba(255,255,255,0.12)'}`,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: lookingCount > 0 ? '#22c55e' : '#8b95a5',
            boxShadow: lookingCount > 0 ? '0 0 5px rgba(34,197,94,0.8)' : 'none',
          }}
        />
        <span
          className="sub-heading"
          style={{
            fontSize: '10px',
            fontWeight: 700,
            color: lookingCount > 0 ? '#22c55e' : 'rgba(255,255,255,0.62)',
          }}
        >
          {lookingCount}
        </span>
      </div>

      {/* Mobile badge — distinguishes separate mobile catalogue entries (SPEC_AMENDMENT_11 FIX 4) */}
      {game.platform === 'Mobile' && (
        <div
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'rgba(10,11,15,0.75)',
            border: '1px solid rgba(232,160,32,0.4)',
          }}
        >
          <span style={{ fontSize: '9px' }}>📱</span>
          <span
            className="sub-heading"
            style={{
              fontSize: '8px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: '#e8a020',
            }}
          >
            {t('MOBILE')}
          </span>
        </div>
      )}

      {/* Logo image — top 70% */}
      <div style={{ flex: '0 0 70%', position: 'relative', overflow: 'hidden' }}>
        {showImg ? (
          // A plain <img> on purpose: logos are hot-linked from many publisher/Steam CDNs, and routing
          // them through next/image would need an allow-list of every host plus Vercel image quota.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="game-tile-image"
            src={game.logoUrl}
            alt=""
            width={184}
            height={129}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
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
            fontSize: '10px',
            textAlign: 'center',
            lineHeight: 1.25,
            letterSpacing: '0.02em',
            transition: 'color 0.15s',
            color: selected ? '#e8a020' : undefined,
            // Version info is now baked into the name (e.g. "Game: Patch 1.0 — Mode"), so
            // names run much longer — clamp instead of letting them overflow the tile.
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {game.name}{' '}
          <sup className="game-tile-mark" style={{ fontSize: '8px', color: 'rgba(255,255,255,0.62)', fontWeight: 400 }}>
            {game.mark}
          </sup>
        </p>
      </div>
    </button>
  )
}
