'use client'

interface CheckboxGridProps {
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  columns?: 2 | 3
}

export default function CheckboxGrid({ options, selected, onChange, columns = 2 }: CheckboxGridProps) {
  function toggle(opt: string) {
    if (selected.includes(opt)) {
      onChange(selected.filter((v) => v !== opt))
    } else {
      onChange([...selected, opt])
    }
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: '6px',
    }}>
      {options.map((opt) => {
        const isSelected = selected.includes(opt)
        return (
          <label
            key={opt}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 10px',
              borderRadius: '5px',
              border: `1px solid ${isSelected ? '#e8a020' : 'rgba(255,255,255,0.06)'}`,
              backgroundColor: isSelected ? 'rgba(232,160,32,0.07)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggle(opt)}
              style={{ accentColor: '#e8a020', width: '13px', height: '13px', flexShrink: 0, cursor: 'pointer' }}
            />
            <span style={{
              fontSize: '12px',
              color: isSelected ? '#e8a020' : 'rgba(255,255,255,0.7)',
              lineHeight: 1.3,
              userSelect: 'none',
            }}>
              {opt}
            </span>
          </label>
        )
      })}
    </div>
  )
}
