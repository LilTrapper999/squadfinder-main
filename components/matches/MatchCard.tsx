'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MatchPlayer } from '@/lib/types'
import { useApp } from '@/context/AppContext'
import { scoreToColour } from '@/lib/matchColour'

type CardState = 'default' | 'waiting' | 'accepted' | 'declined'

interface MatchCardProps {
  player: MatchPlayer
  resolvedStatusGame: string | null
  onAccepted: (playerId: string) => void
}

const getBarColor = scoreToColour

function Bar({ value }: { value: number }) {
  const color = getBarColor(value)
  return (
    <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.08)' }}>
      <div style={{ height: '100%', borderRadius: '3px', backgroundColor: color, width: `${value}%`, transition: 'width 0.5s ease' }} />
    </div>
  )
}

export default function MatchCard({
  player,
  resolvedStatusGame,
  onAccepted,
}: MatchCardProps) {
  const router = useRouter()
  const { addAlly } = useApp()
  const [cardState, setCardState] = useState<CardState>('default')
  const [hoverBtn, setHoverBtn] = useState(false)
  const [hoverChatBtn, setHoverChatBtn] = useState(false)

  const isOffline = player.status === 'offline'
  const isWaiting = cardState === 'waiting'
  const isAccepted = cardState === 'accepted'
  const isDeclined = cardState === 'declined'

  // ── 50/50 Request mechanic ────────────────────────────────────────────────
  // Accepting elsewhere doesn't block this card — you can keep requesting more squadmates.
  function handleRequest(e: React.MouseEvent) {
    e.stopPropagation()
    if (isOffline || cardState !== 'default') return
    setCardState('waiting')

    // 2–4 second delay simulates real response
    const delay = 2000 + Math.random() * 2000
    setTimeout(() => {
      const accepted = Math.random() >= 0.5
      if (accepted) {
        setCardState('accepted')
        onAccepted(player.id)
        // Auto-ally on accept — no separate "Add as Ally" step (SPEC_AMENDMENT_11 FIX 1)
        addAlly({
          id: player.id,
          // TODO: fetch revealedUsername from DB once auth is wired up
          username: player.revealedUsername,
          overall: player.overall,
          status: player.status,
          statusGame: resolvedStatusGame,
        })
      } else {
        // Declined cards stay visible permanently — no ally added, no chat access.
        setCardState('declined')
      }
    }, delay)
  }

  function handleGoToChat(e: React.MouseEvent) {
    e.stopPropagation()
    router.push(`/chat/${player.id}`)
  }

  // Status badge
  const statusDotColor =
    player.status === 'ingame' ? '#22c55e' :
    player.status === 'searching' ? '#e8a020' :
    'rgba(255,255,255,0.3)'

  const statusText =
    player.status === 'ingame' ? `Live — ${resolvedStatusGame ?? 'In Game'}` :
    player.status === 'searching' ? 'Searching for a squad' :
    'Offline'

  const statusColor =
    player.status === 'ingame' ? '#22c55e' :
    player.status === 'searching' ? '#e8a020' :
    'rgba(255,255,255,0.3)'

  const overallColor = getBarColor(player.overall)

  // Card border
  const borderColor =
    isAccepted ? '#22c55e' :
    isDeclined ? '#ef4444' :
    'rgba(255,255,255,0.08)'

  return (
    <div
      className={`match-card${isAccepted ? ' accepted' : ''}`}
      style={{
        backgroundColor: '#1a1d26',
        border: `1px solid ${borderColor}`,
        borderRadius: '12px',
        padding: '20px',
        transition: 'border-color 0.2s ease, opacity 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        opacity: isOffline ? 0.5 : 1,
      }}
    >
      {/* Card header: label (or revealed username) left, status right */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px', gap: '8px' }}>
        <h3
          className="main-heading"
          style={{
            fontSize: '18px',
            letterSpacing: '0.05em',
            textTransform: isAccepted ? 'none' : 'uppercase',
          }}
        >
          {/* TODO: revealedUsername fetched from DB once auth is wired up */}
          {isAccepted ? player.revealedUsername : player.label}
        </h3>

        {/* Status badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: statusDotColor }} />
          <span className="sub-heading" style={{ fontSize: '11px', color: statusColor, whiteSpace: 'nowrap' }}>{statusText}</span>
        </div>
      </div>

      {/* Overall */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
          <span className="sub-heading" style={{ fontSize: '13px', fontWeight: 600 }}>Overall Match</span>
          <span style={{ fontSize: '22px', fontWeight: 700, color: overallColor, fontFamily: 'var(--font-rajdhani), sans-serif', lineHeight: 1 }}>
            {player.overall}%
          </span>
        </div>
        <Bar value={player.overall} />
      </div>

      {/* Sub-scores */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[
          { label: 'Gamesmanship', value: player.gamesmanship },
          { label: 'Vibe Check',   value: player.vibe },
          { label: 'Comms Style',  value: player.comms },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#8b95a5' }}>{label}</span>
              <span style={{ fontSize: '12px', color: getBarColor(value), fontWeight: 600 }}>{value}%</span>
            </div>
            <Bar value={value} />
          </div>
        ))}
      </div>

      {/* Comms info — plain badges, not a score (SPEC_AMENDMENT_10 FIX 2) */}
      <div
        className="comms-info-row"
        style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          padding: '4px 0',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          marginTop: '4px',
          marginBottom: '14px',
        }}
      >
        <span
          className={`comms-badge ${player.willingToSpeak ? 'active' : 'inactive'}`}
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            color: player.willingToSpeak ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.28)',
          }}
        >
          🎙 {player.willingToSpeak ? 'Mic on' : 'Mic off'}
        </span>
        <span
          className={`comms-badge ${player.willingToChat ? 'active' : 'inactive'}`}
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            color: player.willingToChat ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.28)',
          }}
        >
          💬 {player.willingToChat ? 'Types' : 'No text'}
        </span>
      </div>

      {/* CTA area */}
      <div style={{ marginTop: 'auto' }}>

        {/* Default: Request to Squad */}
        {cardState === 'default' && (
          <button
            onClick={handleRequest}
            onMouseEnter={() => setHoverBtn(true)}
            onMouseLeave={() => setHoverBtn(false)}
            disabled={isOffline}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: `1px solid ${isOffline ? 'rgba(255,255,255,0.08)' : '#e8a020'}`,
              backgroundColor: isOffline ? 'rgba(255,255,255,0.03)' : hoverBtn ? '#f0b030' : '#e8a020',
              color: isOffline ? '#4a5568' : '#0a0b0f',
              fontSize: '13px',
              fontWeight: 700,
              cursor: isOffline ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-rajdhani), sans-serif',
              letterSpacing: '0.04em',
              transition: 'all 0.15s ease',
            }}
          >
            {isOffline ? 'Player Offline' : 'Request to Squad'}
          </button>
        )}

        {/* Waiting: pulsing amber spinner state */}
        {isWaiting && (
          <div
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid rgba(232,160,32,0.4)',
              backgroundColor: 'rgba(232,160,32,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {/* Simple CSS spinner */}
            <span
              style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                border: '2px solid rgba(232,160,32,0.3)',
                borderTopColor: '#e8a020',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span
              style={{
                color: '#e8a020',
                fontSize: '13px',
                fontWeight: 700,
                fontFamily: 'var(--font-rajdhani), sans-serif',
                letterSpacing: '0.04em',
                animation: 'subPulse 1.5s ease-in-out infinite',
              }}
            >
              Waiting...
            </span>
          </div>
        )}

        {/* Accepted */}
        {isAccepted && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                padding: '9px 14px',
                borderRadius: '6px',
                border: '1px solid rgba(34,197,94,0.3)',
                backgroundColor: 'rgba(34,197,94,0.08)',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <span style={{ color: '#22c55e', fontSize: '14px' }}>✓</span>
              <span style={{ color: '#22c55e', fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-rajdhani), sans-serif' }}>
                Squad Accepted
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
              You are now allies.
            </p>

            {/* Go to chat — auto-allied, no separate "Add as Ally" step (SPEC_AMENDMENT_11 FIX 1/2) */}
            <button
              onClick={handleGoToChat}
              onMouseEnter={() => setHoverChatBtn(true)}
              onMouseLeave={() => setHoverChatBtn(false)}
              style={{
                width: '100%',
                padding: '9px',
                borderRadius: '6px',
                border: '1px solid #e8a020',
                backgroundColor: hoverChatBtn ? 'rgba(232,160,32,0.12)' : 'transparent',
                color: '#e8a020',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-rajdhani), sans-serif',
                letterSpacing: '0.03em',
                transition: 'all 0.15s ease',
              }}
            >
              Go to chat →
            </button>
          </div>
        )}

        {/* Declined — brief visual before parent removes from DOM */}
        {isDeclined && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                padding: '9px 14px',
                borderRadius: '6px',
                border: '1px solid rgba(239,68,68,0.3)',
                backgroundColor: 'rgba(239,68,68,0.08)',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <span style={{ color: '#ef4444', fontSize: '14px' }}>✗</span>
              <span style={{ color: '#ef4444', fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-rajdhani), sans-serif' }}>
                Squad Declined
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
              This player declined your request.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
