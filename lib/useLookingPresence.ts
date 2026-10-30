'use client'

import { useEffect, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

/**
 * Live "who is looking for a team right now" counts, built on Supabase Realtime presence.
 *
 * Presence is ephemeral by design: it exists only while a browser tab is connected and vanishes
 * when it closes, so there is nothing to clean up and no stale "searching" rows. Every client
 * joins one shared channel; players on /squad-matches track which game they're searching, and
 * the catalogue page just listens.
 */
const CHANNEL = 'lfg-presence'

interface LookingState {
  gameId: string
}

function countByGame(channel: RealtimeChannel): Record<string, number> {
  const counts: Record<string, number> = {}
  const state = channel.presenceState<LookingState>()
  for (const presences of Object.values(state)) {
    // One entry per connected tab. De-dupe per presence key so a user with two tabs on the
    // same game still counts once.
    const seen = new Set<string>()
    for (const p of presences) {
      if (p.gameId && !seen.has(p.gameId)) {
        seen.add(p.gameId)
        counts[p.gameId] = (counts[p.gameId] ?? 0) + 1
      }
    }
  }
  return counts
}

/** Read-only: game id → number of players currently looking for a team in that game. */
export function useLookingCounts(): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    const channel = supabase.channel(CHANNEL)
    const sync = () => setCounts(countByGame(channel))
    channel.on('presence', { event: 'sync' }, sync).subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return counts
}

/** Mark the current user as looking for a team in `gameId` for as long as the caller is mounted. */
export function useAnnounceLooking(gameId: string | null) {
  useEffect(() => {
    if (!gameId) return
    const channel = supabase.channel(CHANNEL)
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') channel.track({ gameId } satisfies LookingState)
    })
    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId])
}
