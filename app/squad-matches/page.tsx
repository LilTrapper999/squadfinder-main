'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { useT } from '@/context/I18nContext'
import { MOCK_MATCHES, MOCK_OPPONENT_PROFILES } from '@/lib/mockData'
import { MatchPlayer } from '@/lib/types'
import { explainMatch } from '@/lib/matching'
import { buildProfileFromAnswers, gameKey, usernameFor } from '@/lib/profileAnswers'
import { useWindowWidth } from '@/lib/useWindowWidth'
import { useAnnounceLooking } from '@/lib/useLookingPresence'
import MatchCard from '@/components/matches/MatchCard'
import AlliesPanel from '@/components/matches/AlliesPanel'
import IncomingRequestPopup from '@/components/matches/IncomingRequestPopup'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import HeaderActions from '@/components/ui/HeaderActions'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1100

export default function SquadMatchesPage() {
  const router = useRouter()
  const { t } = useT()
  const {
    selectedGame,
    profileAnswers,
    allies, addAlly,
    incomingRequests, shiftIncomingRequest,
    blockUser,
    notificationsEnabled, setNotificationsEnabled,
    squadAccepted, setSquadAccepted,
  } = useApp()

  // Cards blocked via popup Decline & Block
  const [blockedMatchIds, setBlockedMatchIds] = useState<string[]>([])

  // The main area is for people you don't know yet — existing allies are reached through the
  // allies panel instead. Captured once on load, not live: a card you just squadded up with
  // has to stay put so its "Squad Accepted / Go to chat" state remains visible.
  const [knownAllies] = useState(() => ({
    ids: new Set(allies.map((a) => a.id)),
    usernames: new Set(allies.map((a) => a.username)),
  }))

  // Tell select-game's player counts that this user is currently looking for a team.
  useAnnounceLooking(selectedGame?.id ?? null)

  // Hover state for Return to Homepage button
  const [hoverReturn, setHoverReturn] = useState(false)
  // Hover state for the Change Details button
  const [hoverChangeDetails, setHoverChangeDetails] = useState(false)

  const width = useWindowWidth()
  const isMobile = width < MOBILE_BREAKPOINT
  const isTablet = width < TABLET_BREAKPOINT
  const matchColumns = isMobile ? 1 : isTablet ? 2 : 3

  // Live-calculated matches: pair each mock display identity (username/label/status)
  // with the corresponding opponent profile and run the real matching algorithm.
  const myProfile = buildProfileFromAnswers(gameKey(selectedGame), profileAnswers)
  const username = usernameFor(profileAnswers, gameKey(selectedGame)).trim()
  const computedMatches: MatchPlayer[] = MOCK_MATCHES.map((match, i) => {
    const opponent = MOCK_OPPONENT_PROFILES[i]
    if (!opponent) return match
    const breakdown = explainMatch(myProfile, opponent.profile)
    const scores = breakdown.scores
    return {
      ...match,
      breakdown,
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
      if (blockedMatchIds.includes(p.id)) return false
      if (knownAllies.ids.has(p.id) || knownAllies.usernames.has(p.revealedUsername)) return false
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
        gameId: selectedGame?.id,
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
  // Accepting one match no longer locks the rest — you can keep sending requests
  // to build out a bigger squad, so this only drives the "in a squad" banner/CTA.
  function handleCardAccepted(playerId: string) {
    setSquadAccepted(playerId)
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
            {t("YOU'RE IN A SQUAD!")}
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
          padding: isMobile ? '0 16px' : '0 24px',
          gap: '10px',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '16px', minWidth: 0, overflow: 'hidden' }}>
          {!isMobile && (
            <span style={{
              fontFamily: 'var(--font-rajdhani), sans-serif',
              fontSize: '16px',
              fontWeight: 700,
              color: '#e8a020',
              letterSpacing: '0.05em',
              flexShrink: 0,
            }}>
              SQUADFINDER
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <button
              onClick={() => router.push('/build-profile')}
              style={{ background: 'none', border: 'none', color: '#4a5568', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
            >
              {t('← Back')}
            </button>
            <span style={{ color: '#4a5568', fontSize: '12px', flexShrink: 0 }}>/</span>
            <span style={{ color: '#8b95a5', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('Squad Matches')}</span>
          </div>
        </div>

        {/* Right side: game badge + notifications bell. The bell is the entry point to the
            squad requests other players have sent — badge count comes from AppContext. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '14px' : '18px', minWidth: 0, flexShrink: 0 }}>
          {/* Game badge — version is already baked into the game name; hidden on mobile since the
              name is long and the page heading below already gives full context */}
          {selectedGame && !isMobile && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 12px',
              backgroundColor: 'rgba(232,160,32,0.08)',
              border: '1px solid rgba(232,160,32,0.2)',
              borderRadius: '20px',
              minWidth: 0,
              overflow: 'hidden',
            }}>
              <span style={{ fontSize: '12px', color: '#e8a020', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedGame.name}</span>
            </div>
          )}

          <HeaderActions />
        </div>
      </div>

      {/* Page heading — at the very top of the page, matching the other pages' heading size */}
      <div style={{ padding: isMobile ? '16px 16px 0' : '20px 28px 0', flexShrink: 0 }}>
        <h1 className="main-heading" style={{ fontSize: 'clamp(24px, 6vw, 40px)', margin: 0 }}>
          {username ? t('{name}, YOUR SQUAD AWAITS', { name: username }) : t('YOUR SQUAD AWAITS')}
        </h1>
      </div>

      {/* Two-panel body — stacks vertically on narrow viewports. Allies sit on the right. */}
      <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: isMobile ? 'auto' : 'hidden', position: 'relative', zIndex: 1, backgroundColor: '#0a0b0f' }}>

        {/* ── LEFT: Match cards ── */}
        <div
          className="matches-grid-panel"
          style={{
            width: isMobile ? '100%' : '82%',
            height: isMobile ? 'auto' : '100%',
            overflowY: isMobile ? 'visible' : 'auto',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0d0f14',
            color: '#ffffff',
          }}
        >
          {/* Change Details — sits just above the cards; the page title is the only other thing up here */}
          <div style={{ padding: isMobile ? '12px 16px 0' : '16px 28px 0', flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => router.push('/build-profile')}
              onMouseEnter={() => setHoverChangeDetails(true)}
              onMouseLeave={() => setHoverChangeDetails(false)}
              style={{
                flexShrink: 0,
                padding: '8px 20px',
                borderRadius: '8px',
                border: `1px solid ${hoverChangeDetails ? '#e8a020' : 'rgba(232,160,32,0.3)'}`,
                backgroundColor: hoverChangeDetails ? 'rgba(232,160,32,0.1)' : 'transparent',
                color: '#e8a020',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-rajdhani), sans-serif',
                letterSpacing: '0.04em',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {t('Change Details')}
            </button>
          </div>

          {/* Match grid — 3 columns on desktop, fewer as the viewport narrows */}
          <div style={{ padding: isMobile ? '0 16px' : '0 28px', flex: 1 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${matchColumns}, 1fr)`,
                gap: '14px',
                marginBottom: '40px',
              }}
            >
              {visibleMatches.map((player) => {
                const resolvedStatusGame =
                  player.status === 'ingame'
                    ? (selectedGame?.name ?? player.statusGame)
                    : player.statusGame

                return (
                  <MatchCard
                    key={player.id}
                    player={player}
                    resolvedStatusGame={resolvedStatusGame}
                    onAccepted={handleCardAccepted}
                  />
                )
              })}
            </div>

            {/* Privacy footer */}
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
              {t('Usernames are hidden until both players accept. Declined requests are hidden for 1 hour.')}
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
                {t('Show players currently in-game (notifications on)')}
              </label>
            </div>

            {/* Post-acceptance CTA — the homepage is gone, so this loops back to the catalogue */}
            {squadAccepted && (
              <div style={{ textAlign: 'center', paddingBottom: '40px' }}>
                <button
                  className="main-heading"
                  onClick={() => router.push('/select-game')}
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
                  {t('PICK ANOTHER GAME')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Allies panel ── */}
        <AlliesPanel allies={allies} />
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
