function getScoreColor(value: number): string {
  if (value >= 90) return '#22c55e'
  if (value >= 80) return '#86efac'
  if (value >= 70) return '#facc15'
  if (value >= 60) return '#f97316'
  return '#ef4444'
}

export default function OverallScore({ value }: { value: number }) {
  const color = getScoreColor(value)
  return (
    <div style={{ marginBottom: '48px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '16px',
          marginBottom: '12px',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontSize: '64px',
            fontWeight: 700,
            color,
            lineHeight: 1,
            fontFamily: 'var(--font-rajdhani), sans-serif',
          }}
        >
          {value}%
        </span>
        <span style={{ fontSize: '14px', color: '#8b95a5' }}>
          Overall squad compatibility
        </span>
      </div>
      <div
        style={{
          height: '6px',
          borderRadius: '3px',
          backgroundColor: 'rgba(255,255,255,0.07)',
          width: '100%',
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: '3px',
            backgroundColor: color,
            width: `${value}%`,
            transition: 'width 0.7s ease',
          }}
        />
      </div>
    </div>
  )
}
