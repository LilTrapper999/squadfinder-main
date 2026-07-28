'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { GAME_QUESTIONS } from '@/lib/mockData'
import CheckboxGrid from '@/components/ui/CheckboxGrid'
import LanguagePicker from '@/components/ui/LanguagePicker'
import Slider from '@/components/ui/Slider'
import { useWindowWidth } from '@/lib/useWindowWidth'

const TABLET_BREAKPOINT = 1024
const MOBILE_BREAKPOINT = 640

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

function GroupHeader({ label, subtext }: { label: string; subtext?: string }) {
  return (
    <div
      style={{
        marginBottom: '20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        paddingBottom: '10px',
        breakAfter: 'avoid',
      }}
    >
      <p className="main-heading" style={{ margin: 0, fontSize: '19.25px' }}>
        {label}
      </p>
      {subtext && (
        <p style={{ margin: '4px 0 0', fontSize: '10px', fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>
          {subtext}
        </p>
      )}
    </div>
  )
}

function QuestionLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p
      style={{
        margin: '0 0 10px',
        fontSize: '14px',
        fontWeight: 500,
        color: '#d0d8e4',
        display: 'flex',
        alignItems: 'baseline',
        flexWrap: 'wrap',
        columnGap: '8px',
        rowGap: '2px',
      }}
    >
      <span>{children}</span>
      {required !== undefined && (
        <span
          style={{
            fontSize: '10px',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
          }}
        >
          {required ? 'Required' : 'Optional'}
        </span>
      )}
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

// ─── Comms style slider — replaces the separate chat/voice yes-no toggles ─────────────

const COMMS_STYLE_LABELS = ['No Communication', 'Only Text Chat', 'Only Voice Chat', 'Both']

function CommsSlider({ chat, voice, onChange }: {
  chat: string
  voice: string
  onChange: (chat: 'yes' | 'no', voice: 'yes' | 'no') => void
}) {
  const chatOn = chat === 'yes'
  const voiceOn = voice === 'yes'
  const activeIndex = chatOn && voiceOn ? 3 : voiceOn ? 2 : chatOn ? 1 : 0
  const maxIndex = COMMS_STYLE_LABELS.length - 1
  const pct = (activeIndex / maxIndex) * 100

  function handleDrag(index: number) {
    onChange(index === 1 || index === 3 ? 'yes' : 'no', index === 2 || index === 3 ? 'yes' : 'no')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ textAlign: 'center' }}>
        <span style={{
          fontSize: '16px',
          fontWeight: 700,
          color: '#e8a020',
          fontFamily: 'var(--font-rajdhani), sans-serif',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          {COMMS_STYLE_LABELS[activeIndex]}
        </span>
      </div>

      <div style={{ position: 'relative', paddingBottom: '30px' }}>
        {/* Track */}
        <div style={{ position: 'relative', height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.08)' }}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${pct}%`,
              backgroundColor: '#e8a020',
              borderRadius: '2px',
              transition: 'width 0.15s ease',
            }}
          />
        </div>

        {/* Tick marks — plain flex row, purely visual indents */}
        <div style={{ position: 'absolute', top: '8px', left: 0, right: 0, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
          {COMMS_STYLE_LABELS.map((_, i) => (
            <div key={i} style={{ width: '1px', height: '6px', backgroundColor: 'rgba(255,255,255,0.25)' }} />
          ))}
        </div>

        {/* Labels — positioned independently of the tick marks above. Nesting a label inside a
            1px-wide flex tick item forces flexbox to center it there regardless of any transform,
            which pushes the first/last labels off the track edge; positioning each by `left: X%`
            against this full-width row avoids that entirely. */}
        <div style={{ position: 'absolute', top: '18px', left: 0, right: 0, height: 0, pointerEvents: 'none' }}>
          {COMMS_STYLE_LABELS.map((label, i) => (
            <span
              key={label}
              style={{
                position: 'absolute',
                left: `${(i / maxIndex) * 100}%`,
                transform: i === 0 ? 'none' : i === maxIndex ? 'translateX(-100%)' : 'translateX(-50%)',
                fontSize: '9px',
                color: i === activeIndex ? '#e8a020' : 'rgba(255,255,255,0.4)',
                fontWeight: i === activeIndex ? 600 : 400,
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Draggable native range input — 4 discrete stops */}
        <input
          type="range"
          min={0}
          max={maxIndex}
          step={1}
          value={activeIndex}
          onChange={(e) => handleDrag(Number(e.target.value))}
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
        <div
          style={{
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
          }}
        />
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ProfileForm() {
  const router = useRouter()
  const { selectedGame, profileAnswers, updateProfileAnswer } = useApp()
  const width = useWindowWidth()
  const isTablet = width < TABLET_BREAKPOINT
  const isMobile = width < MOBILE_BREAKPOINT
  const columnCount = isMobile ? 1 : isTablet ? 2 : 3

  // Weapons/maps/roles are keyed by the base game in GAME_QUESTIONS, not per version —
  // each version is its own selectable tile now, but they all share the same question set.
  const gq = GAME_QUESTIONS[selectedGame?.baseId ?? selectedGame?.id ?? '']

  // Weapon categories unfold on click rather than living behind a native <select> dropdown.
  const [openWeaponCats, setOpenWeaponCats] = useState<Record<string, boolean>>({})
  function toggleWeaponCat(category: string) {
    setOpenWeaponCats((prev) => ({ ...prev, [category]: !prev[category] }))
  }

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

  // Both fields must land in the same update — two sequential updateNested calls would each
  // read the same pre-render 'comms' snapshot and the second would clobber the first.
  function handleCommsStyleChange(chat: 'yes' | 'no', voice: 'yes' | 'no') {
    const g = profileAnswers['comms']
    const existing = (g && typeof g === 'object' && !Array.isArray(g))
      ? (g as Record<string, unknown>)
      : {}
    updateProfileAnswer('comms', { ...existing, willingToChat: chat, willingToSpeak: voice })
  }

  // In-game username is per-game, not a single flat field — keyed by gameId so switching
  // games (or coming back to build a profile for a different one) doesn't overwrite it.
  function getGameUsername(): string {
    const g = profileAnswers['comms']
    if (g && typeof g === 'object' && !Array.isArray(g)) {
      const usernames = (g as Record<string, unknown>).usernames
      if (usernames && typeof usernames === 'object') {
        const val = (usernames as Record<string, unknown>)[selectedGame?.id ?? '']
        return typeof val === 'string' ? val : ''
      }
    }
    return ''
  }

  function updateGameUsername(value: string) {
    const g = profileAnswers['comms']
    const existing = (g && typeof g === 'object' && !Array.isArray(g))
      ? (g as Record<string, unknown>)
      : {}
    const existingUsernames = (existing.usernames && typeof existing.usernames === 'object')
      ? (existing.usernames as Record<string, string>)
      : {}
    updateProfileAnswer('comms', {
      ...existing,
      usernames: { ...existingUsernames, [selectedGame?.id ?? '']: value },
    })
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
            margin: '0 0 8px',
            fontSize: '24px',
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
              . Answer honestly — this is how we find your perfect squad.
            </>
          ) : (
            'Answer honestly — this is how we find your perfect squad.'
          )}
        </p>
      </div>

      {/* 3-column layout — Gamesmanship / Vibe Check / Comms sit side by side, each top-aligned
          regardless of content height (a CSS-columns masonry would let taller columns bleed
          into the next, pushing Comms out of the third column). */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columnCount}, 1fr)`, columnGap: '32px', alignItems: 'start' }}>

        {/* ── GROUP 1: Gamesmanship ─────────────────────────────────────────── */}
        <div style={{ breakInside: 'avoid', marginBottom: '28px' }}>
          <GroupHeader label="Gamesmanship" subtext="Specific for all games" />

          {/* G1 — Role matching style (SPEC_AMENDMENT_08 FIX 2) */}
          <QuestionBlock>
            <QuestionLabel required={false}>Role matching style</QuestionLabel>
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

          {/* G2 — Skill */}
          <QuestionBlock>
            <QuestionLabel required={false}>Skill level</QuestionLabel>
            <Slider
              value={nestedNum('gamesmanship', 'skill')}
              onChange={(v) => updateNested('gamesmanship', 'skill', v)}
              tickLabels={SKILL_LABELS}
            />
          </QuestionBlock>

          {/* G3 — Roles */}
          {gq?.roles && gq.roles.length > 0 && (
            <QuestionBlock>
              <QuestionLabel required={true}>What&apos;s your role?</QuestionLabel>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
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

          {/* G4 — Maps */}
          {gq?.maps && gq.maps.length > 0 && (
            <QuestionBlock>
              <QuestionLabel required={true}>Which maps do you know well?</QuestionLabel>
              <CheckboxGrid
                options={gq.maps}
                selected={nestedArr('gamesmanship', 'maps')}
                onChange={(v) => updateNested('gamesmanship', 'maps', v)}
                columns={gq.maps.length > 12 ? 3 : 2}
              />
            </QuestionBlock>
          )}

          {/* G5 — Weapons: each category unfolds on click instead of a native <select> */}
          {gq?.weapons && gq.weapons.length > 0 && (
            <QuestionBlock>
              <QuestionLabel required={true}>Which weapons do you run?</QuestionLabel>
              {gq.weapons.map((cat) => {
                const isOpen = !!openWeaponCats[cat.category]
                return (
                  <div key={cat.category} style={{ marginBottom: '8px' }}>
                    <button
                      type="button"
                      onClick={() => toggleWeaponCat(cat.category)}
                      aria-expanded={isOpen}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        marginTop: '16px',
                        marginBottom: '6px',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span className="sub-heading weapon-category-title">{cat.category}</span>
                      <span
                        style={{
                          display: 'inline-block',
                          color: '#e8a020',
                          fontSize: '10px',
                          transition: 'transform 0.15s ease',
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                      >
                        ▼
                      </span>
                    </button>
                    {isOpen && (
                      <CheckboxGrid
                        options={cat.weapons}
                        selected={nestedArr('gamesmanship', 'weapons')}
                        onChange={(v) => updateNested('gamesmanship', 'weapons', v)}
                        columns={cat.weapons.length > 8 ? 3 : 2}
                      />
                    )}
                  </div>
                )
              })}
            </QuestionBlock>
          )}
        </div>

        {/* ── GROUP 2: Vibe Check ───────────────────────────────────────────── */}
        <div style={{ breakInside: 'avoid', marginBottom: '28px' }}>
          <GroupHeader label="Vibe Check" subtext="Applies to every game" />

          {/* V1 — Rage level */}
          <QuestionBlock>
            <QuestionLabel required={false}>Rage level</QuestionLabel>
            <Slider
              value={nestedNum('vibeCheck', 'rageLevel')}
              onChange={(v) => updateNested('vibeCheck', 'rageLevel', v)}
              tickLabels={RAGE_LABELS}
            />
          </QuestionBlock>

          {/* V2 — Personality */}
          <QuestionBlock>
            <QuestionLabel required={true}>Personality vibe <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>(pick all that apply)</span></QuestionLabel>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
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
          <GroupHeader label="Comms" subtext="Applies to every game" />
          <p
            style={{
              margin: '0 0 20px',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.35)',
              fontFamily: 'Inter, sans-serif',
              lineHeight: 1.4,
            }}
          >
            Languages determine your match score. Chat and mic preferences are shown to potential squadmates.
          </p>

          {/* C0 — In-game username: per-game, not a single flat profile field */}
          <QuestionBlock>
            <QuestionLabel>
              In-game username{selectedGame ? ` for ${selectedGame.name}` : ''}
            </QuestionLabel>
            <input
              type="text"
              value={getGameUsername()}
              onChange={(e) => updateGameUsername(e.target.value)}
              placeholder="e.g. ShadowRook"
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: 'rgba(255,255,255,0.03)',
                color: '#ffffff',
                fontSize: '14px',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <p style={{ margin: '6px 0 0', fontSize: '10px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.4 }}>
              This is specific to this game — build a profile for another game and you&apos;ll set a different username.
            </p>
          </QuestionBlock>

          {/* C1 — Comms style (replaces separate chat/voice yes-no toggles) */}
          <QuestionBlock>
            <QuestionLabel required={false}>Comms style</QuestionLabel>
            <CommsSlider
              chat={nestedStr('comms', 'willingToChat')}
              voice={nestedStr('comms', 'willingToSpeak')}
              onChange={handleCommsStyleChange}
            />
          </QuestionBlock>

          {/* C2 — Languages */}
          <QuestionBlock>
            <QuestionLabel required={true}>Languages you play in</QuestionLabel>
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
