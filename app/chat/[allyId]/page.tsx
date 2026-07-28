'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { scoreToColour } from '@/lib/matchColour'
import ToggleSwitch from '@/components/ui/ToggleSwitch'
import { useWindowWidth } from '@/lib/useWindowWidth'

const MOBILE_BREAKPOINT = 480

export default function ChatPage() {
  const params = useParams<{ allyId: string }>()
  const allyId = params.allyId
  const router = useRouter()
  const { allies, getChat, sendMessage, toggleDisappearingMessages, pruneExpiredMessages } = useApp()
  const isMobile = useWindowWidth() < MOBILE_BREAKPOINT

  const ally = allies.find(a => a.id === allyId)
  const chat = getChat(allyId)
  const messages = chat?.messages ?? []
  const disappearing = chat?.disappearingMessages ?? false

  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Expiry check runs every time the chat is opened (SPEC_AMENDMENT_11 FIX 3)
  useEffect(() => {
    pruneExpiredMessages(allyId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allyId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  function handleSend() {
    if (!draft.trim()) return
    sendMessage(allyId, draft)
    setDraft('')
  }

  // ── Ally not found (e.g. direct link to a stale/unknown id) ──────────────
  if (!ally) {
    return (
      <div
        className="page-content"
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '12px', backgroundColor: '#0a0b0f', color: '#ffffff', zIndex: 1, position: 'relative',
        }}
      >
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)' }}>Ally not found.</p>
        <button
          onClick={() => router.push('/home')}
          style={{
            padding: '10px 20px', borderRadius: '6px', border: '1px solid #e8a020',
            backgroundColor: 'transparent', color: '#e8a020', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font-rajdhani), sans-serif',
          }}
        >
          ← Back to Home
        </button>
      </div>
    )
  }

  const statusDotColor =
    ally.status === 'ingame' ? '#22c55e' :
    ally.status === 'searching' ? '#e8a020' :
    'rgba(255,255,255,0.3)'

  const statusText =
    ally.status === 'ingame' ? `Live — ${ally.statusGame ?? 'In Game'}` :
    ally.status === 'searching' ? 'Searching for a squad' :
    'Offline'

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
        color: '#ffffff',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          height: '60px',
          backgroundColor: '#111318',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          flexShrink: 0,
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <button
            onClick={() => router.back()}
            aria-label="Back"
            style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
              fontSize: '18px', cursor: 'pointer', padding: '4px', lineHeight: 1,
            }}
          >
            ←
          </button>
          <div
            style={{
              width: '36px', height: '36px', flexShrink: 0, backgroundColor: '#0a0b0f',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-rajdhani), sans-serif', fontSize: '9px', fontWeight: 700,
              color: 'rgba(255,255,255,0.2)', letterSpacing: '0.05em',
            }}
          >
            PFP
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0, fontSize: '14px', fontWeight: 700, color: '#ffffff',
                fontFamily: 'var(--font-rajdhani), sans-serif',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {ally.username}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusDotColor }} />
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>{statusText}</span>
              <span style={{ fontSize: '11px', color: scoreToColour(ally.overall), fontWeight: 600 }}>· {ally.overall}%</span>
            </div>
          </div>
        </div>

        {/* Disappearing messages toggle (SPEC_AMENDMENT_11 FIX 3) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span
            style={{
              fontSize: '12px',
              color: disappearing ? '#e8a020' : 'rgba(255,255,255,0.5)',
              fontFamily: 'Inter, sans-serif',
              whiteSpace: 'nowrap',
            }}
          >
            {isMobile ? '⏱' : '⏱ Disappearing messages'}
          </span>
          <ToggleSwitch
            checked={disappearing}
            onChange={() => toggleDisappearingMessages(allyId)}
            label="Disappearing messages"
          />
        </div>
      </div>

      {/* Disappearing messages banner */}
      {disappearing && (
        <div
          style={{
            backgroundColor: 'rgba(232,160,32,0.1)',
            borderBottom: '1px solid rgba(232,160,32,0.2)',
            padding: '8px 20px',
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '12px', color: '#e8a020', fontFamily: 'Inter, sans-serif' }}>
            ⏱ Messages disappear after 24 hours
          </span>
        </div>
      )}

      {/* Message list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
              No messages yet. Say hello 👋
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === 'me'
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', maxWidth: isMobile ? '85%' : '70%' }}>
                  {disappearing && !isMe && <span style={{ fontSize: '11px', color: '#e8a020' }}>⏱</span>}
                  <div
                    style={{
                      backgroundColor: isMe ? 'rgba(232,160,32,0.15)' : '#1a1d26',
                      border: `1px solid ${isMe ? 'rgba(232,160,32,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: '12px',
                      padding: '9px 13px',
                      color: '#ffffff',
                      fontSize: '13px',
                      lineHeight: 1.4,
                      wordBreak: 'break-word',
                    }}
                  >
                    {msg.content}
                  </div>
                  {disappearing && isMe && <span style={{ fontSize: '11px', color: '#e8a020' }}>⏱</span>}
                </div>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '3px', padding: '0 4px' }}>
                  {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input — pinned to bottom, send on Enter or button */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          backgroundColor: '#111318',
          padding: '12px 16px',
          display: 'flex',
          gap: '10px',
          flexShrink: 0,
        }}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
          placeholder="Type a message…"
          style={{
            flex: 1,
            padding: '10px 14px',
            backgroundColor: '#1a1d26',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '13px',
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim()}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: draft.trim() ? '#e8a020' : 'rgba(255,255,255,0.05)',
            color: draft.trim() ? '#0a0b0f' : '#4a5568',
            fontSize: '13px',
            fontWeight: 700,
            cursor: draft.trim() ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font-rajdhani), sans-serif',
            letterSpacing: '0.03em',
            transition: 'all 0.15s ease',
          }}
        >
          Send
        </button>
      </div>
    </div>
  )
}
