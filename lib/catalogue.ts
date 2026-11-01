// The game catalogue the UI renders. The static snapshot in lib/mockData.ts is the baseline (it is
// what the seed is generated from, so the app works with no database); rows the daily update job
// has written to the database are layered on top: newer season labels and additional
// maps / weapons / roles. The overlay only ever adds or relabels. It never removes snapshot data.

import type { Game, GameCategory, GameQuestions, RoleOption, WeaponCategory } from '@/lib/types'
import { GAMES_BY_CATEGORY, GAME_QUESTIONS } from '@/lib/mockData'

export interface Catalogue {
  gamesByCategory: Record<GameCategory, Game[]>
  questions: Record<string, GameQuestions>
  allGames: Game[]
  findGameById: (id: string) => Game | undefined
}

/** One row of public.games, only the columns that change over time. */
export interface GameRow {
  slug: string
  version_label: string | null
  version_date: string | null
}

/** One row of public.game_reference_data, keyed by the base game's slug. */
export interface ReferenceRow {
  slug: string
  maps: unknown
  weapons: unknown
  roles: unknown
}

const CATEGORIES: GameCategory[] = ['extraction', 'competitive', 'fps']
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

export function buildCatalogue(
  games: Record<GameCategory, Game[]>,
  questions: Record<string, GameQuestions>,
): Catalogue {
  const allGames = CATEGORIES.flatMap((c) => games[c] ?? [])
  const byId = new Map(allGames.map((g) => [g.id, g]))
  return { gamesByCategory: games, questions, allGames, findGameById: (id) => byId.get(id) }
}

export const SNAPSHOT: Catalogue = buildCatalogue(GAMES_BY_CATEGORY, GAME_QUESTIONS)

function mergeWeapons(base: WeaponCategory[], extra: unknown): WeaponCategory[] {
  if (!extra || typeof extra !== 'object' || Array.isArray(extra)) return base
  const out = base.map((c) => ({ category: c.category, weapons: [...c.weapons] }))
  for (const [category, list] of Object.entries(extra as Record<string, unknown>)) {
    const names = strings(list)
    if (!names.length) continue
    const target = out.find((c) => norm(c.category) === norm(category))
    if (!target) {
      out.push({ category, weapons: names })
      continue
    }
    const known = new Set(target.weapons.map(norm))
    for (const n of names) if (!known.has(norm(n))) target.weapons.push(n)
  }
  return out
}

function mergeRoles(base: RoleOption[], extra: unknown): RoleOption[] {
  if (!Array.isArray(extra)) return base
  const known = new Set(base.flatMap((r) => [norm(r.value), norm(r.label)]))
  const out = [...base]
  for (const item of extra) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const label = typeof o.label === 'string' ? o.label : ''
    const value = typeof o.value === 'string' && o.value ? o.value : label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    if (!label || known.has(norm(label)) || known.has(norm(value))) continue
    known.add(norm(label))
    known.add(norm(value))
    out.push({ value, label, subtitle: typeof o.subtitle === 'string' ? o.subtitle : '' })
  }
  return out
}

/** Returns a new catalogue; `base` is not modified. Unknown slugs in the rows are ignored. */
export function applyOverlay(base: Catalogue, gameRows: GameRow[], refRows: ReferenceRow[]): Catalogue {
  const rowBySlug = new Map(gameRows.map((r) => [r.slug, r]))

  const games = Object.fromEntries(
    CATEGORIES.map((c) => [
      c,
      (base.gamesByCategory[c] ?? []).map((g): Game => {
        const row = rowBySlug.get(g.id)
        const label = row?.version_label?.trim()
        if (!row || !label || !g.versions.length) return g
        const [first, ...rest] = g.versions
        return { ...g, versions: [{ ...first, label, date: row.version_date?.trim() || first.date }, ...rest] }
      }),
    ]),
  ) as Record<GameCategory, Game[]>

  const questions: Record<string, GameQuestions> = { ...base.questions }
  for (const row of refRows) {
    const current = questions[row.slug]
    if (!current) continue // a base game the app has no question set for: nothing to extend
    const known = new Set(current.maps.map(norm))
    const maps = [...current.maps, ...strings(row.maps).filter((m) => !known.has(norm(m)))]
    questions[row.slug] = {
      weapons: mergeWeapons(current.weapons, row.weapons),
      maps,
      roles: mergeRoles(current.roles, row.roles),
    }
  }
  return buildCatalogue(games, questions)
}
