'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { Game, GameVersion, ProfileAnswers, Ally, IncomingRequest } from '@/lib/types'

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

  // FIX 1 — notification gate for showing in-game players
  // Prototype only — replace with real Web Notifications permission in Phase 2
  notificationsEnabled: boolean
  setNotificationsEnabled: (v: boolean) => void

  // FIX 2 — shared squad acceptance state (first-come-first-served)
  squadAccepted: boolean
  acceptedMatchId: string | null
  setSquadAccepted: (id: string) => void
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

  // Notification gate (FIX 1)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  // Squad acceptance (FIX 2)
  const [squadAccepted, setSquadAcceptedState] = useState(false)
  const [acceptedMatchId, setAcceptedMatchId] = useState<string | null>(null)

  function updateProfileAnswer(key: string, value: string | string[] | number | Record<string, unknown>) {
    setProfileAnswers(prev => ({ ...prev, [key]: value }))
  }

  function addAlly(ally: Ally) {
    setAllies(prev => prev.some(a => a.id === ally.id) ? prev : [...prev, ally])
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
      notificationsEnabled,
      setNotificationsEnabled,
      squadAccepted,
      acceptedMatchId,
      setSquadAccepted,
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
