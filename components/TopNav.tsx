'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

/**
 * Global top navigation bar — rendered by root layout on every page.
 * Per SPEC_AMENDMENT_02 FIX 2:
 *   - Settings icon (top-left, not clickable) — hidden on '/' (login)
 *   - Home button (top-right, glows amber on hover) — hidden on '/' (login)
 */
export default function TopNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [hoverHome, setHoverHome] = useState(false)

  // Hide the entire nav on the login page
  if (pathname === '/') return null

  return (
    <div
      style={{
        height: '48px',
        backgroundColor: '#0a0b0f',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Settings icon — not clickable */}
      {/* Settings — not implemented in this phase */}
      <div
        style={{ cursor: 'default', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center' }}
        aria-hidden="true"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </div>

      {/* Home button — glows amber on hover, scales up */}
      <button
        onClick={() => router.push('/home')}
        onMouseEnter={() => setHoverHome(true)}
        onMouseLeave={() => setHoverHome(false)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: hoverHome ? '#e8a020' : 'rgba(255,255,255,0.6)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transform: hoverHome ? 'scale(1.15)' : 'scale(1)',
          filter: hoverHome ? 'drop-shadow(0 0 8px rgba(232,160,32,0.8))' : 'none',
          transition: 'all 0.2s ease',
          fontFamily: 'var(--font-rajdhani), sans-serif',
          fontWeight: 700,
          fontSize: '14px',
          letterSpacing: '0.06em',
          padding: 0,
        }}
        aria-label="Go to homepage"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        HOME
      </button>
    </div>
  )
}
