'use client'

import { useState } from 'react'

const LANGUAGES = [
  'English', 'Mandarin Chinese', 'Hindi', 'Spanish', 'Arabic',
  'French', 'Bengali', 'Portuguese', 'Russian', 'Indonesian',
  'Urdu', 'German', 'Japanese', 'Swahili', 'Marathi',
  'Telugu', 'Turkish', 'Tamil', 'Punjabi', 'Vietnamese',
  'Wu Chinese (Shanghainese)', 'Korean', 'Italian', 'Hausa', 'Thai',
  'Gujarati', 'Kannada', 'Polish', 'Ukrainian', 'Dutch',
]

interface LanguagePickerProps {
  selected: string[]
  onChange: (selected: string[]) => void
}

export default function LanguagePicker({ selected, onChange }: LanguagePickerProps) {
  const [otherChecked, setOtherChecked] = useState(false)
  const [otherText, setOtherText] = useState('')

  function toggle(lang: string) {
    if (selected.includes(lang)) {
      onChange(selected.filter((v) => v !== lang))
    } else {
      onChange([...selected, lang])
    }
  }

  function handleOtherCheck() {
    if (otherChecked) {
      // Uncheck — remove the custom language from selected
      const cleaned = selected.filter((v) => !LANGUAGES.includes(v) === false || v === otherText)
      onChange(selected.filter((v) => v !== otherText))
      setOtherText('')
    }
    setOtherChecked((c) => !c)
  }

  function handleOtherBlur(e: React.FocusEvent<HTMLInputElement>) {
    // Case-normalise: first letter uppercase, rest lowercase
    const raw = e.target.value.trim()
    if (!raw) return
    const normalised = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
    setOtherText(normalised)
    // Replace old custom value in selected with normalised
    const withoutOld = selected.filter((v) => v === normalised || LANGUAGES.includes(v))
    if (!withoutOld.includes(normalised)) {
      onChange([...withoutOld, normalised])
    } else {
      onChange(withoutOld)
    }
  }

  return (
    <div>
      {/* 3-column grid for predefined languages */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '6px',
        marginBottom: '6px',
      }}>
        {LANGUAGES.map((lang) => {
          const isSelected = selected.includes(lang)
          return (
            <label
              key={lang}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
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
                onChange={() => toggle(lang)}
                style={{ accentColor: '#e8a020', width: '13px', height: '13px', flexShrink: 0, cursor: 'pointer' }}
              />
              <span style={{
                fontSize: '12px',
                color: isSelected ? '#e8a020' : 'rgba(255,255,255,0.7)',
                userSelect: 'none',
              }}>
                {lang}
              </span>
            </label>
          )
        })}

        {/* "Other" — full-width, spanning all 3 columns */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            padding: '7px 10px',
            borderRadius: '5px',
            border: `1px solid ${otherChecked ? '#e8a020' : 'rgba(255,255,255,0.06)'}`,
            backgroundColor: otherChecked ? 'rgba(232,160,32,0.07)' : 'transparent',
            cursor: 'pointer',
            transition: 'all 0.12s ease',
            gridColumn: '1 / -1',
          }}
        >
          <input
            type="checkbox"
            checked={otherChecked}
            onChange={handleOtherCheck}
            style={{ accentColor: '#e8a020', width: '13px', height: '13px', flexShrink: 0, cursor: 'pointer' }}
          />
          <span style={{ fontSize: '12px', color: otherChecked ? '#e8a020' : 'rgba(255,255,255,0.7)', userSelect: 'none' }}>
            Other
          </span>
        </label>
      </div>

      {/* Other text input — shown only when "Other" is checked */}
      {otherChecked && (
        <div style={{ marginTop: '8px' }}>
          <input
            type="text"
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            onBlur={handleOtherBlur}
            placeholder="Type your language exactly as others would type it"
            required
            style={{
              width: '100%',
              padding: '10px 14px',
              backgroundColor: '#1a1d26',
              border: `1px solid ${otherText ? '#e8a020' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '13px',
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <p style={{ margin: '5px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
            Will be capitalised automatically (e.g. "klingon" → "Klingon")
          </p>
        </div>
      )}
    </div>
  )
}
