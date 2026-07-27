'use client'

import { ReactNode, useState } from 'react'

interface ChipProps {
  children: ReactNode
  selected?: boolean
  onClick?: () => void
  disabled?: boolean
}

export default function Chip({ children, selected, onClick, disabled }: ChipProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: 'inherit',
        fontSize: '13px',
        padding: '6px 14px',
        borderRadius: '20px',
        border: `1px solid ${selected ? '#e8a020' : hovered ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`,
        backgroundColor: selected
          ? 'rgba(232,160,32,0.15)'
          : hovered
          ? 'rgba(255,255,255,0.04)'
          : 'transparent',
        color: selected ? '#e8a020' : '#8b95a5',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}
