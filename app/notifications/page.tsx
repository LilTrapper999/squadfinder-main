'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { useT } from '@/context/I18nContext'
import { GAME_QUESTIONS, findGameById } from '@/lib/mockData'
import { explainMatch } from '@/lib/matching'
import { buildProfileFromAnswers, gameKey } from '@/lib/profileAnswers'
import { Game, GameCategory, SquadRequest } from '@/lib/types'
import { useWindowWidth } from '@/lib/useWindowWidth'
import { useLookingCounts } from '@/lib/useLookingPresence'
import RequestCard from '@/components/notifications/RequestCard'
import GameTile from '@/components/game-select/GameTile'
import AnimatedBackground from '@/components/ui/AnimatedBackground'

const MOBILE_BREAKPOINT = 768

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

/**
 * Groups pending requests by game, then files each game under its category. Every category is
 * present (its tab always shows) but only games that actually hold requests appear inside it.
 */
function bucketRequests(requests: SquadRequest[]): Record<GameCategory, GameBucket[]> {
  const byGame = new Map<string, GameBucket>()

  for (const request of requests) {
    const game = findGameById(request.gameId)
    if (!game) continue // request for a game no longer in the catalogue — nothing to show
    const bucket = byGame.get(game.id)
    if (bucket) bucket.requests.push(request)
    else byGame.set(game.id, { game, requests: [request] })
  }

  const grouped: Record<GameCategory, GameBucket[]> = { extraction: [], competitive: [], fps: [] }
  byGame.forEach((bucket) => grouped[bucket.game.category].push(bucket))
  return grouped
}

function CountBadge({ count, size = 'md' }: { count: number; size?: 'sm' | 'md' }) {
  return (
    <span
      style={{
        minWidth: size === 'sm' ? '18px' : '20px',
        padding: '1px 6px',
        borderRadius: '10px',
        backgroundColor: '#ef4444',
        border: '1px solid #0a0b0f',
        color: '#ffffff',
        fontSize: '10px',
        fontWeight: 700,
        lineHeight: '14px',
        textAlign: 'center',
        fontFamily: 'var(--font-rajdhani), sans-serif',
        boxShadow: '0 0 8px rgba(239,68,68,0.6)',
        boxSizing: 'border-box',
        pointerEvents: 'none',
      }}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
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
  const lookingCounts = useLookingCounts()

  const width = useWindowWidth()
  const isMobile = width < MOBILE_BREAKPOINT

  const grouped = bucketRequests(squadRequests)
  const countFor = (category: GameCategory) =>
    grouped[category].reduce((n, b) => n + b.requests.length, 0)

  // Until the user picks a tab, land on the first one that actually has requests
  const [pickedCategory, setPickedCategory] = useState<GameCategory | null>(null)
  const category = pickedCategory ?? CATEGORY_ORDER.find((c) => grouped[c].length > 0) ?? CATEGORY_ORDER[0]
  const [activeGameId, setActiveGameId] = useState<string | null>(null)
  const [hoverTab, setHoverTab] = useState<GameCategory | null>(null)

  const buckets = grouped[category]
  // Resolved against the current tab's games, so answering a game's last request (or switching
  // tabs) quietly drops the selection instead of pointing at a game that's no longer listed.
  const activeBucket = buckets.find((b) => b.game.id === activeGameId) ?? null

  function pickCategory(next: GameCategory) {
    setPickedCategory(next)
    setActiveGameId(null)
  }

  const gutter = isMobile ? '16px' : '28px'

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
          // Must sit above the fixed, opaque AnimatedBackground (z-index 0)
          position: 'relative',
          zIndex: 1,
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

      {/* Everything below the top bar scrolls together */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', position: 'relative', zIndex: 1 }}>
        {/* Page heading + instructions */}
        <div style={{ padding: `${isMobile ? '16px' : '20px'} ${gutter} 0` }}>
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
              {t('Requests are filed by game type. Pick a tab, choose a game, then review each player who asked to squad up. Tap any percentage to see exactly how that score was worked out, then Accept, Decline, or Decline & Block.')}
            </p>
          </div>
        </div>

        {squadRequests.length === 0 ? (
          <div
            style={{
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
            {/* ── Category tabs — each carries its own request count, top-right ── */}
            <div
              role="tablist"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
                marginTop: isMobile ? '16px' : '20px',
                padding: `0 ${gutter}`,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {CATEGORY_ORDER.map((cat) => {
                const isActive = cat === category
                const isHovered = cat === hoverTab
                const count = countFor(cat)
                return (
                  <button
                    key={cat}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => pickCategory(cat)}
                    onMouseEnter={() => setHoverTab(cat)}
                    onMouseLeave={() => setHoverTab(null)}
                    style={{
                      position: 'relative',
                      // Right padding leaves room for the counter so it never sits on the label
                      padding: isMobile ? '8px 24px 8px 12px' : '12px 32px 12px 20px',
                      backgroundColor: isActive ? 'rgba(232,160,32,0.08)' : isHovered ? 'rgba(255,255,255,0.03)' : 'transparent',
                      border: 'none',
                      borderBottom: `2px solid ${isActive ? '#e8a020' : 'transparent'}`,
                      color: isActive ? '#e8a020' : isHovered ? '#d0d8e4' : '#8b95a5',
                      fontSize: 'clamp(14px, 3.2vw, 26px)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-rajdhani), sans-serif',
                      letterSpacing: '0.05em',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t(CATEGORY_LABELS[cat])}
                    {count > 0 && (
                      <span
                        aria-label={t('{count} requests waiting', { count })}
                        style={{ position: 'absolute', top: isMobile ? '2px' : '6px', right: isMobile ? '2px' : '6px' }}
                      >
                        <CountBadge count={count} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div style={{ padding: `${isMobile ? '16px' : '20px'} ${gutter} 40px` }}>
              {buckets.length === 0 ? (
                <p style={{ margin: '24px 0', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                  {t('No requests in this category.')}
                </p>
              ) : (
                <>
                  {/* ── Games in this category that have requests ── */}
                  <p
                    className="sub-heading"
                    style={{ margin: '0 0 10px', fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8b95a5' }}
                  >
                    {t('Games with requests')}
                  </p>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 120 : 140}px, ${isMobile ? 140 : 160}px))`,
                      gap: '12px',
                      padding: '6px 6px 0 0',
                    }}
                  >
                    {buckets.map(({ game, requests }) => (
                      <div key={game.id} style={{ position: 'relative' }}>
                        <GameTile
                          game={game}
                          selected={activeBucket?.game.id === game.id}
                          onSelect={() => setActiveGameId(game.id)}
                          lookingCount={lookingCounts[game.id] ?? 0}
                        />
                        <span style={{ position: 'absolute', top: '-6px', right: '-6px', zIndex: 3 }}>
                          <CountBadge count={requests.length} size="sm" />
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* ── Requests for the selected game, below its tile ── */}
                  <div style={{ marginTop: '28px' }}>
                    {activeBucket ? (
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
                            gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
                            gap: '14px',
                            alignItems: 'start',
                          }}
                        >
                          {activeBucket.requests.map((request) => {
                            // Score each request against the profile for ITS game, not the selected one
                            const myProfile = buildProfileFromAnswers(gameKey(findGameById(request.gameId)), profileAnswers)

                            return (
                              <RequestCard
                                key={request.id}
                                request={request}
                                breakdown={explainMatch(myProfile, request.profile)}
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
                    ) : (
                      <p style={{ margin: '8px 0', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                        {t('Pick a game above to see who asked to squad up.')}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
