'use client'

import Link from 'next/link'
import { useCallback, useEffect, useId, useState, type ReactNode } from 'react'
import RequireAuth from '@/components/auth/RequireAuth'
import DeleteAccountModal from '@/components/settings/DeleteAccountModal'
import Button from '@/components/ui/Button'
import ToggleSwitch from '@/components/ui/ToggleSwitch'
import { useApp } from '@/context/AppContext'
import { useT } from '@/context/I18nContext'
import { ERROR_MESSAGES, toRpcError } from '@/lib/db/rpc'
import { unblockRpc } from '@/lib/db/requests'
import { exportMyData, fetchBlocks, type BlockedPlayer } from '@/lib/db/settings'
import { LANGUAGE_LIST, type LangCode } from '@/lib/i18n/languages'
import { CONTACT_EMAIL } from '@/lib/site'
import { supabase } from '@/lib/supabase/client'

export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsInner />
    </RequireAuth>
  )
}

function Section({ title, children, id }: { title: string; children: ReactNode; id: string }) {
  return (
    <section
      aria-labelledby={id}
      style={{
        backgroundColor: '#111318',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px',
        padding: '18px',
        marginBottom: '14px',
      }}
    >
      <h2
        id={id}
        style={{ margin: '0 0 12px', fontFamily: 'var(--font-rajdhani), sans-serif', fontSize: '18px', fontWeight: 700, letterSpacing: '0.04em', color: '#e8a020' }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

const muted: React.CSSProperties = { margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'rgba(255,255,255,0.7)' }
const linkStyle: React.CSSProperties = { color: '#e8a020', textUnderlineOffset: '3px', display: 'inline-flex', alignItems: 'center', minHeight: '44px' }

function SettingsInner() {
  const { t, lang, setLang } = useT()
  const { showOnlinePlayers, setShowOnlinePlayers } = useApp()
  const ids = { lang: useId(), online: useId(), blocks: useId(), data: useId(), danger: useId(), about: useId(), langSelect: useId() }

  const [blocks, setBlocks] = useState<BlockedPlayer[] | null>(null)
  const [blocksError, setBlocksError] = useState<string | null>(null)
  const [unblocking, setUnblocking] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [onlineError, setOnlineError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const loadBlocks = useCallback(async () => {
    setBlocksError(null)
    try {
      setBlocks(await fetchBlocks())
    } catch (e) {
      setBlocks(null)
      setBlocksError(ERROR_MESSAGES[toRpcError(e).code])
    }
  }, [])

  useEffect(() => {
    void loadBlocks()
  }, [loadBlocks])

  // Coming back from "sign in with Google again" during account deletion.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('delete') === '1') {
      setDeleteOpen(true)
      window.history.replaceState(null, '', '/settings')
    }
  }, [])

  async function unblock(b: BlockedPlayer) {
    setUnblocking(b.id)
    setBlocksError(null)
    try {
      await unblockRpc(b.id)
      setBlocks((list) => (list ?? []).filter((x) => x.id !== b.id))
    } catch (e) {
      setBlocksError(ERROR_MESSAGES[toRpcError(e).code])
    } finally {
      setUnblocking(null)
    }
  }

  async function toggleOnline() {
    setOnlineError(null)
    try {
      await setShowOnlinePlayers(!showOnlinePlayers)
    } catch (e) {
      setOnlineError(ERROR_MESSAGES[toRpcError(e).code])
    }
  }

  async function download() {
    setExporting(true)
    setExportError(null)
    try {
      const data = await exportMyData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `squadfinder-my-data-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setExportError(ERROR_MESSAGES[toRpcError(e).code])
    } finally {
      setExporting(false)
    }
  }

  async function signOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } finally {
      window.location.assign('/')
    }
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', color: '#ffffff' }}>
      <div style={{ width: '100%', maxWidth: '640px', margin: '0 auto', boxSizing: 'border-box', padding: '20px 16px 8px', flex: 1 }}>
        <h1 style={{ margin: '0 0 16px', fontFamily: 'var(--font-rajdhani), sans-serif', fontSize: '30px', fontWeight: 700 }}>
          {t('Settings')}
        </h1>

        <Section id={ids.lang} title={t('Language')}>
          <label htmlFor={ids.langSelect} style={{ ...muted, display: 'block', marginBottom: '6px' }}>
            {t('Language of the app')}
          </label>
          <select
            id={ids.langSelect}
            value={lang}
            onChange={(e) => setLang(e.target.value as LangCode)}
            style={{ width: '100%', minHeight: '44px', backgroundColor: '#0a0b0f', color: '#ffffff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '6px', padding: '0 10px', fontSize: '16px' }}
          >
            {LANGUAGE_LIST.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </Section>

        <Section id={ids.online} title={t('Who you see')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', minHeight: '44px' }}>
            <div>
              <div id={`${ids.online}-label`} style={{ fontSize: '15px', fontWeight: 600 }}>{t('Also show players who are online')}</div>
              <p style={{ ...muted, marginTop: '2px' }}>
                {t("Off: you only see players who are actively searching. On: you also see players who have the app open.")}
              </p>
            </div>
            <ToggleSwitch checked={showOnlinePlayers} onChange={toggleOnline} label={t('Also show players who are online')} />
          </div>
          <div role="alert" style={{ color: '#fca5a5', fontSize: '13px', marginTop: onlineError ? '8px' : 0 }}>{onlineError && t(onlineError)}</div>
        </Section>

        <Section id={ids.blocks} title={t('Blocked players')}>
          {blocksError && (
            <div role="alert" style={{ color: '#fca5a5', fontSize: '13px', marginBottom: '10px' }}>
              {t(blocksError)}{' '}
              <button type="button" onClick={loadBlocks} style={{ background: 'none', border: 'none', color: '#e8a020', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px', padding: '10px 4px' }}>
                {t('Retry')}
              </button>
            </div>
          )}
          {blocks === null && !blocksError && <p role="status" style={muted}>{t('Loading…')}</p>}
          {blocks && blocks.length === 0 && <p style={muted}>{t("You haven't blocked anyone.")}</p>}
          {blocks && blocks.length > 0 && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {blocks.map((b) => (
                <li key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', minHeight: '48px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '15px', overflowWrap: 'anywhere' }}>{b.label || t('Unknown player')}</span>
                  <Button variant="outline" disabled={unblocking === b.id} onClick={() => unblock(b)} style={{ minHeight: '44px' }} aria-label={t('Unblock {name}', { name: b.label || t('Unknown player') })}>
                    {t('Unblock')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <p style={{ ...muted, marginTop: '10px' }}>{t('Blocked players can never find you, and you can never find them.')}</p>
        </Section>

        <Section id={ids.data} title={t('Your data')}>
          <p style={{ ...muted, marginBottom: '12px' }}>
            {t('Download everything we hold about you as a JSON file: your account, profiles, allies, blocks and the requests you sent.')}
          </p>
          <Button variant="outline" onClick={download} disabled={exporting} style={{ minHeight: '44px' }}>
            {exporting ? t('Preparing…') : t('Download my data')}
          </Button>
          <div role="alert" style={{ color: '#fca5a5', fontSize: '13px', marginTop: exportError ? '8px' : 0 }}>{exportError && t(exportError)}</div>
        </Section>

        <Section id={ids.danger} title={t('Account')}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <Button variant="outline" onClick={signOut} disabled={signingOut} style={{ minHeight: '44px' }}>
              {t('Sign out')}
            </Button>
            <Button
              onClick={() => setDeleteOpen(true)}
              style={{ minHeight: '44px', backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#fca5a5' }}
            >
              {t('Delete my account')}
            </Button>
          </div>
          <p style={{ ...muted, marginTop: '10px' }}>{t('Deleting your account removes your profiles, allies, blocks and requests for good.')}</p>
        </Section>

        <Section id={ids.about} title={t('About')}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 18px' }}>
            <Link href="/privacy" style={linkStyle}>{t('Privacy Policy')}</Link>
            <Link href="/terms" style={linkStyle}>{t('Terms of Service')}</Link>
            <a href={`mailto:${CONTACT_EMAIL}`} style={linkStyle}>{t('Contact us')}</a>
          </div>
        </Section>
      </div>
      {deleteOpen && <DeleteAccountModal onClose={() => setDeleteOpen(false)} />}
    </div>
  )
}
