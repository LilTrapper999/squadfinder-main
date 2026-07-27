// /lib/matching.ts
// Compatibility scoring between two player profiles (MATCHING_LOGIC_SPEC.md, roleScore per SPEC_AMENDMENT_08 FIX 2).

import { Profile, MatchScores, MatchResult } from './types'

// ── Utility ──────────────────────────────────────────────

function intersection<T>(a: T[], b: T[]): T[] {
  return a.filter(x => b.includes(x))
}

function union<T>(a: T[], b: T[]): T[] {
  return Array.from(new Set(a.concat(b)))
}

/**
 * Jaccard similarity — measures overlap between two arrays.
 * Returns 0–100. Returns 0 if both arrays are empty.
 */
function jaccardScore<T>(a: T[], b: T[]): number {
  const u = union(a, b)
  if (u.length === 0) return 0
  return (intersection(a, b).length / u.length) * 100
}

/**
 * Proximity score — measures how close two numbers are on a scale.
 * maxGap defines the distance at which score reaches 0.
 * Returns 0–100.
 */
function proximityScore(a: number, b: number, maxGap: number = 5): number {
  return Math.max(0, 100 - (Math.abs(a - b) / maxGap) * 100)
}

// ── Gamesmanship (4 components × 25% each) ───────────────

/**
 * Weapons: Jaccard similarity.
 * More shared weapon preferences = higher score.
 */
function weaponScore(me: Profile, them: Profile): number {
  return jaccardScore(me.weapons, them.weapons)
}

/**
 * Maps: Jaccard similarity.
 * More shared map preferences = higher score.
 */
function mapScore(me: Profile, them: Profile): number {
  return jaccardScore(me.maps, them.maps)
}

/**
 * Roles — accounts for both players' role-matching preferences (SPEC_AMENDMENT_08 FIX 2).
 *
 * preference = 0.0 → rewards diversity (complement)
 * preference = 5.0 → neutral (no preference)
 * preference = 10.0 → rewards similarity (match)
 *
 * Average both players' preferences, then blend between the diversity
 * score and the similarity score accordingly.
 */
function roleScore(me: Profile, them: Profile): number {
  const u = union(me.roles, them.roles)
  if (u.length === 0) return 50 // no data = neutral

  const overlapRatio = intersection(me.roles, them.roles).length / u.length
  const similarityScore = overlapRatio * 100        // high overlap = high score
  const diversityScore = (1 - overlapRatio) * 100   // low overlap = high score

  // Average both players' preferences (0–10 scale → 0–1)
  const avgPref = ((me.roleMatchPreference ?? 5) + (them.roleMatchPreference ?? 5)) / 20

  // Blend: 0.0 pref = pure diversity, 1.0 pref = pure similarity
  return diversityScore * (1 - avgPref) + similarityScore * avgPref
}

/**
 * Skill: Proximity score on 0–10 scale.
 * Gap of 0 = 100%, gap of 5.0 = 0%.
 */
function skillScore(me: Profile, them: Profile): number {
  return proximityScore(me.skill, them.skill, 5)
}

function gamesmanshipScore(me: Profile, them: Profile): number {
  return (
    weaponScore(me, them) +
    mapScore(me, them) +
    roleScore(me, them) +
    skillScore(me, them)
  ) / 4
}

// ── Vibe Check (2 components × 50% each) ─────────────────

/**
 * Rage: Proximity score on 0–10 scale.
 * Similar rage levels = better vibe match.
 */
function rageScore(me: Profile, them: Profile): number {
  return proximityScore(me.rage, them.rage, 5)
}

/**
 * Personality: Jaccard similarity.
 * Shared personality traits = better vibe.
 */
function personalityScore(me: Profile, them: Profile): number {
  return jaccardScore(me.personality, them.personality)
}

function vibeCheckScore(me: Profile, them: Profile): number {
  return (rageScore(me, them) + personalityScore(me, them)) / 2
}

// ── Comms (3 components × ~33% each) ─────────────────────

/**
 * Chat (text): Binary match.
 * Both willing or both not willing = 100%. Mismatch = 0%.
 */
function chatScore(me: Profile, them: Profile): number {
  return me.willingToChat === them.willingToChat ? 100 : 0
}

/**
 * Voice: Binary match.
 * Both on mic or both off mic = 100%. Mismatch = 0%.
 */
function voiceScore(me: Profile, them: Profile): number {
  return me.willingToSpeak === them.willingToSpeak ? 100 : 0
}

/**
 * Languages: Shared language required.
 * 0 shared languages = 0%, 1 shared = 50%, 2+ shared = 100%.
 */
function languageScore(me: Profile, them: Profile): number {
  const shared = intersection(me.languages, them.languages).length
  if (shared === 0) return 0
  return Math.min(100, shared * 50)
}

function commsScore(me: Profile, them: Profile): number {
  return (chatScore(me, them) + voiceScore(me, them) + languageScore(me, them)) / 3
}

// ── Main Export ───────────────────────────────────────────

/**
 * calculateMatch
 *
 * Takes two player profiles and returns their compatibility scores.
 * All scores are rounded integers 0–100.
 */
export function calculateMatch(me: Profile, them: Profile): MatchScores {
  const gamesmanship = gamesmanshipScore(me, them)
  const vibeCheck = vibeCheckScore(me, them)
  const comms = commsScore(me, them)
  const overall = (gamesmanship + vibeCheck + comms) / 3

  return {
    overall: Math.round(overall),
    gamesmanship: Math.round(gamesmanship),
    vibeCheck: Math.round(vibeCheck),
    comms: Math.round(comms),
  }
}

/**
 * rankMatches
 *
 * Takes the current user's profile and an array of mock opponent profiles,
 * calculates match scores for each, and returns them sorted by overall
 * score descending (best match first).
 */
export function rankMatches(
  me: Profile,
  opponents: Array<{ id: string; profile: Profile; status: string; statusGame: string | null }>
): Array<MatchResult & { status: string; statusGame: string | null }> {
  return opponents
    .map((opponent, index) => ({
      matchId: `match-${String(index + 1).padStart(2, '0')}`,
      scores: calculateMatch(me, opponent.profile),
      profile: opponent.profile,
      status: opponent.status,
      statusGame: opponent.statusGame,
    }))
    .sort((a, b) => b.scores.overall - a.scores.overall)
    .map((result, index) => ({
      ...result,
      matchId: `match-${String(index + 1).padStart(2, '0')}`, // re-label after sort
    }))
}
