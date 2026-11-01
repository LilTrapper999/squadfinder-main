import type { Metadata } from 'next'
import LogoMark from '@/components/ui/LogoMark'
import T from '@/components/ui/T'

export const metadata: Metadata = { title: 'Back soon', robots: { index: false, follow: false } }

/** Shown for every page while NEXT_PUBLIC_MAINTENANCE_MODE=true (see middleware.ts). Static, no data. */
export default function MaintenancePage() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '24px', textAlign: 'center', color: '#ffffff' }}>
      <LogoMark size={56} />
      <h1 style={{ margin: 0, fontFamily: 'var(--font-rajdhani), sans-serif', fontSize: '32px' }}>
        <T>We&apos;ll be right back</T>
      </h1>
      <p style={{ margin: 0, maxWidth: '420px', lineHeight: 1.6, color: 'rgba(255,255,255,0.75)' }}>
        <T>SquadFinder is down for a short maintenance break. Please check back soon.</T>
      </p>
    </div>
  )
}
