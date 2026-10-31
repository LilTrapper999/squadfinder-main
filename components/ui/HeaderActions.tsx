'use client'

import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import NotificationBell from '@/components/ui/NotificationBell'
import SignOutButton from '@/components/ui/SignOutButton'

/**
 * Language switcher + notifications bell + sign out — the controls every signed-in page carries
 * top-right. Public pages that can be read while signed out pass showSignOut={false}.
 */
export default function HeaderActions({ showSignOut = true }: { showSignOut?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexShrink: 0 }}>
      <LanguageSwitcher />
      <NotificationBell />
      {showSignOut && <SignOutButton />}
    </div>
  )
}
