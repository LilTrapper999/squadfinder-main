'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { Game, GameVersion, ProfileAnswers, Ally, OutboundRequest, SquadRequest } from '@/lib/types'
import { gameKey } from '@/lib/profileAnswers'
import { supabase } from '@/lib/supabase/client'
import {
  acceptRequest, blockAllyRpc, declineAndBlockRequest, declineRequest, fetchAllies,
  fetchPendingRequests, heartbeat, removeAllyRpc, setAllyPinned, unblockRpc,
} from '@/lib/db/requests'
import { fetchOutboundRequests, sendSquadRequest, withdrawSquadRequest } from '@/lib/db/discovery'
import { gameIdForSlug } from '@/lib/db/games'
import { loadProfileAnswers, saveProfile } from '@/lib/db/profiles'
import { fetchShowOnlinePlayers, saveShowOnlinePlayers } from '@/lib/db/settings'
import { RpcErrorCode, toRpcError } from '@/lib/db/rpc'

interface AppContextValue {
  // Game selection
  selectedGame: Game | null
  selectedVersion: GameVersion | null
  isReturningUser: boolean
  profileAnswers: ProfileAnswers
  setSelectedGame: (game: Game | null) => void
  setSelectedVersion: (version: GameVersion | null) => void
  updateProfileAnswer: (key: string, value: string | string[] | number | Record<string, unknown>) => void

  // Allies and requests
  allies: Ally[]
  removeAlly: (id: string) => void
  /** Favourite — pinned allies sort to the top of every allies list */
  toggleAllyPinned: (id: string) => void
  /** Dislike/block — keeps the ally on the list (so you remember) but marks them blocked */
  toggleAllyBlocked: (id: string) => void
  /** Squad requests sent *to* the user — the bell badge count and /notifications list */
  squadRequests: SquadRequest[]
  acceptSquadRequest: (id: string) => void
  declineSquadRequest: (id: string) => void
  declineAndBlockSquadRequest: (id: string) => void
  /** Squad requests the user has sent; follows get_my_outbound_requests() */
  outboundRequests: OutboundRequest[]
  refreshOutbound: () => Promise<void>
  /** Clears the error and re-reads requests, allies and outbound requests (the banner's Retry). */
  reloadAll: () => Promise<void>
  /** Sends a request to an anonymous candidate. Throws an RpcError the caller can show. */
  sendRequest: (matchRef: string) => Promise<void>
  withdrawRequest: (requestId: string) => Promise<void>

  /** Supabase user id; null while signed out. */
  userId: string | null
  /** False until the first session lookup finishes (guards must not redirect before then). */
  authReady: boolean
  /** Last error from a request/ally action that talks to the database (shown as a banner on /notifications and /squad-matches) */
  requestError: RpcErrorCode | null
  clearRequestError: () => void
  /** Saves the answers for the selected game to the database. Throws on failure. */
  saveMyProfile: () => Promise<void>

  /** users.show_online_players — also list players who are online but not searching */
  showOnlinePlayers: boolean
  setShowOnlinePlayers: (v: boolean) => Promise<void>

  /** Bumps whenever a new squad request arrives in real time; drives the toast. */
  newRequestSignal: number
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<GameVersion | null>(null)
  const [isReturningUser, setIsReturningUser] = useState(false)
  const [profileAnswers, setProfileAnswers] = useState<ProfileAnswers>({})

  const [allies, setAllies] = useState<Ally[]>([])
  const [squadRequests, setSquadRequests] = useState<SquadRequest[]>([])
  const [outboundRequests, setOutboundRequests] = useState<OutboundRequest[]>([])
  const [showOnlinePlayers, setShowOnlineState] = useState(false)
  const [newRequestSignal, setNewRequestSignal] = useState(0)

  const [userId, setUserId] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [requestError, setRequestError] = useState<RpcErrorCode | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null)
      setAuthReady(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Nothing from one account may survive in memory into the next (sign-out, account switch,
  // revoked token). Runs on every change of userId, including the first sign-in.
  const lastUser = useRef<string | null>(null)
  useEffect(() => {
    if (lastUser.current === userId) return
    lastUser.current = userId
    setProfileAnswers({})
    setSelectedGame(null)
    setSelectedVersion(null)
    setIsReturningUser(false)
    setAllies([])
    setSquadRequests([])
    setOutboundRequests([])
    setShowOnlineState(false)
    setRequestError(null)
  }, [userId])

  /** A dead session is a re-auth, not an error banner. */
  const handleError = useCallback((e: unknown): RpcErrorCode => {
    const code = toRpcError(e).code
    if (code === 'not_authenticated') void supabase.auth.signOut({ scope: 'local' })
    return code
  }, [])

  const refreshRequests = useCallback(async () => {
    try {
      setSquadRequests(await fetchPendingRequests())
    } catch (e) {
      setRequestError(handleError(e))
    }
  }, [handleError])

  const refreshAllies = useCallback(async () => {
    try {
      setAllies(await fetchAllies())
    } catch (e) {
      setRequestError(handleError(e))
    }
  }, [handleError])

  const refreshOutbound = useCallback(async () => {
    try {
      setOutboundRequests(await fetchOutboundRequests())
    } catch (e) {
      setRequestError(handleError(e))
    }
  }, [handleError])

  const reloadAll = useCallback(async () => {
    setRequestError(null)
    await Promise.all([refreshRequests(), refreshAllies(), refreshOutbound()])
  }, [refreshRequests, refreshAllies, refreshOutbound])

  // On sign-in: restore the saved profile and load requests/allies.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    loadProfileAnswers(userId)
      .then(saved => {
        if (cancelled || !saved) return
        setProfileAnswers(prev => (Object.keys(prev).length > 0 ? prev : saved))
        setIsReturningUser(true)
      })
      .catch(e => { if (!cancelled) setRequestError(handleError(e)) })
    fetchShowOnlinePlayers(userId).then(v => { if (!cancelled) setShowOnlineState(v) }).catch(() => {})
    refreshRequests()
    refreshAllies()
    refreshOutbound()
    return () => { cancelled = true }
  }, [userId, refreshRequests, refreshAllies, refreshOutbound, handleError])

  // Presence heartbeat + live updates. The database broadcasts only {kind, request_id} to the
  // private topic user:<uid>; on any event we simply re-read. Polling is the safety net.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    const visible = () => document.visibilityState === 'visible'
    const beat = () => { if (visible()) heartbeat().catch(() => {}) }
    const reread = () => {
      if (visible()) { refreshRequests(); refreshAllies(); refreshOutbound() }
    }

    beat()
    const beatTimer = setInterval(beat, 45_000)
    const pollTimer = setInterval(reread, 60_000)
    const onVisible = () => { beat(); reread() }
    document.addEventListener('visibilitychange', onVisible)

    let channel: ReturnType<typeof supabase.channel> | null = null
    supabase.realtime.setAuth().then(() => {
      if (cancelled) return
      channel = supabase
        .channel(`user:${userId}`, { config: { private: true } })
        .on('broadcast', { event: 'request_received' }, () => {
          refreshRequests().then(() => setNewRequestSignal(n => n + 1))
        })
        .on('broadcast', { event: 'request_updated' }, () => {
          refreshRequests(); refreshAllies(); refreshOutbound()
        })
        .subscribe()
    })

    return () => {
      cancelled = true
      clearInterval(beatTimer)
      clearInterval(pollTimer)
      document.removeEventListener('visibilitychange', onVisible)
      if (channel) supabase.removeChannel(channel)
    }
  }, [userId, refreshRequests, refreshAllies, refreshOutbound])

  /** Runs a database action, surfaces its error, and re-reads so the UI always shows the truth. */
  async function runAction(action: () => Promise<void>) {
    setRequestError(null)
    try {
      await action()
    } catch (e) {
      setRequestError(handleError(e))
    }
    await Promise.all([refreshRequests(), refreshAllies(), refreshOutbound()])
  }

  async function saveMyProfile() {
    if (!userId || !selectedGame) return
    await saveProfile(userId, gameKey(selectedGame), profileAnswers)
  }

  function updateProfileAnswer(key: string, value: string | string[] | number | Record<string, unknown>) {
    setProfileAnswers(prev => ({ ...prev, [key]: value }))
  }

  function removeAlly(id: string) {
    void runAction(() => removeAllyRpc(id))
  }

  function toggleAllyPinned(id: string) {
    const ally = allies.find(a => a.id === id)
    if (!ally) return
    setAllies(prev => prev.map(a => a.id === id ? { ...a, pinned: !a.pinned } : a))
    void runAction(() => setAllyPinned(id, !ally.pinned))
  }

  // Blocking keeps the ally record — un-allying them would let them request you again with
  // nothing to remind you why you said no last time.
  function toggleAllyBlocked(id: string) {
    const ally = allies.find(a => a.id === id)
    if (ally) void runAction(() => (ally.blockId ? unblockRpc(ally.blockId) : blockAllyRpc(id)))
  }

  function acceptSquadRequest(id: string) {
    // The database computes the score and creates both ally rows.
    void runAction(() => acceptRequest(id))
  }

  function declineSquadRequest(id: string) {
    void runAction(() => declineRequest(id))
  }

  function declineAndBlockSquadRequest(id: string) {
    void runAction(() => declineAndBlockRequest(id))
  }

  async function sendRequest(matchRef: string) {
    if (!selectedGame) throw toRpcError(new Error('This player is no longer available'))
    try {
      const gameId = await gameIdForSlug(selectedGame.id)
      await sendSquadRequest(gameId, matchRef)
    } catch (e) {
      throw toRpcError(e)
    } finally {
      await refreshOutbound()
    }
  }

  async function withdrawRequest(requestId: string) {
    try {
      await withdrawSquadRequest(requestId)
    } catch (e) {
      throw toRpcError(e)
    } finally {
      await refreshOutbound()
    }
  }

  async function setShowOnlinePlayers(v: boolean) {
    if (!userId) return
    const previous = showOnlinePlayers
    setShowOnlineState(v)
    try {
      await saveShowOnlinePlayers(userId, v)
    } catch (e) {
      setShowOnlineState(previous)
      throw toRpcError(e)
    }
  }

  return (
    <AppContext.Provider value={{
      selectedGame,
      selectedVersion,
      isReturningUser,
      profileAnswers,
      setSelectedGame,
      setSelectedVersion,
      updateProfileAnswer,
      allies,
      removeAlly,
      toggleAllyPinned,
      toggleAllyBlocked,
      squadRequests,
      acceptSquadRequest,
      declineSquadRequest,
      declineAndBlockSquadRequest,
      outboundRequests,
      refreshOutbound,
      reloadAll,
      sendRequest,
      withdrawRequest,
      userId,
      authReady,
      requestError,
      clearRequestError: () => setRequestError(null),
      saveMyProfile,
      showOnlinePlayers,
      setShowOnlinePlayers,
      newRequestSignal,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
