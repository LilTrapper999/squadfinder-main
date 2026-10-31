// Regenerates supabase/seed.sql from the current lib/mockData.ts catalogue.
// Run with: node scripts/generate-seed.mjs
//
// Compiles lib/mockData.ts + lib/types.ts to plain JS in a temp dir (using the
// `typescript` devDependency, so no extra tooling is required), imports the
// result, and turns GAMES_BY_CATEGORY / GAME_QUESTIONS into idempotent
// upsert SQL. Safe to re-run any time the catalogue changes — game ids are
// derived deterministically (UUIDv5) from each catalogue key, so re-running
// updates existing rows instead of duplicating them.

import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const repoRoot = path.resolve(import.meta.dirname, '..')

// Fixed, arbitrary namespace UUID for this app's deterministic ids — do not change,
// changing it would remap every generated game id on the next run.
const NAMESPACE = 'a8f61c00-8b1e-4f3a-9c2d-000000000001'

function uuidv5(name, namespace) {
  const nsBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex')
  const nameBytes = Buffer.from(name, 'utf8')
  const hash = crypto.createHash('sha1').update(Buffer.concat([nsBytes, nameBytes])).digest()
  const bytes = Buffer.from(hash.subarray(0, 16))
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function sqlStr(value) {
  if (value === undefined || value === null) return 'null'
  return `'${String(value).replace(/'/g, "''")}'`
}

function sqlBool(value) {
  return value ? 'true' : 'false'
}

function sqlTextArray(arr) {
  if (!arr || arr.length === 0) return "'{}'::text[]"
  return `ARRAY[${arr.map(sqlStr).join(', ')}]::text[]`
}

function sqlJsonb(value) {
  const json = JSON.stringify(value ?? null)
  return `$jsonb$${json}$jsonb$::jsonb`
}

// --- Step 1: compile the TS catalogue to plain JS so we can import real data ---

const tmpDir = mkdtempSync(path.join(tmpdir(), 'sf-seed-'))
try {
  execFileSync(
    'npx',
    ['tsc', 'lib/mockData.ts', 'lib/types.ts',
      '--outDir', tmpDir, '--module', 'es2020', '--target', 'es2020',
      '--moduleResolution', 'node', '--skipLibCheck', '--esModuleInterop'],
    { cwd: repoRoot, stdio: 'inherit', shell: true }
  )

  const { GAMES_BY_CATEGORY, GAME_QUESTIONS } = await import(
    pathToFileURL(path.join(tmpDir, 'mockData.js')).href
  )

  // --- Step 2: flatten + group by baseId ---

  const allGames = [
    ...GAMES_BY_CATEGORY.extraction,
    ...GAMES_BY_CATEGORY.competitive,
    ...GAMES_BY_CATEGORY.fps,
  ]

  const byBase = new Map()
  for (const g of allGames) {
    if (!byBase.has(g.baseId)) byBase.set(g.baseId, [])
    byBase.get(g.baseId).push(g)
  }

  const gameRows = []
  const referenceRows = []

  for (const [baseId, members] of byBase) {
    let baseUuid
    if (members.length === 1 && members[0].id === baseId) {
      // Single-version game: the one row is its own base.
      const g = members[0]
      baseUuid = uuidv5(`game:${g.id}`, NAMESPACE)
      const version = g.versions[0]
      gameRows.push({
        id: baseUuid,
        slug: g.id,
        name: g.name,
        category: g.category,
        mark: g.mark,
        logoUrl: g.logoUrl,
        steamAppId: g.steamAppId,
        platforms: g.platforms ?? [],
        isMobile: g.platform === 'Mobile',
        hasTeamFeature: !!g.hasTeamFeature,
        baseGameId: null,
        versionLabel: version.label,
        versionDate: version.date,
        isSelectable: true,
      })
    } else {
      // Multi-version family: synthesize a non-selectable anchor row that
      // holds the shared reference data, then one row per real version-tile.
      baseUuid = uuidv5(`game-family:${baseId}`, NAMESPACE)
      const sample = members[0]
      const originalNames = new Set(members.map((g) => {
        const version = g.versions[0]
        const suffix = `: ${version.label}`
        return g.name.endsWith(suffix) ? g.name.slice(0, -suffix.length) : g.name
      }))
      if (originalNames.size !== 1) {
        throw new Error(`could not reconstruct a single base name for family "${baseId}": ${[...originalNames]}`)
      }
      const [baseName] = originalNames

      gameRows.push({
        id: baseUuid,
        slug: baseId,
        name: baseName,
        category: sample.category,
        mark: sample.mark,
        logoUrl: sample.logoUrl,
        steamAppId: sample.steamAppId,
        platforms: [],
        isMobile: sample.platform === 'Mobile',
        hasTeamFeature: !!sample.hasTeamFeature,
        baseGameId: null,
        versionLabel: null,
        versionDate: null,
        isSelectable: false,
      })

      for (const g of members) {
        const version = g.versions[0]
        gameRows.push({
          id: uuidv5(`game:${g.id}`, NAMESPACE),
          slug: g.id,
          name: g.name,
          category: g.category,
          mark: g.mark,
          logoUrl: g.logoUrl,
          steamAppId: g.steamAppId,
          platforms: [],
          isMobile: g.platform === 'Mobile',
          hasTeamFeature: !!g.hasTeamFeature,
          baseGameId: baseUuid,
          versionLabel: version.label,
          versionDate: version.date,
          isSelectable: true,
        })
      }
    }

    const questions = GAME_QUESTIONS[baseId]
    if (!questions) {
      console.warn(`WARNING: no GAME_QUESTIONS entry for "${baseId}" — skipping game_reference_data row`)
      continue
    }
    const weaponsByCategory = Object.fromEntries(
      questions.weapons.map((wc) => [wc.category, wc.weapons])
    )
    referenceRows.push({
      gameId: baseUuid,
      maps: questions.maps,
      weapons: weaponsByCategory,
      roles: questions.roles,
    })
  }

  const slugs = new Set()
  for (const g of gameRows) {
    if (slugs.has(g.slug)) throw new Error(`duplicate games.slug "${g.slug}"`)
    slugs.add(g.slug)
  }

  // --- Step 3: emit SQL ---

  const lines = []
  lines.push('-- Generated by scripts/generate-seed.mjs from lib/mockData.ts — do not hand-edit.')
  lines.push('-- Re-run the generator after changing the catalogue in mockData.ts; game ids are')
  lines.push('-- deterministic (UUIDv5 of the catalogue key), so re-running this file is an upsert,')
  lines.push('-- not a duplicate insert.')
  lines.push('')
  lines.push(`-- ${gameRows.length} games (${gameRows.filter(g => !g.isSelectable).length} non-selectable reference-data anchors)`)
  lines.push('insert into public.games')
  lines.push('  (id, slug, name, category, mark, logo_url, steam_app_id, platforms, is_mobile, has_team_feature, base_game_id, version_label, version_date, is_selectable)')
  lines.push('values')
  lines.push(
    gameRows
      .map((g) => {
        const values = [
          sqlStr(g.id),
          sqlStr(g.slug),
          sqlStr(g.name),
          sqlStr(g.category),
          sqlStr(g.mark),
          sqlStr(g.logoUrl),
          sqlStr(g.steamAppId),
          sqlTextArray(g.platforms),
          sqlBool(g.isMobile),
          sqlBool(g.hasTeamFeature),
          sqlStr(g.baseGameId),
          sqlStr(g.versionLabel),
          sqlStr(g.versionDate),
          sqlBool(g.isSelectable),
        ]
        return `  (${values.join(', ')})`
      })
      .join(',\n')
  )
  lines.push(`-- resolve base_game_id -> games(id) is already correct above since anchors are inserted`)
  lines.push('on conflict (id) do update set')
  lines.push('  slug = excluded.slug,')
  lines.push('  name = excluded.name,')
  lines.push('  category = excluded.category,')
  lines.push('  mark = excluded.mark,')
  lines.push('  logo_url = excluded.logo_url,')
  lines.push('  steam_app_id = excluded.steam_app_id,')
  lines.push('  platforms = excluded.platforms,')
  lines.push('  is_mobile = excluded.is_mobile,')
  lines.push('  has_team_feature = excluded.has_team_feature,')
  lines.push('  base_game_id = excluded.base_game_id,')
  lines.push('  version_label = excluded.version_label,')
  lines.push('  version_date = excluded.version_date,')
  lines.push('  is_selectable = excluded.is_selectable;')
  lines.push('')

  lines.push(`-- ${referenceRows.length} game_reference_data rows (one per base game)`)
  lines.push('insert into public.game_reference_data (game_id, maps, weapons, roles)')
  lines.push('values')
  lines.push(
    referenceRows
      .map((r) => `  (${sqlStr(r.gameId)}, ${sqlJsonb(r.maps)}, ${sqlJsonb(r.weapons)}, ${sqlJsonb(r.roles)})`)
      .join(',\n')
  )
  lines.push('on conflict (game_id) do update set')
  lines.push('  maps = excluded.maps,')
  lines.push('  weapons = excluded.weapons,')
  lines.push('  roles = excluded.roles;')
  lines.push('')

  const outPath = path.join(repoRoot, 'supabase', 'seed.sql')
  writeFileSync(outPath, lines.join('\n'), 'utf8')
  console.log(`Wrote ${outPath}`)
  console.log(`  games: ${gameRows.length}, reference-data rows: ${referenceRows.length}`)
} finally {
  rmSync(tmpDir, { recursive: true, force: true })
}
