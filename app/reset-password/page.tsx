'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/context/I18nContext'
import { supabase } from '@/lib/supabase/client'
import { Field, capsFont } from '@/components/auth/AuthField'
import LogoMark from '@/components/ui/LogoMark'

const MIN_PASSWORD_LENGTH = 8

/**
 * Landing page for the "reset your password" email link. supabase-js reads the recovery token
 * from the URL and opens a short-lived session; this page lets the user choose a new password
 * with it, then continues into the app.
 */
export default function ResetPasswordPage() {
  const router = useRouter()
  const { t } = useT()
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid'>('checking')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hoveredSubmit, setHoveredSubmit] = useState(false)

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) setStatus('ready')
    })
    // The token in the URL is exchanged asynchronously. If no session shows up, the link was
    // opened without a token, has expired, or was already used.
    const timer = setTimeout(async () => {
      const { data } = await supabase.auth.getSession()
      setStatus(data.session ? 'ready' : 'invalid')
    }, 1500)
    return () => {
      clearTimeout(timer)
      listener.subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('Password must be at least {n} characters.', { n: MIN_PASSWORD_LENGTH }))
      return
    }
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) {
      setBusy(false)
      setError(
        /different from the old/i.test(err.message)
          ? t('Choose a password you have not used before.')
          : t('Could not update your password. Please try again.'),
      )
      return
    }
    router.replace('/select-game')
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'safe center',
        justifyContent: 'center',
        overflowY: 'auto',
        padding: '20px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          backgroundColor: '#111318',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: 'clamp(28px, 6vw, 40px) clamp(20px, 5vw, 36px)',
          width: '100%',
          maxWidth: '420px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ ...capsFont, fontSize: '28px', color: '#e8a020', letterSpacing: '0.05em', marginBottom: '24px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><LogoMark size={22} />SQUADFINDER</span>
        </div>

        {status === 'checking' && (
          <p role="status" style={{ fontSize: '15px', color: '#8b95a5', margin: 0 }}>
            {t('Verifying your link…')}
          </p>
        )}

        {status === 'invalid' && (
          <>
            <h1 style={{ ...capsFont, fontSize: '22px', color: '#ffffff', margin: '0 0 10px 0' }}>
              {t('Link expired')}
            </h1>
            <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#8b95a5', margin: '0 0 22px 0' }}>
              {t('This password reset link is invalid or has already been used. Request a new one from the sign-in page.')}
            </p>
            <button
              onClick={() => router.replace('/')}
              style={{
                ...capsFont,
                width: '100%',
                padding: '13px 20px',
                fontSize: '15px',
                borderRadius: '8px',
                border: '1px solid #e8a020',
                backgroundColor: 'transparent',
                color: '#e8a020',
                cursor: 'pointer',
              }}
            >
              {t('Back to sign in')}
            </button>
          </>
        )}

        {status === 'ready' && (
          <form onSubmit={handleSubmit} noValidate>
            <h1 style={{ ...capsFont, fontSize: '22px', color: '#ffffff', margin: '0 0 10px 0' }}>
              {t('Choose a new password')}
            </h1>
            <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#8b95a5', margin: '0 0 20px 0' }}>
              {t('Pick something at least {n} characters long.', { n: MIN_PASSWORD_LENGTH })}
            </p>

            <Field
              label={t('New password')}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              autoFocus
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? t('Hide password') : t('Show password')}
                  style={{
                    ...capsFont,
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontSize: '11px',
                    color: '#8b95a5',
                  }}
                >
                  {showPassword ? t('Hide') : t('Show')}
                </button>
              }
            />

            {error && (
              <p role="alert" style={{ fontSize: '13px', color: '#e5484d', margin: '-4px 0 12px 0' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              onMouseEnter={() => setHoveredSubmit(true)}
              onMouseLeave={() => setHoveredSubmit(false)}
              style={{
                ...capsFont,
                width: '100%',
                padding: '13px 20px',
                fontSize: '15px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: hoveredSubmit && !busy ? '#f0b030' : '#e8a020',
                color: '#0a0b0f',
                cursor: busy ? 'wait' : 'pointer',
                opacity: busy ? 0.7 : 1,
                transition: 'background-color 0.15s ease, opacity 0.15s ease',
              }}
            >
              {busy ? t('Please wait…') : t('Update password')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
