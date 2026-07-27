'use client'

interface ToggleSwitchProps {
  checked: boolean
  onChange: () => void
  label?: string
}

// Standard iOS-style switch — amber when active (SPEC_AMENDMENT_11 FIX 3)
export default function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      style={{
        width: '38px',
        height: '22px',
        borderRadius: '11px',
        border: 'none',
        padding: 0,
        position: 'relative',
        backgroundColor: checked ? '#e8a020' : 'rgba(255,255,255,0.15)',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background-color 0.2s ease',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '2px',
          left: '2px',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          display: 'block',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
          transform: checked ? 'translateX(16px)' : 'translateX(0)',
          transition: 'transform 0.2s ease',
        }}
      />
    </button>
  )
}
