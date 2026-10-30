'use client'

import { useState } from 'react'
import { Game } from '@/lib/types'
import { useT } from '@/context/I18nContext'

interface WelcomeBannerProps {
  game: Game | null
  /** The line under the heading — the only thing that differs between pages */
  subtext: React.ReactNode
}

/**
 * The "Welcome, Commander" letterbox. Shared so /build-profile and /squad-matches stay
 * identical — the selected game is shown as its catalogue logo rather than spelled out.
 */
export default function WelcomeBanner({ game, subtext }: WelcomeBannerProps) {
  const { t } = useT()
  const [imgError, setImgError] = useState(false)
  const showLogo = !!game?.logoUrl && !imgError

  return (
    <div
      style={{
        padding: '20px 24px',
        backgroundColor: 'rgba(232,160,32,0.05)',
        border: '1px solid rgba(232,160,32,0.15)',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
      }}
    >
      {/* Game logo — same asset as the select-game tile */}
      {game && (
        <div
          style={{
            flexShrink: 0,
            width: '132px',
            height: '62px',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#0a0b0f',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {showLogo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={game.logoUrl}
              alt={game.name}
              onError={() => setImgError(true)}
              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px', display: 'block' }}
            />
          ) : (
            <span
              style={{
                fontFamily: 'var(--font-rajdhani), sans-serif',
                fontSize: '11px',
                fontWeight: 700,
                color: '#e8a020',
                textAlign: 'center',
                padding: '4px',
                lineHeight: 1.2,
              }}
            >
              {game.name}
            </span>
          )}
        </div>
      )}

      <div style={{ minWidth: 0 }}>
        <p
          style={{
            margin: '0 0 8px',
            fontSize: '24px',
            fontWeight: 600,
            color: '#ffffff',
            fontFamily: 'var(--font-rajdhani), sans-serif',
          }}
        >
          {t('Welcome, Commander')}
        </p>
        <p style={{ margin: 0, fontSize: '13px', color: '#8b95a5', lineHeight: 1.5 }}>
          {subtext}
        </p>
      </div>
    </div>
  )
}
