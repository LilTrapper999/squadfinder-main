import { ImageResponse } from 'next/og'

export const alt = 'SquadFinder: find your perfect gaming squad'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
// The edge build of the image renderer loads its font without Node file URLs, which the Node build
// cannot resolve when these routes are prerendered; edge routes are rendered on request instead.
export const runtime = 'edge'

/** The card shown when a link to the site is shared. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 56,
          background: '#0a0b0f',
          color: '#ffffff',
        }}
      >
        <div
          style={{
            width: 260,
            height: 260,
            borderRadius: 130,
            border: '16px solid #ff7a52',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 120,
            fontWeight: 900,
            letterSpacing: -4,
          }}
        >
          SF
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 88, fontWeight: 800, color: '#e8a020', letterSpacing: 4 }}>SQUADFINDER</div>
          <div style={{ fontSize: 40, marginTop: 8, color: 'rgba(255,255,255,0.85)' }}>Find your perfect gaming squad</div>
        </div>
      </div>
    ),
    size,
  )
}
