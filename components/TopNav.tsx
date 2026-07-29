'use client'

import { usePathname } from 'next/navigation'
import NotificationBell from '@/components/ui/NotificationBell'

/**
 * Global top navigation bar — rendered by root layout on every page.
 * Per SPEC_AMENDMENT_02 FIX 2:
 *   - Settings icon (top-left, not clickable) — hidden on '/' (login)
 *
 * The old Home button is gone with the homepage; each page carries its own back control.
 * The notifications bell is here for pages that don't draw their own top bar (chat), while
 * select-game, build-profile and squad-matches render it in theirs. The login page has no
 * nav at all — there's no account yet.
 */
export default function TopNav() {
  const pathname = usePathname()

  // Pages with their own top bar draw their own bell, so this one would be a duplicate.
  const OWN_TOP_BAR = ['/', '/select-game', '/build-profile', '/squad-matches']
  if (OWN_TOP_BAR.includes(pathname)) return null

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

      <NotificationBell />
    </div>
  )
}
