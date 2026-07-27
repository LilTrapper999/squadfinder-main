'use client'

interface YesNoToggleProps {
  value: 'yes' | 'no' | null
  onChange: (v: 'yes' | 'no') => void
}

export default function YesNoToggle({ value, onChange }: YesNoToggleProps) {
  return (
    <div style={{ display: 'flex', gap: '10px' }}>
      {(['yes', 'no'] as const).map((opt) => {
        const isSelected = value === opt
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              flex: 1,
              padding: '14px 20px',
              borderRadius: '8px',
              border: `2px solid ${isSelected ? '#e8a020' : 'rgba(255,255,255,0.1)'}`,
              backgroundColor: isSelected ? 'rgba(232,160,32,0.12)' : 'transparent',
              color: isSelected ? '#e8a020' : 'rgba(255,255,255,0.5)',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--font-rajdhani), sans-serif',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              transition: 'all 0.15s ease',
            }}
          >
            {opt === 'yes' ? 'Yes' : 'No'}
          </button>
        )
      })}
    </div>
  )
}
