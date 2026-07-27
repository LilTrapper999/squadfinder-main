'use client'

import { useState } from 'react'
import { GameCategory } from '@/lib/types'

interface SidebarProps {
  activeCategory: GameCategory
  onCategoryChange: (cat: GameCategory) => void
}

const categories: { id: GameCategory; label: string }[] = [
  { id: 'extraction', label: 'Extraction Shooters' },
  { id: 'competitive', label: 'Competitive FPS' },
  { id: 'fps', label: 'FPS' },
]

export default function Sidebar({ activeCategory, onCategoryChange }: SidebarProps) {
  const [hovered, setHovered] = useState<GameCategory | null>(null)

  return (
    <div
      className="game-sidebar"
      style={{
        width: 'fit-content',
        minWidth: '180px',
        height: '100%',
        backgroundColor: '#111318',
        color: '#ffffff',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        padding: '24px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        flexShrink: 0,
        position: 'relative',
        zIndex: 2,
      }}
    >
      <p
        className="sub-heading"
        style={{
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          padding: '0 20px',
          marginBottom: '8px',
          whiteSpace: 'nowrap',
        }}
      >
        YOUR ARENA
      </p>
      {categories.map((cat) => {
        const isActive = cat.id === activeCategory
        const isHovered = cat.id === hovered
        return (
          <button
            key={cat.id}
            className={`sidebar-category${isActive ? ' active' : ''}`}
            onClick={() => onCategoryChange(cat.id)}
            onMouseEnter={() => setHovered(cat.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '10px 20px 10px 16px',
              backgroundColor: isActive
                ? 'rgba(232,160,32,0.08)'
                : isHovered
                ? 'rgba(255,255,255,0.03)'
                : 'transparent',
              border: 'none',
              borderLeft: `3px solid ${isActive ? '#e8a020' : 'transparent'}`,
              color: isActive ? '#e8a020' : isHovered ? '#d0d8e4' : '#8b95a5',
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {cat.label}
          </button>
        )
      })}
    </div>
  )
}
