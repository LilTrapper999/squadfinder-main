'use client'

import { useState } from 'react'
import { useT } from '@/context/I18nContext'
import { useWindowWidth } from '@/lib/useWindowWidth'
import { supabase } from '@/lib/supabase/client'

/**
 * Sign-out control carried in the header of every signed-in page, next to the language switcher
 * and the notifications bell. Ends the Supabase session, then does a full page load of the login
 * page so no game, profile or request state from the previous user survives in memory.
 */
export default function SignOutButton() {
  const { t } = useT()
  const width = useWindowWidth()
  const [hovered, setHovered] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      // "local" clears this browser's session without needing the network round trip to succeed.
      await supabase.auth.signOut({ scope: 'local' })
    } finally {
      window.location.assign('/')
    }
  }

  const active = hovered && !signingOut

  return (
    <button
      onClick={handleSignOut}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={signingOut}
      aria-label={t('Sign out')}
      title={t('Sign out')}
      style={{
        // Positioned like its header siblings so it paints above the pages' background layers.
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: signingOut ? 'wait' : 'pointer',
        flexShrink: 0,
        color: active ? '#e8a020' : 'rgba(255,255,255,0.6)',
        opacity: signingOut ? 0.6 : 1,
        fontSize: '12px',
        fontFamily: 'var(--font-rajdhani), sans-serif',
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        transition: 'color 0.15s ease, opacity 0.15s ease',
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          // Door-and-arrow icon: the whole glyph nudges outward on hover.
          transform: active ? 'translateX(2px)' : 'none',
          transition: 'transform 0.15s ease',
        }}
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      {width >= 560 && <span>{t('Sign out')}</span>}
    </button>
  )
}
