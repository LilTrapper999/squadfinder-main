'use client'

import { useState } from 'react'

/** Rajdhani caps used for labels and the primary button, matching the rest of the login card. */
export const capsFont: React.CSSProperties = {
  fontFamily: 'var(--font-rajdhani), sans-serif',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}

export function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  placeholder,
  trailing,
  autoFocus,
}: {
  label: string
  type: 'email' | 'password' | 'text'
  value: string
  onChange: (v: string) => void
  autoComplete: string
  placeholder?: string
  trailing?: React.ReactNode
  autoFocus?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <label style={{ display: 'block', marginBottom: '14px' }}>
      <span style={{ ...capsFont, display: 'block', fontSize: '12px', color: '#8b95a5', marginBottom: '6px' }}>
        {label}
      </span>
      <span style={{ position: 'relative', display: 'block' }}>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          autoFocus={autoFocus}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: trailing ? '12px 56px 12px 14px' : '12px 14px',
            backgroundColor: 'rgba(255,255,255,0.04)',
            border: `1px solid ${focused ? '#e8a020' : 'rgba(255,255,255,0.12)'}`,
            boxShadow: focused ? '0 0 0 3px rgba(232,160,32,0.12)' : 'none',
            borderRadius: '8px',
            outline: 'none',
            color: '#ffffff',
            fontSize: '15px',
            fontFamily: 'inherit',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          }}
        />
        {trailing && (
          <span style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)' }}>
            {trailing}
          </span>
        )}
      </span>
    </label>
  )
}
