// /lib/profileAnswers.ts
// Shared translation layer between the raw /build-profile answer blob and the typed Profile
// the matching engine consumes — plus the human-readable rendering of a profile used by the
// per-category answers popup on /notifications.

import { Profile, ProfileAnswers } from './types'

// ─── Slider anchor labels (shared with ProfileForm) ─────────────────────────
// 3 anchors only: [0.0, 5.0, 10.0] (SPEC_AMENDMENT_02 FIX 1)

export const SKILL_LABELS: [string, string, string] = [
  'Noob',
  'Mid (Respectfully)',
  "We Don't Deserve You",
]

export const RAGE_LABELS: [string, string, string] = [
  'Zen Monk',
  'Full Blame Rotation',
  'Keyboard Through Wall',
]

export const ROLE_MATCH_LABELS: [string, string, string] = [
  'Complement me',
  'Either works',
  'Match me',
]

// ─── Raw answers → Profile ──────────────────────────────────────────────────

// Reads a nested answer group (e.g. answers.gamesmanship.weapons) written by ProfileForm's updateNested()
function nestedGroup(answers: ProfileAnswers, group: string): Record<string, unknown> {
  const g = answers[group]
  return g && typeof g === 'object' && !Array.isArray(g) ? (g as Record<string, unknown>) : {}
}

function arr(v: unknown): string[] {
  return Array.isArray(v) ? v as string[] : []
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' ? v / 10 : fallback // stored 0–100 internally, Profile scale is 0.0–10.0
}

/** Builds the current user's Profile (for calculateMatch) from their /build-profile answers. */
export function buildProfileFromAnswers(gameId: string, answers: ProfileAnswers): Profile {
  const gamesmanship = nestedGroup(answers, 'gamesmanship')
  const vibeCheck = nestedGroup(answers, 'vibeCheck')
  const comms = nestedGroup(answers, 'comms')
  return {
    gameId,
    weapons: arr(gamesmanship.weapons),
    maps: arr(gamesmanship.maps),
    roles: arr(gamesmanship.roles),
    skill: num(gamesmanship.skill, 5),
    roleMatchPreference: num(gamesmanship.roleMatchPreference, 5),
    rage: num(vibeCheck.rageLevel, 5),
    personality: arr(vibeCheck.personality),
    willingToChat: comms.willingToChat === 'yes',
    willingToSpeak: comms.willingToSpeak === 'yes',
    languages: arr(comms.languages),
  }
}

// ─── Profile → readable answers (notifications popup) ───────────────────────

/** The four clickable score readouts on a match/notification card. */
export type ScoreCategory = 'overall' | 'gamesmanship' | 'vibe' | 'comms'

export const CATEGORY_LABEL: Record<ScoreCategory, string> = {
  overall: 'Overall Match',
  gamesmanship: 'Gamesmanship',
  vibe: 'Vibe Check',
  comms: 'Comms Style',
}

export interface AnswerItem {
  /** The build-profile question this answers */
  label: string
  /** One entry per selected option — empty means the sender skipped the question */
  values: string[]
}

export interface AnswerGroup {
  title: string
  items: AnswerItem[]
}

/** Renders a 0.0–10.0 slider answer as "6.5 / 10 — Mid (Respectfully)". */
function sliderAnswer(value: number, labels: [string, string, string]): string {
  const anchor = value <= 2.5 ? labels[0] : value < 7.5 ? labels[1] : labels[2]
  return `${value.toFixed(1)} / 10 — ${anchor}`
}

/** Mirrors ProfileForm's CommsSlider — the two booleans are a single 4-stop answer. */
function commsStyle(profile: Profile): string {
  if (profile.willingToChat && profile.willingToSpeak) return 'Both'
  if (profile.willingToSpeak) return 'Only Voice Chat'
  if (profile.willingToChat) return 'Only Text Chat'
  return 'No Communication'
}

function gamesmanshipGroup(profile: Profile): AnswerGroup {
  return {
    title: 'Gamesmanship',
    items: [
      { label: 'Role matching style', values: [sliderAnswer(profile.roleMatchPreference ?? 5, ROLE_MATCH_LABELS)] },
      { label: 'Skill level', values: [sliderAnswer(profile.skill, SKILL_LABELS)] },
      { label: "What's your role?", values: profile.roles },
      { label: 'Maps they know well', values: profile.maps },
      { label: 'Weapons they run', values: profile.weapons },
    ],
  }
}

function vibeGroup(profile: Profile): AnswerGroup {
  return {
    title: 'Vibe Check',
    items: [
      { label: 'Rage level', values: [sliderAnswer(profile.rage, RAGE_LABELS)] },
      { label: 'Personality vibe', values: profile.personality },
    ],
  }
}

function commsGroup(profile: Profile): AnswerGroup {
  return {
    title: 'Comms',
    items: [
      { label: 'Comms style', values: [commsStyle(profile)] },
      { label: 'Languages they play in', values: profile.languages },
    ],
  }
}

/**
 * Every answer the sender gave for one score category — 'overall' returns all three groups,
 * since the overall score is the average of them.
 */
export function describeAnswers(profile: Profile, category: ScoreCategory): AnswerGroup[] {
  switch (category) {
    case 'gamesmanship': return [gamesmanshipGroup(profile)]
    case 'vibe':         return [vibeGroup(profile)]
    case 'comms':        return [commsGroup(profile)]
    case 'overall':      return [gamesmanshipGroup(profile), vibeGroup(profile), commsGroup(profile)]
  }
}
