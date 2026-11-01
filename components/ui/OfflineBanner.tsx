'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/context/I18nContext'

/** A thin strip that appears while the browser reports no connection. */
export default function OfflineBanner() {
  const { t } = useT()
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  return (
    <div role="status" aria-live="polite">
      {offline && (
        <div style={{ backgroundColor: '#7f1d1d', color: '#ffffff', textAlign: 'center', fontSize: '13px', padding: '6px 12px' }}>
          {t("You seem to be offline. Check your connection and try again.")}
        </div>
      )}
    </div>
  )
}
