'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'

interface NotificationBellProps {
  /** Overrides the badge count — defaults to the number of pending squad requests */
  count?: number
  size?: number
}

/**
 * Bell icon shown top-right on /squad-matches and in the global TopNav.
 * The red badge counts squad requests waiting for an answer; clicking opens /notifications.
 */
export default function NotificationBell({ count, size = 20 }: NotificationBellProps) {
  const router = useRouter()
  const { squadRequests } = useApp()
  const [hovered, setHovered] = useState(false)

  const total = count ?? squadRequests.length

  return (
    <button
      onClick={() => router.push('/notifications')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={total > 0 ? `Notifications — ${total} squad requests` : 'Notifications'}
      style={{
        position: 'relative',
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        color: hovered ? '#e8a020' : 'rgba(255,255,255,0.6)',
        transform: hovered ? 'scale(1.15)' : 'scale(1)',
        filter: hovered ? 'drop-shadow(0 0 8px rgba(232,160,32,0.8))' : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>

      {/* Red count badge — top-right of the bell */}
      {total > 0 && (
        <span
          style={{
            position: 'absolute',
            top: '-5px',
            right: '-6px',
            minWidth: '16px',
            height: '16px',
            padding: '0 4px',
            borderRadius: '8px',
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
          }}
        >
          {total > 9 ? '9+' : total}
        </span>
      )}
    </button>
  )
}
