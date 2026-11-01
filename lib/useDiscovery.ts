'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { findSquadMatches, startSearching, stopSearching } from '@/lib/db/discovery'
import { gameIdForSlug } from '@/lib/db/games'
import { RpcErrorCode, toRpcError } from '@/lib/db/rpc'
import type { MatchCandidate } from '@/lib/types'

export type DiscoveryState =
  | { kind: 'loading' }
  | { kind: 'ready'; matches: MatchCandidate[] }
  | { kind: 'error'; code: RpcErrorCode }

const REFRESH_MS = 20_000
// The RPC allows 20 calls a minute; after a rate-limit error wait out most of the window.
const BACKOFF_MS = 45_000

/**
 * Marks the user as searching `slug` while the caller is mounted and keeps the candidate list
 * fresh: a 20 s timer while the tab is visible, plus an immediate reload when it becomes visible.
 * `reload` forces a refresh (the Retry button).
 */
export function useDiscovery(slug: string | null, gameKey: string, includeOnline: boolean, enabled: boolean) {
  const [state, setState] = useState<DiscoveryState>({ kind: 'loading' })
  const gameId = useRef<string | null>(null)
  const backoffUntil = useRef(0)
  const alive = useRef(true)
  const [nonce, setNonce] = useState(0)

  const load = useCallback(async () => {
    if (!gameId.current) return
    if (Date.now() < backoffUntil.current) return
    try {
      const matches = await findSquadMatches(gameId.current, gameKey, includeOnline)
      if (alive.current) setState({ kind: 'ready', matches })
    } catch (e) {
      const code = toRpcError(e).code
      if (code === 'rate_limited') backoffUntil.current = Date.now() + BACKOFF_MS
      if (alive.current) setState({ kind: 'error', code })
    }
  }, [gameKey, includeOnline])

  useEffect(() => {
    if (!slug || !enabled) return
    alive.current = true
    let timer: ReturnType<typeof setInterval> | undefined
    const visible = () => document.visibilityState === 'visible'

    async function begin() {
      try {
        gameId.current = await gameIdForSlug(slug as string)
        await startSearching(gameId.current)
        await load()
      } catch (e) {
        if (alive.current) setState({ kind: 'error', code: toRpcError(e).code })
        return
      }
      timer = setInterval(() => { if (visible()) void load() }, REFRESH_MS)
    }
    void begin()

    const onVisible = () => {
      if (!visible() || !gameId.current) return
      // A heartbeat may have lapsed while hidden; start_searching is idempotent and revives presence.
      startSearching(gameId.current).then(load).catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      alive.current = false
      if (timer) clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      stopSearching().catch(() => {})
    }
  }, [slug, enabled, load, nonce])

  const reload = useCallback(() => {
    backoffUntil.current = 0
    setState({ kind: 'loading' })
    setNonce((n) => n + 1) // restarts the effect: start_searching again, then a fresh load
  }, [])

  return { state, reload }
}
