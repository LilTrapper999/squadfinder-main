'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/context/I18nContext'
import { supabase } from '@/lib/supabase/client'
import EmailAuthForm from '@/components/auth/EmailAuthForm'
import LogoMark from '@/components/ui/LogoMark'
import { redirectOrigin } from '@/lib/siteUrl'

export default function LoginCard() {
  const router = useRouter()
  const { t } = useT()
  const [deleted, setDeleted] = useState(false)
  const [hoveredGoogle, setHoveredGoogle] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const [signInError, setSignInError] = useState(false)

  // /?deleted=1 is where account deletion lands: say so once, then tidy the address bar.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('deleted') === '1') {
      setDeleted(true)
      window.history.replaceState(null, '', '/')
    }
  }, [])

  // Google redirects back to this page with a session in the URL; supabase-js picks it up
  // and fires SIGNED_IN. An already-signed-in visitor is sent straight into the app.
  // Both new and returning users start at select-game — isReturningUser only changes what
  // happens *after* a game is picked (skip build-profile straight to squad-matches or not).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/select-game')
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) router.replace('/select-game')
    })
    return () => listener.subscription.unsubscribe()
  }, [router])

  async function handleGoogleClick() {
    setSigningIn(true)
    setSignInError(false)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${redirectOrigin()}/`,
        // Always show Google's account chooser so a returning user can pick (or switch) accounts
        // instead of being signed straight back in as the last one.
        queryParams: { prompt: 'select_account' },
      },
    })
    // On success the browser navigates to Google, so only the failure path returns here.
    if (error) {
      setSigningIn(false)
      setSignInError(true)
    }
  }

  return (
    <div
      className="login-card"
      style={{
        backgroundColor: '#111318',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: 'clamp(28px, 6vw, 48px) clamp(20px, 5vw, 40px)',
        width: '100%',
        maxWidth: '420px',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* Logo + wordmark */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontFamily: 'var(--font-rajdhani), sans-serif',
          fontSize: '28px',
          fontWeight: 700,
          color: '#e8a020',
          letterSpacing: '0.05em',
          marginBottom: '24px',
        }}
      >
        <LogoMark size={44} />
        <span>SQUADFINDER</span>
      </div>

      {/* Heading */}
      <h1
        className="main-heading"
        style={{
          fontSize: '32px',
          margin: '0 0 10px 0',
          lineHeight: 1.2,
        }}
      >
        {t('FIND YOUR SQUAD')}
      </h1>

      {/* Subheading */}
      <p
        className="sub-heading"
        style={{
          fontSize: '15px',
          margin: '0 0 28px 0',
          lineHeight: 1.5,
        }}
      >
        {t('Connect with players who match your style, game, and version.')}
      </p>

      {/* Google button */}
      <button
        onClick={handleGoogleClick}
        disabled={signingIn}
        onMouseEnter={() => setHoveredGoogle(true)}
        onMouseLeave={() => setHoveredGoogle(false)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '14px 20px',
          backgroundColor: hoveredGoogle ? 'rgba(232,160,32,0.08)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${hoveredGoogle ? '#e8a020' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: '8px',
          cursor: signingIn ? 'wait' : 'pointer',
          opacity: signingIn ? 0.7 : 1,
          transition: 'all 0.15s ease',
          fontFamily: 'inherit',
          marginBottom: 0,
        }}
      >
        {/* Google G SVG */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        <span style={{ fontSize: '15px', fontWeight: 500, color: '#ffffff' }}>
          {signingIn ? t('Signing in…') : t('Continue with Google')}
        </span>
      </button>

      {deleted && (
        <p role="status" style={{ fontSize: '13px', color: '#86efac', margin: 0 }}>
          {t('Your account has been deleted.')}
        </p>
      )}

      {signInError && (
        <p role="alert" style={{ fontSize: '13px', color: '#e5484d', margin: 0 }}>
          {t('Sign-in failed. Please try again.')}
        </p>
      )}

      {/* "or" divider between Google and email sign-in */}
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }} />
        <span
          style={{
            fontFamily: 'var(--font-rajdhani), sans-serif',
            fontWeight: 700,
            fontSize: '12px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#8b95a5',
          }}
        >
          {t('or')}
        </span>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }} />
      </div>

      <div style={{ width: '100%' }}>
        <EmailAuthForm />
      </div>

    </div>
  )
}
