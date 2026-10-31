// Thin typed wrappers over the squad-request RPCs from SPEC_DB_CHANGES.md.
// squad_requests is not readable by clients at all: everything goes through these functions,
// none of which ever return the other player's user id before acceptance.

import { supabase } from '@/lib/supabase/client'
import type { Ally, MatchStatus, SquadRequest } from '@/lib/types'

interface RequestCardRow {
  request_id: string
  game_slug: string
  sender_username: string
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
  sender_status: string
}

interface AllyRow {
  ally_id: string
  game_slug: string
  ally_gaming_user_id: string
  match_score_at_acceptance: number | string | null
  rating: 'favorite' | 'meh' | null
  status: string
  block_id: string | null
}

function toStatus(s: string): MatchStatus {
  return s === 'searching' || s === 'online' ? s : 'offline'
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data as T
}

export async function fetchPendingRequests(): Promise<SquadRequest[]> {
  const rows = await rpc<RequestCardRow[]>('get_my_pending_request_cards')
  return rows.map((r) => ({
    id: r.request_id,
    // games.slug is the catalogue id the UI already uses ('tarkov-eft-pvp', 'cs2', …)
    gameId: r.game_slug,
    senderUsername: r.sender_username,
    senderStatus: toStatus(r.sender_status),
    senderStatusGame: null,
    profile: {
      gameId: r.game_slug,
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
    },
  }))
}

export async function fetchAllies(): Promise<Ally[]> {
  const rows = await rpc<AllyRow[]>('get_my_allies')
  return rows.map((a) => ({
    id: a.ally_id,
    username: a.ally_gaming_user_id,
    overall: Math.round(Number(a.match_score_at_acceptance ?? 0)),
    status: toStatus(a.status),
    statusGame: null,
    gameId: a.game_slug,
    pinned: a.rating === 'favorite',
    blocked: a.block_id != null,
    blockId: a.block_id ?? undefined,
  }))
}

export const acceptRequest = (id: string) => rpc<void>('accept_squad_request', { p_request_id: id })
export const declineRequest = (id: string) => rpc<void>('decline_squad_request', { p_request_id: id })
export const declineAndBlockRequest = (id: string) => rpc<void>('decline_and_block_squad_request', { p_request_id: id })
export const removeAllyRpc = (allyId: string) => rpc<void>('remove_ally', { p_ally_id: allyId })
export const blockAllyRpc = (allyId: string) => rpc<void>('block_ally', { p_ally_id: allyId })
export const unblockRpc = (blockId: string) => rpc<void>('unblock_user', { p_block_id: blockId })
export const heartbeat = () => rpc<void>('heartbeat')

/** Pin = rating 'favorite'. Direct update is allowed: the allies policy lets owners change rating only. */
export async function setAllyPinned(allyId: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.from('allies').update({ rating: pinned ? 'favorite' : null }).eq('id', allyId)
  if (error) throw new Error(error.message)
}
