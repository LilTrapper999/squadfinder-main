// /lib/matching.ts
// Compatibility scoring between two player profiles (MATCHING_LOGIC_SPEC.md, roleScore per SPEC_AMENDMENT_08 FIX 2).

import {
  Profile,
  MatchScores,
  MatchResult,
  MatchBreakdown,
  MatchFactor,
  MatchFactorDetail,
  MatchFactorId,
} from './types'

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

  const avgPref = roleSimilarityLean(me, them)

  // Blend: 0.0 pref = pure diversity, 1.0 pref = pure similarity
  return diversityScore * (1 - avgPref) + similarityScore * avgPref
}

/** Both players' role-matching preferences averaged and rescaled from 0–10 to 0–1. */
function roleSimilarityLean(me: Profile, them: Profile): number {
  return ((me.roleMatchPreference ?? 5) + (them.roleMatchPreference ?? 5)) / 20
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

// ── Comms (language-only binary gate, SPEC_AMENDMENT_10 FIX 1) ───────────

/**
 * commsScore
 *
 * Binary: 100 if at least one shared language, 0 if none.
 * willingToChat and willingToSpeak are informational only — not scored,
 * shown as info badges on the match card instead.
 */
function commsScore(me: Profile, them: Profile): number {
  const shared = intersection(me.languages, them.languages)
  return shared.length > 0 ? 100 : 0
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

// ── Explanation ──────────────────────────────────────────

function overlapDetail(me: string[], them: string[]): Extract<MatchFactorDetail, { kind: 'overlap' }> {
  return {
    kind: 'overlap',
    shared: intersection(me, them),
    onlyYou: me.filter(x => !them.includes(x)),
    onlyThem: them.filter(x => !me.includes(x)),
  }
}

function scaleDetail(you: number, them: number): Extract<MatchFactorDetail, { kind: 'scale' }> {
  const maxGap = 5 // keep in step with proximityScore's default
  return { kind: 'scale', you, them, gap: Math.abs(you - them), maxGap }
}

/**
 * explainMatch
 *
 * Same inputs and same scoring functions as calculateMatch, but returns every component of every
 * score — which picks the two players share, which only one made, and how far apart their sliders
 * sit — so the UI can show *why* a percentage is what it is. Category scores come from the same
 * helpers calculateMatch uses, so the two can never disagree.
 */
export function explainMatch(me: Profile, them: Profile): MatchBreakdown {
  const scores = calculateMatch(me, them)

  const factor = (
    id: MatchFactorId,
    score: number,
    weight: number,
    detail: MatchFactorDetail,
  ): MatchFactor => ({ id, score: Math.round(score), weight, detail })

  return {
    scores,
    gamesmanship: {
      score: scores.gamesmanship,
      factors: [
        factor('weapons', weaponScore(me, them), 0.25, overlapDetail(me.weapons, them.weapons)),
        factor('maps', mapScore(me, them), 0.25, overlapDetail(me.maps, them.maps)),
        factor('roles', roleScore(me, them), 0.25, {
          ...overlapDetail(me.roles, them.roles),
          similarityLean: roleSimilarityLean(me, them),
        }),
        factor('skill', skillScore(me, them), 0.25, scaleDetail(me.skill, them.skill)),
      ],
    },
    vibe: {
      score: scores.vibeCheck,
      factors: [
        factor('rage', rageScore(me, them), 0.5, scaleDetail(me.rage, them.rage)),
        factor('personality', personalityScore(me, them), 0.5, overlapDetail(me.personality, them.personality)),
      ],
    },
    comms: {
      score: scores.comms,
      factors: [factor('languages', commsScore(me, them), 1, overlapDetail(me.languages, them.languages))],
    },
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
