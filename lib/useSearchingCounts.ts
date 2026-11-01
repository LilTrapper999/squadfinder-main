'use client'

import { useEffect, useState } from 'react'
import { countSearchingByGame } from '@/lib/db/discovery'
import { gameIdsBySlug } from '@/lib/db/games'

const REFRESH_MS = 40_000

/**
 * "N searching" per game tile: slug → number of players searching that tile right now.
 * One count_searching_by_game() call per refresh, only while the tab is visible and signed in.
 * A failure leaves the previous numbers (the tiles simply show no badge).
 */
export function useSearchingCounts(enabled: boolean): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!enabled) return
    let alive = true

    async function load() {
      if (document.visibilityState !== 'visible') return
      try {
        const [byId, slugs] = await Promise.all([countSearchingByGame(), gameIdsBySlug()])
        const bySlug: Record<string, number> = {}
        slugs.forEach((id, slug) => { if (byId[id]) bySlug[slug] = byId[id] })
        if (alive) setCounts(bySlug)
      } catch {
        // Counts are decoration; keep whatever we had.
      }
    }

    void load()
    const timer = setInterval(load, REFRESH_MS)
    const onVisible = () => void load()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled])

  return counts
}
