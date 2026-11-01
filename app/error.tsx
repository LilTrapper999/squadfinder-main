'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useT } from '@/context/I18nContext'

/** Anything that throws while rendering a page lands here instead of a blank screen. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useT()

  useEffect(() => {
    // The digest ties this to the server log; the message itself may contain details, so it stays out.
    console.error('page error', error.digest ?? 'no-digest')
  }, [error])

  return (
    <div role="alert" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '24px', textAlign: 'center', color: '#ffffff' }}>
      <h1 style={{ margin: 0, fontFamily: 'var(--font-rajdhani), sans-serif', fontSize: '28px' }}>{t('Something went wrong')}</h1>
      <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', maxWidth: '420px' }}>{t('Something went wrong. Try again.')}</p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={reset}
          style={{ minHeight: '44px', padding: '0 22px', borderRadius: '6px', border: 'none', backgroundColor: '#e8a020', color: '#0a0b0f', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}
        >
          {t('Try again')}
        </button>
        <Link href="/" style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center', padding: '0 12px', color: '#e8a020' }}>
          {t('Back to start')}
        </Link>
      </div>
    </div>
  )
}
