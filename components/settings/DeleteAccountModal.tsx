'use client'

import { useEffect, useId, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { useT } from '@/context/I18nContext'
import { ERROR_MESSAGES, toRpcError } from '@/lib/db/rpc'
import { deleteMyAccount } from '@/lib/db/settings'
import { supabase } from '@/lib/supabase/client'
import { redirectOrigin } from '@/lib/siteUrl'

export const DELETE_PHRASE = 'DELETE'
/** Where the visitor lands after deletion; the login page reads this to show a confirmation. */
export const DELETED_FLAG = '/?deleted=1'

type Step = 'confirm' | 'reauth'
interface Identity {
  email: string | null
  hasPassword: boolean
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  backgroundColor: '#0a0b0f',
  color: '#ffffff',
  border: '1px solid rgba(255,255,255,0.25)',
  borderRadius: '6px',
  padding: '12px',
  fontSize: '16px',
  fontFamily: 'inherit',
  minHeight: '44px',
}

export default function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const { t } = useT()
  const typedId = useId()
  const passwordId = useId()
  const errorId = useId()
  const [step, setStep] = useState<Step>('confirm')
  const [typed, setTyped] = useState('')
  const [password, setPassword] = useState('')
  const [identity, setIdentity] = useState<Identity>({ email: null, hasPassword: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return
      const providers = (data.user.app_metadata?.providers as string[] | undefined) ?? []
      setIdentity({ email: data.user.email ?? null, hasPassword: providers.includes('email') })
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  async function runDelete() {
    setBusy(true)
    setError(null)
    try {
      await deleteMyAccount()
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } finally {
        window.location.assign(DELETED_FLAG)
      }
    } catch (e) {
      const code = toRpcError(e).code
      if (code === 'reauth_required') {
        setStep('reauth')
        setBusy(false)
        return
      }
      setError(t(ERROR_MESSAGES[code]))
      setBusy(false)
    }
  }

  async function reauthWithPassword() {
    if (!identity.email || !password) return
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email: identity.email, password })
    setPassword('')
    if (err) {
      setError(t('That password is not correct.'))
      setBusy(false)
      return
    }
    await runDelete()
  }

  async function reauthWithGoogle() {
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${redirectOrigin()}/settings?delete=1` },
    })
    if (err) {
      setError(t(ERROR_MESSAGES.unknown))
      setBusy(false)
    }
  }

  const confirmed = typed === DELETE_PHRASE

  return (
    <Dialog title={t('Delete my account')} onClose={onClose} busy={busy}>
      {step === 'confirm' ? (
        <>
          <p style={{ margin: '0 0 10px', fontSize: '14px', lineHeight: 1.55, color: 'rgba(255,255,255,0.85)' }}>
            {t('This permanently removes your account and everything tied to it:')}
          </p>
          <ul style={{ margin: '0 0 12px', paddingInlineStart: '20px', fontSize: '14px', lineHeight: 1.6, color: 'rgba(255,255,255,0.85)' }}>
            <li>{t('Your game profiles and answers')}</li>
            <li>{t('Your allies')}</li>
            <li>{t('Your blocked players')}</li>
            <li>{t('Your squad requests, sent and received')}</li>
          </ul>
          <p style={{ margin: '0 0 14px', fontSize: '14px', lineHeight: 1.55, color: '#fca5a5' }}>
            {t('This cannot be undone. Signing in again later creates a brand-new, empty account.')}
          </p>
          <label htmlFor={typedId} style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'rgba(255,255,255,0.8)' }}>
            {t('Type {word} to confirm', { word: DELETE_PHRASE })}
          </label>
          <input
            id={typedId}
            data-autofocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={busy}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-describedby={error ? errorId : undefined}
            style={inputStyle}
          />
        </>
      ) : (
        <>
          <p style={{ margin: '0 0 14px', fontSize: '14px', lineHeight: 1.55, color: 'rgba(255,255,255,0.85)' }}>
            {t('For your security, please sign in again to confirm. Then your account will be deleted.')}
          </p>
          {identity.hasPassword ? (
            <>
              <label htmlFor={passwordId} style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'rgba(255,255,255,0.8)' }}>
                {t('Password')}
              </label>
              <input
                id={passwordId}
                data-autofocus
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void reauthWithPassword() }}
                disabled={busy}
                autoComplete="current-password"
                aria-describedby={error ? errorId : undefined}
                style={inputStyle}
              />
            </>
          ) : null}
        </>
      )}

      <div id={errorId} role="alert" style={{ color: '#fca5a5', fontSize: '13px', margin: error ? '10px 0 0' : 0 }}>
        {error}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px', flexWrap: 'wrap' }}>
        <Button variant="ghost" onClick={onClose} disabled={busy}>{t('Cancel')}</Button>
        {step === 'confirm' ? (
          <Button onClick={runDelete} disabled={!confirmed || busy} style={{ backgroundColor: confirmed && !busy ? '#dc2626' : undefined, color: confirmed && !busy ? '#ffffff' : undefined }}>
            {busy ? t('Deleting…') : t('Delete my account')}
          </Button>
        ) : identity.hasPassword ? (
          <Button onClick={reauthWithPassword} disabled={!password || busy}>
            {busy ? t('Deleting…') : t('Confirm and delete')}
          </Button>
        ) : (
          <Button onClick={reauthWithGoogle} disabled={busy}>{t('Sign in with Google')}</Button>
        )}
      </div>
    </Dialog>
  )
}
