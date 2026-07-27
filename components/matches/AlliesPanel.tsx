'use client'

import { Ally } from '@/lib/types'

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

function AllyCard({ ally }: AllyCardProps) {
  const statusDotColor =
    ally.status === 'ingame' ? '#22c55e' :
    ally.status === 'searching' ? '#e8a020' :
    'rgba(255,255,255,0.3)'

  const statusText =
    ally.status === 'ingame' ? `Live — ${ally.statusGame ?? 'In Game'}` :
    ally.status === 'searching' ? 'Searching for a squad' :
    'Offline'

  const statusColor =
    ally.status === 'ingame' ? '#22c55e' :
    ally.status === 'searching' ? '#e8a020' :
    'rgba(255,255,255,0.3)'

  return (
    <div
      className="ally-card"
      style={{
        width: '90%',
        height: 'calc(100vh / 7)',
        margin: '0 auto 8px',
        backgroundColor: '#1a1d26',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        gap: '12px',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* PFP placeholder */}
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

      {/* Name + overall */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: '0 0 2px',
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
        <p style={{ margin: 0, fontSize: '12px', color: getScoreColor(ally.overall), fontWeight: 500 }}>
          Overall: {ally.overall}%
        </p>
      </div>

      {/* Status badge — top right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusDotColor }} />
        <span style={{ fontSize: '11px', color: statusColor, whiteSpace: 'nowrap' }}>{statusText}</span>
      </div>
    </div>
  )
}

interface AlliesPanelProps {
  allies: Ally[]
}

export default function AlliesPanel({ allies }: AlliesPanelProps) {
  return (
    <div
      className="allies-panel"
      style={{
        width: '40%',
        height: '100%',
        backgroundColor: '#111318',
        color: '#ffffff',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}
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
          YOUR ALLIES ({allies.length})
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
              No allies yet.
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: '#8b95a5', lineHeight: 1.5 }}>
              Accept a squad request and add them as an ally to see them here.
            </p>
          </div>
        ) : (
          allies.map((ally) => <AllyCard key={ally.id} ally={ally} />)
        )}
      </div>
    </div>
  )
}
