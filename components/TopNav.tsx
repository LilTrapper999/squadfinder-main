'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import HeaderActions from '@/components/ui/HeaderActions'
import LogoMark from '@/components/ui/LogoMark'

/**
 * Global top navigation bar, rendered by the root layout on pages that don't draw their own top
 * bar (settings, notifications and the public legal pages). select-game, build-profile and
 * squad-matches render HeaderActions in theirs; the login page has no nav at all. The wordmark
 * links to the game list (signed in) or the login page (public pages).
 */
export default function TopNav() {
  const pathname = usePathname()

  // Pages with their own top bar draw their own controls, so this one would be a duplicate.
  const OWN_TOP_BAR = ['/', '/select-game', '/build-profile', '/squad-matches', '/maintenance']
  if (OWN_TOP_BAR.includes(pathname)) return null

  // Legal pages are readable without an account, so a sign-out button there would be noise —
  // and /reset-password is reached from an email link, mid-recovery.
  const PUBLIC_PAGES = ['/privacy', '/terms', '/reset-password']

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
      <Link
        href={PUBLIC_PAGES.includes(pathname) ? '/' : '/select-game'}
        style={{
          fontFamily: 'var(--font-rajdhani), sans-serif',
          fontSize: '16px',
          fontWeight: 700,
          color: '#e8a020',
          letterSpacing: '0.05em',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <LogoMark size={26} />
        <span>SQUADFINDER</span>
      </Link>

      <HeaderActions showSignOut={!PUBLIC_PAGES.includes(pathname)} />
    </div>
  )
}
