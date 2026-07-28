'use client'

import { useEffect, useState } from 'react'

// SSR-safe default — must match what the client's *first* render also uses (see below),
// otherwise React's hydration mismatch recovery silently keeps the server's stale desktop
// markup in the DOM: the effect's corrective setState becomes a same-value no-op (it already
// read the real width on that same first render) and never triggers the re-render that would
// actually patch the attributes.
const DESKTOP_DEFAULT = 1280

/**
 * Live viewport width, updated on resize. The codebase has no media-query
 * infrastructure (every layout is inline styles), so structural responsive
 * decisions — row vs. column stacking, grid column counts — are driven from
 * this instead.
 *
 * Always starts at the desktop default, even on the client, so the first client
 * render matches SSR exactly (no hydration mismatch) — the real width is applied
 * a moment later via the effect below, which is a genuine state transition and
 * therefore actually reaches the DOM.
 */
export function useWindowWidth(): number {
  const [width, setWidth] = useState<number>(DESKTOP_DEFAULT)

  useEffect(() => {
    function onResize() {
      setWidth(window.innerWidth)
    }
    window.addEventListener('resize', onResize)
    onResize()
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return width
}
