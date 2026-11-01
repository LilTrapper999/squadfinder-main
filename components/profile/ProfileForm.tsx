'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/context/I18nContext'
import { useApp } from '@/context/AppContext'
import { useCatalogue } from '@/context/CatalogueContext'
import { GAME_SPECIFIC_QUESTIONS } from '@/lib/mockData'
import type { Question } from '@/lib/types'
import GameQuestionBlock from '@/components/profile/QuestionBlock'
import CheckboxGrid from '@/components/ui/CheckboxGrid'
import LanguagePicker from '@/components/ui/LanguagePicker'
import Slider from '@/components/ui/Slider'
import { ERROR_MESSAGES, toRpcError } from '@/lib/db/rpc'
import { useWindowWidth } from '@/lib/useWindowWidth'
import WelcomeBanner from '@/components/ui/WelcomeBanner'
// Tick labels — 3 anchors only: [0.0, 5.0, 10.0] (SPEC_AMENDMENT_02 FIX 1). Shared with the
// notifications answers popup, which renders the same sliders back as readable text.
import {
  SKILL_LABELS,
  RAGE_LABELS,
  ROLE_MATCH_LABELS,
  gameKey,
  gamesmanshipGroupFor,
  missingRequiredAnswers,
  nestedGroup,
  usernameFor,
} from '@/lib/profileAnswers'

const MOBILE_BREAKPOINT = 640

// Steps: 0 identify (username) → 1 Gamesmanship → 2 Vibe Check → 3 Comms
const STEP_COUNT = 4
// Which required answers (labels from missingRequiredAnswers) belong to which step
const STEP_REQUIRED: string[][] = [
  ['In-game username'],
  [], // Gamesmanship — gated per sub-card, see SUB_REQUIRED
  ['Personality vibe'],
  ['Languages you play in'],
]
// Gamesmanship sub-cards: skill/role/role-matching · maps · weapons · game-specific extras
type SubCard = 'basics' | 'maps' | 'weapons' | 'specific'
const SUB_REQUIRED: Record<SubCard, string[]> = {
  basics: ['Your role'],
  maps: ['Maps you know well'],
  weapons: ['Weapons you run'],
  specific: [],
}

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
  const { t } = useT()
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
        {t(label)}
      </p>
      {subtext && (
        <p style={{ margin: '5px 0 0', fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>
          {t(subtext)}
        </p>
      )}
    </div>
  )
}

function QuestionLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  const { t } = useT()
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
            // Required reads as a warning, Optional stays quiet background text
            fontSize: required ? '11px' : '10px',
            fontWeight: required ? 700 : 400,
            color: required ? '#ff3b3b' : 'rgba(255,255,255,0.62)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            whiteSpace: 'nowrap',
            textShadow: required ? '0 0 8px rgba(255,59,59,0.5)' : 'none',
          }}
        >
          {required ? t('Required') : t('Optional')}
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
  const { t } = useT()
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
          {t(COMMS_STYLE_LABELS[activeIndex])}
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
                color: i === activeIndex ? '#e8a020' : 'rgba(255,255,255,0.62)',
                fontWeight: i === activeIndex ? 600 : 400,
                whiteSpace: 'nowrap',
              }}
            >
              {t(label)}
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

// ─── Role matching — a radio row, not a slider ───────────────────────────────
// The three anchors were the only meaningful stops on the old 0–100 slider, so they're
// stored as 0 / 50 / 100 and the matching engine still reads one number.

const ROLE_MATCH_OPTIONS: { value: number; label: string; subtitle: string }[] = [
  { value: 0,   label: ROLE_MATCH_LABELS[0], subtitle: 'Favour squadmates who fill different roles' },
  { value: 50,  label: ROLE_MATCH_LABELS[1], subtitle: 'No preference either way' },
  { value: 100, label: ROLE_MATCH_LABELS[2], subtitle: 'Favour squadmates who play like me' },
]

function RoleMatchRadioRow({ value, onChange, columns }: {
  value: number
  onChange: (v: number) => void
  columns: number
}) {
  const { t } = useT()
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '6px' }}>
      {ROLE_MATCH_OPTIONS.map((opt) => {
        const isSelected = value === opt.value
        return (
          <label
            key={opt.value}
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
              type="radio"
              name="roleMatchPreference"
              checked={isSelected}
              onChange={() => onChange(opt.value)}
              style={{ accentColor: '#e8a020', width: '13px', height: '13px', flexShrink: 0, marginTop: '2px', cursor: 'pointer' }}
            />
            <span>
              <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: isSelected ? '#e8a020' : 'rgba(255,255,255,0.8)', userSelect: 'none' }}>
                {t(opt.label)}
              </span>
              <span style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.62)', userSelect: 'none', marginTop: '1px' }}>
                {t(opt.subtitle)}
              </span>
            </span>
          </label>
        )
      })}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ProfileForm() {
  const router = useRouter()
  const { t } = useT()
  const { selectedGame, profileAnswers, updateProfileAnswer, saveMyProfile } = useApp()
  const { questions } = useCatalogue()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const width = useWindowWidth()
  const isMobile = width < MOBILE_BREAKPOINT

  // Weapons/maps/roles are keyed by the base game in GAME_QUESTIONS, not per version —
  // each version is its own selectable tile now, but they all share the same question set.
  // Answers are filed under the same key so one game's picks can't satisfy another's.
  const key = gameKey(selectedGame)

  // A refresh drops the in-memory game selection, leaving a form with no maps or weapons to
  // show — send them back to pick a game instead.
  useEffect(() => {
    if (!selectedGame) router.replace('/select-game')
  }, [selectedGame, router])
  const gq = questions[key]

  // ── helpers ──────────────────────────────────────────────────────────────────
  // Nested key helpers for the game-agnostic groups (e.g. 'vibeCheck.personality')
  function nestedArr(group: string, field: string): string[] {
    const val = nestedGroup(profileAnswers, group)[field]
    return Array.isArray(val) ? val : []
  }

  function nestedNum(group: string, field: string): number {
    const val = nestedGroup(profileAnswers, group)[field]
    return typeof val === 'number' ? val : 0
  }

  function nestedStr(group: string, field: string): string {
    const val = nestedGroup(profileAnswers, group)[field]
    return typeof val === 'string' ? val : ''
  }

  function updateNested(group: string, field: string, value: unknown) {
    updateProfileAnswer(group, { ...nestedGroup(profileAnswers, group), [field]: value })
  }

  // Gamesmanship is per game — weapons, maps and roles only mean anything within one title,
  // so they live under gamesmanship[key] rather than in one shared blob.
  function gamesArr(field: string): string[] {
    const val = gamesmanshipGroupFor(profileAnswers, key)[field]
    return Array.isArray(val) ? val : []
  }

  function gamesNum(field: string, fallback = 0): number {
    const val = gamesmanshipGroupFor(profileAnswers, key)[field]
    return typeof val === 'number' ? val : fallback
  }

  // Several fields in one write — sequential updateGamesmanship calls would each read the same
  // pre-render snapshot and the second would clobber the first.
  function updateGamesmanshipFields(fields: Record<string, unknown>) {
    const allGames = nestedGroup(profileAnswers, 'gamesmanship')
    const thisGame = gamesmanshipGroupFor(profileAnswers, key)
    updateProfileAnswer('gamesmanship', { ...allGames, [key]: { ...thisGame, ...fields } })
  }

  function updateGamesmanship(field: string, value: unknown) {
    updateGamesmanshipFields({ [field]: value })
  }

  // "None — I don't know any maps yet" satisfies the maps requirement for beginners.
  const noMaps = gamesmanshipGroupFor(profileAnswers, key).noMaps === true

  // The game's own extra questions. role/map are already asked above, so they're skipped here.
  const specificQuestions: Question[] = (
    GAME_SPECIFIC_QUESTIONS[key] ?? GAME_SPECIFIC_QUESTIONS[`_${selectedGame?.category ?? ''}`] ?? []
  ).filter((q) => q.id !== 'role' && q.id !== 'map')
  const rawSpecific = gamesmanshipGroupFor(profileAnswers, key).specific
  const specificAnswers: Record<string, unknown> =
    rawSpecific && typeof rawSpecific === 'object' && !Array.isArray(rawSpecific)
      ? (rawSpecific as Record<string, unknown>)
      : {}

  // Both fields must land in the same update — two sequential updateNested calls would each
  // read the same pre-render 'comms' snapshot and the second would clobber the first.
  function handleCommsStyleChange(chat: 'yes' | 'no', voice: 'yes' | 'no') {
    const g = profileAnswers['comms']
    const existing = (g && typeof g === 'object' && !Array.isArray(g))
      ? (g as Record<string, unknown>)
      : {}
    updateProfileAnswer('comms', { ...existing, willingToChat: chat, willingToSpeak: voice })
  }

  // In-game username is per-game, not a single flat field — keyed the same way as the rest of
  // the game-specific answers so switching games doesn't overwrite it.
  function updateGameUsername(value: string) {
    const existing = nestedGroup(profileAnswers, 'comms')
    const existingUsernames = (existing.usernames && typeof existing.usernames === 'object')
      ? (existing.usernames as Record<string, string>)
      : {}
    updateProfileAnswer('comms', {
      ...existing,
      usernames: { ...existingUsernames, [key]: value },
    })
  }

  // ── validation ────────────────────────────────────────────────────────────────
  // Shared with the select-game CTA, so no route can reach /squad-matches with an
  // incomplete profile for the selected game.
  const missingRequired = missingRequiredAnswers(key, profileAnswers, gq)
  const canSubmit = missingRequired.length === 0

  // The profile is built one section at a time; Next stays locked until that step's required
  // answers are in. The final submit still checks the whole profile (canSubmit).
  const [step, setStep] = useState(0)
  // Gamesmanship (step 1) is itself a short run of sub-cards. A sub-card with nothing to show
  // for this game (no maps, no weapons, no extra questions) isn't in the run at all.
  const [subStep, setSubStep] = useState(0)
  const subCards: SubCard[] = [
    'basics',
    ...(gq?.maps?.length ? (['maps'] as const) : []),
    ...(gq?.weapons?.length ? (['weapons'] as const) : []),
    ...(specificQuestions.length > 0 ? (['specific'] as const) : []),
  ]
  const subCount = subCards.length
  const lastSub = subCount - 1
  const card = subCards[subStep]
  const topRef = useRef<HTMLDivElement>(null)
  const isLastStep = step === STEP_COUNT - 1
  const required = step === 1 ? SUB_REQUIRED[card] : STEP_REQUIRED[step]
  const stepMissing = missingRequired.filter((m) => required.includes(m))
  const stepComplete = isLastStep ? canSubmit : stepMissing.length === 0

  function goTo(nextStep: number, nextSub: number) {
    setStep(nextStep)
    setSubStep(nextSub)
    topRef.current?.scrollIntoView({ block: 'start' })
  }
  function goNext() {
    if (!stepComplete || isLastStep) return
    if (step === 1 && subStep < lastSub) goTo(1, subStep + 1)
    else goTo(step + 1, 0)
  }
  function goBack() {
    if (step === 1 && subStep > 0) goTo(1, subStep - 1)
    else if (step === 2) goTo(1, lastSub)
    else if (step > 0) goTo(step - 1, 0)
  }

  async function handleSubmit() {
    if (!canSubmit || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      // Saves to the database when signed in; a no-op for the dev bypass.
      await saveMyProfile()
      router.push('/squad-matches')
    } catch (e) {
      // Never show a raw database/network message: map it to a translated one.
      const code = toRpcError(e).code
      setSaveError(code === 'unknown' ? t('Could not save your profile. Please try again.') : t(ERROR_MESSAGES[code]))
      setSaving(false)
    }
  }

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: '80px' }}>

      <div ref={topRef} style={{ maxWidth: '860px', margin: '0 auto' }}>

      {/* Progress — the profile is built one section at a time */}
      <p style={{ margin: '0 0 14px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8b95a5', fontFamily: 'var(--font-rajdhani), sans-serif' }}>
        {t('Step {current} of {total}', { current: step + 1, total: STEP_COUNT })}
      </p>
      {step === 1 && (
        <p style={{ margin: '-6px 0 14px', fontSize: '11px', color: 'rgba(255,255,255,0.62)' }}>
          {t('Gamesmanship · part {current} of {total}', { current: subStep + 1, total: subCount })}
        </p>
      )}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
        {Array.from({ length: STEP_COUNT }, (_, i) => (
          <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', backgroundColor: i <= step ? '#e8a020' : 'rgba(255,255,255,0.1)', transition: 'background-color 0.2s ease' }} />
        ))}
      </div>

      {/* STEP 1 — identify: the welcome banner doubles as the in-game username prompt */}
      {step === 0 && (
        <div style={{ marginBottom: '32px' }}>
          <WelcomeBanner
            game={selectedGame}
            subtext={
              <>
                <span style={{ display: 'block', marginBottom: '10px' }}>
                  {t('How should we call you?')}
                </span>
                <input
                  type="text"
                  autoFocus
                  value={usernameFor(profileAnswers, key)}
                  onChange={(e) => updateGameUsername(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && stepComplete) goNext() }}
                  placeholder={t('e.g. ShadowRook')}
                  aria-label={selectedGame ? t('In-game username for {game}', { game: selectedGame.name }) : t('In-game username')}
                  style={{
                    width: '100%',
                    maxWidth: '360px',
                    padding: '11px 14px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <span style={{ display: 'block', margin: '8px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.62)', lineHeight: 1.4 }}>
                  {t("This is specific to this game — build a profile for another game and you'll set a different username.")}
                </span>
              </>
            }
          />
        </div>
      )}

      <div>

        {/* ── STEP 2: Gamesmanship ──────────────────────────────────────────── */}
        {step === 1 && (
        <div style={{ breakInside: 'avoid', marginBottom: '28px' }}>
          <GroupHeader label="Gamesmanship" subtext="Specific for all games" />

          {/* Sub-card 1 — skill level, your role, role matching style */}
          {card === 'basics' && (<>
          {/* G1 — Skill */}
          <QuestionBlock>
            <QuestionLabel required={false}>{t('Skill level')}</QuestionLabel>
            <Slider
              value={gamesNum('skill')}
              onChange={(v) => updateGamesmanship('skill', v)}
              tickLabels={SKILL_LABELS}
            />
          </QuestionBlock>

          {/* In-game username moved to step 1 (the welcome banner) */}

          {/* G4 — Roles */}
          {gq?.roles && gq.roles.length > 0 && (
            <QuestionBlock>
              <QuestionLabel required={true}>{t("What's your role?")}</QuestionLabel>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                  gap: '6px',
                }}
              >
                {gq.roles.map((role) => {
                  const selected = gamesArr('roles')
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
                          const cur = gamesArr('roles')
                          updateGamesmanship(
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
                          {t(role.label)}
                        </span>
                        {role.subtitle && (
                          <span
                            style={{
                              display: 'block',
                              fontSize: '10px',
                              color: 'rgba(255,255,255,0.62)',
                              userSelect: 'none',
                              marginTop: '1px',
                            }}
                          >
                            {t(role.subtitle)}
                          </span>
                        )}
                      </span>
                    </label>
                  )
                })}
              </div>
            </QuestionBlock>
          )}

          {/* G3 — Role matching style (SPEC_AMENDMENT_08 FIX 2) */}
          <QuestionBlock>
            <QuestionLabel required={false}>{t('Role matching style')}</QuestionLabel>
            <RoleMatchRadioRow
              value={(() => {
                const group = gamesmanshipGroupFor(profileAnswers, key)
                return 'roleMatchPreference' in group ? gamesNum('roleMatchPreference', 50) : 50
              })()}
              onChange={(v) => updateGamesmanship('roleMatchPreference', v)}
              columns={isMobile ? 1 : 3}
            />
          </QuestionBlock>
          </>)}

          {/* Sub-card 2 — maps, with an explicit "none" for beginners */}
          {card === 'maps' && gq?.maps && gq.maps.length > 0 && (
            <QuestionBlock>
              <QuestionLabel required={true}>{t('Which maps do you know well?')}</QuestionLabel>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 12px',
                  marginBottom: '10px',
                  borderRadius: '5px',
                  border: `1px solid ${noMaps ? '#e8a020' : 'rgba(255,255,255,0.12)'}`,
                  backgroundColor: noMaps ? 'rgba(232,160,32,0.07)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={noMaps}
                  onChange={() => {
                    // Picking "none" clears any maps; picking a map below clears "none"
                    updateGamesmanshipFields({ noMaps: !noMaps, maps: [] })
                  }}
                  style={{ accentColor: '#e8a020', width: '13px', height: '13px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', fontWeight: 600, color: noMaps ? '#e8a020' : 'rgba(255,255,255,0.8)' }}>
                  {t("None — I don't know any maps yet")}
                </span>
              </label>
              <CheckboxGrid
                options={gq.maps}
                selected={gamesArr('maps')}
                onChange={(v) => updateGamesmanshipFields({ maps: v, noMaps: false })}
                columns={gq.maps.length > 12 ? 3 : 2}
              />
            </QuestionBlock>
          )}

          {/* Sub-card 3 — weapons: every category open on one card, pick freely across them */}
          {card === 'weapons' && gq?.weapons && gq.weapons.length > 0 && (
            <QuestionBlock>
              <QuestionLabel required={true}>{t('Weapons — pick at least 1')}</QuestionLabel>
              <p style={{ margin: '-4px 0 6px', fontSize: '11px', color: 'rgba(255,255,255,0.62)' }}>
                {t('Pick as many as you like, from any category.')}
              </p>
              {gq.weapons.map((cat) => (
                <div key={cat.category} style={{ marginBottom: '8px' }}>
                  <p style={{ margin: '16px 0 6px' }}>
                    <span className="sub-heading weapon-category-title">{t(cat.category)}</span>
                  </p>
                  <CheckboxGrid
                    options={cat.weapons}
                    selected={gamesArr('weapons')}
                    onChange={(v) => updateGamesmanship('weapons', v)}
                    columns={cat.weapons.length > 8 ? 3 : 2}
                  />
                </div>
              ))}
            </QuestionBlock>
          )}

          {/* Sub-card 4 — the game's own extra questions (optional, shown on match cards only) */}
          {card === 'specific' && specificQuestions.map((q) => (
            <GameQuestionBlock
              key={q.id}
              question={q}
              value={specificAnswers[q.id] as string | string[] | number | undefined}
              onChange={(v) => updateGamesmanship('specific', { ...specificAnswers, [q.id]: v })}
            />
          ))}
        </div>
        )}

        {/* ── STEP 3: Vibe Check ────────────────────────────────────────────── */}
        {step === 2 && (
        <div style={{ breakInside: 'avoid', marginBottom: '28px' }}>
          <GroupHeader label="Vibe Check" subtext="Applies to every game" />

          {/* V1 — Rage level */}
          <QuestionBlock>
            <QuestionLabel required={false}>{t('Rage level')}</QuestionLabel>
            <Slider
              value={nestedNum('vibeCheck', 'rageLevel')}
              onChange={(v) => updateNested('vibeCheck', 'rageLevel', v)}
              tickLabels={RAGE_LABELS}
            />
          </QuestionBlock>

          {/* V2 — Personality */}
          <QuestionBlock>
            <QuestionLabel required={true}>{t('Personality vibe')} <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.62)' }}>{t('(pick all that apply)')}</span></QuestionLabel>
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
                      {t(opt)}
                    </span>
                  </label>
                )
              })}
            </div>
          </QuestionBlock>
        </div>
        )}

        {/* ── STEP 4: Comms ─────────────────────────────────────────────────── */}
        {step === 3 && (
        <div style={{ breakInside: 'avoid', marginBottom: '28px' }}>
          <GroupHeader label="Comms" subtext="Applies to every game" />
          <p
            style={{
              margin: '0 0 20px',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.62)',
              fontFamily: 'Inter, sans-serif',
              lineHeight: 1.4,
            }}
          >
            {t('Languages determine your match score. Chat and mic preferences are shown to potential squadmates.')}
          </p>

          {/* C1 — Comms style (replaces separate chat/voice yes-no toggles) */}
          <QuestionBlock>
            <QuestionLabel required={false}>{t('In-game Comms Style')}</QuestionLabel>
            <CommsSlider
              chat={nestedStr('comms', 'willingToChat')}
              voice={nestedStr('comms', 'willingToSpeak')}
              onChange={handleCommsStyleChange}
            />
          </QuestionBlock>

          {/* C2 — Languages */}
          <QuestionBlock>
            <QuestionLabel required={true}>{t('Languages you play in')}</QuestionLabel>
            <LanguagePicker
              selected={nestedArr('comms', 'languages')}
              onChange={(v) => updateNested('comms', 'languages', v)}
            />
          </QuestionBlock>
        </div>
        )}

      </div>

      {/* Step navigation — Back on the left, Next / Find My Squad on the right */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          marginTop: '8px',
        }}
      >
        {step > 0 ? (
          <button
            type="button"
            onClick={goBack}
            style={{
              padding: '14px 28px',
              borderRadius: '8px',
              border: '1px solid rgba(232,160,32,0.4)',
              backgroundColor: 'transparent',
              color: '#e8a020',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--font-rajdhani), sans-serif',
              letterSpacing: '0.06em',
            }}
          >
            {t('← Back')}
          </button>
        ) : <span />}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '8px',
          }}
        >
        {/* Names what's still blocking this step — the button alone can't say why it's dead */}
        {!stepComplete && (
          <div
            style={{
              maxWidth: '260px',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: '#111318',
              border: '1px solid rgba(232,160,32,0.25)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          >
            <p
              style={{
                margin: '0 0 4px',
                fontFamily: 'var(--font-rajdhani), sans-serif',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#e8a020',
              }}
            >
              {t('Still required')}
            </p>
            <p style={{ margin: 0, fontSize: '11px', color: '#8b95a5', lineHeight: 1.5 }}>
              {stepMissing.map((m) => t(m)).join(' · ')}
            </p>
          </div>
        )}

        <button
          onClick={isLastStep ? handleSubmit : goNext}
          disabled={!stepComplete || saving}
          style={{
            padding: '14px 32px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: stepComplete ? '#e8a020' : 'rgba(255,255,255,0.05)',
            color: stepComplete ? '#0a0b0f' : '#8b95a5',
            fontSize: '15px',
            fontWeight: 700,
            cursor: stepComplete ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font-rajdhani), sans-serif',
            letterSpacing: '0.06em',
            transition: 'all 0.15s ease',
            boxShadow: stepComplete ? '0 4px 20px rgba(232,160,32,0.3)' : 'none',
          }}
        >
          {isLastStep ? t('FIND MY SQUAD →') : t('Next →')}
        </button>
        {saveError && (
          <p role="alert" style={{ margin: '12px 0 0', fontSize: '13px', color: '#ef4444' }}>{saveError}</p>
        )}
        </div>
      </div>
      </div>
    </div>
  )
}
