'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useT } from '@/context/I18nContext'
import { supabase } from '@/lib/supabase/client'
import { Field, capsFont } from '@/components/auth/AuthField'

type Mode = 'signin' | 'signup' | 'forgot' | 'sent-confirm' | 'sent-reset'

const MIN_PASSWORD_LENGTH = 8
const RESEND_COOLDOWN_SECONDS = 30
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function TextLink({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        fontFamily: 'inherit',
        fontSize: '13px',
        color: hovered && !disabled ? '#e8a020' : '#8b95a5',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'color 0.15s ease',
      }}
    >
      {children}
    </button>
  )
}

/**
 * Email + password sign-in for the login card: sign in, create account (with the confirmation-email
 * step), and forgot password (reset link lands on /reset-password). Success is handled by the
 * caller's onAuthStateChange listener, which sends a fresh session on to the app.
 */
export default function EmailAuthForm() {
  const { t } = useT()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [needsConfirm, setNeedsConfirm] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [hoveredSubmit, setHoveredSubmit] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  function goTo(next: Mode) {
    setMode(next)
    setError(null)
    setNotice(null)
    setNeedsConfirm(false)
    setShowPassword(false)
    setConfirmPassword('')
  }

  function validate(): string | null {
    if (!EMAIL_PATTERN.test(email.trim())) return t('Enter a valid email address.')
    if (mode === 'signup' && password.length < MIN_PASSWORD_LENGTH) {
      return t('Password must be at least {n} characters.', { n: MIN_PASSWORD_LENGTH })
    }
    if (mode === 'signup' && password !== confirmPassword) return t("Passwords don't match.")
    if (mode === 'signin' && !password) return t('Enter your password.')
    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    setBusy(true)
    setError(null)
    setNeedsConfirm(false)
    const address = email.trim()

    if (mode === 'signin') {
      const { error: err } = await supabase.auth.signInWithPassword({ email: address, password })
      if (err) {
        if (/not confirmed/i.test(err.message)) {
          setNeedsConfirm(true)
          setError(t('Please confirm your email first — check your inbox for the link.'))
        } else if (/invalid login/i.test(err.message)) {
          setError(t('Incorrect email or password.'))
        } else {
          setError(t('Sign-in failed. Please try again.'))
        }
        setBusy(false)
      }
      // On success the session event in LoginCard moves the user into the app.
      return
    }

    if (mode === 'signup') {
      const { data, error: err } = await supabase.auth.signUp({
        email: address,
        password,
        options: { emailRedirectTo: `${window.location.origin}/` },
      })
      setBusy(false)
      if (err) {
        setError(
          /already registered/i.test(err.message)
            ? t('An account with this email already exists. Try signing in.')
            : t('Could not create your account. Please try again.'),
        )
        return
      }
      // With email confirmation on, an existing address comes back as a user with no identities
      // rather than an error (so signup can't be used to probe which emails are registered).
      if (data.user && data.user.identities?.length === 0) {
        setError(t('An account with this email already exists. Try signing in.'))
        return
      }
      // No session means confirmation is required; with a session, LoginCard redirects us.
      if (!data.session) {
        setCooldown(RESEND_COOLDOWN_SECONDS)
        goTo('sent-confirm')
      }
      return
    }

    if (mode === 'forgot') {
      await supabase.auth.resetPasswordForEmail(address, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      setBusy(false)
      // Same message whether or not the address has an account.
      setCooldown(RESEND_COOLDOWN_SECONDS)
      goTo('sent-reset')
    }
  }

  async function handleResend() {
    if (cooldown > 0 || busy) return
    const address = email.trim()
    setCooldown(RESEND_COOLDOWN_SECONDS)
    setError(null)
    if (mode === 'sent-reset') {
      await supabase.auth.resetPasswordForEmail(address, { redirectTo: `${window.location.origin}/reset-password` })
    } else {
      const { error: err } = await supabase.auth.resend({
        type: 'signup',
        email: address,
        options: { emailRedirectTo: `${window.location.origin}/` },
      })
      if (err) setError(t('Could not send the email. Please try again.'))
    }
  }

  async function handleResendFromSignin() {
    if (cooldown > 0) return
    setCooldown(RESEND_COOLDOWN_SECONDS)
    const { error: err } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
    setError(err ? t('Could not send the email. Please try again.') : null)
    setNotice(err ? null : t('Confirmation email sent — check your inbox.'))
    setNeedsConfirm(false)
  }

  // ---- "check your inbox" screens -------------------------------------------------------
  if (mode === 'sent-confirm' || mode === 'sent-reset') {
    const isReset = mode === 'sent-reset'
    return (
      <div role="status" style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            margin: '0 auto 14px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(232,160,32,0.1)',
            border: '1px solid rgba(232,160,32,0.35)',
            color: '#e8a020',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-10 6L2 7" />
          </svg>
        </div>
        <div style={{ ...capsFont, fontSize: '18px', color: '#ffffff', marginBottom: '8px' }}>
          {t('Check your inbox')}
        </div>
        <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#8b95a5', margin: '0 0 20px 0' }}>
          {isReset
            ? t('If an account exists for {email}, we sent a link to reset your password.', { email: email.trim() })
            : t('We sent a confirmation link to {email}. Open it to finish creating your account.', { email: email.trim() })}
        </p>
        {error && (
          <p role="alert" style={{ fontSize: '13px', color: '#e5484d', margin: '0 0 14px 0' }}>
            {error}
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <TextLink onClick={handleResend} disabled={cooldown > 0}>
            {cooldown > 0 ? t('Resend email in {n}s', { n: cooldown }) : t('Resend email')}
          </TextLink>
          <TextLink onClick={() => goTo('signin')}>{t('← Back to sign in')}</TextLink>
        </div>
      </div>
    )
  }

  // ---- form screens ---------------------------------------------------------------------
  const isSignup = mode === 'signup'
  const isForgot = mode === 'forgot'
  const submitLabel = busy
    ? t('Please wait…')
    : isForgot
      ? t('Send reset link')
      : isSignup
        ? t('Create account')
        : t('Sign in')

  return (
    <form onSubmit={handleSubmit} noValidate>
      {isForgot && (
        <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#8b95a5', margin: '0 0 16px 0' }}>
          {t("Enter your email and we'll send you a link to reset your password.")}
        </p>
      )}

      <Field
        label={t('Email')}
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        placeholder="you@example.com"
      />

      {!isForgot && (
        <Field
          label={t('Password')}
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={setPassword}
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          placeholder={isSignup ? t('At least {n} characters', { n: MIN_PASSWORD_LENGTH }) : undefined}
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
      )}

      {isSignup && (
        <Field
          label={t('Confirm password')}
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
        />
      )}

      {notice && (
        <p role="status" style={{ fontSize: '13px', color: '#e8a020', margin: '-4px 0 12px 0', lineHeight: 1.4 }}>
          {notice}
        </p>
      )}

      {error && (
        <p role="alert" style={{ fontSize: '13px', color: '#e5484d', margin: '-4px 0 12px 0', lineHeight: 1.4 }}>
          {error}{' '}
          {needsConfirm && (
            <TextLink onClick={handleResendFromSignin} disabled={cooldown > 0}>
              {cooldown > 0 ? t('Resend email in {n}s', { n: cooldown }) : t('Resend email')}
            </TextLink>
          )}
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
          marginBottom: '16px',
        }}
      >
        {submitLabel}
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {isForgot ? (
          <TextLink onClick={() => goTo('signin')}>{t('← Back to sign in')}</TextLink>
        ) : (
          <TextLink onClick={() => goTo(isSignup ? 'signin' : 'signup')}>
            {isSignup ? t('Already have an account? Sign in') : t('New here? Create account')}
          </TextLink>
        )}
        {mode === 'signin' && <TextLink onClick={() => goTo('forgot')}>{t('Forgot password?')}</TextLink>}
      </div>
    </form>
  )
}
