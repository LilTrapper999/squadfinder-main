'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { Game, GameVersion, ProfileAnswers, Ally, IncomingRequest, SquadRequest, AllyChat, ChatMessage } from '@/lib/types'
import { MOCK_SQUAD_REQUESTS } from '@/lib/mockData'
import { buildProfileFromAnswers } from '@/lib/profileAnswers'
import { calculateMatch } from '@/lib/matching'

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
  const [isReturningUser, setIsReturningUser] = useState(false)
  const [profileAnswers, setProfileAnswers] = useState<ProfileAnswers>({})

  // Social state
  const [allies, setAllies] = useState<Ally[]>([])
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([])
  const [blockedUsers, setBlockedUsers] = useState<string[]>([])
  const [squadStatus, setSquadStatus] = useState<'searching' | 'in-squad' | null>(null)

  // Requests sent to the user — prototype: seeded from mock data so the bell has a badge
  const [squadRequests, setSquadRequests] = useState<SquadRequest[]>(MOCK_SQUAD_REQUESTS)

  // Notification gate (FIX 1)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  // Squad acceptance (FIX 2)
  const [squadAccepted, setSquadAcceptedState] = useState(false)
  const [acceptedMatchId, setAcceptedMatchId] = useState<string | null>(null)

  // Private ally chat (SPEC_AMENDMENT_11 FIX 2/3)
  const [chats, setChats] = useState<AllyChat[]>([])

  function updateProfileAnswer(key: string, value: string | string[] | number | Record<string, unknown>) {
    setProfileAnswers(prev => ({ ...prev, [key]: value }))
  }

  function addAlly(ally: Ally) {
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
    setAllies(prev => prev.filter(a => a.id !== id))
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
    const request = squadRequests.find(r => r.id === id)
    if (request) {
      const myProfile = buildProfileFromAnswers(selectedGame?.id ?? '', profileAnswers)
      addAlly({
        id: request.id,
        username: request.senderUsername,
        overall: calculateMatch(myProfile, request.profile).overall,
        status: request.senderStatus,
        statusGame: request.senderStatusGame,
        gameId: selectedGame?.id,
      })
    }
    removeSquadRequest(id)
  }

  function declineSquadRequest(id: string) {
    removeSquadRequest(id)
  }

  function declineAndBlockSquadRequest(id: string) {
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
      pushIncomingRequest,
      shiftIncomingRequest,
      blockUser,
      setSquadStatus,
      squadRequests,
      acceptSquadRequest,
      declineSquadRequest,
      declineAndBlockSquadRequest,
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
