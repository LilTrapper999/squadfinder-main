'use client'

import { Question } from '@/lib/types'
import Chip from '@/components/ui/Chip'
import Slider from '@/components/ui/Slider'
import { useT } from '@/context/I18nContext'

interface QuestionBlockProps {
  question: Question
  value: string | string[] | number | undefined
  onChange: (value: string | string[] | number) => void
}

export default function QuestionBlock({ question, value, onChange }: QuestionBlockProps) {
  const { t } = useT()
  const strValue = typeof value === 'string' ? value : ''
  const arrValue = Array.isArray(value) ? value : []
  const numValue = typeof value === 'number' ? value : 50 // default mid-point for 0–100

  function toggleChip(opt: string) {
    if (arrValue.includes(opt)) {
      onChange(arrValue.filter((v) => v !== opt))
    } else {
      onChange([...arrValue, opt])
    }
  }

  return (
    <div style={{ marginBottom: '28px', breakInside: 'avoid' }}>
      <p
        style={{
          margin: '0 0 14px',
          fontSize: '14px',
          fontWeight: 500,
          color: '#d0d8e4',
        }}
      >
        {t(question.label)}
      </p>

      {/* Radio */}
      {question.type === 'radio' && question.options && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {question.options.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor:
                  strValue === opt.value ? 'rgba(232,160,32,0.08)' : 'transparent',
                border: `1px solid ${strValue === opt.value ? '#e8a020' : 'rgba(255,255,255,0.06)'}`,
                transition: 'all 0.15s ease',
              }}
            >
              <input
                type="radio"
                name={question.id}
                value={opt.value}
                checked={strValue === opt.value}
                onChange={() => onChange(opt.value)}
                style={{ accentColor: '#e8a020' }}
              />
              <span style={{ fontSize: '14px', color: strValue === opt.value ? '#e8a020' : '#8b95a5' }}>
                {t(opt.label)}
              </span>
            </label>
          ))}
        </div>
      )}

      {/* Chips (multiselect) */}
      {(question.type === 'chips' || question.type === 'multiselect') && question.options && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {question.options.map((opt) => (
            <Chip
              key={opt.value}
              selected={arrValue.includes(opt.value)}
              onClick={() => toggleChip(opt.value)}
            >
              {t(opt.label)}
            </Chip>
          ))}
        </div>
      )}

      {/* Select dropdown */}
      {question.type === 'select' && question.options && (
        <select
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            backgroundColor: '#1a1d26',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            color: strValue ? '#ffffff' : '#4a5568',
            fontSize: '14px',
            fontFamily: 'inherit',
            cursor: 'pointer',
            appearance: 'none',
            outline: 'none',
          }}
        >
          <option value="" disabled>
            {t('Select an option')}
          </option>
          {question.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(opt.label)}
            </option>
          ))}
        </select>
      )}

      {/* Decimal slider (0–100 internally, display /10) */}
      {question.type === 'slider' && (
        <Slider
          value={numValue}
          onChange={(v) => onChange(v)}
          sliderMinLabel={question.sliderMinLabel}
          sliderMaxLabel={question.sliderMaxLabel}
        />
      )}

      {/* Roles (primary label + subtitle) */}
      {question.type === 'roles' && question.roleOptions && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {question.roleOptions.map((role) => {
            const isSelected = strValue === role.value
            return (
              <button
                key={role.value}
                onClick={() => onChange(role.value)}
                style={{
                  textAlign: 'left',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: `1px solid ${isSelected ? '#e8a020' : 'rgba(255,255,255,0.06)'}`,
                  backgroundColor: isSelected ? 'rgba(232,160,32,0.08)' : 'transparent',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: isSelected ? '#e8a020' : '#d0d8e4',
                  }}
                >
                  {t(role.label)}
                </span>
                {role.subtitle && (
                  <span
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.35)',
                      marginTop: '2px',
                    }}
                  >
                    {t(role.subtitle)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
