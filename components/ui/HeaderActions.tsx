'use client'

import { useApp } from '@/context/AppContext'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import NotificationBell from '@/components/ui/NotificationBell'
import SettingsLink from '@/components/ui/SettingsLink'
import SignOutButton from '@/components/ui/SignOutButton'

/**
 * Language switcher + notifications bell + settings gear + sign out — the controls every signed-in
 * page carries top-right. Everything except the language switcher needs an account, so a signed-out
 * visitor (legal pages, a mistyped URL, a password-reset link) sees only the switcher. Public pages
 * that signed-in users also read pass showSignOut={false} to drop the settings gear and sign out.
 */
export default function HeaderActions({ showSignOut = true }: { showSignOut?: boolean }) {
  const { userId } = useApp()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexShrink: 0 }}>
      <LanguageSwitcher />
      {userId && <NotificationBell />}
      {userId && showSignOut && <SettingsLink />}
      {userId && showSignOut && <SignOutButton />}
    </div>
  )
}
