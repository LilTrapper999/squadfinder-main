'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'

export default function LoginCard() {
  const router = useRouter()
  const { isReturningUser, setIsReturningUser } = useApp()
  const [rememberMe, setRememberMe] = useState(false)
  const [hoveredGoogle, setHoveredGoogle] = useState(false)
  const [hoveredSkip, setHoveredSkip] = useState(false)

  // Both new and returning users start at select-game — isReturningUser only changes what
  // happens *after* a game is picked (skip build-profile straight to squad-matches or not).
  // Demo only — replace with real OAuth + DB user lookup in Phase 2
  function handleGoogleClick() {
    router.push('/select-game')
  }

  function handleDevSkip() {
    // Dev bypass — skips auth entirely, goes straight to the app
    router.push('/select-game')
  }

  return (
    <div
      className="login-card"
      style={{
        backgroundColor: '#111318',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: 'clamp(28px, 6vw, 48px) clamp(20px, 5vw, 40px)',
        width: '100%',
        maxWidth: '420px',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* Wordmark */}
      <div
        style={{
          fontFamily: 'var(--font-rajdhani), sans-serif',
          fontSize: '28px',
          fontWeight: 700,
          color: '#e8a020',
          letterSpacing: '0.05em',
          marginBottom: '32px',
        }}
      >
        SQUADFINDER
      </div>

      {/* Heading */}
      <h1
        className="main-heading"
        style={{
          fontSize: '32px',
          margin: '0 0 10px 0',
          lineHeight: 1.2,
        }}
      >
        FIND YOUR SQUAD
      </h1>

      {/* Subheading */}
      <p
        className="sub-heading"
        style={{
          fontSize: '15px',
          margin: '0 0 36px 0',
          lineHeight: 1.5,
        }}
      >
        Connect with players who match your style, game, and version.
      </p>

      {/* Google button */}
      <button
        onClick={handleGoogleClick}
        onMouseEnter={() => setHoveredGoogle(true)}
        onMouseLeave={() => setHoveredGoogle(false)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '14px 20px',
          backgroundColor: hoveredGoogle ? 'rgba(232,160,32,0.08)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${hoveredGoogle ? '#e8a020' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          fontFamily: 'inherit',
          marginBottom: '20px',
        }}
      >
        {/* Google G SVG */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        <span style={{ fontSize: '15px', fontWeight: 500, color: '#ffffff' }}>
          Continue with Google
        </span>
      </button>

      {/* Dev bypass — skip OAuth */}
      <button
        onClick={handleDevSkip}
        onMouseEnter={() => setHoveredSkip(true)}
        onMouseLeave={() => setHoveredSkip(false)}
        style={{
          width: '100%',
          padding: '11px 20px',
          backgroundColor: 'transparent',
          border: `1px solid ${hoveredSkip ? 'rgba(232,160,32,0.4)' : 'rgba(255,255,255,0.06)'}`,
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          fontFamily: 'var(--font-rajdhani), sans-serif',
          fontWeight: 700,
          fontSize: '13px',
          letterSpacing: '0.06em',
          color: hoveredSkip ? '#e8a020' : 'rgba(255,255,255,0.3)',
          textTransform: 'uppercase',
          marginBottom: '20px',
        }}
      >
        ⚡ Enter Without Login (Dev)
      </button>

      {/* Remember me */}
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
          marginBottom: '28px',
        }}
      >
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={() => setRememberMe(!rememberMe)}
          style={{ accentColor: '#e8a020', width: '16px', height: '16px', cursor: 'pointer' }}
        />
        <span style={{ fontSize: '14px', color: '#8b95a5' }}>Remember me</span>
      </label>

      {/* Divider */}
      <div
        style={{
          height: '1px',
          backgroundColor: 'rgba(255,255,255,0.06)',
          marginBottom: '20px',
        }}
      />

      {/* Returning user toggle */}
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={isReturningUser}
          onChange={() => setIsReturningUser(!isReturningUser)}
          style={{ accentColor: '#e8a020', width: '16px', height: '16px', cursor: 'pointer' }}
        />
        <span style={{ fontSize: '13px', color: '#4a5568' }}>
          Returning user{' '}
          <span style={{ color: '#e8a020', fontSize: '11px' }}>(demo)</span>
        </span>
      </label>
    </div>
  )
}
