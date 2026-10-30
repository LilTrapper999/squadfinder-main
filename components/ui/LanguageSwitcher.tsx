'use client'

import { useEffect, useRef, useState } from 'react'
import { useT } from '@/context/I18nContext'
import { LANGUAGE_LIST } from '@/lib/i18n/languages'

/**
 * Globe button + dropdown for switching the interface language. Lives next to the
 * notifications bell on every page, and on its own in the corner of the login page.
 */
export default function LanguageSwitcher() {
  const { lang, setLang, t } = useT()
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={t('Change language')}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={t('Change language')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: hovered || open ? '#e8a020' : 'rgba(255,255,255,0.6)',
          fontSize: '12px',
          fontFamily: 'var(--font-rajdhani), sans-serif',
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          transition: 'color 0.15s ease',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        {lang}
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t('Language')}
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            insetInlineEnd: 0,
            zIndex: 100,
            margin: 0,
            padding: '6px',
            listStyle: 'none',
            minWidth: '150px',
            maxHeight: '60vh',
            overflowY: 'auto',
            backgroundColor: '#111318',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '8px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
          }}
        >
          {LANGUAGE_LIST.map((l) => {
            const active = l.code === lang
            return (
              <li key={l.code} role="option" aria-selected={active}>
                <button
                  onClick={() => {
                    setLang(l.code)
                    setOpen(false)
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'start',
                    padding: '8px 10px',
                    borderRadius: '5px',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '13px',
                    color: active ? '#e8a020' : 'rgba(255,255,255,0.8)',
                    backgroundColor: active ? 'rgba(232,160,32,0.1)' : 'transparent',
                  }}
                >
                  {l.label}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
