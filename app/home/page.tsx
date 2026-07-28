'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MOCK_SQUAD, MOCK_HOMEPAGE_ALLIES } from '@/lib/mockData'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import { useApp } from '@/context/AppContext'
import { MatchStatus } from '@/lib/types'
import { useWindowWidth } from '@/lib/useWindowWidth'

const MOBILE_BREAKPOINT = 768

type AllyStatus = 'searching' | 'in-squad' | 'offline'
type InviteState = 'idle' | 'inviting' | 'accepted' | 'declined'

// Homepage cards use their own lightweight status enum ('in-squad' has no MatchStatus
// equivalent) — mapped to the closest MatchStatus when opening a real ally chat record.
function toMatchStatus(s: AllyStatus): MatchStatus {
  if (s === 'in-squad') return 'ingame'
  return s
}

interface HomepageAlly {
  id: string
  username: string
  overall: number
  status: AllyStatus
}

interface SquadMember {
  id: string
  username: string
  overall: number
  /** true = newly joined (shows amber top border that fades after 3s) */
  newlyJoined?: boolean
}

function getBarColor(value: number): string {
  if (value >= 90) return '#22c55e'
  if (value >= 80) return '#86efac'
  if (value >= 70) return '#facc15'
  if (value >= 60) return '#f97316'
  return '#ef4444'
}

function MiniBar({ value }: { value: number }) {
  const color = getBarColor(value)
  return (
    <div style={{ height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.08)', marginTop: '3px' }}>
      <div style={{ height: '100%', borderRadius: '2px', backgroundColor: color, width: `${value}%` }} />
    </div>
  )
}

function PFP() {
  return (
    <div style={{
      width: '36px',
      height: '36px',
      flexShrink: 0,
      backgroundColor: '#111318',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-rajdhani), sans-serif',
      fontSize: '9px',
      fontWeight: 700,
      color: 'rgba(255,255,255,0.2)',
      letterSpacing: '0.05em',
    }}>
      PFP
    </div>
  )
}

const STATUS_LABEL: Record<AllyStatus, string> = {
  'searching': '● Searching for a squad',
  'in-squad':  '● In squad',
  'offline':   '● Offline',
}

const STATUS_COLOR: Record<AllyStatus, string> = {
  'searching': '#22c55e',
  'in-squad':  '#facc15',
  'offline':   'rgba(255,255,255,0.3)',
}

const CARD_HEIGHT = 'calc(100vh / 8)'
const CARD_STYLE: React.CSSProperties = {
  height: CARD_HEIGHT,
  width: '90%',
  margin: '0 auto 6px',
  backgroundColor: '#1a1d26',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px',
  padding: '10px 12px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  boxSizing: 'border-box',
}

export default function HomePage() {
  const router = useRouter()
  const { addAlly } = useApp()

  // Ensures a real AppContext ally + chat record exists before opening the chat page
  // (this page's squad/allies lists are local mock state, not wired to AppContext).
  function openChat(id: string, username: string, overall: number, status: AllyStatus) {
    addAlly({ id, username, overall, status: toMatchStatus(status), statusGame: null })
    router.push(`/chat/${id}`)
  }
  const [hoverFindSquad, setHoverFindSquad] = useState(false)
  const isMobile = useWindowWidth() < MOBILE_BREAKPOINT

  // Squad state — start with mock data, allies can join
  const [squadMembers, setSquadMembers] = useState<SquadMember[]>(
    MOCK_SQUAD.map((m) => ({ ...m }))
  )

  // Ally state — start with mock data
  const [allies, setAllies] = useState<HomepageAlly[]>(
    MOCK_HOMEPAGE_ALLIES.map((a) => ({ ...a }))
  )

  // Per-ally invite state
  const [inviteStates, setInviteStates] = useState<Record<string, InviteState>>({})

  const maxSquadSize = 4 // including self
  const selfCount = 1
  const squadFull = squadMembers.length + selfCount >= maxSquadSize

  function setInvite(allyId: string, state: InviteState) {
    setInviteStates((prev) => ({ ...prev, [allyId]: state }))
  }

  function handleInvite(ally: HomepageAlly) {
    if (inviteStates[ally.id] && inviteStates[ally.id] !== 'idle') return
    setInvite(ally.id, 'inviting')

    const delay = 1000 + Math.random() * 2000
    setTimeout(() => {
      const accepted = Math.random() >= 0.5
      if (accepted) {
        setInvite(ally.id, 'accepted')
        // Move ally into squad with amber highlight
        const newMember: SquadMember = { id: ally.id, username: ally.username, overall: ally.overall, newlyJoined: true }
        setSquadMembers((prev) => [...prev, newMember])
        // Remove from allies list
        setAllies((prev) => prev.filter((a) => a.id !== ally.id))
        // Fade the amber border after 3 seconds
        setTimeout(() => {
          setSquadMembers((prev) =>
            prev.map((m) => m.id === ally.id ? { ...m, newlyJoined: false } : m)
          )
        }, 3000)
      } else {
        setInvite(ally.id, 'declined')
      }
    }, delay)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <AnimatedBackground />

      {/* Top nav is provided by the global TopNav in layout.tsx */}

      {/* ── Main layout: sidebar + feed — stacks vertically on narrow viewports ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: isMobile ? 'auto' : 'hidden' }}>

        {/* ── LEFT SIDEBAR (25% desktop / full-width capped-height on mobile) ── */}
        <div style={{
          width: isMobile ? '100%' : '25%',
          maxHeight: isMobile ? '45vh' : undefined,
          flexShrink: 0,
          borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.08)',
          borderBottom: isMobile ? '1px solid rgba(255,255,255,0.08)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Sidebar header — pinned */}
          <div style={{ padding: '16px 16px 12px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <h2
              className="main-heading"
              style={{ fontSize: '18px', margin: 0 }}
            >
              YOUR BATTLE BUDDIES
            </h2>
          </div>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>

            {/* ── YOUR SQUAD section ─────────────────────────────────────────── */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '12px', paddingTop: '10px' }}>
              <p
                className="sub-heading"
                style={{
                  margin: '0 0 10px 16px',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-rajdhani), sans-serif',
                }}
              >
                YOUR SQUAD
              </p>

              {squadMembers.length === 0 ? (
                <p style={{ margin: '0 16px', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                  No squad members yet.
                </p>
              ) : (
                squadMembers.map((member) => (
                  <div
                    key={member.id}
                    onClick={() => openChat(member.id, member.username, member.overall, 'in-squad')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') openChat(member.id, member.username, member.overall, 'in-squad') }}
                    style={{
                      ...CARD_STYLE,
                      borderTop: member.newlyJoined ? '2px solid #e8a020' : '1px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer',
                      transition: 'border-top 0.5s ease',
                    }}
                  >
                    <PFP />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#ffffff', fontFamily: 'var(--font-rajdhani), sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {member.username}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <span style={{ fontSize: '11px', color: getBarColor(member.overall), fontWeight: 600 }}>
                          Overall: {member.overall}%
                        </span>
                      </div>
                      <MiniBar value={member.overall} />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ── ALLIES section ──────────────────────────────────────────────── */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '16px', paddingTop: '10px' }}>
              <p
                className="sub-heading"
                style={{
                  margin: '0 0 10px 16px',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-rajdhani), sans-serif',
                }}
              >
                ALLIES
              </p>

              {allies.length === 0 ? (
                <p style={{ margin: '0 16px', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                  No allies yet.
                </p>
              ) : (
                allies.map((ally) => {
                  const invState = inviteStates[ally.id] ?? 'idle'

                  return (
                    <div
                      key={ally.id}
                      onClick={() => openChat(ally.id, ally.username, ally.overall, ally.status)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') openChat(ally.id, ally.username, ally.overall, ally.status) }}
                      style={{ ...CARD_STYLE, cursor: 'pointer' }}
                    >
                      <PFP />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Top row: username + invite button */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px' }}>
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#ffffff', fontFamily: 'var(--font-rajdhani), sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ally.username}
                          </p>

                          {/* Invite to Squad button — shown only when searching and squad not full */}
                          {ally.status === 'searching' && (
                            squadFull ? (
                              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                Squad Full
                              </span>
                            ) : invState === 'idle' ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleInvite(ally) }}
                                style={{
                                  flexShrink: 0,
                                  fontSize: '11px',
                                  padding: '4px 10px',
                                  border: '1px solid #e8a020',
                                  borderRadius: '4px',
                                  backgroundColor: 'transparent',
                                  color: '#e8a020',
                                  cursor: 'pointer',
                                  fontFamily: 'inherit',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Invite to Squad
                              </button>
                            ) : invState === 'inviting' ? (
                              <span style={{ fontSize: '11px', color: '#e8a020', animation: 'subPulse 1.2s ease-in-out infinite', flexShrink: 0 }}>
                                Inviting...
                              </span>
                            ) : invState === 'declined' ? (
                              <span style={{ fontSize: '11px', color: '#4a5568', flexShrink: 0 }}>
                                ✗ Declined
                              </span>
                            ) : null
                          )}
                        </div>

                        {/* Overall bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                          <span style={{ fontSize: '11px', color: getBarColor(ally.overall), fontWeight: 600 }}>
                            Overall: {ally.overall}%
                          </span>
                        </div>
                        <MiniBar value={ally.overall} />

                        {/* Status */}
                        <p style={{ margin: '3px 0 0', fontSize: '10px', color: STATUS_COLOR[ally.status] }}>
                          {STATUS_LABEL[ally.status]}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* FIX 8 — FIND YOUR SQUAD button below Allies section */}
            <div style={{ width: '90%', margin: '16px auto 0' }}>
              <button
                onClick={() => router.push('/squad-matches')}
                onMouseEnter={() => setHoverFindSquad(true)}
                onMouseLeave={() => setHoverFindSquad(false)}
                className="main-heading"
                style={{
                  width: '100%',
                  padding: '14px 0',
                  border: '2px solid #e8a020',
                  backgroundColor: hoverFindSquad ? 'rgba(232,160,32,0.12)' : 'transparent',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
                  boxShadow: hoverFindSquad ? '0 0 20px rgba(232,160,32,0.3)' : '0 0 8px rgba(232,160,32,0.1)',
                }}
              >
                FIND YOUR SQUAD
              </button>
            </div>

          </div>
        </div>

        {/* ── FEED AREA (75%) ──────────────────────────────────────────────────── */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '24px',
          boxSizing: 'border-box',
          minHeight: isMobile ? '40vh' : undefined,
        }}>
          <h1 className="main-heading" style={{ fontSize: 'clamp(24px, 6vw, 36px)' }}>
            COMING SOON
          </h1>
          <p
            className="sub-heading"
            style={{
              margin: 0,
              fontSize: '14px',
              textAlign: 'center',
              maxWidth: '480px',
              lineHeight: 1.6,
              fontFamily: 'var(--font-rajdhani), sans-serif',
            }}
          >
            Your feed will show clips, highlights, and updates from your squad and allies.
          </p>
        </div>

      </div>
    </div>
  )
}
