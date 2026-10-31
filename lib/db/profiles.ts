// Saves and loads the player's questionnaire answers as game_profiles rows.
//
// The UI keeps one answers blob (ProfileAnswers). The DB keeps one row per BASE game
// (SPEC_DB_CHANGES.md §3.2): "Tarkov PvP" and "Tarkov PvE" share a row, keyed by
// gameKey(game) = game.baseId ?? game.id, which equals games.slug of the base/anchor row.

import { supabase } from '@/lib/supabase/client'
import type { ProfileAnswers } from '@/lib/types'
import { buildProfileFromAnswers, gamesmanshipGroupFor, usernameFor } from '@/lib/profileAnswers'

const unique = (a: string[]) => Array.from(new Set(a)).slice(0, 100)
const tenth = (n: number) => Math.round(n * 10) / 10
// eslint-disable-next-line no-control-regex
const cleanName = (s: string) => s.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 40)

export async function saveProfile(userId: string, key: string, answers: ProfileAnswers): Promise<void> {
  const username = cleanName(usernameFor(answers, key))
  if (!username) throw new Error('Enter your in-game username first.')

  const { data: game, error: gameError } = await supabase.from('games').select('id').eq('slug', key).single()
  if (gameError || !game) throw new Error(`Unknown game "${key}"`)

  const p = buildProfileFromAnswers(key, answers)
  const gm = gamesmanshipGroupFor(answers, key)
  const specific = gm.specific && typeof gm.specific === 'object' && !Array.isArray(gm.specific) ? gm.specific : {}

  const { error } = await supabase.from('game_profiles').upsert(
    {
      user_id: userId,
      game_id: game.id,
      in_game_username: username,
      weapons: unique(p.weapons),
      maps: unique(p.maps),
      roles: unique(p.roles),
      skill: tenth(p.skill),
      role_match_preference: tenth(p.roleMatchPreference ?? 5),
      rage: tenth(p.rage),
      personality: unique(p.personality),
      willing_to_chat: p.willingToChat,
      willing_to_speak: p.willingToSpeak,
      languages: unique(p.languages),
      no_maps: gm.noMaps === true,
      specific_answers: specific,
    },
    { onConflict: 'user_id,game_id' }
  )
  if (error) throw new Error(error.message)
}

interface ProfileRow {
  in_game_username: string
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
  no_maps: boolean
  specific_answers: Record<string, unknown>
  updated_at: string
  game: { slug: string } | null
}

/** The player's saved profiles, rebuilt into the answers blob the form and matcher read. */
export async function loadProfileAnswers(userId: string): Promise<ProfileAnswers | null> {
  const { data, error } = await supabase
    .from('game_profiles')
    .select('*, game:games(slug)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as unknown as ProfileRow[]
  if (rows.length === 0) return null

  const gamesmanship: Record<string, unknown> = {}
  const usernames: Record<string, string> = {}
  for (const r of rows) {
    const key = r.game?.slug
    if (!key) continue
    usernames[key] = r.in_game_username
    gamesmanship[key] = {
      weapons: r.weapons,
      maps: r.maps,
      roles: r.roles,
      skill: Number(r.skill) * 10,            // stored 0–10, the form works 0–100
      roleMatchPreference: Number(r.role_match_preference ?? 5) * 10,
      noMaps: r.no_maps,
      specific: r.specific_answers,
    }
  }

  // Vibe check and comms are one set of answers in the UI but stored per game: use the newest row.
  const latest = rows[0]
  return {
    gamesmanship,
    vibeCheck: { rageLevel: Number(latest.rage) * 10, personality: latest.personality },
    comms: {
      willingToChat: latest.willing_to_chat ? 'yes' : 'no',
      willingToSpeak: latest.willing_to_speak ? 'yes' : 'no',
      languages: latest.languages,
      usernames,
    },
  }
}
