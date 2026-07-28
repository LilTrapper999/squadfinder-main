'use client'

import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { calculateMatch } from '@/lib/matching'
import { buildProfileFromAnswers } from '@/lib/profileAnswers'
import { useWindowWidth } from '@/lib/useWindowWidth'
import RequestCard from '@/components/notifications/RequestCard'
import AnimatedBackground from '@/components/ui/AnimatedBackground'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1100

export default function NotificationsPage() {
  const router = useRouter()
  const {
    selectedGame,
    profileAnswers,
    squadRequests,
    acceptSquadRequest,
    declineSquadRequest,
    declineAndBlockSquadRequest,
  } = useApp()

  const width = useWindowWidth()
  const isMobile = width < MOBILE_BREAKPOINT
  const isTablet = width < TABLET_BREAKPOINT
  const columns = isMobile ? 1 : isTablet ? 2 : 3

  // Same live scoring as /squad-matches — the sender's profile run against the user's answers.
  const myProfile = buildProfileFromAnswers(selectedGame?.id ?? '', profileAnswers)

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
              ← Back
            </button>
            <span style={{ color: '#4a5568', fontSize: '12px', flexShrink: 0 }}>/</span>
            <span style={{ color: '#8b95a5', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Notifications</span>
          </div>
        </div>

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
      </div>

      {/* Page heading + instructions — same banner treatment as the build-profile page */}
      <div style={{ padding: isMobile ? '16px 16px 0' : '20px 28px 0', flexShrink: 0 }}>
        <h1 className="main-heading" style={{ fontSize: 'clamp(24px, 6vw, 40px)', margin: 0 }}>
          NOTIFICATIONS
        </h1>

        <div
          style={{
            marginTop: '12px',
            padding: isMobile ? '16px 18px' : '20px 24px',
            backgroundColor: 'rgba(232,160,32,0.05)',
            border: '1px solid rgba(232,160,32,0.15)',
            borderRadius: '10px',
          }}
        >
          <p
            style={{
              margin: '0 0 8px',
              fontSize: isMobile ? '20px' : '24px',
              fontWeight: 600,
              color: '#ffffff',
              fontFamily: 'var(--font-rajdhani), sans-serif',
            }}
          >
            {squadRequests.length === 0
              ? 'No squad requests waiting'
              : `${squadRequests.length} player${squadRequests.length === 1 ? '' : 's'} want${squadRequests.length === 1 ? 's' : ''} to squad up`}
          </p>
          <p style={{ margin: 0, fontSize: '13px', color: '#8b95a5', lineHeight: 1.6 }}>
            Each card below is a player who sent you a squad request, scored against your own profile.
            Click <span style={{ color: '#e8a020' }}>any percentage</span> — Overall, Gamesmanship, Vibe
            Check or Comms Style — to open the answers they gave for that category.{' '}
            <span style={{ color: '#e8a020' }}>Accept</span> makes you allies and opens a chat,{' '}
            <span style={{ color: '#e8a020' }}>Decline</span> clears the request, and{' '}
            <span style={{ color: '#e8a020' }}>Decline &amp; Block</span> also stops them reaching you again.
          </p>
        </div>
      </div>

      {/* Request cards */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: isMobile ? '16px' : '20px 28px 40px',
          backgroundColor: '#0d0f14',
          marginTop: isMobile ? '16px' : '20px',
        }}
      >
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
              ALL CAUGHT UP
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: '#8b95a5', maxWidth: '360px', lineHeight: 1.5 }}>
              When another player sends you a squad request, it lands here — accept to become allies
              and start chatting straight away.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gap: '14px',
              alignItems: 'start',
            }}
          >
            {squadRequests.map((request, index) => (
              <RequestCard
                key={request.id}
                request={request}
                scores={calculateMatch(myProfile, request.profile)}
                // Cards in the last column open their popup to the left so it stays on-screen
                flipPopup={columns > 1 && index % columns === columns - 1}
                inlinePopup={columns === 1}
                onAccept={() => acceptSquadRequest(request.id)}
                onDecline={() => declineSquadRequest(request.id)}
                onDeclineAndBlock={() => declineAndBlockSquadRequest(request.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
