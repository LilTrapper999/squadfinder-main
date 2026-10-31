'use client'

import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react'
import { Game, GameVersion, ProfileAnswers, Ally, IncomingRequest, SquadRequest, AllyChat, ChatMessage } from '@/lib/types'
import { MOCK_SQUAD_REQUESTS, MOCK_BLOCKED_BY, findGameById } from '@/lib/mockData'
import { buildProfileFromAnswers, gameKey } from '@/lib/profileAnswers'
import { calculateMatch } from '@/lib/matching'
import { SHOW_DEV_FEATURES } from '@/lib/launch'
import { supabase } from '@/lib/supabase/client'
import {
  acceptRequest, blockAllyRpc, declineAndBlockRequest, declineRequest, fetchAllies,
  fetchPendingRequests, heartbeat, removeAllyRpc, setAllyPinned, unblockRpc,
} from '@/lib/db/requests'
import { loadProfileAnswers, saveProfile } from '@/lib/db/profiles'

interface AppContextValue {
  // Game selection
  selectedGame: Game | null
  selectedVersion: GameVersion | null
  isReturningUser: boolean
  profileAnswers: ProfileAnswers
  setSelectedGame: (game: Game | null) => void
  setSelectedVersion: (version: GameVersion | null) => void
  setIsReturningUser: (v: boolean) => void
  updateProfileAnswer: (key: string, value: string | string[] | number | Record<string, unknown>) => void

  // Squad / social state
  allies: Ally[]
  incomingRequests: IncomingRequest[]
  blockedUsers: string[]
  squadStatus: 'searching' | 'in-squad' | null
  addAlly: (ally: Ally) => void
  removeAlly: (id: string) => void
  /** Favourite — pinned allies sort to the top of every allies list */
  toggleAllyPinned: (id: string) => void
  /** Dislike/block — keeps the ally on the list (so you remember) but marks them blocked */
  toggleAllyBlocked: (id: string) => void
  pushIncomingRequest: (req: IncomingRequest) => void
  shiftIncomingRequest: () => void
  blockUser: (userId: string) => void
  setSquadStatus: (s: 'searching' | 'in-squad' | null) => void

  // Squad requests sent *to* the user — the bell badge count and /notifications list
  squadRequests: SquadRequest[]
  /** Accepting auto-allies, same as the incoming-request popup (SPEC_AMENDMENT_11 FIX 1) */
  acceptSquadRequest: (id: string) => void
  declineSquadRequest: (id: string) => void
  declineAndBlockSquadRequest: (id: string) => void
  /** Supabase user id when signed in; null for the dev bypass, which keeps the in-memory demo behaviour */
  userId: string | null
  /** Last error from a request/ally action that talks to the database (shown on /notifications) */
  requestError: string | null
  clearRequestError: () => void
  /** Saves the answers for the selected game to the database (no-op when not signed in). Throws on failure. */
  saveMyProfile: () => Promise<void>

  // FIX 1 — notification gate for showing in-game players
  // Prototype only — replace with real Web Notifications permission in Phase 2
  notificationsEnabled: boolean
  setNotificationsEnabled: (v: boolean) => void

  // FIX 2 — shared squad acceptance state (first-come-first-served)
  squadAccepted: boolean
  acceptedMatchId: string | null
  setSquadAccepted: (id: string) => void

  // Private ally chat (SPEC_AMENDMENT_11 FIX 2/3) — prototype: in-memory only
  chats: AllyChat[]
  getChat: (allyId: string) => AllyChat | undefined
  sendMessage: (allyId: string, content: string) => void
  toggleDisappearingMessages: (allyId: string) => void
  pruneExpiredMessages: (allyId: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<GameVersion | null>(null)
  const [isReturningUser, setIsReturningUserState] = useState(false)
  const [profileAnswers, setProfileAnswers] = useState<ProfileAnswers>({})

  // Social state
  const [allies, setAllies] = useState<Ally[]>([])
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([])
  const [blockedUsers, setBlockedUsers] = useState<string[]>([])
  const [squadStatus, setSquadStatus] = useState<'searching' | 'in-squad' | null>(null)

  // Requests sent to the user. A brand-new user starts empty on purpose — their account
  // doesn't exist yet, so nobody could have requested them. Returning users get the mock
  // backlog when they identify themselves at login.
  const [squadRequests, setSquadRequests] = useState<SquadRequest[]>([])

  function setIsReturningUser(v: boolean) {
    setIsReturningUserState(v)
    // Signed-in users' requests come from the database, never from the demo backlog.
    if (!userId) setSquadRequests(v ? MOCK_SQUAD_REQUESTS : [])
  }

  // Notification gate (FIX 1)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  // Squad acceptance (FIX 2)
  const [squadAccepted, setSquadAcceptedState] = useState(false)
  const [acceptedMatchId, setAcceptedMatchId] = useState<string | null>(null)

  // Private ally chat (SPEC_AMENDMENT_11 FIX 2/3)
  const [chats, setChats] = useState<AllyChat[]>([])

  // ── Real data (SPEC_DB_CHANGES.md) ─────────────────────────────────────────
  // Signed in with Supabase: requests, allies and the saved profile come from the database.
  // Dev bypass / signed out: everything below stays inert and the in-memory demo behaves as before.
  const [userId, setUserId] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)

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

  // Demo notifications: when running on localhost without a session, start with the mock requests
  // already waiting so the bell and /notifications can be shown. Client-side only, never deployed.
  useEffect(() => {
    if (!SHOW_DEV_FEATURES || !authReady || userId) return
    if (['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) {
      setSquadRequests(MOCK_SQUAD_REQUESTS)
    }
  }, [authReady, userId])

  const refreshRequests = useCallback(async () => {
    try {
      setSquadRequests(await fetchPendingRequests())
    } catch (e) {
      console.error('[squad requests] load failed', e)
    }
  }, [])

  const refreshAllies = useCallback(async () => {
    try {
      const fetched = await fetchAllies()
      setAllies(fetched)
      // Every ally relationship has a chat (chat itself is still in-memory; see the allies/chat slice).
      setChats(prev => [
        ...prev,
        ...fetched
          .filter(a => !prev.some(c => c.allyId === a.id))
          .map(a => ({ allyId: a.id, disappearingMessages: false, messages: [] as ChatMessage[] })),
      ])
    } catch (e) {
      console.error('[allies] load failed', e)
    }
  }, [])

  // On sign-in: restore the saved profile and load requests/allies.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    loadProfileAnswers(userId)
      .then(saved => {
        if (cancelled || !saved) return
        setProfileAnswers(prev => (Object.keys(prev).length > 0 ? prev : saved))
        setIsReturningUserState(true)
      })
      .catch(e => console.error('[profile] load failed', e))
    refreshRequests()
    refreshAllies()
    return () => { cancelled = true }
  }, [userId, refreshRequests, refreshAllies])

  // Presence heartbeat + live updates. The database broadcasts only {kind, request_id} to the
  // private topic user:<uid>; on any event we simply re-read. Polling is the safety net.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    const visible = () => document.visibilityState === 'visible'
    const beat = () => { if (visible()) heartbeat().catch(() => {}) }
    const reread = () => { if (visible()) { refreshRequests(); refreshAllies() } }

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
        .on('broadcast', { event: 'request_received' }, () => refreshRequests())
        .on('broadcast', { event: 'request_updated' }, () => { refreshRequests(); refreshAllies() })
        .subscribe()
    })

    return () => {
      cancelled = true
      clearInterval(beatTimer)
      clearInterval(pollTimer)
      document.removeEventListener('visibilitychange', onVisible)
      if (channel) supabase.removeChannel(channel)
    }
  }, [userId, refreshRequests, refreshAllies])

  /** Runs a database action, surfaces its error, and re-reads so the UI always shows the truth. */
  async function runAction(action: () => Promise<void>) {
    setRequestError(null)
    try {
      await action()
    } catch (e) {
      setRequestError(e instanceof Error ? e.message : 'Something went wrong')
    }
    await Promise.all([refreshRequests(), refreshAllies()])
  }

  async function saveMyProfile() {
    if (!userId || !selectedGame) return
    await saveProfile(userId, gameKey(selectedGame), profileAnswers)
  }

  function updateProfileAnswer(key: string, value: string | string[] | number | Record<string, unknown>) {
    setProfileAnswers(prev => ({ ...prev, [key]: value }))
  }

  function addAlly(incoming: Ally) {
    // Prototype: the "they blocked you" flag would come off the relationship record in Phase 2
    const ally: Ally = {
      ...incoming,
      blockedYou: incoming.blockedYou ?? MOCK_BLOCKED_BY.includes(incoming.username),
    }
    setAllies(prev => prev.some(a => a.id === ally.id) ? prev : [...prev, ally])
    // Every ally relationship gets a chat immediately (SPEC_AMENDMENT_11 FIX 1/2)
    setChats(prev => prev.some(c => c.allyId === ally.id)
      ? prev
      : [...prev, { allyId: ally.id, disappearingMessages: false, messages: [] }])
  }

  function getChat(allyId: string): AllyChat | undefined {
    return chats.find(c => c.allyId === allyId)
  }

  function sendMessage(allyId: string, content: string) {
    const trimmed = content.trim()
    if (!trimmed) return
    setChats(prev => {
      const existing = prev.find(c => c.allyId === allyId)
      const disappearing = existing?.disappearingMessages ?? false
      const sentAt = Date.now()
      const message: ChatMessage = {
        id: `msg-${sentAt}-${Math.random().toString(36).slice(2, 8)}`,
        senderId: 'me',
        content: trimmed,
        sentAt,
        expiresAt: disappearing ? sentAt + 86400000 : null,
      }
      if (existing) {
        return prev.map(c => c.allyId === allyId ? { ...c, messages: [...c.messages, message] } : c)
      }
      return [...prev, { allyId, disappearingMessages: false, messages: [message] }]
    })
  }

  function toggleDisappearingMessages(allyId: string) {
    setChats(prev => {
      const existing = prev.find(c => c.allyId === allyId)
      if (existing) {
        return prev.map(c => c.allyId === allyId ? { ...c, disappearingMessages: !c.disappearingMessages } : c)
      }
      return [...prev, { allyId, disappearingMessages: true, messages: [] }]
    })
  }

  function pruneExpiredMessages(allyId: string) {
    const now = Date.now()
    setChats(prev => prev.map(c =>
      c.allyId === allyId
        ? { ...c, messages: c.messages.filter(m => m.expiresAt === null || m.expiresAt > now) }
        : c
    ))
  }

  function removeAlly(id: string) {
    if (userId) {
      // Ends the relationship for both sides and deletes the chat (SPEC D10)
      void runAction(() => removeAllyRpc(id))
      return
    }
    setAllies(prev => prev.filter(a => a.id !== id))
  }

  function toggleAllyPinned(id: string) {
    const ally = allies.find(a => a.id === id)
    setAllies(prev => prev.map(a => a.id === id ? { ...a, pinned: !a.pinned } : a))
    if (userId && ally) {
      void runAction(() => setAllyPinned(id, !ally.pinned))
    }
  }

  // Blocking keeps the ally record — un-allying them would let them request you again with
  // nothing to remind you why you said no last time.
  function toggleAllyBlocked(id: string) {
    if (userId) {
      const ally = allies.find(a => a.id === id)
      if (ally) void runAction(() => (ally.blockId ? unblockRpc(ally.blockId) : blockAllyRpc(id)))
      return
    }
    setAllies(prev => prev.map(a => a.id === id ? { ...a, blocked: !a.blocked } : a))
    setBlockedUsers(prev => {
      const ally = allies.find(a => a.id === id)
      if (ally?.blocked) return prev.filter(u => u !== id)
      return prev.includes(id) ? prev : [...prev, id]
    })
  }

  function pushIncomingRequest(req: IncomingRequest) {
    setIncomingRequests(prev => [...prev, { ...req, expiresAt: Date.now() + 20000 }])
  }

  function shiftIncomingRequest() {
    setIncomingRequests(prev => prev.slice(1))
  }

  function blockUser(userId: string) {
    setBlockedUsers(prev => prev.includes(userId) ? prev : [...prev, userId])
  }

  // ── Squad requests (bell / notifications) ──────────────────────────────────
  function removeSquadRequest(id: string) {
    setSquadRequests(prev => prev.filter(r => r.id !== id))
  }

  function acceptSquadRequest(id: string) {
    if (userId) {
      // The database computes the score and creates both ally rows and the chat.
      void runAction(() => acceptRequest(id))
      return
    }
    const request = squadRequests.find(r => r.id === id)
    if (request) {
      // Score against the profile for the game the request is *for*, not whichever game
      // happens to be selected right now.
      const myProfile = buildProfileFromAnswers(gameKey(findGameById(request.gameId)), profileAnswers)
      addAlly({
        id: request.id,
        username: request.senderUsername,
        overall: calculateMatch(myProfile, request.profile).overall,
        status: request.senderStatus,
        statusGame: request.senderStatusGame,
        gameId: request.gameId,
      })
    }
    removeSquadRequest(id)
  }

  function declineSquadRequest(id: string) {
    if (userId) {
      void runAction(() => declineRequest(id))
      return
    }
    removeSquadRequest(id)
  }

  function declineAndBlockSquadRequest(id: string) {
    if (userId) {
      void runAction(() => declineAndBlockRequest(id))
      return
    }
    blockUser(id)
    removeSquadRequest(id)
  }

  function setSquadAccepted(id: string) {
    setSquadAcceptedState(true)
    setAcceptedMatchId(id)
  }

  return (
    <AppContext.Provider value={{
      selectedGame,
      selectedVersion,
      isReturningUser,
      profileAnswers,
      setSelectedGame,
      setSelectedVersion,
      setIsReturningUser,
      updateProfileAnswer,
      allies,
      incomingRequests,
      blockedUsers,
      squadStatus,
      addAlly,
      removeAlly,
      toggleAllyPinned,
      toggleAllyBlocked,
      pushIncomingRequest,
      shiftIncomingRequest,
      blockUser,
      setSquadStatus,
      squadRequests,
      acceptSquadRequest,
      declineSquadRequest,
      declineAndBlockSquadRequest,
      userId,
      requestError,
      clearRequestError: () => setRequestError(null),
      saveMyProfile,
      notificationsEnabled,
      setNotificationsEnabled,
      squadAccepted,
      acceptedMatchId,
      setSquadAccepted,
      chats,
      getChat,
      sendMessage,
      toggleDisappearingMessages,
      pruneExpiredMessages,
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
