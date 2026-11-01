import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'
// The edge build of the image renderer loads its font without Node file URLs, which the Node build
// cannot resolve when these routes are prerendered; edge routes are rendered on request instead.
export const runtime = 'edge'

/** Home-screen icon: the logo's crosshair and SF monogram on the dark tile (iOS adds its own rounding). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#12141c',
        }}
      >
        <div
          style={{
            width: 132,
            height: 132,
            borderRadius: 66,
            border: '8px solid #ff7a52',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: 62,
            fontWeight: 900,
            letterSpacing: -2,
          }}
        >
          SF
        </div>
      </div>
    ),
    size,
  )
}
