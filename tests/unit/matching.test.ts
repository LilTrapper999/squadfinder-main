import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { calculateMatch, explainMatch } from '@/lib/matching'
import type { Profile } from '@/lib/types'

// The same hand-written vectors the SQL suite (supabase/tests/run.mjs) scores through
// public.calculate_match. That suite asserts SQL == JS; this one pins the JS side in CI.
const vectors: { name: string; a: Partial<Profile>; b: Partial<Profile> }[] = JSON.parse(
  readFileSync(path.join(__dirname, '../../supabase/tests/match_vectors.json'), 'utf8'),
).pairs

const full = (p: Partial<Profile>): Profile => ({
  weapons: [],
  maps: [],
  roles: [],
  skill: 5,
  rage: 5,
  personality: [],
  languages: [],
  willingToChat: true,
  willingToSpeak: true,
  gameId: '',
  ...p,
})

const named = vectors.map((v) => [v.name, v] as const)
// 'dup' vectors hold duplicate array entries, which game_profiles' CHECK rejects, so the
// 0..100 bound is only promised for storable profiles.
const storable = named.filter(([name]) => !name.startsWith('dup'))

describe('calculateMatch', () => {
  it('scores identical profiles 100, except roles at a neutral preference (50)', () => {
    const v = vectors.find((x) => x.name === 'identical')!
    expect(calculateMatch(full(v.a), full(v.b))).toEqual({
      overall: 96, // gamesmanship (100 + 100 + 50 + 100) / 4 = 87.5, so (87.5 + 100 + 100) / 3
      gamesmanship: 88,
      vibeCheck: 100,
      comms: 100,
    })
  })

  it('scores disjoint profiles 0 for vibe and comms', () => {
    const v = vectors.find((x) => x.name === 'disjoint')!
    const s = calculateMatch(full(v.a), full(v.b))
    expect(s.vibeCheck).toBe(0)
    expect(s.comms).toBe(0)
  })

  it('treats empty roles as neutral and no shared language as no comms', () => {
    // weapons 0, maps 0, roles 50, skill 100 -> 37.5 -> 38; rage 100, personality 0 -> 50
    expect(calculateMatch(full({}), full({}))).toMatchObject({ gamesmanship: 38, vibeCheck: 50, comms: 0 })
  })

  it.each(storable)('%s: integer scores in 0..100, symmetric', (_name, v) => {
    const ab = calculateMatch(full(v.a), full(v.b))
    const ba = calculateMatch(full(v.b), full(v.a))
    for (const n of Object.values(ab)) {
      expect(Number.isInteger(n)).toBe(true)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThanOrEqual(100)
    }
    expect(ba).toEqual(ab)
  })
})

describe('explainMatch', () => {
  it.each(named)('%s: breakdown scores equal calculateMatch', (_name, v) => {
    const a = full(v.a)
    const b = full(v.b)
    const e = explainMatch(a, b)
    expect(e.scores).toEqual(calculateMatch(a, b))
    expect(e.gamesmanship.factors).toHaveLength(4)
    expect(e.vibe.factors).toHaveLength(2)
    expect(e.comms.factors).toHaveLength(1)
  })
})
