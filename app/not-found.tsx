import Link from 'next/link'
import type { Metadata } from 'next'
import T from '@/components/ui/T'

export const metadata: Metadata = { title: 'Page not found', robots: { index: false } }

export default function NotFound() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '24px', textAlign: 'center', color: '#ffffff' }}>
      <h1 style={{ margin: 0, fontFamily: 'var(--font-rajdhani), sans-serif', fontSize: '32px' }}><T>Page not found</T></h1>
      <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)' }}><T>That page doesn&apos;t exist, or it has moved.</T></p>
      <Link href="/" style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center', padding: '0 12px', color: '#e8a020' }}>
        <T>Back to start</T>
      </Link>
    </div>
  )
}
