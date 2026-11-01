import { describe, expect, it } from 'vitest'
import {
  buildProfileFromAnswers,
  gameKey,
  isProfileComplete,
  missingRequiredAnswers,
  sliderAnchor,
  SKILL_LABELS,
} from '@/lib/profileAnswers'
import type { Game, GameQuestions, ProfileAnswers } from '@/lib/types'

const gq = { roles: [{}], maps: [{}], weapons: [{}] } as unknown as GameQuestions
const KEY = 'tarkov'

const complete = (): ProfileAnswers => ({
  gamesmanship: { [KEY]: { roles: ['r'], maps: ['m'], weapons: ['w'], skill: 70, roleMatchPreference: 30 } },
  vibeCheck: { personality: ['chill'], rageLevel: 20 },
  comms: { languages: ['en'], willingToChat: 'yes', willingToSpeak: 'no', usernames: { [KEY]: 'Player1' } },
})

describe('gameKey', () => {
  it('prefers baseId, then id, then empty', () => {
    expect(gameKey({ baseId: 'b', id: 'i' } as Game)).toBe('b')
    expect(gameKey({ id: 'i' } as Game)).toBe('i')
    expect(gameKey(null)).toBe('')
  })
})

describe('buildProfileFromAnswers', () => {
  it('rescales stored 0-100 sliders to 0-10 and maps comms flags', () => {
    expect(buildProfileFromAnswers(KEY, complete())).toMatchObject({
      gameId: KEY,
      weapons: ['w'],
      maps: ['m'],
      roles: ['r'],
      skill: 7,
      roleMatchPreference: 3,
      rage: 2,
      personality: ['chill'],
      languages: ['en'],
      willingToChat: true,
      willingToSpeak: false,
    })
  })

  it('falls back to neutral values on an empty blob', () => {
    expect(buildProfileFromAnswers(KEY, {})).toMatchObject({
      weapons: [],
      skill: 5,
      rage: 5,
      roleMatchPreference: 5,
    })
  })

  it("does not leak another game's picks", () => {
    expect(buildProfileFromAnswers('other', complete()).weapons).toEqual([])
  })
})

describe('missingRequiredAnswers', () => {
  it('is empty for a complete profile', () => {
    expect(missingRequiredAnswers(KEY, complete(), gq)).toEqual([])
    expect(isProfileComplete(KEY, complete(), gq)).toBe(true)
  })

  /* eslint-disable @typescript-eslint/no-explicit-any */
  it.each([
    ['In-game username', (a: any) => { a.comms.usernames[KEY] = '   ' }],
    ['Your role', (a: any) => { a.gamesmanship[KEY].roles = [] }],
    ['Maps you know well', (a: any) => { a.gamesmanship[KEY].maps = [] }],
    ['Weapons you run', (a: any) => { a.gamesmanship[KEY].weapons = [] }],
    ['Personality vibe', (a: any) => { a.vibeCheck.personality = [] }],
    ['Languages you play in', (a: any) => { a.comms.languages = [] }],
  ])('flags %s', (label, mutate) => {
    const a = complete()
    mutate(a)
    expect(missingRequiredAnswers(KEY, a, gq)).toEqual([label])
    expect(isProfileComplete(KEY, a, gq)).toBe(false)
  })

  it('accepts "no maps" and ignores lists the game does not render', () => {
    const a: any = complete()
    a.gamesmanship[KEY].maps = []
    a.gamesmanship[KEY].noMaps = true
    expect(missingRequiredAnswers(KEY, a, gq)).toEqual([])
    a.gamesmanship[KEY].weapons = []
    expect(missingRequiredAnswers(KEY, a, { ...gq, weapons: [] } as GameQuestions)).toEqual([])
  })
})

describe('sliderAnchor', () => {
  it('picks the closest of three anchors', () => {
    expect([0, 2.5, 2.6, 7.4, 7.5, 10].map((v) => sliderAnchor(v, SKILL_LABELS))).toEqual([
      SKILL_LABELS[0],
      SKILL_LABELS[0],
      SKILL_LABELS[1],
      SKILL_LABELS[1],
      SKILL_LABELS[2],
      SKILL_LABELS[2],
    ])
  })
})
