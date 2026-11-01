// The UI identifies a game tile by its slug (games.slug); the database RPCs take games.id.
// One cached lookup bridges the two.

import { supabase } from '@/lib/supabase/client'
import { toRpcError } from '@/lib/db/rpc'

let cache: Promise<Map<string, string>> | null = null

async function load(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('games').select('id, slug')
  if (error) throw toRpcError(new Error(error.message))
  return new Map((data ?? []).map((g: { id: string; slug: string }) => [g.slug, g.id]))
}

/** slug → games.id for every game. Cached; a failed load is not cached. */
export function gameIdsBySlug(): Promise<Map<string, string>> {
  if (!cache) {
    cache = load().catch((e) => {
      cache = null
      throw e
    })
  }
  return cache
}

export async function gameIdForSlug(slug: string): Promise<string> {
  const id = (await gameIdsBySlug()).get(slug)
  if (!id) throw toRpcError(new Error('This player is no longer available'))
  return id
}

/** Test hook. */
export function resetGameIdCache() {
  cache = null
}
