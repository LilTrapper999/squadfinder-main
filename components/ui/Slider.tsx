'use client'

import { useT } from '@/context/I18nContext'

interface SliderProps {
  /** Internal value: 0–100 (displayed as 0.0–10.0) */
  value: number
  onChange: (v: number) => void
  sliderMinLabel?: string
  sliderMaxLabel?: string
  /**
   * 3-anchor labels for the slider: [min (0.0), mid (5.0), max (10.0)].
   * Per SPEC_AMENDMENT_02: only 3 labels rendered — at positions 0, 5, 10.
   * All other tick marks remain as visual indents with no label.
   */
  tickLabels?: [string, string, string]
}

export default function Slider({ value, onChange, sliderMinLabel, sliderMaxLabel, tickLabels }: SliderProps) {
  const { t } = useT()
  const pct = (value / 100) * 100
  const display = (value / 10).toFixed(1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Value display */}
      <div style={{ textAlign: 'center' }}>
        <span style={{
          fontSize: '28px',
          fontWeight: 700,
          color: '#e8a020',
          fontFamily: 'var(--font-rajdhani), sans-serif',
          letterSpacing: '0.02em',
        }}>
          {display}
        </span>
        <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.62)', marginLeft: '4px' }}>/ 10</span>
      </div>

      {/* Slider track + ticks + input */}
      <div style={{ position: 'relative', paddingBottom: tickLabels ? '36px' : '20px' }}>
        {/* Track */}
        <div style={{
          position: 'relative',
          height: '4px',
          borderRadius: '2px',
          backgroundColor: 'rgba(255,255,255,0.08)',
        }}>
          {/* Fill */}
          <div style={{
            position: 'absolute',
            left: 0, top: 0,
            height: '100%',
            width: `${pct}%`,
            backgroundColor: '#e8a020',
            borderRadius: '2px',
          }} />
        </div>

        {/* Major tick marks (0–10, 11 total) — plain flex row, purely visual indents */}
        <div style={{
          position: 'absolute',
          top: '8px',
          left: 0, right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          pointerEvents: 'none',
        }}>
          {Array.from({ length: 11 }, (_, i) => (
            <div key={i} style={{ width: '1px', height: '6px', backgroundColor: 'rgba(255,255,255,0.25)' }} />
          ))}
        </div>

        {/* 3-anchor labels — positioned independently of the tick marks above. Nesting a label
            inside a 1px-wide flex tick item forces flexbox to center it there regardless of any
            transform, which pushes the first/last labels off the track edge; positioning each by
            `left: X%` against this full-width row avoids that entirely. */}
        {tickLabels && (
          <div style={{ position: 'absolute', top: '18px', left: 0, right: 0, height: 0, pointerEvents: 'none' }}>
            {[0, 5, 10].map((i, labelIndex) => (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: `${(i / 10) * 100}%`,
                  transform: i === 0 ? 'none' : i === 10 ? 'translateX(-100%)' : 'translateX(-50%)',
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.62)',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                }}
              >
                {t(tickLabels[labelIndex])}
              </span>
            ))}
          </div>
        )}

        {/* Invisible native range input */}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            position: 'absolute',
            top: '-6px',
            left: 0,
            width: '100%',
            opacity: 0,
            cursor: 'pointer',
            height: '16px',
            margin: 0,
          }}
        />

        {/* Thumb */}
        <div style={{
          position: 'absolute',
          top: '-5px',
          left: `calc(${pct}% - 7px)`,
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          backgroundColor: '#e8a020',
          border: '2px solid #0a0b0f',
          boxShadow: '0 0 0 2px #e8a020',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Min / max labels (when no tick labels) */}
      {!tickLabels && (sliderMinLabel || sliderMaxLabel) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '-4px' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.62)' }}>{sliderMinLabel ? t(sliderMinLabel) : ''}</span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.62)' }}>{sliderMaxLabel ? t(sliderMaxLabel) : ''}</span>
        </div>
      )}
    </div>
  )
}
