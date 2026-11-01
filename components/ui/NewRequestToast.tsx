'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { useT } from '@/context/I18nContext'

/**
 * Small toast shown when a squad request arrives in real time. Requests live 14 days and are
 * answered on /notifications, so this only points there; the bell badge is already live.
 */
export default function NewRequestToast() {
  const { t } = useT()
  const { newRequestSignal } = useApp()
  const [visibleFor, setVisibleFor] = useState(0)

  useEffect(() => {
    if (newRequestSignal === 0) return
    setVisibleFor(newRequestSignal)
    const timer = setTimeout(() => setVisibleFor(0), 8000)
    return () => clearTimeout(timer)
  }, [newRequestSignal])

  return (
    <div
      role="status"
      aria-live="polite"
      style={{ position: 'fixed', insetInlineEnd: '16px', bottom: '16px', zIndex: 50, maxWidth: 'calc(100vw - 32px)' }}
    >
      {visibleFor !== 0 && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px 16px', borderRadius: '10px',
            backgroundColor: '#1a1d26', border: '1px solid rgba(232,160,32,0.5)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)', color: '#ffffff', fontSize: '14px',
          }}
        >
          <span>{t('New squad request')}</span>
          <Link
            href="/notifications"
            onClick={() => setVisibleFor(0)}
            style={{ color: '#e8a020', fontWeight: 700, textDecoration: 'underline' }}
          >
            {t('View')}
          </Link>
          <button
            type="button"
            onClick={() => setVisibleFor(0)}
            aria-label={t('Dismiss')}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '16px', padding: '4px' }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
