'use client'

import RequireAuth from '@/components/auth/RequireAuth'
import { useRouter } from 'next/navigation'
import ProfileForm from '@/components/profile/ProfileForm'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import HeaderActions from '@/components/ui/HeaderActions'
import { useWindowWidth } from '@/lib/useWindowWidth'
import { useT } from '@/context/I18nContext'
import LogoMark from '@/components/ui/LogoMark'

const MOBILE_BREAKPOINT = 768

export default function BuildProfilePage() {
  return (
    <RequireAuth>
      <BuildProfilePageInner />
    </RequireAuth>
  )
}

function BuildProfilePageInner() {
  const router = useRouter()
  const { t } = useT()
  const isMobile = useWindowWidth() < MOBILE_BREAKPOINT

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
          padding: isMobile ? '0 16px' : '0 24px',
          gap: isMobile ? '10px' : '16px',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {!isMobile && (
          <span
            style={{
              fontFamily: 'var(--font-rajdhani), sans-serif',
              fontSize: '16px',
              fontWeight: 700,
              color: '#e8a020',
              letterSpacing: '0.05em',
              flexShrink: 0,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><LogoMark size={22} />SQUADFINDER</span>
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
          <button
            onClick={() => router.push('/select-game')}
            style={{
              background: 'none',
              border: 'none',
              color: '#8b95a5',
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >
            {t('← Back')}
          </button>
          {!isMobile && (
            <>
              <span style={{ color: '#8b95a5', fontSize: '12px' }}>/</span>
              <span style={{ color: '#8b95a5', fontSize: '13px' }}>{t('Select Game')}</span>
            </>
          )}
          <span style={{ color: '#8b95a5', fontSize: '12px' }}>/</span>
          <span style={{ color: '#8b95a5', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('Build Profile')}</span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <HeaderActions />
        </div>
      </div>

      {/* Content — full width, scrollable */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: isMobile ? '16px 20px 40px' : '20px 48px 40px',
          backgroundColor: '#0a0b0f',
          color: '#ffffff',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Page heading */}
        <div style={{ marginBottom: '24px' }}>
          <h1 className="main-heading" style={{ fontSize: 'clamp(24px, 6vw, 40px)', margin: 0 }}>
            {t('HELP US FIND YOUR SQUAD')}
          </h1>
        </div>

        <ProfileForm />
      </div>
    </div>
  )
}
