'use client'

import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { GAME_QUESTIONS } from '@/lib/mockData'
import CheckboxGrid from '@/components/ui/CheckboxGrid'
import YesNoToggle from '@/components/ui/YesNoToggle'
import LanguagePicker from '@/components/ui/LanguagePicker'
import Slider from '@/components/ui/Slider'

// ─── Tick labels — 3 anchors only: [0.0, 5.0, 10.0] (SPEC_AMENDMENT_02 FIX 1) ──

const SKILL_LABELS: [string, string, string] = [
  'Noob',
  'Mid (Respectfully)',
  "We Don't Deserve You",
]

const RAGE_LABELS: [string, string, string] = [
  'Zen Monk',
  'Full Blame Rotation',
  'Keyboard Through Wall',
]

const ROLE_MATCH_LABELS: [string, string, string] = [
  'Complement me',
  'Either works',
  'Match me',
]

// ─── Vibe Check — personality options ────────────────────────────────────────

const PERSONALITY_OPTS = [
  'Calls out every enemy',
  'Teaches newer players',
  'Hypes the team',
  'Quiet but deadly',
  'Comedian / Banter',
  'Strategist / Over-thinker',
  'Results-only focused',
  'Clutch merchant',
  'Meme lord',
  'Main character energy',
]

// ─── Section header ────────────────────────────────────────────────────────────

function GroupHeader({ label }: { label: string }) {
  return (
    <p
      style={{
        margin: '0 0 20px',
        fontSize: '11px',
        fontWeight: 600,
        color: '#4a5568',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        paddingBottom: '10px',
        breakAfter: 'avoid',
      }}
    >
      {label}
    </p>
  )
}

function QuestionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 500, color: '#d0d8e4' }}>
      {children}
    </p>
  )
}

function QuestionBlock({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '28px', breakInside: 'avoid' }}>
      {children}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ProfileForm() {
  const router = useRouter()
  const { selectedGame, selectedVersion, profileAnswers, updateProfileAnswer } = useApp()

  const gameId = selectedGame?.id ?? ''
  const gq = GAME_QUESTIONS[gameId]

  // ── helpers ──────────────────────────────────────────────────────────────────
  // Nested key helpers  (e.g. 'gamesmanship.weapons')
  function nestedArr(group: string, field: string): string[] {
    const g = profileAnswers[group]
    if (g && typeof g === 'object' && !Array.isArray(g)) {
      const val = (g as Record<string, unknown>)[field]
      return Array.isArray(val) ? val : []
    }
    return []
  }

  function nestedNum(group: string, field: string): number {
    const g = profileAnswers[group]
    if (g && typeof g === 'object' && !Array.isArray(g)) {
      const val = (g as Record<string, unknown>)[field]
      return typeof val === 'number' ? val : 0
    }
    return 0
  }

  function nestedStr(group: string, field: string): string {
    const g = profileAnswers[group]
    if (g && typeof g === 'object' && !Array.isArray(g)) {
      const val = (g as Record<string, unknown>)[field]
      return typeof val === 'string' ? val : ''
    }
    return ''
  }

  function updateNested(group: string, field: string, value: unknown) {
    const g = profileAnswers[group]
    const existing = (g && typeof g === 'object' && !Array.isArray(g))
      ? (g as Record<string, unknown>)
      : {}
    updateProfileAnswer(group, { ...existing, [field]: value })
  }

  // ── validation ────────────────────────────────────────────────────────────────
  const canSubmit =
    nestedArr('gamesmanship', 'weapons').length > 0 ||
    nestedArr('gamesmanship', 'maps').length > 0 ||
    nestedArr('gamesmanship', 'roles').length > 0

  function handleSubmit() {
    if (!canSubmit) return
    router.push('/squad-matches')
  }

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: '80px' }}>

      {/* Welcome banner */}
      <div
        style={{
          marginBottom: '32px',
          padding: '20px 24px',
          backgroundColor: 'rgba(232,160,32,0.05)',
          border: '1px solid rgba(232,160,32,0.15)',
          borderRadius: '10px',
        }}
      >
        <p
          style={{
            margin: '0 0 6px',
            fontSize: '16px',
            fontWeight: 600,
            color: '#ffffff',
            fontFamily: 'var(--font-rajdhani), sans-serif',
          }}
        >
          Welcome, Commander
        </p>
        <p style={{ margin: 0, fontSize: '13px', color: '#8b95a5', lineHeight: 1.5 }}>
          {selectedGame ? (
            <>
              Building your profile for{' '}
              <span style={{ color: '#e8a020' }}>{selectedGame.name}</span>
              {selectedVersion && (
                <>
                  {' '}—{' '}
                  <span style={{ color: '#e8a020' }}>{selectedVersion.label}</span>
                </>
              )}
              . Answer honestly — this is how we find your perfect squad.
            </>
          ) : (
            'Answer honestly — this is how we find your perfect squad.'
          )}
        </p>
      </div>

      {/* 3-column masonry layout */}
      <div style={{ columnCount: 3, columnGap: '32px' }}>

        {/* ── GROUP 1: Gamesmanship ─────────────────────────────────────────── */}
        <div style={{ breakInside: 'avoid', marginBottom: '28px' }}>
          <GroupHeader label="Gamesmanship" />

          {/* G1 — Weapons (categorised with animated subtitles per FIX 3) */}
          {gq?.weapons && gq.weapons.length > 0 && (
            <QuestionBlock>
              <QuestionLabel>Which weapons do you run?</QuestionLabel>
              {gq.weapons.map((cat) => (
                <div key={cat.category} style={{ marginBottom: '12px' }}>
                  <div style={{ marginTop: '16px', marginBottom: '6px' }}>
                    <span className="sub-heading weapon-category-title">{cat.category}</span>
                  </div>
                  <CheckboxGrid
                    options={cat.weapons}
                    selected={nestedArr('gamesmanship', 'weapons')}
                    onChange={(v) => updateNested('gamesmanship', 'weapons', v)}
                    columns={cat.weapons.length > 8 ? 3 : 2}
                  />
                </div>
              ))}
            </QuestionBlock>
          )}

          {/* G2 — Maps */}
          {gq?.maps && gq.maps.length > 0 && (
            <QuestionBlock>
              <QuestionLabel>Which maps do you know well?</QuestionLabel>
              <CheckboxGrid
                options={gq.maps}
                selected={nestedArr('gamesmanship', 'maps')}
                onChange={(v) => updateNested('gamesmanship', 'maps', v)}
                columns={gq.maps.length > 12 ? 3 : 2}
              />
            </QuestionBlock>
          )}

          {/* G3 — Roles */}
          {gq?.roles && gq.roles.length > 0 && (
            <QuestionBlock>
              <QuestionLabel>What&apos;s your role?</QuestionLabel>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '6px',
                }}
              >
                {gq.roles.map((role) => {
                  const selected = nestedArr('gamesmanship', 'roles')
                  const isSelected = selected.includes(role.value)
                  return (
                    <label
                      key={role.value}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        padding: '8px 10px',
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
                        onChange={() => {
                          const cur = nestedArr('gamesmanship', 'roles')
                          updateNested(
                            'gamesmanship',
                            'roles',
                            isSelected ? cur.filter((v) => v !== role.value) : [...cur, role.value],
                          )
                        }}
                        style={{
                          accentColor: '#e8a020',
                          width: '13px',
                          height: '13px',
                          flexShrink: 0,
                          marginTop: '2px',
                          cursor: 'pointer',
                        }}
                      />
                      <span>
                        <span
                          style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: isSelected ? '#e8a020' : 'rgba(255,255,255,0.8)',
                            userSelect: 'none',
                          }}
                        >
                          {role.label}
                        </span>
                        {role.subtitle && (
                          <span
                            style={{
                              display: 'block',
                              fontSize: '10px',
                              color: 'rgba(255,255,255,0.35)',
                              userSelect: 'none',
                              marginTop: '1px',
                            }}
                          >
                            {role.subtitle}
                          </span>
                        )}
                      </span>
                    </label>
                  )
                })}
              </div>
            </QuestionBlock>
          )}

          {/* G3.5 — Role matching style (SPEC_AMENDMENT_08 FIX 2) */}
          <QuestionBlock>
            <QuestionLabel>Role matching style</QuestionLabel>
            <Slider
              value={(() => {
                const raw = nestedNum('gamesmanship', 'roleMatchPreference')
                const g = profileAnswers['gamesmanship']
                const isSet = g && typeof g === 'object' && !Array.isArray(g) && 'roleMatchPreference' in g
                return isSet ? raw : 50
              })()}
              onChange={(v) => updateNested('gamesmanship', 'roleMatchPreference', v)}
              tickLabels={ROLE_MATCH_LABELS}
            />
          </QuestionBlock>

          {/* G4 — Skill */}
          <QuestionBlock>
            <QuestionLabel>Skill level</QuestionLabel>
            <Slider
              value={nestedNum('gamesmanship', 'skill')}
              onChange={(v) => updateNested('gamesmanship', 'skill', v)}
              tickLabels={SKILL_LABELS}
            />
          </QuestionBlock>
        </div>

        {/* ── GROUP 2: Vibe Check ───────────────────────────────────────────── */}
        <div style={{ breakInside: 'avoid', marginBottom: '28px' }}>
          <GroupHeader label="Vibe Check" />

          {/* V1 — Rage level */}
          <QuestionBlock>
            <QuestionLabel>Rage level</QuestionLabel>
            <Slider
              value={nestedNum('vibeCheck', 'rageLevel')}
              onChange={(v) => updateNested('vibeCheck', 'rageLevel', v)}
              tickLabels={RAGE_LABELS}
            />
          </QuestionBlock>

          {/* V2 — Personality */}
          <QuestionBlock>
            <QuestionLabel>Personality vibe <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>(pick all that apply)</span></QuestionLabel>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '6px',
              }}
            >
              {PERSONALITY_OPTS.map((opt) => {
                const selected = nestedArr('vibeCheck', 'personality')
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
                      onChange={() => {
                        const cur = nestedArr('vibeCheck', 'personality')
                        updateNested(
                          'vibeCheck',
                          'personality',
                          isSelected ? cur.filter((v) => v !== opt) : [...cur, opt],
                        )
                      }}
                      style={{ accentColor: '#e8a020', width: '13px', height: '13px', flexShrink: 0, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '12px', color: isSelected ? '#e8a020' : 'rgba(255,255,255,0.7)', userSelect: 'none', lineHeight: 1.3 }}>
                      {opt}
                    </span>
                  </label>
                )
              })}
            </div>
          </QuestionBlock>
        </div>

        {/* ── GROUP 3: Comms ────────────────────────────────────────────────── */}
        <div style={{ breakInside: 'avoid', marginBottom: '28px' }}>
          <GroupHeader label="Comms" />
          <p
            style={{
              margin: '-14px 0 20px',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.35)',
              fontFamily: 'Inter, sans-serif',
              lineHeight: 1.4,
            }}
          >
            Languages determine your match score. Chat and mic preferences are shown to potential squadmates.
          </p>

          {/* C1 — Chat */}
          <QuestionBlock>
            <QuestionLabel>Willing to text chat?</QuestionLabel>
            <YesNoToggle
              value={
                nestedStr('comms', 'willingToChat') === 'yes'
                  ? 'yes'
                  : nestedStr('comms', 'willingToChat') === 'no'
                  ? 'no'
                  : null
              }
              onChange={(v) => updateNested('comms', 'willingToChat', v)}
            />
          </QuestionBlock>

          {/* C2 — Voice */}
          <QuestionBlock>
            <QuestionLabel>Willing to use voice comms?</QuestionLabel>
            <YesNoToggle
              value={
                nestedStr('comms', 'willingToSpeak') === 'yes'
                  ? 'yes'
                  : nestedStr('comms', 'willingToSpeak') === 'no'
                  ? 'no'
                  : null
              }
              onChange={(v) => updateNested('comms', 'willingToSpeak', v)}
            />
          </QuestionBlock>

          {/* C3 — Languages */}
          <QuestionBlock>
            <QuestionLabel>Languages you play in</QuestionLabel>
            <LanguagePicker
              selected={nestedArr('comms', 'languages')}
              onChange={(v) => updateNested('comms', 'languages', v)}
            />
          </QuestionBlock>
        </div>

      </div>

      {/* Fixed CTA */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 100,
        }}
      >
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            padding: '14px 32px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: canSubmit ? '#e8a020' : 'rgba(255,255,255,0.05)',
            color: canSubmit ? '#0a0b0f' : '#4a5568',
            fontSize: '15px',
            fontWeight: 700,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font-rajdhani), sans-serif',
            letterSpacing: '0.06em',
            transition: 'all 0.15s ease',
            boxShadow: canSubmit ? '0 4px 20px rgba(232,160,32,0.3)' : 'none',
          }}
        >
          FIND MY SQUAD →
        </button>
      </div>
    </div>
  )
}
