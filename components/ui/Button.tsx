'use client'

import { ButtonHTMLAttributes, ReactNode, useState } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost'
  children: ReactNode
}

export default function Button({
  variant = 'primary',
  children,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const [hovered, setHovered] = useState(false)

  const base: React.CSSProperties = {
    fontFamily: 'inherit',
    fontWeight: 500,
    fontSize: '14px',
    borderRadius: '6px',
    padding: '10px 20px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
    border: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  }

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: disabled ? '#3a3520' : hovered ? '#f0b030' : '#e8a020',
      color: disabled ? '#5a5030' : '#0a0b0f',
      border: 'none',
    },
    outline: {
      backgroundColor: hovered && !disabled ? 'rgba(232,160,32,0.1)' : 'transparent',
      border: `1px solid ${disabled ? '#3a3520' : '#e8a020'}`,
      color: disabled ? '#3a3520' : '#e8a020',
    },
    ghost: {
      backgroundColor: hovered && !disabled ? 'rgba(255,255,255,0.05)' : 'transparent',
      color: '#8b95a5',
      border: 'none',
    },
  }

  return (
    <button
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...base, ...variants[variant], ...style }}
      {...props}
    >
      {children}
    </button>
  )
}
