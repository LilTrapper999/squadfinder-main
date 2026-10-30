'use client'

import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import NotificationBell from '@/components/ui/NotificationBell'

/** Language switcher + notifications bell — the controls every signed-in page carries top-right. */
export default function HeaderActions() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexShrink: 0 }}>
      <LanguageSwitcher />
      <NotificationBell />
    </div>
  )
}
