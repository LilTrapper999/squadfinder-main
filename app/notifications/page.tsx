'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { useT } from '@/context/I18nContext'
import { GAME_QUESTIONS, findGameById } from '@/lib/mockData'
import { calculateMatch } from '@/lib/matching'
import { buildProfileFromAnswers, gameKey } from '@/lib/profileAnswers'
import { Game, GameCategory, SquadRequest } from '@/lib/types'
import { useWindowWidth } from '@/lib/useWindowWidth'
import RequestCard from '@/components/notifications/RequestCard'
import GameTile from '@/components/game-select/GameTile'
import AnimatedBackground from '@/components/ui/AnimatedBackground'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1100

const CATEGORY_LABELS: Record<GameCategory, string> = {
  extraction: 'Extraction Shooters',
  competitive: 'Competitive FPS',
  fps: 'FPS',
}

const CATEGORY_ORDER: GameCategory[] = ['extraction', 'competitive', 'fps']

interface GameBucket {
  game: Game
  requests: SquadRequest[]
}

interface CategoryGroup {
  category: GameCategory
  buckets: GameBucket[]
}

/**
 * Groups pending requests by game, then by that game's category. A category with no requests
 * never appears — neither does a game the user has no requests for.
 */
function bucketRequests(requests: SquadRequest[]): CategoryGroup[] {
  const byGame: Record<string, GameBucket> = {}
  const gameOrder: string[] = []

  for (const request of requests) {
    const game = findGameById(request.gameId)
    if (!game) continue // request for a game no longer in the catalogue — nothing to show
    if (byGame[game.id]) {
      byGame[game.id].requests.push(request)
    } else {
      byGame[game.id] = { game, requests: [request] }
      gameOrder.push(game.id)
    }
  }

  const allBuckets = gameOrder.map((id) => byGame[id])
  const groups: CategoryGroup[] = []
  for (const category of CATEGORY_ORDER) {
    const buckets = allBuckets.filter((b) => b.game.category === category)
    if (buckets.length > 0) groups.push({ category, buckets })
  }
  return groups
}

export default function NotificationsPage() {
  const router = useRouter()
  const { t } = useT()
  const {
    profileAnswers,
    squadRequests,
    acceptSquadRequest,
    declineSquadRequest,
    declineAndBlockSquadRequest,
  } = useApp()

  const width = useWindowWidth()
  const isMobile = width < MOBILE_BREAKPOINT
  const isTablet = width < TABLET_BREAKPOINT

  const grouped = bucketRequests(squadRequests)
  const categories = grouped.map((g) => g.category)

  // Every category with requests starts expanded — collapsing is the deliberate act
  const [expanded, setExpanded] = useState<GameCategory[]>(categories)
  const [activeGameId, setActiveGameId] = useState<string | null>(null)

  function toggleCategory(category: GameCategory) {
    setExpanded((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    )
  }

  // Falls back to the first game still holding requests, so answering the last request for a
  // game doesn't leave the panel pointing at nothing.
  const allBuckets: GameBucket[] = grouped.reduce<GameBucket[]>((acc, g) => acc.concat(g.buckets), [])
  const activeBucket =
    allBuckets.find((b) => b.game.id === activeGameId) ?? allBuckets[0] ?? null

  const requestColumns = isMobile ? 1 : isTablet ? 1 : 2

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
              onClick={() => router.push('/squad-matches')}
              style={{ background: 'none', border: 'none', color: '#4a5568', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
            >
              {t('← Back')}
            </button>
            <span style={{ color: '#4a5568', fontSize: '12px', flexShrink: 0 }}>/</span>
            <span style={{ color: '#8b95a5', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('Notifications')}</span>
          </div>
        </div>
      </div>

      {/* Page heading + instructions */}
      <div style={{ padding: isMobile ? '16px 16px 0' : '20px 28px 0', flexShrink: 0 }}>
        <h1 className="main-heading" style={{ fontSize: 'clamp(24px, 6vw, 40px)', margin: 0 }}>
          {t('NOTIFICATIONS')}
        </h1>

        <div
          style={{
            marginTop: '12px',
            padding: isMobile ? '14px 16px' : '16px 22px',
            backgroundColor: 'rgba(232,160,32,0.05)',
            border: '1px solid rgba(232,160,32,0.15)',
            borderRadius: '10px',
          }}
        >
          <p
            style={{
              margin: '0 0 6px',
              fontSize: isMobile ? '18px' : '22px',
              fontWeight: 600,
              color: '#ffffff',
              fontFamily: 'var(--font-rajdhani), sans-serif',
            }}
          >
            {squadRequests.length === 0
              ? t('No squad requests waiting')
              : squadRequests.length === 1
              ? t('1 request waiting')
              : t('{count} requests waiting', { count: squadRequests.length })}
          </p>
          <p style={{ margin: 0, fontSize: '13px', color: '#8b95a5', lineHeight: 1.6 }}>
            {t('Requests are filed by game. Expand a category on the left and pick a game to see everyone who asked to squad up on it. On each card, click any percentage to read the answers they gave for that category, then Accept, Decline, or Decline & Block.')}
          </p>
        </div>
      </div>

      {/* Body: category/game rail on the left, that game's requests on the right */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          overflow: isMobile ? 'auto' : 'hidden',
          marginTop: isMobile ? '16px' : '20px',
          backgroundColor: '#0d0f14',
          minHeight: 0,
        }}
      >
        {squadRequests.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '64px 20px',
              textAlign: 'center',
              opacity: 0.5,
            }}
          >
            <p className="sub-heading" style={{ margin: 0, fontSize: '18px' }}>
              {t('ALL CAUGHT UP')}
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: '#8b95a5', maxWidth: '380px', lineHeight: 1.5 }}>
              {t('When another player sends you a squad request it lands here, grouped under the game they want to play.')}
            </p>
          </div>
        ) : (
          <>
            {/* ── LEFT: expandable categories ── */}
            <div
              style={{
                width: isMobile ? '100%' : '32%',
                minWidth: isMobile ? undefined : '260px',
                maxHeight: isMobile ? '46vh' : undefined,
                height: isMobile ? undefined : '100%',
                overflowY: 'auto',
                flexShrink: 0,
                backgroundColor: '#111318',
                borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.08)',
                borderBottom: isMobile ? '1px solid rgba(255,255,255,0.08)' : 'none',
                padding: '14px',
              }}
            >
              {grouped.map(({ category, buckets }) => {
                const isOpen = expanded.includes(category)
                const total = buckets.reduce((n, b) => n + b.requests.length, 0)

                return (
                  <div key={category} style={{ marginBottom: '10px' }}>
                    <button
                      onClick={() => toggleCategory(category)}
                      aria-expanded={isOpen}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        gap: '10px',
                        padding: '11px 12px',
                        borderRadius: '8px',
                        border: `1px solid ${isOpen ? 'rgba(232,160,32,0.35)' : 'rgba(255,255,255,0.08)'}`,
                        backgroundColor: isOpen ? 'rgba(232,160,32,0.08)' : 'transparent',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                        {/* Right when collapsed, down when expanded */}
                        <span
                          style={{
                            display: 'inline-block',
                            color: '#e8a020',
                            fontSize: '10px',
                            transition: 'transform 0.15s ease',
                            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                          }}
                        >
                          ▶
                        </span>
                        <span
                          className="sub-heading"
                          style={{
                            fontSize: '14px',
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            color: isOpen ? '#e8a020' : 'rgba(255,255,255,0.9)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {t(CATEGORY_LABELS[category])}
                        </span>
                      </span>
                      <span
                        style={{
                          flexShrink: 0,
                          minWidth: '20px',
                          padding: '1px 6px',
                          borderRadius: '9px',
                          backgroundColor: '#ef4444',
                          color: '#ffffff',
                          fontSize: '10px',
                          fontWeight: 700,
                          textAlign: 'center',
                          fontFamily: 'var(--font-rajdhani), sans-serif',
                        }}
                      >
                        {total}
                      </span>
                    </button>

                    {/* Game cards — identical tiles to the select-game grid */}
                    {isOpen && (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '10px',
                          padding: '12px 4px 4px',
                        }}
                      >
                        {buckets.map(({ game, requests }) => (
                          <div key={game.id} style={{ position: 'relative' }}>
                            <GameTile
                              game={game}
                              selected={activeBucket?.game.id === game.id}
                              onSelect={() => setActiveGameId(game.id)}
                            />
                            {/* Per-game request count */}
                            <span
                              style={{
                                position: 'absolute',
                                top: '6px',
                                left: '6px',
                                zIndex: 3,
                                minWidth: '18px',
                                padding: '1px 5px',
                                borderRadius: '9px',
                                backgroundColor: '#ef4444',
                                border: '1px solid #0a0b0f',
                                color: '#ffffff',
                                fontSize: '10px',
                                fontWeight: 700,
                                textAlign: 'center',
                                fontFamily: 'var(--font-rajdhani), sans-serif',
                                pointerEvents: 'none',
                              }}
                            >
                              {requests.length}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* ── RIGHT: every request for the selected game ── */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                height: isMobile ? undefined : '100%',
                overflowY: isMobile ? 'visible' : 'auto',
                padding: isMobile ? '16px' : '20px 24px 40px',
              }}
            >
              {activeBucket && (
                <>
                  <p
                    className="sub-heading"
                    style={{ margin: '0 0 4px', fontSize: '17px', letterSpacing: '0.05em', color: '#e8a020' }}
                  >
                    {activeBucket.game.name}
                  </p>
                  <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#8b95a5' }}>
                    {activeBucket.requests.length === 1
                      ? t('1 request for this game')
                      : t('{count} requests for this game', { count: activeBucket.requests.length })}
                  </p>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${requestColumns}, 1fr)`,
                      gap: '14px',
                      alignItems: 'start',
                    }}
                  >
                    {activeBucket.requests.map((request, index) => {
                      // Score each request against the profile for ITS game, not the selected one
                      const key = gameKey(findGameById(request.gameId))
                      const myProfile = buildProfileFromAnswers(key, profileAnswers)

                      return (
                        <RequestCard
                          key={request.id}
                          request={request}
                          scores={calculateMatch(myProfile, request.profile)}
                          // Last column opens its popup leftwards so it stays on-screen
                          flipPopup={requestColumns > 1 && index % requestColumns === requestColumns - 1}
                          inlinePopup={requestColumns === 1}
                          onAccept={() => acceptSquadRequest(request.id)}
                          onDecline={() => declineSquadRequest(request.id)}
                          onDeclineAndBlock={() => declineAndBlockSquadRequest(request.id)}
                        />
                      )
                    })}
                  </div>

                  {/* A request for a game with no question set can't be scored meaningfully */}
                  {!GAME_QUESTIONS[gameKey(activeBucket.game)] && (
                    <p style={{ margin: '16px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                      {t('No question set for this game yet — scores are indicative only.')}
                    </p>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
