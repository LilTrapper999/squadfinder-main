// DB-contract tests: the real lib/db/* wrappers run against the real migrations (PGlite).
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { bootDb, type FakeSupabase, type TestDb } from '../helpers/pgliteSupabase'

// The wrappers import `supabase` from this module; point it at whichever user the test is acting as.
let current: FakeSupabase
vi.mock('@/lib/supabase/client', () => ({
  supabase: new Proxy({}, { get: (_t, prop) => (current as unknown as Record<string, unknown>)[prop as string] }),
}))

import { acceptRequest, fetchAllies, fetchPendingRequests, heartbeat, removeAllyRpc } from '@/lib/db/requests'
import {
  countSearchingByGame, fetchOutboundRequests, findSquadMatches, sendSquadRequest, startSearching, withdrawSquadRequest,
} from '@/lib/db/discovery'
import { gameIdForSlug, resetGameIdCache } from '@/lib/db/games'
import { saveProfile, loadProfileAnswers } from '@/lib/db/profiles'
import { fetchBlocks, fetchShowOnlinePlayers, saveShowOnlinePlayers } from '@/lib/db/settings'
import { RpcError } from '@/lib/db/rpc'
import type { ProfileAnswers } from '@/lib/types'

let T: TestDb
beforeAll(async () => { T = await bootDb() }, 120_000)
afterAll(async () => { await T.db.close() })
beforeEach(() => resetGameIdCache())

const KEY = 'tarkov' // base game slug
const answers = (name: string): ProfileAnswers => ({
  gamesmanship: { [KEY]: { weapons: ['AK-74'], maps: ['Customs'], roles: ['Rusher'], skill: 60, roleMatchPreference: 50 } },
  vibeCheck: { personality: ['chill'], rageLevel: 30 },
  comms: { languages: ['en'], willingToChat: 'yes', willingToSpeak: 'no', usernames: { [KEY]: name } },
})

async function player(name: string) {
  const id = await T.mkUser()
  current = T.clientFor(id)
  await saveProfile(id, KEY, answers(name))
  await heartbeat()
  return id
}

describe('profiles', () => {
  it('saveProfile → loadProfileAnswers round-trips the answers', async () => {
    const id = await player('RoundTrip')
    const back = await loadProfileAnswers(id)
    expect(back).toMatchObject({
      gamesmanship: { [KEY]: { weapons: ['AK-74'], maps: ['Customs'], roles: ['Rusher'], skill: 60 } },
      vibeCheck: { personality: ['chill'], rageLevel: 30 },
      comms: { languages: ['en'], willingToChat: 'yes', willingToSpeak: 'no', usernames: { [KEY]: 'RoundTrip' } },
    })
  })
})

describe('discovery → request → accept → allies', () => {
  it('runs the whole loop through the wrappers, never exposing a user id or username early', async () => {
    const a = await player('SenderA')
    const b = await player('RecipientB')
    const pvp = await gameIdForSlug('tarkov-eft-pvp')

    current = T.clientFor(b); await startSearching(pvp)
    current = T.clientFor(a); await startSearching(pvp)

    const matches = await findSquadMatches(pvp, KEY, false)
    expect(matches).toHaveLength(1)
    const m = matches[0]
    expect(Object.keys(m)).toEqual(['matchRef', 'status', 'score', 'profile'])
    expect(JSON.stringify(m)).not.toContain(b)
    expect(JSON.stringify(m)).not.toContain('RecipientB')
    expect(m.status).toBe('searching')

    expect((await countSearchingByGame())[pvp]).toBe(2)

    const requestId = await sendSquadRequest(pvp, m.matchRef)
    let out = await fetchOutboundRequests()
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ id: requestId, gameSlug: 'tarkov-eft-pvp', status: 'pending', matchRef: m.matchRef })
    expect(await findSquadMatches(pvp, KEY, false)).toHaveLength(0) // pending pairs drop out of discovery

    current = T.clientFor(b)
    const cards = await fetchPendingRequests()
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({ id: requestId, senderUsername: 'SenderA', gameId: 'tarkov-eft-pvp' })
    await acceptRequest(requestId)

    const bAllies = await fetchAllies()
    expect(bAllies).toHaveLength(1)
    expect(bAllies[0]).toMatchObject({ username: 'SenderA', requestId })

    current = T.clientFor(a)
    out = await fetchOutboundRequests()
    expect(out[0].status).toBe('accepted')
    const aAllies = await fetchAllies()
    expect(aAllies[0]).toMatchObject({ username: 'RecipientB', requestId, status: 'searching' })

    await removeAllyRpc(aAllies[0].id)
    expect(await fetchAllies()).toHaveLength(0)
  })

  it('withdraw cancels a pending request', async () => {
    const a = await player('WithdrawA')
    const b = await player('WithdrawB')
    const pvp = await gameIdForSlug('tarkov-eft-pvp')
    current = T.clientFor(b); await startSearching(pvp)
    current = T.clientFor(a); await startSearching(pvp)
    const [m] = await findSquadMatches(pvp, KEY, false)
    const id = await sendSquadRequest(pvp, m.matchRef)
    await withdrawSquadRequest(id)
    expect(await fetchOutboundRequests()).toHaveLength(0)
    current = T.clientFor(b)
    expect(await fetchPendingRequests()).toHaveLength(0)
  })

  it('maps database errors to stable codes', async () => {
    await player('ErrA')
    const pvp = await gameIdForSlug('tarkov-eft-pvp')
    const err = await sendSquadRequest(pvp, '00000000-0000-0000-0000-000000000000').catch((e) => e)
    expect(err).toBeInstanceOf(RpcError)
    expect((err as RpcError).code).toBe('unavailable')
  })
})

describe('settings', () => {
  it('persists show_online_players and lists blocks as labels only', async () => {
    const id = await player('Settings')
    expect(await fetchShowOnlinePlayers(id)).toBe(false)
    await saveShowOnlinePlayers(id, true)
    expect(await fetchShowOnlinePlayers(id)).toBe(true)
    expect(await fetchBlocks()).toEqual([])
  })
})
