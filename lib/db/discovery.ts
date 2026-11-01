// Discovery and outbound requests (SPEC_DB_CHANGES.md §3.4–§3.8). Nothing here ever returns
// another player's user id or username before acceptance.

import { rpc } from '@/lib/db/rpc'
import type { MatchCandidate, MatchStatus, OutboundRequest, OutboundStatus } from '@/lib/types'

interface MatchRow {
  match_ref: string
  weapons: string[]
  maps: string[]
  roles: string[]
  skill: number | string
  role_match_preference: number | string | null
  rage: number | string
  personality: string[]
  willing_to_chat: boolean
  willing_to_speak: boolean
  languages: string[]
  platform: string | null
  status: string
  score: number
}

interface OutboundRow {
  request_id: string
  game_slug: string
  status: string
  created_at: string
  match_ref: string | null
}

const toStatus = (s: string): MatchStatus => (s === 'searching' || s === 'online' ? s : 'offline')

const OUTBOUND: OutboundStatus[] = ['pending', 'accepted', 'declined', 'expired']
const toOutbound = (s: string): OutboundStatus => (OUTBOUND.includes(s as OutboundStatus) ? (s as OutboundStatus) : 'expired')

export function mapMatchRow(r: MatchRow, gameKey: string): MatchCandidate {
  return {
    matchRef: r.match_ref,
    status: toStatus(r.status),
    score: Number(r.score),
    profile: {
      gameId: gameKey,
      weapons: r.weapons,
      maps: r.maps,
      roles: r.roles,
      skill: Number(r.skill),
      roleMatchPreference: r.role_match_preference == null ? undefined : Number(r.role_match_preference),
      rage: Number(r.rage),
      personality: r.personality,
      willingToChat: r.willing_to_chat,
      willingToSpeak: r.willing_to_speak,
      languages: r.languages,
      platform: r.platform ?? undefined,
    },
  }
}

export function mapOutboundRow(r: OutboundRow): OutboundRequest {
  return {
    id: r.request_id,
    gameSlug: r.game_slug,
    status: toOutbound(r.status),
    createdAt: r.created_at,
    matchRef: r.match_ref,
  }
}

export const startSearching = (gameId: string) => rpc<void>('start_searching', { p_game_id: gameId })
export const stopSearching = () => rpc<void>('stop_searching')

export async function findSquadMatches(gameId: string, gameKey: string, includeOnline: boolean): Promise<MatchCandidate[]> {
  const rows = await rpc<MatchRow[]>('find_squad_matches', {
    p_game_id: gameId,
    p_include_online: includeOnline,
    p_limit: 50,
  })
  return (rows ?? []).map((r) => mapMatchRow(r, gameKey))
}

export async function sendSquadRequest(gameId: string, matchRef: string): Promise<string> {
  const rows = await rpc<{ request_id: string }[]>('send_squad_request', { p_game_id: gameId, p_match_ref: matchRef })
  return rows[0].request_id
}

export const withdrawSquadRequest = (id: string) => rpc<void>('withdraw_squad_request', { p_request_id: id })

export async function fetchOutboundRequests(): Promise<OutboundRequest[]> {
  return ((await rpc<OutboundRow[]>('get_my_outbound_requests')) ?? []).map(mapOutboundRow)
}

/** games.id → number of players searching. Keyed by id; callers map to slugs. */
export async function countSearchingByGame(): Promise<Record<string, number>> {
  const rows = await rpc<{ game_id: string; n: number | string }[]>('count_searching_by_game')
  const out: Record<string, number> = {}
  for (const r of rows ?? []) out[r.game_id] = Number(r.n)
  return out
}
