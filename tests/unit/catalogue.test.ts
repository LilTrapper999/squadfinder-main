import { describe, expect, it } from 'vitest'
import { applyOverlay, SNAPSHOT } from '@/lib/catalogue'
import { gameKey, isProfileComplete, missingRequiredAnswers } from '@/lib/profileAnswers'
import type { ProfileAnswers } from '@/lib/types'

const firstGame = SNAPSHOT.allGames[0]
const firstKey = gameKey(firstGame)

describe('applyOverlay', () => {
  it('leaves the snapshot untouched and returns a new catalogue', () => {
    const before = JSON.stringify(SNAPSHOT.gamesByCategory)
    const out = applyOverlay(SNAPSHOT, [{ slug: firstGame.id, version_label: 'ZZ Season', version_date: 'Jan 1' }], [])
    expect(JSON.stringify(SNAPSHOT.gamesByCategory)).toBe(before)
    expect(out).not.toBe(SNAPSHOT)
    expect(out.findGameById(firstGame.id)?.versions[0].label).toBe('ZZ Season')
    expect(out.findGameById(firstGame.id)?.versions[0].date).toBe('Jan 1')
  })

  it('ignores empty labels and unknown slugs', () => {
    const out = applyOverlay(
      SNAPSHOT,
      [{ slug: firstGame.id, version_label: '  ', version_date: null }, { slug: 'not-a-game', version_label: 'X', version_date: null }],
      [{ slug: 'not-a-game', maps: ['M'], weapons: {}, roles: [] }],
    )
    expect(out.findGameById(firstGame.id)?.versions[0].label).toBe(firstGame.versions[0].label)
    expect(out.allGames.length).toBe(SNAPSHOT.allGames.length)
  })

  it('adds maps, weapons and roles but never removes or duplicates snapshot entries', () => {
    const base = SNAPSHOT.questions[firstKey]
    const knownMap = base.maps[0]
    const cat = base.weapons[0].category
    const knownWeapon = base.weapons[0].weapons[0]
    const knownRole = base.roles[0]
    const out = applyOverlay(SNAPSHOT, [], [
      {
        slug: firstKey,
        maps: [knownMap.toUpperCase(), 'ZZ Map'],
        weapons: { [cat.toLowerCase()]: [knownWeapon, 'ZZ Gun'], 'ZZ Category': ['ZZ Rifle'] },
        roles: [{ value: 'zz', label: 'ZZ Role', subtitle: '' }, { value: knownRole.value, label: knownRole.label }],
      },
    ])
    const q = out.questions[firstKey]
    expect(q.maps).toEqual([...base.maps, 'ZZ Map'])
    expect(q.weapons[0].weapons).toEqual([...base.weapons[0].weapons, 'ZZ Gun'])
    expect(q.weapons.at(-1)).toEqual({ category: 'ZZ Category', weapons: ['ZZ Rifle'] })
    expect(q.roles).toHaveLength(base.roles.length + 1)
    expect(q.roles.at(-1)?.label).toBe('ZZ Role')
    // and the snapshot itself did not change
    expect(SNAPSHOT.questions[firstKey].maps).not.toContain('ZZ Map')
  })

  it('survives malformed database values', () => {
    const out = applyOverlay(SNAPSHOT, [], [{ slug: firstKey, maps: 'nope', weapons: [1, 2], roles: { a: 1 } }])
    expect(out.questions[firstKey]).toEqual(SNAPSHOT.questions[firstKey])
  })
})

// U-14: the button, the select-game routing and /squad-matches all gate on this one function.
// Generated over the whole catalogue so a game with a gap in its question set cannot slip in.
describe('required answers, every catalogue game', () => {
  const keys = Array.from(new Set(SNAPSHOT.allGames.map(gameKey)))

  const fill = (key: string): ProfileAnswers => {
    const gq = SNAPSHOT.questions[key]
    return {
      gamesmanship: {
        [key]: {
          roles: gq?.roles?.length ? [gq.roles[0].value] : [],
          maps: gq?.maps?.length ? [gq.maps[0]] : [],
          weapons: gq?.weapons?.length ? [gq.weapons[0].weapons[0]] : [],
          skill: 50,
          roleMatchPreference: 50,
        },
      },
      vibeCheck: { personality: ['chill'], rageLevel: 20 },
      comms: { languages: ['en'], willingToChat: 'yes', willingToSpeak: 'yes', usernames: { [key]: 'Player1' } },
    }
  }

  it('covers a plausible number of games', () => {
    expect(keys.length).toBeGreaterThan(10)
  })

  it.each(keys.map((k) => [k] as const))('%s: a complete profile passes and each missing answer is rejected', (key) => {
    const gq = SNAPSHOT.questions[key]
    expect(isProfileComplete(key, fill(key), gq)).toBe(true)

    const without = (mutate: (a: ProfileAnswers) => void) => {
      const a = fill(key)
      mutate(a)
      return missingRequiredAnswers(key, a, gq)
    }
    const g = (a: ProfileAnswers) => (a.gamesmanship as Record<string, Record<string, unknown>>)[key]

    expect(without((a) => ((a.comms as Record<string, unknown>).usernames = {}))).toContain('In-game username')
    expect(without((a) => ((a.comms as Record<string, unknown>).usernames = { [key]: '   ' }))).toContain('In-game username')
    expect(without((a) => ((a.vibeCheck as Record<string, unknown>).personality = []))).toContain('Personality vibe')
    expect(without((a) => ((a.comms as Record<string, unknown>).languages = []))).toContain('Languages you play in')
    if (gq?.roles?.length) expect(without((a) => (g(a).roles = []))).toContain('Your role')
    if (gq?.weapons?.length) expect(without((a) => (g(a).weapons = []))).toContain('Weapons you run')
    if (gq?.maps?.length) {
      expect(without((a) => (g(a).maps = []))).toContain('Maps you know well')
      // "I don't know any maps" is an explicit, accepted answer
      expect(without((a) => ((g(a).maps = []), (g(a).noMaps = true)))).not.toContain('Maps you know well')
    }
  })

  it("one game's answers never satisfy another game's profile", () => {
    const [a, b] = keys
    expect(isProfileComplete(b, fill(a), SNAPSHOT.questions[b])).toBe(false)
  })
})
