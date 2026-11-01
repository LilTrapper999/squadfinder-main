'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { useT } from '@/context/I18nContext'
import { useCatalogue } from '@/context/CatalogueContext'
import { MatchCandidate } from '@/lib/types'
import { explainMatch } from '@/lib/matching'
import { buildProfileFromAnswers, gameKey, isProfileComplete, usernameFor } from '@/lib/profileAnswers'
import { ERROR_MESSAGES } from '@/lib/db/rpc'
import { useWindowWidth } from '@/lib/useWindowWidth'
import { useDiscovery } from '@/lib/useDiscovery'
import MatchCard from '@/components/matches/MatchCard'
import AlliesPanel from '@/components/matches/AlliesPanel'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import HeaderActions from '@/components/ui/HeaderActions'
import RequireAuth from '@/components/auth/RequireAuth'
import LogoMark from '@/components/ui/LogoMark'
import ErrorBanner from '@/components/ui/ErrorBanner'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1100

export default function SquadMatchesPage() {
  return (
    <RequireAuth>
      <SquadMatches />
    </RequireAuth>
  )
}

const outlineButton: React.CSSProperties = {
  padding: '10px 24px',
  borderRadius: '8px',
  border: '1px solid #e8a020',
  background: 'transparent',
  color: '#e8a020',
  fontWeight: 700,
  cursor: 'pointer',
  minHeight: '44px',
}

function SquadMatches() {
  const router = useRouter()
  const { t } = useT()
  const {
    selectedGame,
    profileAnswers,
    allies,
    outboundRequests, sendRequest, withdrawRequest,
    showOnlinePlayers, setShowOnlinePlayers,
    requestError, clearRequestError, reloadAll,
  } = useApp()

  const { questions } = useCatalogue()
  const key = gameKey(selectedGame)
  const profileReady = !!selectedGame && isProfileComplete(key, profileAnswers, questions[key])

  // Nothing to browse without a chosen game.
  useEffect(() => {
    if (!selectedGame) router.replace('/select-game')
  }, [selectedGame, router])

  // Searching this game for as long as the page is open; the hook keeps the list fresh.
  const { state, reload } = useDiscovery(selectedGame?.id ?? null, key, showOnlinePlayers, profileReady)

  const [hoverReturn, setHoverReturn] = useState(false)
  const [hoverChangeDetails, setHoverChangeDetails] = useState(false)
  const [toggleError, setToggleError] = useState(false)

  const width = useWindowWidth()
  const isMobile = width < MOBILE_BREAKPOINT
  const isTablet = width < TABLET_BREAKPOINT
  const matchColumns = isMobile ? 1 : isTablet ? 2 : 3

  const username = usernameFor(profileAnswers, key).trim()

  // The server stops listing a candidate once a request is pending / answered, so cards the
  // user has acted on are kept from earlier loads for as long as the page is open.
  const [known, setKnown] = useState<Map<string, MatchCandidate>>(new Map())
  useEffect(() => {
    if (state.kind !== 'ready') return
    setKnown((prev) => {
      const next = new Map(prev)
      for (const m of state.matches) next.set(m.matchRef, m)
      return next
    })
  }, [state])

  const gameRequests = useMemo(
    () => outboundRequests.filter((r) => r.gameSlug === selectedGame?.id),
    [outboundRequests, selectedGame?.id],
  )

  const cards = useMemo(() => {
    const myProfile = buildProfileFromAnswers(key, profileAnswers)
    const listed = state.kind === 'ready' ? state.matches : []
    const listedRefs = new Set(listed.map((m) => m.matchRef))
    const acted = gameRequests
      .map((r) => (r.matchRef && !listedRefs.has(r.matchRef) ? known.get(r.matchRef) : undefined))
      .filter((c): c is MatchCandidate => !!c)
    return [...listed, ...acted].map((candidate) => ({
      candidate,
      breakdown: explainMatch(myProfile, candidate.profile),
      request: gameRequests.find((r) => r.matchRef === candidate.matchRef),
    }))
  }, [state, known, gameRequests, profileAnswers, key])

  const inSquad = gameRequests.some((r) => r.status === 'accepted')

  async function toggleOnline(next: boolean) {
    setToggleError(false)
    try {
      await setShowOnlinePlayers(next)
    } catch {
      setToggleError(true)
    }
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
      {inSquad && (
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

      {requestError && (
        <ErrorBanner
          message={ERROR_MESSAGES[requestError]}
          onDismiss={clearRequestError}
          onRetry={reloadAll}
          style={{ margin: isMobile ? '8px 16px 0' : '8px 24px 0', flexShrink: 0 }}
        />
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
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><LogoMark size={22} />SQUADFINDER</span>
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <button
              onClick={() => router.push('/build-profile')}
              style={{ background: 'none', border: 'none', color: '#8b95a5', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, minHeight: '44px' }}
            >
              {t('← Back')}
            </button>
            <span aria-hidden="true" style={{ color: '#8b95a5', fontSize: '12px', flexShrink: 0 }}>/</span>
            <span style={{ color: '#8b95a5', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('Squad Matches')}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '14px' : '18px', minWidth: 0, flexShrink: 0 }}>
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
          <div style={{ padding: isMobile ? '12px 16px 0' : '16px 28px 0', flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => router.push('/build-profile')}
              onMouseEnter={() => setHoverChangeDetails(true)}
              onMouseLeave={() => setHoverChangeDetails(false)}
              style={{
                flexShrink: 0,
                minHeight: '44px',
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

          <div style={{ padding: isMobile ? '0 16px' : '0 28px', flex: 1 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${matchColumns}, 1fr)`,
                gap: '14px',
                marginBottom: '24px',
              }}
            >
              {cards.map(({ candidate, breakdown, request }, i) => (
                <MatchCard
                  key={candidate.matchRef}
                  candidate={candidate}
                  index={i + 1}
                  breakdown={breakdown}
                  request={request}
                  ally={request ? allies.find((a) => a.requestId === request.id) : undefined}
                  onSend={sendRequest}
                  onWithdraw={withdrawRequest}
                />
              ))}
            </div>

            {!profileReady && (
              <div role="status" style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.7)' }}>
                <p style={{ margin: '0 0 12px' }}>{t('Finish your profile for this game first.')}</p>
                <button type="button" onClick={() => router.push('/build-profile')} style={outlineButton}>
                  {t('Change Details')}
                </button>
              </div>
            )}

            {profileReady && state.kind === 'loading' && (
              <div role="status" aria-busy="true" style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.6)' }}>
                {t('Looking for squadmates…')}
              </div>
            )}

            {profileReady && state.kind === 'error' && (
              <div role="alert" style={{ textAlign: 'center', padding: '32px 0', color: '#fca5a5' }}>
                <p style={{ margin: '0 0 12px' }}>{t(ERROR_MESSAGES[state.code])}</p>
                <button type="button" onClick={reload} style={outlineButton}>
                  {t('Retry')}
                </button>
              </div>
            )}

            {profileReady && state.kind === 'ready' && cards.length === 0 && (
              <div role="status" style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.7)' }}>
                <p style={{ margin: '0 0 6px', fontWeight: 600 }}>{t('Nobody is searching this game right now.')}</p>
                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                  {t('Stay on this page and new players will appear, or also show players who are online.')}
                </p>
              </div>
            )}

            <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>
              {t('Usernames are hidden until both players accept. Declined requests are hidden for 1 hour.')}
            </p>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'rgba(255,255,255,0.7)', minHeight: '44px' }}>
                <input
                  type="checkbox"
                  checked={showOnlinePlayers}
                  onChange={(e) => toggleOnline(e.target.checked)}
                  style={{ accentColor: '#e8a020', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                {t('Also show players who are online')}
              </label>
              {toggleError && (
                <p role="alert" style={{ margin: '4px 0 0', fontSize: '12px', color: '#fca5a5' }}>{t(ERROR_MESSAGES.unknown)}</p>
              )}
            </div>

            {/* Post-acceptance CTA — the homepage is gone, so this loops back to the catalogue */}
            {inSquad && (
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
    </div>
  )
}
