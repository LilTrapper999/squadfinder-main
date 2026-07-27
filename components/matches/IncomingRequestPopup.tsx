'use client'

import { useEffect, useRef, useState } from 'react'
import { IncomingRequest } from '@/lib/types'

interface IncomingRequestPopupProps {
  request: IncomingRequest
  queueLength: number          // how many more are waiting after this one
  /** Accepting always auto-allies — no separate "Add as Ally" step (SPEC_AMENDMENT_11 FIX 1) */
  onAccept: () => void
  onDecline: () => void
  onDeclineAndBlock: () => void
  onExpire: () => void
}

function getBarColor(value: number): string {
  if (value >= 90) return '#22c55e'
  if (value >= 80) return '#86efac'
  if (value >= 70) return '#facc15'
  if (value >= 60) return '#f97316'
  return '#ef4444'
}

export default function IncomingRequestPopup({
  request,
  queueLength,
  onAccept,
  onDecline,
  onDeclineAndBlock,
  onExpire,
}: IncomingRequestPopupProps) {
  const DURATION = 20 // seconds
  const [secondsLeft, setSecondsLeft] = useState(DURATION)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Countdown timer
  useEffect(() => {
    setSecondsLeft(DURATION)
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!)
          onExpire()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [request.id]) // reset when a new request appears

  const progress = (secondsLeft / DURATION) * 100
  const barColor = secondsLeft > 10 ? '#e8a020' : '#ef4444'

  const statusDotColor =
    request.senderStatus === 'ingame' ? '#22c55e' :
    request.senderStatus === 'searching' ? '#e8a020' :
    'rgba(255,255,255,0.3)'

  const statusText =
    request.senderStatus === 'ingame' ? `Live — ${request.senderStatusGame ?? 'In Game'}` :
    request.senderStatus === 'searching' ? 'Searching for a squad' :
    'Offline'

  const statusColor =
    request.senderStatus === 'ingame' ? '#22c55e' :
    request.senderStatus === 'searching' ? '#e8a020' :
    'rgba(255,255,255,0.3)'

  const overallColor = getBarColor(request.overallMatch)

  return (
    <>
      {/* Dark backdrop */}
      <div
        className="popup-backdrop"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          zIndex: 999,
        }}
      />

      {/* Popup */}
      <div
        className="popup-card"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          width: '33vw',
          minWidth: '320px',
          minHeight: 'calc(100vh / 6)',
          backgroundColor: '#111318',
          border: '1px solid rgba(232,160,32,0.4)',
          borderRadius: '14px',
          padding: '28px 28px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: '0 0 40px rgba(232,160,32,0.4), 0 0 80px rgba(232,160,32,0.15)',
          animation: 'glowPulse 2.5s ease-in-out infinite',
        }}
      >
        {/* Heading */}
        <div>
          <h2
            className="main-heading"
            style={{ fontSize: '22px', margin: 0 }}
          >
            MATCH REQUEST{queueLength > 0 ? ` (${queueLength} more waiting)` : ''}
          </h2>
        </div>

        {/* Sender info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* PFP */}
          <div
            style={{
              width: '40px',
              height: '40px',
              flexShrink: 0,
              backgroundColor: '#0a0b0f',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-rajdhani), sans-serif',
              fontSize: '11px',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.2)',
              letterSpacing: '0.05em',
            }}
          >
            PFP
          </div>

          <div style={{ flex: 1 }}>
            {/* Username */}
            <p
              style={{
                margin: '0 0 4px',
                fontSize: '16px',
                fontWeight: 700,
                color: '#ffffff',
                fontFamily: 'var(--font-rajdhani), sans-serif',
              }}
            >
              {request.senderUsername}
            </p>

            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusDotColor }} />
              <span style={{ fontSize: '12px', color: statusColor }}>{statusText}</span>
            </div>

            {/* Overall match */}
            <p style={{ margin: 0, fontSize: '13px', color: overallColor, fontWeight: 600 }}>
              Overall Match: {request.overallMatch}%
            </p>
          </div>
        </div>

        {/* Action buttons — secondary pair on top, primary Accept full-width below (auto-allies) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {/* Decline */}
            <button
              onClick={onDecline}
              style={{
                padding: '11px',
                borderRadius: '7px',
                border: '1px solid rgba(255,255,255,0.2)',
                backgroundColor: 'transparent',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-rajdhani), sans-serif',
                letterSpacing: '0.03em',
                transition: 'all 0.15s ease',
              }}
            >
              Decline
            </button>

            {/* Decline & Block */}
            <button
              onClick={onDeclineAndBlock}
              style={{
                padding: '11px',
                borderRadius: '7px',
                border: '1px solid #ef4444',
                backgroundColor: 'rgba(239,68,68,0.08)',
                color: '#ef4444',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-rajdhani), sans-serif',
                letterSpacing: '0.03em',
                transition: 'all 0.15s ease',
              }}
            >
              Decline &amp; Block
            </button>
          </div>

          {/* Accept — automatically adds each other as allies (SPEC_AMENDMENT_11 FIX 1) */}
          <button
            onClick={onAccept}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '7px',
              border: 'none',
              backgroundColor: '#e8a020',
              color: '#0a0b0f',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--font-rajdhani), sans-serif',
              letterSpacing: '0.04em',
              transition: 'all 0.15s ease',
            }}
          >
            Accept
          </button>
        </div>

        {/* Countdown bar */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                backgroundColor: 'rgba(255,255,255,0.08)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  backgroundColor: barColor,
                  borderRadius: '2px',
                  transition: 'width 1s linear, background-color 0.5s ease',
                }}
              />
            </div>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', width: '28px', textAlign: 'right', flexShrink: 0 }}>
              {secondsLeft}s
            </span>
          </div>
        </div>
      </div>

      {/* Keyframe for popup glow pulse — injected inline since it mirrors subPulse */}
      <style>{`
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 40px rgba(232,160,32,0.4), 0 0 80px rgba(232,160,32,0.15); }
          50%       { box-shadow: 0 0 60px rgba(232,160,32,0.65), 0 0 120px rgba(232,160,32,0.25); }
        }
      `}</style>
    </>
  )
}
