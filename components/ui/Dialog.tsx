'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '@/context/I18nContext'

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface DialogProps {
  title: string
  onClose: () => void
  children: ReactNode
  /** Block Esc / backdrop close while something irreversible is in flight. */
  busy?: boolean
  maxWidth?: number
}

/**
 * Accessible modal: aria-modal, focus moves in on open and returns to the trigger on close, Tab
 * stays inside, Esc and a backdrop click close it (unless `busy`).
 */
export default function Dialog({ title, onClose, children, busy = false, maxWidth = 440 }: DialogProps) {
  const { t } = useT()
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const busyRef = useRef(busy)
  busyRef.current = busy

  useEffect(() => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const node = panel.current
    const first = node?.querySelector<HTMLElement>('[data-autofocus]') ?? node?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? node)?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busyRef.current) {
        e.stopPropagation()
        closeRef.current()
        return
      }
      if (e.key !== 'Tab' || !node) return
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (!items.length) {
        e.preventDefault()
        return
      }
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      opener.current?.focus?.()
    }
  }, [])

  // Portalled to <body> so no ancestor's overflow/transform can clip or offset it.
  return createPortal(
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{
          width: '100%',
          maxWidth,
          maxHeight: 'calc(100dvh - 32px)',
          overflowY: 'auto',
          backgroundColor: '#12141b',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '10px',
          padding: '22px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          color: '#ffffff',
          outline: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
          <h2
            id={titleId}
            style={{ margin: 0, fontFamily: 'var(--font-rajdhani), sans-serif', fontSize: '22px', fontWeight: 700, letterSpacing: '0.02em' }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={t('Close')}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: busy ? 'not-allowed' : 'pointer', fontSize: '22px', lineHeight: 1, padding: '4px 8px', minWidth: '44px', minHeight: '44px', marginTop: '-10px', marginInlineEnd: '-10px' }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
