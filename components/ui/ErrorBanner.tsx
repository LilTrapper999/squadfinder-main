'use client'

import { useT } from '@/context/I18nContext'

/**
 * A dismissible error strip with an optional Retry. `message` is an English source string from
 * ERROR_MESSAGES (or any t() literal); it is translated here. role="alert" so it is announced.
 */
export default function ErrorBanner({
  message,
  onDismiss,
  onRetry,
  style,
}: {
  message: string
  onDismiss: () => void
  onRetry?: () => void
  style?: React.CSSProperties
}) {
  const { t } = useT()
  const button: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontFamily: 'inherit',
    minHeight: '44px',
    minWidth: '44px',
  }
  return (
    <div
      role="alert"
      style={{
        padding: '4px 8px 4px 14px',
        borderRadius: '8px',
        backgroundColor: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.3)',
        color: '#fca5a5',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        ...style,
      }}
    >
      <span style={{ padding: '6px 0' }}>{t(message)}</span>
      <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {onRetry && (
          <button type="button" onClick={onRetry} style={{ ...button, textDecoration: 'underline', textUnderlineOffset: '3px', padding: '0 10px' }}>
            {t('Retry')}
          </button>
        )}
        <button type="button" onClick={onDismiss} aria-label={t('Dismiss')} style={{ ...button, fontSize: '18px', lineHeight: 1 }}>
          ×
        </button>
      </span>
    </div>
  )
}
