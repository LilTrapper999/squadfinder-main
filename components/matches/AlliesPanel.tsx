'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ally } from '@/lib/types'
import { useApp } from '@/context/AppContext'
import { useT } from '@/context/I18nContext'
import { useWindowWidth } from '@/lib/useWindowWidth'

function getScoreColor(value: number): string {
  if (value >= 90) return '#22c55e'
  if (value >= 80) return '#86efac'
  if (value >= 70) return '#facc15'
  if (value >= 60) return '#f97316'
  return '#ef4444'
}

interface AllyCardProps {
  ally: Ally
}

/** Pinned allies first, then online before offline; otherwise insertion order (sort is stable). */
export function sortAllies(allies: Ally[]): Ally[] {
  const online = (a: Ally) => Number(a.status !== 'offline')
  return [...allies].sort(
    (a, b) => Number(!!b.pinned) - Number(!!a.pinned) || online(b) - online(a)
  )
}

/** Dot colour + label for an ally's presence. "Online" covers searching and in-game alike. */
function presenceOf(status: Ally['status']): { color: string; label: string } {
  if (status === 'ingame') return { color: '#22c55e', label: 'In game' }
  if (status === 'searching') return { color: '#22c55e', label: 'Online' }
  return { color: '#4a5568', label: 'Offline' }
}

interface IconButtonProps {
  label: string
  active: boolean
  activeColor: string
  onClick: () => void
  children: React.ReactNode
}

function IconButton({ label, active, activeColor, onClick, children }: IconButtonProps) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={label}
      title={label}
      aria-pressed={active}
      style={{
        width: '28px',
        height: '28px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '6px',
        cursor: 'pointer',
        border: `1px solid ${active || hovered ? activeColor : 'rgba(255,255,255,0.12)'}`,
        backgroundColor: active ? `${activeColor}22` : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        color: active || hovered ? activeColor : 'rgba(255,255,255,0.45)',
        transition: 'all 0.15s ease',
        padding: 0,
      }}
    >
      {children}
    </button>
  )
}

/**
 * The one ally card used by every "Your Allies" list (select-game and squad-matches).
 * Deliberately minimal: username, match percentage, and the two actions — nothing else.
 */
export function AllyCard({ ally }: AllyCardProps) {
  const router = useRouter()
  const { t } = useT()
  const { toggleAllyPinned, toggleAllyBlocked } = useApp()
  const [hovered, setHovered] = useState(false)
  const presence = presenceOf(ally.status)
  const [copied, setCopied] = useState(false)

  async function copyUsername() {
    try {
      await navigator.clipboard.writeText(ally.username)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked (e.g. insecure context) — nothing useful to do.
    }
  }

  // A blocked ally shouldn't open a chat — the whole point is you've stopped talking.
  const canOpenChat = !ally.blocked && !ally.blockedYou
  function openChat() {
    if (canOpenChat) router.push(`/chat/${ally.id}`)
  }

  const borderColor =
    ally.blocked ? 'rgba(239,68,68,0.45)' :
    ally.pinned ? 'rgba(232,160,32,0.45)' :
    hovered ? 'rgba(232,160,32,0.4)' :
    'rgba(255,255,255,0.08)'

  return (
    <div
      className="ally-card"
      onClick={openChat}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role={canOpenChat ? 'button' : undefined}
      tabIndex={canOpenChat ? 0 : undefined}
      onKeyDown={(e) => { if (e.key === 'Enter') openChat() }}
      style={{
        width: '90%',
        margin: '0 auto 8px',
        backgroundColor: '#1a1d26',
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        padding: '12px 14px',
        gap: '10px',
        flexShrink: 0,
        overflow: 'hidden',
        cursor: canOpenChat ? 'pointer' : 'default',
        opacity: ally.blocked ? 0.6 : 1,
        transition: 'border-color 0.15s ease, opacity 0.15s ease',
      }}
    >
      {/* Username + match percentage */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Username with a small copy icon — paste it into the game's friend search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 2px', minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 600,
              color: '#ffffff',
              fontFamily: 'var(--font-rajdhani), sans-serif',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {ally.username}
          </p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); copyUsername() }}
            aria-label={t('Copy username')}
            title={copied ? t('Copied!') : t('Copy username')}
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              padding: 0,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: copied ? '#22c55e' : 'rgba(255,255,255,0.4)',
              transition: 'color 0.15s ease',
            }}
          >
            {copied ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
        </div>
        <p style={{ margin: 0, fontSize: '12px', color: getScoreColor(ally.overall), fontWeight: 500 }}>
          {t('{score}% match', { score: ally.overall })}
        </p>

        {/* Online / offline — same on every allies list */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
          <span
            aria-hidden="true"
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: presence.color,
              boxShadow: presence.color === '#22c55e' ? '0 0 6px rgba(34,197,94,0.7)' : 'none',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: '11px', color: presence.color === '#22c55e' ? '#22c55e' : '#8b95a5' }}>
            {t(presence.label)}
          </span>
        </div>

        {/* Why the chat is dead — shown on every allies list, per SPEC */}
        {ally.blockedYou && (
          <p style={{ margin: '3px 0 0', fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>
            {t('User has blocked you')}
          </p>
        )}
      </div>

      {/* Pin (favourite) + dislike (block) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <IconButton
          label={ally.pinned ? t('Unpin {name}', { name: ally.username }) : t('Pin {name}', { name: ally.username })}
          active={!!ally.pinned}
          activeColor="#e8a020"
          onClick={() => toggleAllyPinned(ally.id)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={ally.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 17v5" />
            <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
          </svg>
        </IconButton>

        <IconButton
          label={ally.blocked ? t('Unblock {name}', { name: ally.username }) : t('Block {name}', { name: ally.username })}
          active={!!ally.blocked}
          activeColor="#ef4444"
          onClick={() => toggleAllyBlocked(ally.id)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        </IconButton>
      </div>
    </div>
  )
}

interface AlliesPanelProps {
  allies: Ally[]
}

const MOBILE_BREAKPOINT = 768

export default function AlliesPanel({ allies }: AlliesPanelProps) {
  const { t } = useT()
  const isMobile = useWindowWidth() < MOBILE_BREAKPOINT

  return (
    <div
      className="allies-panel"
      style={
        isMobile
          ? {
              width: '100%',
              maxHeight: '35vh',
              backgroundColor: '#111318',
              color: '#ffffff',
              borderLeft: 'none',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
              overflow: 'hidden',
            }
          : {
              width: '18%',
              minWidth: '200px',
              height: '100%',
              backgroundColor: '#111318',
              color: '#ffffff',
              // Panel sits on the right of the page, so the divider goes on its left edge
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
              overflow: 'hidden',
            }
      }
    >
      {/* Panel header */}
      <div
        style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        <p
          className="sub-heading"
          style={{
            margin: 0,
            fontFamily: 'var(--font-rajdhani), sans-serif',
            fontWeight: 700,
            fontSize: '18px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {t('YOUR ALLIES ({count})', { count: allies.length })}
        </p>
      </div>

      {/* Scrollable ally list */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '12px', paddingBottom: '12px' }}>
        {allies.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: '32px 20px',
              opacity: 0.4,
              textAlign: 'center',
            }}
          >
            <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#ffffff', fontFamily: 'var(--font-rajdhani), sans-serif', fontWeight: 700 }}>
              {t('No allies yet.')}
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: '#8b95a5', lineHeight: 1.5 }}>
              {t("Accept a squad request to add them as an ally — you'll be able to chat right away.")}
            </p>
          </div>
        ) : (
          sortAllies(allies).map((ally) => <AllyCard key={ally.id} ally={ally} />)
        )}
      </div>
    </div>
  )
}
