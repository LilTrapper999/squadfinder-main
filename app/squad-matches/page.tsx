'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { MOCK_MATCHES, MOCK_OPPONENT_PROFILES } from '@/lib/mockData'
import { MatchPlayer, Profile, ProfileAnswers } from '@/lib/types'
import { calculateMatch } from '@/lib/matching'
import MatchCard from '@/components/matches/MatchCard'
import AlliesPanel from '@/components/matches/AlliesPanel'
import IncomingRequestPopup from '@/components/matches/IncomingRequestPopup'
import AnimatedBackground from '@/components/ui/AnimatedBackground'

// Reads a nested answer group (e.g. answers.gamesmanship.weapons) written by ProfileForm's updateNested()
function nestedGroup(answers: ProfileAnswers, group: string): Record<string, unknown> {
  const g = answers[group]
  return g && typeof g === 'object' && !Array.isArray(g) ? (g as Record<string, unknown>) : {}
}
function arr(v: unknown): string[] {
  return Array.isArray(v) ? v as string[] : []
}
function num(v: unknown, fallback: number): number {
  return typeof v === 'number' ? v / 10 : fallback // stored 0–100 internally, Profile scale is 0.0–10.0
}

/** Builds the current user's Profile (for calculateMatch) from their /build-profile answers. */
function buildProfileFromAnswers(gameId: string, answers: ProfileAnswers): Profile {
  const gamesmanship = nestedGroup(answers, 'gamesmanship')
  const vibeCheck = nestedGroup(answers, 'vibeCheck')
  const comms = nestedGroup(answers, 'comms')
  return {
    gameId,
    weapons: arr(gamesmanship.weapons),
    maps: arr(gamesmanship.maps),
    roles: arr(gamesmanship.roles),
    skill: num(gamesmanship.skill, 5),
    roleMatchPreference: num(gamesmanship.roleMatchPreference, 5),
    rage: num(vibeCheck.rageLevel, 5),
    personality: arr(vibeCheck.personality),
    willingToChat: comms.willingToChat === 'yes',
    willingToSpeak: comms.willingToSpeak === 'yes',
    languages: arr(comms.languages),
  }
}

export default function SquadMatchesPage() {
  const router = useRouter()
  const {
    selectedGame, selectedVersion,
    profileAnswers,
    allies, addAlly,
    incomingRequests, shiftIncomingRequest,
    blockUser,
    notificationsEnabled, setNotificationsEnabled,
    squadAccepted, acceptedMatchId, setSquadAccepted,
  } = useApp()

  // Cards declined by the 50/50 are hidden for the full session
  // TODO: persist 1hr cooldown in DB
  const [hiddenIds, setHiddenIds] = useState<string[]>([])
  // Cards blocked via popup Decline & Block
  const [blockedMatchIds, setBlockedMatchIds] = useState<string[]>([])

  // Hover state for Return to Homepage button
  const [hoverReturn, setHoverReturn] = useState(false)

  // Live-calculated matches: pair each mock display identity (username/label/status)
  // with the corresponding opponent profile and run the real matching algorithm.
  const myProfile = buildProfileFromAnswers(selectedGame?.id ?? '', profileAnswers)
  const computedMatches: MatchPlayer[] = MOCK_MATCHES.map((match, i) => {
    const opponent = MOCK_OPPONENT_PROFILES[i]
    if (!opponent) return match
    const scores = calculateMatch(myProfile, opponent.profile)
    return {
      ...match,
      overall: scores.overall,
      gamesmanship: scores.gamesmanship,
      vibe: scores.vibeCheck,
      comms: scores.comms,
      // Info badges only — not scored (SPEC_AMENDMENT_10)
      willingToChat: opponent.profile.willingToChat,
      willingToSpeak: opponent.profile.willingToSpeak,
    }
  })

  // FIX 1: Filter by status — offline always hidden, ingame hidden unless notifications on
  const visibleMatches = [...computedMatches]
    .sort((a, b) => b.overall - a.overall)
    .filter((p) => {
      if (blockedMatchIds.includes(p.id) || hiddenIds.includes(p.id)) return false
      if (p.status === 'offline') return false
      if (p.status === 'ingame' && !notificationsEnabled) return false
      return true
    })

  const currentRequest = incomingRequests[0] ?? null
  const queueLength = incomingRequests.length - 1

  // ── Popup handlers ────────────────────────────────────────────────────────
  // Accepting always auto-allies — no separate "Add as Ally" step (SPEC_AMENDMENT_11 FIX 1)
  function handlePopupAccept() {
    if (currentRequest) {
      addAlly({
        id: currentRequest.id,
        username: currentRequest.senderUsername,
        overall: currentRequest.overallMatch,
        status: currentRequest.senderStatus,
        statusGame: currentRequest.senderStatusGame,
      })
    }
    shiftIncomingRequest()
  }

  function handlePopupDecline() {
    shiftIncomingRequest()
  }

  function handlePopupDeclineAndBlock() {
    if (currentRequest) {
      blockUser(currentRequest.id)
      if (currentRequest.matchId) {
        setBlockedMatchIds((prev) => [...prev, currentRequest.matchId!])
      }
    }
    shiftIncomingRequest()
  }

  function handlePopupExpire() {
    shiftIncomingRequest()
  }

  // ── Match card callbacks ──────────────────────────────────────────────────
  // FIX 2: use shared AppContext squadAccepted so all cards see it immediately
  function handleCardAccepted(playerId: string) {
    setSquadAccepted(playerId)
  }

  function handleCardDeclined(playerId: string) {
    // Remove card from DOM for the session (1hr hide in production)
    // TODO: persist 1hr cooldown in DB
    setHiddenIds((prev) => [...prev, playerId])
  }

  return (
    <div
      className="page-content"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
        backgroundColor: '#0a0b0f',
      }}
    >
      <AnimatedBackground />
      {/* YOU'RE IN A SQUAD! banner */}
      {squadAccepted && (
        <div style={{ backgroundColor: '#e8a020', padding: '10px 24px', textAlign: 'center', flexShrink: 0 }}>
          <span style={{
            fontFamily: 'var(--font-rajdhani), sans-serif',
            fontWeight: 700,
            fontSize: '16px',
            color: '#0a0b0f',
            letterSpacing: '0.08em',
          }}>
            YOU&apos;RE IN A SQUAD!
          </span>
        </div>
      )}

      {/* Top bar */}
      <div
        style={{
          height: '52px',
          backgroundColor: '#111318',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{
            fontFamily: 'var(--font-rajdhani), sans-serif',
            fontSize: '16px',
            fontWeight: 700,
            color: '#e8a020',
            letterSpacing: '0.05em',
          }}>
            SQUADFINDER
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => router.push('/build-profile')}
              style={{ background: 'none', border: 'none', color: '#4a5568', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ← Back
            </button>
            <span style={{ color: '#4a5568', fontSize: '12px' }}>/</span>
            <span style={{ color: '#8b95a5', fontSize: '13px' }}>Squad Matches</span>
          </div>
        </div>

        {/* Game + version badge */}
        {selectedGame && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '4px 12px',
            backgroundColor: 'rgba(232,160,32,0.08)',
            border: '1px solid rgba(232,160,32,0.2)',
            borderRadius: '20px',
          }}>
            <span style={{ fontSize: '12px', color: '#e8a020', fontWeight: 500 }}>{selectedGame.name}</span>
            {selectedVersion && (
              <span style={{ fontSize: '11px', color: '#8b95a5' }}>· {selectedVersion.label}</span>
            )}
          </div>
        )}
      </div>

      {/* Two-panel body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 1, backgroundColor: '#0a0b0f' }}>

        {/* ── LEFT: Allies panel (40%) ── */}
        <AlliesPanel allies={allies} />

        {/* ── RIGHT: Match cards (60%) ── */}
        <div
          className="matches-grid-panel"
          style={{
            width: '60%',
            height: '100%',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0d0f14',
            color: '#ffffff',
          }}
        >
          {/* Panel heading */}
          <div style={{ padding: '24px 28px 0', flexShrink: 0 }}>
            <h1 className="main-heading" style={{ fontSize: '26px', marginBottom: '24px' }}>
              YOUR SQUAD AWAITS
            </h1>
          </div>

          {/* 3-column grid */}
          <div style={{ padding: '0 28px', flex: 1 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '14px',
                marginBottom: '40px',
              }}
            >
              {visibleMatches.map((player) => {
                // FIX 2: use shared context — first acceptance locks all other cards
                const isAccepted = acceptedMatchId === player.id
                const isLocked = squadAccepted && !isAccepted

                const resolvedStatusGame =
                  player.status === 'ingame'
                    ? (selectedGame?.name ?? player.statusGame)
                    : player.statusGame

                return (
                  <MatchCard
                    key={player.id}
                    player={player}
                    resolvedStatusGame={resolvedStatusGame}
                    isLocked={isLocked}
                    onAccepted={handleCardAccepted}
                    onDeclined={handleCardDeclined}
                  />
                )
              })}
            </div>

            {/* Privacy footer */}
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
              Usernames are hidden until both players accept. Declined requests are hidden for 1 hour.
            </p>

            {/* Notification toggle — Prototype only — replace with real Web Notifications permission in Phase 2 */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  style={{ accentColor: '#e8a020', width: '13px', height: '13px', cursor: 'pointer' }}
                />
                Show players currently in-game (notifications on)
              </label>
            </div>

            {/* Return to Homepage — appears after squad acceptance */}
            {squadAccepted && (
              <div style={{ textAlign: 'center', paddingBottom: '40px' }}>
                <button
                  className="main-heading"
                  onClick={() => router.push('/home')}
                  onMouseEnter={() => setHoverReturn(true)}
                  onMouseLeave={() => setHoverReturn(false)}
                  style={{
                    padding: '16px 48px',
                    borderRadius: '10px',
                    border: '2px solid #e8a020',
                    backgroundColor: hoverReturn ? 'rgba(232,160,32,0.15)' : 'transparent',
                    color: '#e8a020',
                    fontSize: '20px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-rajdhani), sans-serif',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
                    boxShadow: hoverReturn
                      ? '0 0 32px rgba(232,160,32,0.4), 0 0 64px rgba(232,160,32,0.15)'
                      : '0 0 16px rgba(232,160,32,0.15)',
                    // animation comes from .main-heading class
                  }}
                >
                  RETURN TO HOMEPAGE
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Incoming request popup */}
      {currentRequest && (
        <IncomingRequestPopup
          request={currentRequest}
          queueLength={queueLength}
          onAccept={handlePopupAccept}
          onDecline={handlePopupDecline}
          onDeclineAndBlock={handlePopupDeclineAndBlock}
          onExpire={handlePopupExpire}
        />
      )}
    </div>
  )
}
