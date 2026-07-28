'use client'

import { useRouter } from 'next/navigation'
import ProfileForm from '@/components/profile/ProfileForm'
import AnimatedBackground from '@/components/ui/AnimatedBackground'

export default function BuildProfilePage() {
  const router = useRouter()

  return (
    <div
      className="page-content"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
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
          padding: '0 24px',
          gap: '16px',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-rajdhani), sans-serif',
            fontSize: '16px',
            fontWeight: 700,
            color: '#e8a020',
            letterSpacing: '0.05em',
          }}
        >
          SQUADFINDER
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => router.push('/select-game')}
            style={{
              background: 'none',
              border: 'none',
              color: '#4a5568',
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ← Back
          </button>
          <span style={{ color: '#4a5568', fontSize: '12px' }}>/</span>
          <span style={{ color: '#4a5568', fontSize: '13px' }}>Select Game</span>
          <span style={{ color: '#4a5568', fontSize: '12px' }}>/</span>
          <span style={{ color: '#8b95a5', fontSize: '13px' }}>Build Profile</span>
        </div>
      </div>

      {/* Content — full width, scrollable */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 48px 40px',
          backgroundColor: '#0a0b0f',
          color: '#ffffff',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Page heading */}
        <div style={{ marginBottom: '24px' }}>
          <h1 className="main-heading" style={{ fontSize: '28px', margin: 0 }}>
            HELP US FIND YOUR SQUAD
          </h1>
        </div>

        <ProfileForm />
      </div>
    </div>
  )
}
