'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { useT } from '@/context/I18nContext'

/**
 * Wraps every page that needs an account. Until the first session lookup finishes it renders a
 * neutral splash (no flash of protected UI); with no session it sends the visitor to the login
 * page. The database is the real gate — this only avoids empty, broken-looking pages.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { t } = useT()
  const { authReady, userId } = useApp()

  useEffect(() => {
    if (authReady && !userId) router.replace('/')
  }, [authReady, userId, router])

  if (!authReady || !userId) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.62)', fontSize: '14px' }}
      >
        {t('Loading…')}
      </div>
    )
  }
  return <>{children}</>
}
