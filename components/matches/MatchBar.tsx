interface MatchBarProps {
  label: string
  value: number
  large?: boolean
}

function getBarColor(value: number): string {
  if (value >= 90) return '#22c55e'
  if (value >= 80) return '#86efac'
  if (value >= 70) return '#facc15'
  if (value >= 60) return '#f97316'
  return '#ef4444'
}

export default function MatchBar({ label, value, large }: MatchBarProps) {
  const color = getBarColor(value)
  return (
    <div style={{ marginBottom: large ? '14px' : '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <span style={{ fontSize: large ? '13px' : '12px', color: '#8b95a5' }}>{label}</span>
        <span style={{ fontSize: large ? '13px' : '12px', color, fontWeight: 600 }}>{value}%</span>
      </div>
      <div
        style={{
          height: '6px',
          borderRadius: '3px',
          backgroundColor: 'rgba(255,255,255,0.08)',
          width: '100%',
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: '3px',
            backgroundColor: color,
            width: `${value}%`,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  )
}
