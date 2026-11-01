import T from '@/components/ui/T'

/** Shown while a route segment streams in. Neutral on purpose: it must never hint at account state. */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.62)', fontSize: '14px' }}>
      <T>Loading…</T>
    </div>
  )
}
