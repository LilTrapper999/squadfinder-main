// Reads the parts of the catalogue that change after release (season labels, maps, weapons, roles).
// Both tables are readable by signed-in users only.

import { supabase } from '@/lib/supabase/client'
import { toRpcError } from '@/lib/db/rpc'
import type { GameRow, ReferenceRow } from '@/lib/catalogue'

export async function fetchCatalogueRows(): Promise<{ games: GameRow[]; reference: ReferenceRow[] }> {
  const [games, reference] = await Promise.all([
    supabase.from('games').select('slug, version_label, version_date'),
    supabase.from('game_reference_data').select('maps, weapons, roles, game:games!inner(slug)'),
  ])
  if (games.error) throw toRpcError(new Error(games.error.message))
  if (reference.error) throw toRpcError(new Error(reference.error.message))

  return {
    games: (games.data ?? []).filter((g): g is GameRow => typeof g.slug === 'string'),
    reference: (reference.data ?? []).flatMap((r) => {
      const game = r.game as unknown as { slug: string } | { slug: string }[] | null
      const slug = Array.isArray(game) ? game[0]?.slug : game?.slug
      return slug ? [{ slug, maps: r.maps, weapons: r.weapons, roles: r.roles }] : []
    }),
  }
}
