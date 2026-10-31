// /lib/profileAnswers.ts
// Shared translation layer between the raw /build-profile answer blob and the typed Profile
// the matching engine consumes — plus the labels the score breakdown popup on /notifications uses.

import { Game, GameQuestions, Profile, ProfileAnswers } from './types'

/**
 * The key every game-specific answer is filed under.
 *
 * Weapons/maps/roles are defined per base game, not per version tile — "Tarkov PvP" and
 * "Tarkov PvE" share one question set — so answers are scoped the same way. Scoping matters:
 * a flat gamesmanship blob let picks made for one game satisfy another game's required
 * questions and then fed the matching engine weapons that don't exist in the selected game.
 */
export function gameKey(game: Game | null | undefined): string {
  return game?.baseId ?? game?.id ?? ''
}

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

// Reads a nested answer group (e.g. answers.vibeCheck.personality) written by ProfileForm's updateNested()
export function nestedGroup(answers: ProfileAnswers, group: string): Record<string, unknown> {
  const g = answers[group]
  return g && typeof g === 'object' && !Array.isArray(g) ? (g as Record<string, unknown>) : {}
}

/**
 * Reads the gamesmanship answers for one game. Vibe Check and Comms stay flat — they apply to
 * every game — but weapons/maps/roles/skill are per game and nested one level deeper.
 */
export function gamesmanshipGroupFor(answers: ProfileAnswers, key: string): Record<string, unknown> {
  const all = nestedGroup(answers, 'gamesmanship')
  const g = all[key]
  return g && typeof g === 'object' && !Array.isArray(g) ? (g as Record<string, unknown>) : {}
}

/** In-game usernames are per game too — one account name per title, not one for the whole app. */
export function usernameFor(answers: ProfileAnswers, key: string): string {
  const usernames = nestedGroup(answers, 'comms').usernames
  if (usernames && typeof usernames === 'object') {
    const value = (usernames as Record<string, unknown>)[key]
    return typeof value === 'string' ? value : ''
  }
  return ''
}

function arr(v: unknown): string[] {
  return Array.isArray(v) ? v as string[] : []
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' ? v / 10 : fallback // stored 0–100 internally, Profile scale is 0.0–10.0
}

/**
 * Builds the current user's Profile (for calculateMatch) from their /build-profile answers.
 * `key` must be the game's answer key — see gameKey().
 */
export function buildProfileFromAnswers(key: string, answers: ProfileAnswers): Profile {
  const gamesmanship = gamesmanshipGroupFor(answers, key)
  const vibeCheck = nestedGroup(answers, 'vibeCheck')
  const comms = nestedGroup(answers, 'comms')
  return {
    gameId: key,
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

// ─── Required-answer gate ───────────────────────────────────────────────────

/**
 * Every question labelled "Required" that the user hasn't answered for this game, in form order.
 * One implementation drives both the FIND MY SQUAD button and the select-game routing —
 * otherwise a route that skips /build-profile lets a player match on an empty profile.
 *
 * The three game-specific lists are only demanded when the game actually renders them; every
 * catalogue game currently does, but a game with no GAME_QUESTIONS entry must not deadlock.
 */
export function missingRequiredAnswers(
  key: string,
  answers: ProfileAnswers,
  gq: GameQuestions | undefined,
): string[] {
  const gamesmanship = gamesmanshipGroupFor(answers, key)
  const comms = nestedGroup(answers, 'comms')
  const missing: string[] = []

  if (!usernameFor(answers, key).trim()) missing.push('In-game username')
  if (gq?.roles?.length && arr(gamesmanship.roles).length === 0) missing.push('Your role')
  if (gq?.maps?.length && arr(gamesmanship.maps).length === 0 && gamesmanship.noMaps !== true) {
    missing.push('Maps you know well')
  }
  if (gq?.weapons?.length && arr(gamesmanship.weapons).length === 0) missing.push('Weapons you run')
  if (arr(nestedGroup(answers, 'vibeCheck').personality).length === 0) missing.push('Personality vibe')
  if (arr(comms.languages).length === 0) missing.push('Languages you play in')

  return missing
}

/** True when this game's profile is complete enough to be matched on. */
export function isProfileComplete(
  key: string,
  answers: ProfileAnswers,
  gq: GameQuestions | undefined,
): boolean {
  return missingRequiredAnswers(key, answers, gq).length === 0
}

// ─── Score labels (notifications breakdown popup) ───────────────────────────

/** The four clickable score readouts on a match/notification card. */
export type ScoreCategory = 'overall' | 'gamesmanship' | 'vibe' | 'comms'

export const CATEGORY_LABEL: Record<ScoreCategory, string> = {
  overall: 'Overall Match',
  gamesmanship: 'Gamesmanship',
  vibe: 'Vibe Check',
  comms: 'Comms Style',
}

/** Which of a slider's three anchor labels a 0.0–10.0 value sits closest to. */
export function sliderAnchor(value: number, labels: [string, string, string]): string {
  return value <= 2.5 ? labels[0] : value < 7.5 ? labels[1] : labels[2]
}
