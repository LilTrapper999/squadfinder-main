'use client'

import { useEffect } from 'react'

/**
 * Last resort: the root layout itself failed, so no providers or translations exist here.
 * Plain English and inline styles only.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('global error', error.digest ?? 'no-digest')
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0b0f', color: '#ffffff', fontFamily: 'system-ui, sans-serif' }}>
        <div role="alert" style={{ textAlign: 'center', padding: '24px' }}>
          <h1 style={{ margin: '0 0 12px' }}>Something went wrong</h1>
          <p style={{ margin: '0 0 18px', color: 'rgba(255,255,255,0.75)' }}>Please try again in a moment.</p>
          <button
            type="button"
            onClick={reset}
            style={{ minHeight: '44px', padding: '0 22px', borderRadius: '6px', border: 'none', backgroundColor: '#e8a020', color: '#0a0b0f', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
