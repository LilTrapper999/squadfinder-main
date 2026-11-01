// DB tests for SPEC_DB_CHANGES.md. Runs every migration plus seed.sql inside an in-memory
// Postgres (PGlite) with just enough of Supabase stubbed (roles, auth.uid(), realtime.send).
//
//   npm run test:db
//
// It is not a substitute for running the migrations on a real Supabase project once, but it
// executes every function, policy and privilege path the spec describes.

import { PGlite } from '@electric-sql/pglite'
import { ENV_SQL } from './env.mjs'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..')
const migrationsDir = path.join(repoRoot, 'supabase', 'migrations')

// ── Harness ────────────────────────────────────────────────────────────────────────────────

const db = new PGlite({ extensions: { pgcrypto } })
const results = []
const only = process.argv[2]

async function test(name, fn) {
  if (only && !name.includes(only)) return
  try {
    await fn()
    results.push({ name, ok: true })
    console.log(`  ok   ${name}`)
  } catch (e) {
    results.push({ name, ok: false, error: e })
    console.log(`  FAIL ${name}\n       ${String(e.message ?? e).split('\n').join('\n       ')}`)
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg ?? 'assertion failed')
}
function eq(actual, expected, msg) {
  const a = JSON.stringify(actual)
  const b = JSON.stringify(expected)
  if (a !== b) throw new Error(`${msg ?? 'not equal'}\n  actual:   ${a}\n  expected: ${b}`)
}
async function errOf(p) {
  try {
    await p
    return null
  } catch (e) {
    return String(e.message ?? e)
  }
}
async function rejects(p, re, msg) {
  const m = await errOf(p)
  if (m === null) throw new Error(`${msg ?? 'expected an error'} (got success)`)
  if (re && !re.test(m)) throw new Error(`${msg ?? 'wrong error'}: ${m}`)
  return m
}

/** Superuser query (bypasses RLS and grants). */
const sudo = async (sql, params) => (await db.query(sql, params)).rows

/** Run as a signed-in client (role authenticated, auth.uid() = uid). */
function U(uid) {
  return {
    async q(sql, params) {
      await db.exec('set role authenticated')
      await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid])
      try {
        return (await db.query(sql, params)).rows
      } finally {
        await db.exec('reset role')
        await db.query(`select set_config('request.jwt.claim.sub', '', false)`)
      }
    },
  }
}
const ANON = {
  async q(sql, params) {
    await db.exec('set role anon')
    try {
      return (await db.query(sql, params)).rows
    } finally {
      await db.exec('reset role')
    }
  },
}

// ── Environment: roles + the slice of Supabase the migrations rely on ────────────────────────

async function boot() {
  await db.exec(ENV_SQL)

  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()
  for (const f of files) {
    try {
      await db.exec(readFileSync(path.join(migrationsDir, f), 'utf8'))
    } catch (e) {
      throw new Error(`migration ${f} failed: ${e.message}`)
    }
  }
  console.log(`applied ${files.length} migrations`)

  try {
    await db.exec(readFileSync(path.join(repoRoot, 'supabase', 'seed.sql'), 'utf8'))
  } catch (e) {
    throw new Error(`seed.sql failed: ${e.message}`)
  }
  console.log('applied seed.sql')
}

// ── Fixtures ───────────────────────────────────────────────────────────────────────────────

let G = {}
async function loadGames() {
  const rows = await sudo(`select id, slug, base_game_id from public.games where slug in ('tarkov-eft-pvp','tarkov-eft-pve','tarkov','cs2','dayz')`)
  for (const r of rows) G[r.slug] = r
  G.pvp = G['tarkov-eft-pvp'].id
  G.pve = G['tarkov-eft-pve'].id
  G.tarkov = G['tarkov'].id // base (anchor) row
  G.cs2 = G['cs2'].id
  G.dayz = G['dayz'].id
}

let n = 0
async function mkUser(name = 'u') {
  const id = randomUUID()
  await sudo(`insert into auth.users (id, raw_user_meta_data) values ($1, $2::jsonb)`, [id, JSON.stringify({ full_name: name })])
  return id
}

const PROFILE = {
  weapons: ['ak', 'm4'], maps: ['customs', 'woods'], roles: ['rusher'], personality: ['chill'],
  languages: ['en'], skill: 5, rage: 5, role_match_preference: 5, platform: 'PC',
  willing_to_chat: true, willing_to_speak: false,
}
/** Insert a profile as superuser. baseId is the BASE game row. Returns the profile id (= match_ref). */
async function mkProfile(uid, baseId, o = {}) {
  const p = { in_game_username: `player${++n}`, ...PROFILE, ...o }
  const r = await sudo(
    `insert into public.game_profiles
       (user_id, game_id, in_game_username, platform, weapons, maps, roles, skill, role_match_preference,
        rage, personality, willing_to_chat, willing_to_speak, languages)
     values ($1,$2,$3,$4,$5::text[],$6::text[],$7::text[],$8,$9,$10,$11::text[],$12,$13,$14::text[])
     returning id`,
    [uid, baseId, p.in_game_username, p.platform, p.weapons, p.maps, p.roles, p.skill, p.role_match_preference,
     p.rage, p.personality, p.willing_to_chat, p.willing_to_speak, p.languages]
  )
  return r[0].id
}
const online = (uid) => U(uid).q('select public.heartbeat()')
const search = (uid, gameId) => U(uid).q('select public.start_searching($1)', [gameId])

/** Two users with Tarkov profiles, both online, B searching PvP. */
async function pair({ aSearching = true } = {}) {
  const A = await mkUser('A'), B = await mkUser('B')
  const pa = await mkProfile(A, G.tarkov), pb = await mkProfile(B, G.tarkov)
  await online(A); await online(B)
  await search(B, G.pvp)
  if (aSearching) await search(A, G.pvp)
  return { A, B, pa, pb }
}
const send = (from, game, ref) => U(from).q('select * from public.send_squad_request($1,$2)', [game, ref])
const outbound = (uid) => U(uid).q('select * from public.get_my_outbound_requests()')
const cards = (uid) => U(uid).q('select * from public.get_my_pending_request_cards()')
const reqRow = async (id) => (await sudo(`select * from public.squad_requests where id = $1`, [id]))[0]

// ── Score parity: SQL calculate_match vs lib/matching.ts ───────────────────────────────────

function compileMatching() {
  const out = mkdtempSync(path.join(tmpdir(), 'sf-match-'))
  const r = spawnSync('npx', ['tsc', 'lib/matching.ts', 'lib/types.ts', '--outDir', out, '--module', 'es2020',
    '--target', 'es2020', '--moduleResolution', 'node', '--skipLibCheck', '--esModuleInterop'],
    { cwd: repoRoot, shell: true, encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`tsc failed:\n${r.stdout}\n${r.stderr}`)
  return { out, load: () => import(pathToFileURL(path.join(out, 'matching.js')).href) }
}

function seededPairs(count) {
  let s = 20261031
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
  const pool = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  const subset = () => pool.filter(() => rnd() < 0.4)
  const dec = () => Math.round(rnd() * 100) / 10
  const prof = () => ({
    weapons: subset(), maps: subset(), roles: subset(), personality: subset(),
    languages: rnd() < 0.7 ? ['en', 'fr'].filter(() => rnd() < 0.6) : [],
    skill: dec(), rage: dec(), ...(rnd() < 0.8 ? { roleMatchPreference: dec() } : {}),
  })
  return Array.from({ length: count }, (_, i) => ({ name: `seeded-${i}`, a: prof(), b: prof() }))
}

const asRecord = (p) => ({
  weapons: p.weapons, maps: p.maps, roles: p.roles, personality: p.personality, languages: p.languages,
  skill: p.skill, rage: p.rage, role_match_preference: p.roleMatchPreference ?? null,
})

// ── Tests ──────────────────────────────────────────────────────────────────────────────────

await boot()
await loadGames()

console.log('\nFresh database (D-07)')

const SEED_TABLES = ['games', 'game_reference_data']
const USER_TABLES = ['users', 'game_profiles', 'squad_requests', 'squad_request_events', 'allies', 'user_blocks', 'user_presence',
  'lfg_presence', 'api_rate_limits', 'banned_usernames', 'reports', 'game_updates']
const rowCounts = async (tables) => Object.fromEntries(await Promise.all(tables.map(async (t) =>
  [t, Number((await sudo(`select count(*) as c from public.${t}`))[0].c)])))

await test('D-07: migrations + seed leave no users, profiles, requests, allies, blocks or bans', async () => {
  eq(await rowCounts(USER_TABLES), Object.fromEntries(USER_TABLES.map((t) => [t, 0])))
  const [{ c }] = await sudo('select count(*) as c from auth.users')
  eq(Number(c), 0, 'no auth users either')
})
await test('D-07: the seed can be applied again with identical results, even with real users present', async () => {
  const seed = readFileSync(path.join(repoRoot, 'supabase', 'seed.sql'), 'utf8')
  // content only: updated_at legitimately moves when the seed upserts
  const fingerprint = async () => (await sudo(`select md5(string_agg(concat_ws('~', g.id, g.slug, g.name, g.category, g.mark, g.logo_url, g.version_label,
      g.version_date, g.base_game_id, g.is_selectable), '|' order by g.id)) as h from public.games g`))[0].h
    + (await sudo(`select md5(string_agg(concat_ws('~', r.game_id, r.maps, r.weapons, r.roles), '|' order by r.game_id)) as h from public.game_reference_data r`))[0].h
  const before = { counts: await rowCounts(SEED_TABLES), fp: await fingerprint() }
  const u = await mkUser('seeded')
  await db.exec(seed)
  await db.exec(seed)
  eq({ counts: await rowCounts(SEED_TABLES), fp: await fingerprint() }, before)
  eq(Number((await sudo('select count(*) as c from public.users where id = $1', [u]))[0].c), 1, 'real user untouched')
  await sudo('delete from auth.users where id = $1', [u])
})
await test('D-07: every selectable game has reference data through its base game, and slugs are unique', async () => {
  const orphans = await sudo(`select g.slug from public.games g
    where g.is_selectable and not exists (select 1 from public.game_reference_data r where r.game_id = coalesce(g.base_game_id, g.id))`)
  eq(orphans.map((r) => r.slug), [])
  const dupes = await sudo('select slug from public.games group by slug having count(*) > 1')
  eq(dupes, [])
})

console.log('\nPrivileges (§0)')

const CLIENT_FUNCTIONS = [
  'base_game_id(uuid)', 'text_array_is_clean(text[])', 'is_ally_for_profile(uuid,uuid)',
  'heartbeat()', 'start_searching(uuid)', 'stop_searching()', 'count_searching_by_game()',
  'get_my_blocks()', 'unblock_user(uuid)', 'block_ally(uuid)',
  'accept_squad_request(uuid)', 'decline_squad_request(uuid)', 'decline_and_block_squad_request(uuid)',
  'withdraw_squad_request(uuid)', 'send_squad_request(uuid,uuid)',
  'get_my_pending_request_cards()', 'count_my_pending_requests()', 'get_my_outbound_requests()',
  'find_squad_matches(uuid,boolean,integer)',
  'get_my_allies()', 'remove_ally(uuid)',
  'export_my_data()', 'normalize_username(text)', 'report_ally(uuid,report_reason,text)', 'report_request(uuid,report_reason,text)',
].sort()

await test('only the intended functions are executable by authenticated', async () => {
  const rows = await sudo(`select p.oid::regprocedure::text as sig from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prokind = 'f'
     and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')   -- skip extension members (pgcrypto)
     and has_function_privilege('authenticated', p.oid, 'execute')`)
  eq(rows.map((r) => r.sig.replace(/public\./g, '')).sort(), CLIENT_FUNCTIONS)
})
await test('anon and PUBLIC can execute no function in public', async () => {
  const rows = await sudo(`select p.oid::regprocedure::text as sig from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prokind = 'f'
     and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')   -- skip extension members (pgcrypto)
     and has_function_privilege('anon', p.oid, 'execute')`)
  eq(rows, [])
})
await test('anon has no privilege on any table; nobody can TRUNCATE', async () => {
  const rows = await sudo(`select c.relname,
      has_table_privilege('anon', c.oid, 'select,insert,update,delete') as anon_any,
      has_table_privilege('authenticated', c.oid, 'truncate') as auth_truncate
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r','v')`)
  eq(rows.filter((r) => r.anon_any || r.auth_truncate).map((r) => r.relname), [])
})
await test('least privilege: the exact table privileges signed-in clients hold', async () => {
  const rows = await sudo(`select table_name, string_agg(privilege_type, ',' order by privilege_type) as p
      from information_schema.role_table_grants
     where table_schema = 'public' and grantee = 'authenticated' group by 1 order by 1`)
  eq(Object.fromEntries(rows.map((r) => [r.table_name, r.p])), {
    allies: 'SELECT,UPDATE',
    game_profiles: 'DELETE,INSERT,SELECT,UPDATE',
    game_reference_data: 'SELECT',
    games: 'SELECT',
    users: 'SELECT',
  })
  const cols = await sudo(`select table_name, privilege_type, string_agg(column_name, ',' order by column_name) as cols
      from information_schema.column_privileges
     where table_schema = 'public' and grantee = 'authenticated' and table_name = 'users' and privilege_type = 'UPDATE' group by 1, 2`)
  eq(cols.map((r) => r.cols), ['show_online_players'])
})
await test('a client cannot insert an ally or touch its own users row beyond the one setting', async () => {
  const u = await mkUser()
  await rejects(U(u).q(`insert into public.allies (user_id, ally_user_id) values ($1, $1)`, [u]), /permission denied/)
  await rejects(U(u).q(`delete from public.users where id = $1`, [u]), /permission denied/)
  await rejects(U(u).q(`insert into public.users (id) values (gen_random_uuid())`), /permission denied/)
})
await test('locked tables are unreachable to clients', async () => {
  const u = await mkUser()
  for (const t of ['squad_requests', 'squad_request_events', 'user_blocks', 'user_presence', 'lfg_presence', 'api_rate_limits', 'reports', 'banned_usernames']) {
    await rejects(U(u).q(`select * from public.${t}`), /permission denied/, t)
    await rejects(U(u).q(`insert into public.${t} default values`), /permission denied/, t)
  }
  await rejects(U(u).q('select * from public.open_reports'), /permission denied/, 'open_reports')
})
await test('is_blocked / has_blocked / can_contact are not callable by clients (no block oracle)', async () => {
  const [a, b] = [await mkUser(), await mkUser()]
  await rejects(U(a).q('select public.is_blocked($1,$2)', [a, b]), /permission denied/)
  await rejects(U(a).q('select public.has_blocked($1,$2)', [a, b]), /permission denied/)
  await rejects(U(a).q('select public.can_contact($1,$2,$3)', [a, b, G.pvp]), /permission denied/)
})
await test('anon cannot read the catalogue or call RPCs', async () => {
  await rejects(ANON.q('select * from public.games limit 1'), /permission denied/)
  await rejects(ANON.q('select public.heartbeat()'), /permission denied/)
})
await test('catalogue is read-only for authenticated', async () => {
  const u = await mkUser()
  assert((await U(u).q('select count(*)::int as c from public.games'))[0].c > 0)
  await rejects(U(u).q(`update public.games set name = 'x'`), /permission denied/)
})

console.log('\nProfiles (§3.2)')

await test('game_profiles must reference a base game', async () => {
  const u = await mkUser()
  await rejects(mkProfile(u, G.pvp), /base game/)
  await mkProfile(u, G.tarkov)
  await rejects(mkProfile(u, G.tarkov), /duplicate key|unique/)
})
await test('array / username limits are enforced', async () => {
  const u = await mkUser()
  await rejects(mkProfile(u, G.cs2, { weapons: ['x', 'x'] }), /game_profiles_arrays_clean/)
  await rejects(mkProfile(u, G.cs2, { in_game_username: 'x'.repeat(41) }), /game_profiles_username_valid/)
  await rejects(mkProfile(u, G.cs2, { in_game_username: 'bad\u0007name' }), /game_profiles_username_valid/)
  await rejects(mkProfile(u, G.cs2, { maps: Array.from({ length: 101 }, (_, i) => `m${i}`) }), /game_profiles_arrays_clean/)
})
await test('a stranger cannot read a profile; the owner can; allies can after accept', async () => {
  const { A, B, pb } = await pair()
  assert((await U(A).q('select 1 from public.game_profiles where user_id = $1', [B])).length === 0, 'stranger read')
  assert((await U(B).q('select 1 from public.game_profiles where user_id = $1', [B])).length === 1, 'own read')
  const [{ request_id }] = await send(A, G.pvp, pb)
  // pending: still hidden, even for the recipient
  assert((await U(B).q('select 1 from public.game_profiles where user_id = $1', [A])).length === 0, 'recipient reads sender profile pre-accept')
  await U(B).q('select public.accept_squad_request($1)', [request_id])
  assert((await U(B).q('select 1 from public.game_profiles where user_id = $1', [A])).length === 1, 'ally read B->A')
  assert((await U(A).q('select 1 from public.game_profiles where user_id = $1', [B])).length === 1, 'ally read A->B')
})
await test('profile deletion withdraws that user\'s pending outbound requests', async () => {
  const { A, B, pa, pb } = await pair()
  const [{ request_id }] = await send(A, G.pvp, pb)
  assert((await cards(B)).length === 1)
  await U(A).q('delete from public.game_profiles where id = $1', [pa])
  eq((await reqRow(request_id)).status, 'withdrawn')
  eq((await cards(B)).length, 0)
  eq((await U(B).q('select public.count_my_pending_requests() as c'))[0].c, 0, 'bell == cards')
})

console.log('\nScoring (§3.6)')

await test('SQL calculate_match matches lib/matching.ts on every vector', async () => {
  const { out, load } = compileMatching()
  try {
    const { calculateMatch } = await load()
    const vectors = JSON.parse(readFileSync(path.join(here, 'match_vectors.json'), 'utf8')).pairs
    const all = [...vectors, ...seededPairs(400)]
    const bad = []
    for (const v of all) {
      const js = calculateMatch({ ...v.a, gameId: '', willingToChat: true, willingToSpeak: true },
                                { ...v.b, gameId: '', willingToChat: true, willingToSpeak: true })
      const [sql] = await sudo(
        `select overall, gamesmanship, vibe_check as "vibeCheck", comms from public.calculate_match(
           jsonb_populate_record(null::public.game_profiles, $1::jsonb),
           jsonb_populate_record(null::public.game_profiles, $2::jsonb))`,
        [JSON.stringify(asRecord(v.a)), JSON.stringify(asRecord(v.b))])
      if (JSON.stringify(sql) !== JSON.stringify({ overall: js.overall, gamesmanship: js.gamesmanship, vibeCheck: js.vibeCheck, comms: js.comms }))
        bad.push(`${v.name}: sql=${JSON.stringify(sql)} js=${JSON.stringify(js)}`)
    }
    assert(bad.length === 0, `${bad.length}/${all.length} mismatches:\n${bad.slice(0, 5).join('\n')}`)
  } finally {
    rmSync(out, { recursive: true, force: true })
  }
})
await test('stored match score is computed by the server, not passed by the client', async () => {
  const { A, B, pb } = await pair()
  const [{ request_id }] = await send(A, G.pvp, pb)
  await rejects(U(B).q('select public.accept_squad_request($1, 100)', [request_id]), /does not exist/)
  await U(B).q('select public.accept_squad_request($1)', [request_id])
  const [{ s, e }] = await sudo(
    `select a.match_score_at_acceptance as s,
            (select overall from public.calculate_match(pa, pb)) as e
       from public.allies a,
            (select * from public.game_profiles where user_id = $1) pa,
            (select * from public.game_profiles where user_id = $2) pb
      where a.user_id = $1 and a.ally_user_id = $2`, [A, B])
  eq(Number(s), e)
})

console.log('\nPresence (§3.8)')

await test('clients cannot write presence tables; start_searching is one game at a time', async () => {
  const u = await mkUser(); await mkProfile(u, G.tarkov)
  await rejects(U(u).q(`insert into public.lfg_presence (user_id, game_id, last_seen_at) values ($1,$2,'2099-01-01')`, [u, G.pvp]), /permission denied/)
  await search(u, G.pvp); await search(u, G.pve)
  eq((await sudo('select game_id from public.lfg_presence where user_id = $1', [u])).map((r) => r.game_id), [G.pve])
})
await test('start_searching needs a profile for the base game and a selectable game', async () => {
  const u = await mkUser()
  await rejects(search(u, G.pvp), /Complete your profile/)
  await mkProfile(u, G.tarkov)
  await rejects(search(u, G.tarkov), /not available/) // the non-selectable anchor
})
await test('stale presence is ignored, and a heartbeat does not revive a stale search', async () => {
  const u = await mkUser(); await mkProfile(u, G.tarkov)
  await online(u); await search(u, G.pvp)
  await sudo(`update public.lfg_presence set last_seen_at = now() - interval '10 minutes' where user_id = $1`, [u])
  await sudo(`update public.user_presence set last_seen_at = now() - interval '10 minutes' where user_id = $1`, [u])
  eq((await sudo(`select public.presence_status($1,$2) as s`, [u, G.pvp]))[0].s, 'offline')
  await online(u) // heartbeat
  eq((await sudo(`select public.presence_status($1,$2) as s`, [u, G.pvp]))[0].s, 'online', 'must be online, NOT searching')
})
await test('PvP and PvE searching counts are independent', async () => {
  const count = async (id) => Number((await U(await mkUser()).q('select * from public.count_searching_by_game()')).find((r) => r.game_id === id)?.n ?? 0)
  const [p0, e0] = [await count(G.pvp), await count(G.pve)]
  const a = await mkUser(), b = await mkUser()
  await mkProfile(a, G.tarkov); await mkProfile(b, G.tarkov)
  await search(a, G.pvp); await search(b, G.pve)
  eq([await count(G.pvp), await count(G.pve)], [p0 + 1, e0 + 1])
})

console.log('\nDiscovery (§3.7)')

await test('find_squad_matches returns answers but no identity', async () => {
  const { A, B, pb } = await pair()
  const rows = await U(A).q('select * from public.find_squad_matches($1)', [G.pvp])
  const mine = rows.find((r) => r.match_ref === pb)
  assert(mine, 'B should be listed')
  for (const bad of ['user_id', 'in_game_username', 'id']) assert(!(bad in mine), `leaks column ${bad}`)
  eq(mine.status, 'searching')
  assert(Number.isInteger(mine.score))
})
await test('discovery: caller must have a profile and be searching; online-only needs the toggle', async () => {
  const { A, B, pb } = await pair({ aSearching: false })
  eq((await U(A).q('select * from public.find_squad_matches($1)', [G.pvp])).length, 0, 'not searching')
  const noProfile = await mkUser(); await online(noProfile)
  eq((await U(noProfile).q('select * from public.find_squad_matches($1)', [G.pvp])).length, 0, 'no profile')

  await search(A, G.pvp)
  await sudo(`delete from public.lfg_presence where user_id = $1`, [B]) // B now merely online
  assert(!(await U(A).q('select * from public.find_squad_matches($1)', [G.pvp])).some((r) => r.match_ref === pb), 'online hidden by default')
  const withOnline = await U(A).q('select * from public.find_squad_matches($1, true)', [G.pvp])
  eq(withOnline.find((r) => r.match_ref === pb)?.status, 'online')
})
await test('discovery: p_limit is clamped to 50 and calls are rate-limited', async () => {
  const me = await mkUser(); await mkProfile(me, G.dayz); await online(me); await search(me, G.dayz)
  for (let i = 0; i < 55; i++) {
    const u = await mkUser(); await mkProfile(u, G.dayz); await online(u); await search(u, G.dayz)
  }
  const rows = await U(me).q('select * from public.find_squad_matches($1, false, 1000)', [G.dayz])
  eq(rows.length, 50)
  // 1 call used; 19 more allowed in the window, the 21st fails
  for (let i = 0; i < 19; i++) await U(me).q('select * from public.find_squad_matches($1)', [G.dayz])
  await rejects(U(me).q('select * from public.find_squad_matches($1)', [G.dayz]), /slow down/)
})

console.log('\nRequest state machine (§3.4, §3.5)')

await test('full flow: send → card → accept → allies, outbound status', async () => {
  const { A, B, pb } = await pair()
  const [sent] = await send(A, G.pvp, pb)
  eq(sent.status, 'pending')
  eq((await outbound(A))[0].status, 'pending')
  const c = await cards(B)
  eq(c.length, 1)
  eq(c[0].game_slug, 'tarkov-eft-pvp')
  for (const bad of ['sender_id', 'user_id', 'recipient_id']) assert(!(bad in c[0]), `card leaks ${bad}`)
  assert(c[0].sender_username, 'username shown')
  eq(c[0].sender_status, 'searching')
  eq((await U(B).q('select public.count_my_pending_requests() as c'))[0].c, 1)

  await U(B).q('select public.accept_squad_request($1)', [sent.request_id])
  eq((await sudo('select count(*)::int c from public.allies where squad_request_id = $1', [sent.request_id]))[0].c, 2)
  eq((await outbound(A))[0].status, 'accepted')
  const allies = await U(A).q('select * from public.get_my_allies()')
  eq(allies.length, 1)
  eq(allies[0].request_id, sent.request_id, 'ally row links back to the request that created it')
  eq((await cards(B)).length, 0)
})
await test('a recipient cannot reach "accepted" (or anything) by direct DML', async () => {
  const { A, B, pb } = await pair()
  const [{ request_id }] = await send(A, G.pvp, pb)
  await rejects(U(B).q(`update public.squad_requests set status = 'accepted' where id = $1`, [request_id]), /permission denied/)
  await rejects(U(A).q(`delete from public.squad_requests where id = $1`, [request_id]), /permission denied/)
  await rejects(U(A).q('select * from public.my_inbound_squad_requests'), /does not exist/)
})
await test('transition guard (second layer) rejects illegal transitions', async () => {
  const { A, B, pb } = await pair()
  const [{ request_id }] = await send(A, G.pvp, pb)
  await U(B).q('select public.decline_squad_request($1)', [request_id])
  await rejects(sudo(`update public.squad_requests set status = 'accepted' where id = $1`, [request_id]), /invalid squad request status transition/)
})
await test('accept needs a recipient profile; decline/accept only by the recipient while pending', async () => {
  const A = await mkUser(), B = await mkUser()
  await mkProfile(A, G.tarkov); const pb = await mkProfile(B, G.tarkov)
  await online(A); await online(B); await search(A, G.pvp)
  const [{ request_id }] = await send(A, G.pvp, pb)
  await rejects(U(A).q('select public.accept_squad_request($1)', [request_id]), /not found/, 'sender cannot accept')
  await sudo('delete from public.game_profiles where user_id = $1', [B])
  await rejects(U(B).q('select public.accept_squad_request($1)', [request_id]), /Complete your profile/)
  await mkProfile(B, G.tarkov)
  await U(B).q('select public.accept_squad_request($1)', [request_id])
  await rejects(U(B).q('select public.accept_squad_request($1)', [request_id]), /no longer available/, 'not pending any more')
})
await test('send rejects: self, unknown ref, offline, no own profile — all with the same generic error', async () => {
  const { A, B, pa, pb } = await pair()
  const stranger = await mkUser()
  const generic = /This player is no longer available/
  await rejects(send(A, G.pvp, pa), generic, 'self')
  await rejects(send(A, G.pvp, randomUUID()), generic, 'unknown ref')
  await sudo(`update public.user_presence set last_seen_at = now() - interval '1 hour' where user_id = $1`, [B])
  await sudo(`delete from public.lfg_presence where user_id = $1`, [B])
  await rejects(send(A, G.pvp, pb), generic, 'offline')
  await rejects(send(stranger, G.pvp, pb), /Complete your profile/)
})
await test('opposite-direction requests cannot both be active', async () => {
  const { A, B, pa, pb } = await pair()
  await send(A, G.pvp, pb)
  await rejects(send(B, G.pvp, pa), /no longer available/)
  // and the index backs it up if the function were bypassed
  await rejects(sudo(`insert into public.squad_requests (game_id, sender_id, recipient_id) values ($1,$2,$3)`, [G.pvp, B, A]), /squad_requests_active_pair_idx/)
})
await test('decline cooldown: 59 minutes is refused, 61 minutes re-opens', async () => {
  const { A, B, pb } = await pair()
  const [{ request_id }] = await send(A, G.pvp, pb)
  await U(B).q('select public.decline_squad_request($1)', [request_id])
  eq((await outbound(A))[0].status, 'declined')
  await sudo(`update public.squad_requests set declined_at = now() - interval '59 minutes' where id = $1`, [request_id])
  await rejects(send(A, G.pvp, pb), /no longer available/)
  await sudo(`update public.squad_requests set declined_at = now() - interval '61 minutes' where id = $1`, [request_id])
  eq((await send(A, G.pvp, pb))[0].status, 'pending')
  eq((await cards(B)).length, 1)
})
await test('withdraw keeps the row; send→withdraw loops hit the per-pair cap', async () => {
  const { A, B, pb } = await pair()
  let id
  for (let i = 0; i < 4; i++) {
    id = (await send(A, G.pvp, pb))[0].request_id
    await U(A).q('select public.withdraw_squad_request($1)', [id])
  }
  eq((await reqRow(id)).status, 'withdrawn', 'row kept')
  await rejects(send(A, G.pvp, pb), /too many times/)
  eq((await sudo('select count(*)::int c from public.squad_request_events where sender_id = $1', [A]))[0].c, 4)
})
await test('pending cap: the 21st unexpired pending request is refused', async () => {
  const A = await mkUser(); await mkProfile(A, G.cs2); await online(A)
  const targets = []
  for (let i = 0; i < 21; i++) {
    const t = await mkUser(); const ref = await mkProfile(t, G.cs2); await online(t); targets.push(ref)
  }
  for (let i = 0; i < 20; i++) await send(A, G.cs2, targets[i])
  await rejects(send(A, G.cs2, targets[20]), /too many pending/)
})
await test('daily cap blocks the 51st send in 24h', async () => {
  const A = await mkUser(); await mkProfile(A, G.cs2); await online(A)
  const other = await mkUser(); await mkProfile(other, G.cs2)
  await sudo(`insert into public.squad_request_events (sender_id, recipient_id, game_id)
              select $1, $2, $3 from generate_series(1, 50)`, [A, other, G.cs2])
  const t = await mkUser(); const ref = await mkProfile(t, G.cs2); await online(t)
  await rejects(send(A, G.cs2, ref), /Daily request limit/)
})
await test('pending requests expire after 14 days', async () => {
  const { A, B, pb } = await pair()
  const [{ request_id }] = await send(A, G.pvp, pb)
  await sudo(`update public.squad_requests set last_sent_at = now() - interval '15 days' where id = $1`, [request_id])
  eq((await cards(B)).length, 0)
  eq((await U(B).q('select public.count_my_pending_requests() as c'))[0].c, 0)
  eq((await outbound(A))[0].status, 'expired')
  await rejects(U(B).q('select public.accept_squad_request($1)', [request_id]), /no longer available/)
  eq((await send(A, G.pvp, pb))[0].status, 'pending') // re-send over the expired one
  eq((await cards(B)).length, 1)
})

console.log('\nBlocks (§3.3, D2, D7)')

await test('decline & block: sender sees plain "declined"; blocker never sees them again', async () => {
  const { A, B, pb } = await pair()
  const [{ request_id }] = await send(A, G.pvp, pb)
  await U(B).q('select public.decline_and_block_squad_request($1)', [request_id])
  eq((await outbound(A))[0].status, 'declined')
  const blocks = await U(B).q('select * from public.get_my_blocks()')
  eq(blocks.length, 1)
  for (const bad of ['blocker_id', 'blocked_id', 'user_id']) assert(!(bad in blocks[0]), `get_my_blocks leaks ${bad}`)
  assert(blocks[0].label, 'label snapshot')
  // neither direction appears in discovery
  assert(!(await U(A).q('select * from public.find_squad_matches($1)', [G.pvp])).some((r) => r.match_ref === pb), 'A sees B')
  const pa = (await sudo('select id from public.game_profiles where user_id = $1', [A]))[0].id
  assert(!(await U(B).q('select * from public.find_squad_matches($1)', [G.pvp])).some((r) => r.match_ref === pa), 'B sees A')
})
await test('D2/D7: replaying a match_ref is identical for a plain decline and a block', async () => {
  const A = await mkUser(); await mkProfile(A, G.tarkov); await online(A); await search(A, G.pvp)
  const B = await mkUser(), C = await mkUser()
  const pb = await mkProfile(B, G.tarkov), pc = await mkProfile(C, G.tarkov)
  for (const u of [B, C]) { await online(u); await search(u, G.pvp) }

  const [rb] = await send(A, G.pvp, pb), [rc] = await send(A, G.pvp, pc)
  await U(B).q('select public.decline_squad_request($1)', [rb.request_id])
  await U(C).q('select public.decline_and_block_squad_request($1)', [rc.request_id])
  await sudo('delete from realtime.sent_log')

  const snapshot = async () => {
    const o = await outbound(A)
    return o.map((r) => r.status).sort()
  }
  eq(await snapshot(), ['declined', 'declined'], 'immediately after the declines')

  // inside the cooldown: same generic error for both
  const eB = await errOf(send(A, G.pvp, pb)), eC = await errOf(send(A, G.pvp, pc))
  assert(eB && eB === eC, `cooldown errors differ: ${eB} / ${eC}`)

  // after the cooldown: both succeed and look like a normal pending send
  for (const id of [rb.request_id, rc.request_id])
    await sudo(`update public.squad_requests set declined_at = now() - interval '2 hours' where id = $1`, [id])
  const sB = await send(A, G.pvp, pb), sC = await send(A, G.pvp, pc)
  eq([sB[0].status, sC[0].status], ['pending', 'pending'])
  eq(await snapshot(), ['pending', 'pending'], 'sender view identical')

  // the blocked-pair send reaches nobody
  eq((await cards(B)).length, 1, 'B (plain decline) gets the new card')
  eq((await cards(C)).length, 0, 'C (blocker) gets nothing')
  const log = await sudo('select topic, event from realtime.sent_log')
  assert(log.some((l) => l.topic === `user:${B}`), 'B notified')
  assert(!log.some((l) => l.topic === `user:${C}`), 'C must not be notified')
  // both consumed the same number of log events
  const ev = await sudo('select recipient_id, count(*)::int c from public.squad_request_events where sender_id = $1 group by 1', [A])
  eq(ev.map((e) => e.c).sort(), [2, 2])
})
await test('shadow-declines turn "declined" only after their future declined_at', async () => {
  const A = await mkUser(); await mkProfile(A, G.tarkov); await online(A)
  const C = await mkUser(); const pc = await mkProfile(C, G.tarkov); await online(C)
  await U(C).q('select 1')
  await sudo(`insert into public.user_blocks (blocker_id, blocked_id) values ($1,$2)`, [C, A])
  const [s] = await send(A, G.pvp, pc)
  eq((await outbound(A))[0].status, 'pending')
  await sudo(`update public.squad_requests set declined_at = now() - interval '1 minute' where id = $1`, [s.request_id])
  eq((await outbound(A))[0].status, 'declined')
})
await test('blocking cancels the pair\'s pending requests in both directions', async () => {
  const A = await mkUser(), B = await mkUser()
  const pa = await mkProfile(A, G.tarkov), pb = await mkProfile(B, G.tarkov)
  await mkProfile(A, G.cs2); await mkProfile(B, G.cs2)
  await online(A); await online(B)
  const [x] = await send(A, G.pvp, pb)                              // A -> B (tarkov)
  const pbCs = (await sudo('select id from public.game_profiles where user_id=$1 and game_id=$2', [B, G.cs2]))[0].id
  const paCs = (await sudo('select id from public.game_profiles where user_id=$1 and game_id=$2', [A, G.cs2]))[0].id
  const [y] = await send(B, G.cs2, paCs)                            // B -> A (cs2)
  await U(A).q('select public.decline_and_block_squad_request($1)', [y.request_id])
  eq((await reqRow(y.request_id)).status, 'declined')
  eq((await reqRow(x.request_id)).status, 'withdrawn') // A was the sender of x
  eq((await cards(A)).length + (await cards(B)).length, 0)
})
await test('unblock restores eligibility', async () => {
  const { A, B, pb } = await pair()
  const [{ request_id }] = await send(A, G.pvp, pb)
  await U(B).q('select public.decline_and_block_squad_request($1)', [request_id])
  const [{ block_id }] = await U(B).q('select * from public.get_my_blocks()')
  await U(B).q('select public.unblock_user($1)', [block_id])
  eq((await U(B).q('select * from public.get_my_blocks()')).length, 0)
  await rejects(U(A).q('select public.unblock_user($1)', [block_id]), /not found/, 'only the blocker can unblock')
})
await test('accept re-checks blocks with the generic error', async () => {
  const A = await mkUser(), B = await mkUser()
  const pa = await mkProfile(A, G.tarkov), pb = await mkProfile(B, G.tarkov)
  await mkProfile(A, G.cs2); await mkProfile(B, G.cs2)
  await online(A); await online(B)
  const [x] = await send(A, G.pvp, pb)
  await sudo(`insert into public.user_blocks (blocker_id, blocked_id) values ($1,$2)`, [B, A])
  await rejects(U(B).q('select public.accept_squad_request($1)', [x.request_id]), /no longer available/)
})

console.log('\nAllies (§3.10, D8, D10) and chat removal (D-05)')

async function allies() {
  const w = await pair()
  const [{ request_id }] = await send(w.A, G.pvp, w.pb)
  await U(w.B).q('select public.accept_squad_request($1)', [request_id])
  const aAlly = (await U(w.A).q('select * from public.get_my_allies()'))[0]
  return { ...w, request_id, aAlly }
}

await test('D-05: the schema contains no chat objects', async () => {
  const tables = await sudo(`select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r','v') and c.relname ~ 'chat'`)
  eq(tables, [])
  const fns = await sudo(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname ~ 'chat'`)
  eq(fns, [])
})
await test('D8: block_ally → blocker sees block_id; blocked party notices nothing; unblock restores', async () => {
  const { A, B, aAlly } = await allies()
  await U(A).q('select public.block_ally($1)', [aAlly.ally_id])

  // block_id is only ever the caller's OWN block
  assert((await U(A).q('select * from public.get_my_allies()'))[0].block_id, 'blocker gets block_id')
  eq((await U(B).q('select * from public.get_my_allies()'))[0].block_id, null, 'blocked party gets nothing')

  // presence reads as plain offline; B can no longer read A's live profile
  eq((await U(B).q('select * from public.get_my_allies()'))[0].status, 'offline')
  eq((await U(B).q('select 1 from public.game_profiles where user_id = $1', [A])).length, 0)

  const [{ block_id }] = await U(A).q('select * from public.get_my_blocks()')
  await U(A).q('select public.unblock_user($1)', [block_id])
  eq((await U(B).q('select 1 from public.game_profiles where user_id = $1', [A])).length, 1)
})
await test('D10: remove_ally ends the relationship for both sides and allows a fresh request later', async () => {
  const { A, B, pb, request_id, aAlly } = await allies()
  await U(A).q('select public.remove_ally($1)', [aAlly.ally_id])
  eq((await sudo('select count(*)::int c from public.allies where user_id in ($1,$2)', [A, B]))[0].c, 0)
  eq((await reqRow(request_id)).status, 'ended')
  eq((await U(B).q('select * from public.get_my_allies()')).length, 0)
  eq((await U(B).q('select 1 from public.game_profiles where user_id = $1', [A])).length, 0)
  await rejects(U(A).q('delete from public.allies'), /permission denied/)
  // cooldown from the removal, then re-open
  await rejects(send(A, G.pvp, pb), /no longer available/)
  await sudo(`update public.squad_requests set declined_at = now() - interval '2 hours' where id = $1`, [request_id])
  eq((await send(A, G.pvp, pb))[0].status, 'pending')
})
await test('get_my_allies exposes presence only, never a profile', async () => {
  const { aAlly } = await allies()
  for (const bad of ['weapons', 'maps', 'skill', 'rage', 'languages']) assert(!(bad in aAlly), `leaks ${bad}`)
  assert(['searching', 'online', 'offline'].includes(aAlly.status))
})

await test('manual-fake-request.sql sends a real, acceptable request to the named account', async () => {
  const me = await mkUser('me')
  await sudo('update auth.users set email = $1 where id = $2', ['me@example.test', me])
  await mkProfile(me, G.tarkov)
  const script = readFileSync(path.join(here, 'manual-fake-request.sql'), 'utf8').replace('YOUR_EMAIL_HERE', 'me@example.test')
  await db.exec(script)
  await db.exec(script) // re-running is harmless
  const c = await cards(me)
  eq(c.length, 1)
  eq(c[0].sender_username, 'DemoSender')
  eq(c[0].sender_status, 'searching')
  await U(me).q('select public.accept_squad_request($1)', [c[0].request_id])
  eq((await U(me).q('select * from public.get_my_allies()')).length, 1)
  // the cleanup statement from the file's header
  await sudo(`delete from auth.users where email = 'demo-sender@example.invalid'`)
  eq((await sudo(`select count(*)::int c from public.squad_requests where recipient_id = $1`, [me]))[0].c, 0)
})

console.log('\nLive updates (§3.9)')

await test('broadcasts carry only {kind, request_id} to private per-user topics', async () => {
  const { A, B, pb } = await pair()
  await sudo('delete from realtime.sent_log')
  const [{ request_id }] = await send(A, G.pvp, pb)
  await U(B).q('select public.decline_squad_request($1)', [request_id])
  const log = await sudo('select * from realtime.sent_log order by id')
  eq(log.map((l) => [l.topic, l.event]), [[`user:${B}`, 'request_received'], [`user:${A}`, 'request_updated']])
  for (const l of log) eq(Object.keys(l.payload).sort(), ['kind', 'request_id'])
})
await test('realtime.messages policy: a user can receive on their own topic only', async () => {
  const u = await mkUser(), v = await mkUser()
  await sudo('delete from realtime.messages'); await sudo('insert into realtime.messages default values')
  const count = async (uid, topic) => {
    await db.query(`select set_config('realtime.topic', $1, false)`, [topic])
    return (await U(uid).q('select count(*)::int c from realtime.messages'))[0].c
  }
  eq(await count(u, `user:${u}`), 1)
  eq(await count(u, `user:${v}`), 0)
  await rejects(U(u).q('insert into realtime.messages default values'), /permission denied|row-level security/)
})

console.log('\nLaunch readiness: privacy, deletion, export, bans, reports (D-01, D-02, D-03, D-09, D-10, D-14, D-15)')

const count = async (sql, params) => Number((await sudo(sql, params))[0].c)

await test('D-09: no Google profile data is stored on users', async () => {
  eq(await sudo(`select column_name from information_schema.columns
                  where table_schema = 'public' and table_name = 'users' and column_name in ('display_name','avatar_url')`), [])
  const id = randomUUID()
  await sudo(`insert into auth.users (id, raw_user_meta_data) values ($1, '{"full_name":"Real Name","avatar_url":"http://x"}'::jsonb)`, [id])
  const [row] = await sudo('select * from public.users where id = $1', [id])
  assert(row, 'users row created')
  assert(!JSON.stringify(row).includes('Real Name'), 'name not persisted')
})
await test('D-10: a client can change show_online_players and nothing else on users', async () => {
  const u = await mkUser()
  await U(u).q('update public.users set show_online_players = true where id = $1', [u])
  eq((await sudo('select show_online_players from public.users where id = $1', [u]))[0].show_online_players, true)
  await rejects(U(u).q(`update public.users set created_at = now() where id = $1`, [u]), /permission denied/)
  await rejects(U(u).q(`update public.users set id = $1 where id = $2`, [randomUUID(), u]), /permission denied/)
})
await test('D-14: a failure inside handle_new_user cannot block sign-up', async () => {
  await sudo('alter table public.users add constraint tmp_break check (false) not valid')
  try {
    const id = randomUUID()
    await sudo(`insert into auth.users (id, raw_user_meta_data) values ($1, '{}'::jsonb)`, [id])   // must not throw
    eq(await count('select count(*)::int c from public.users where id = $1', [id]), 0)
  } finally {
    await sudo('alter table public.users drop constraint tmp_break')
  }
  // and the normal path is idempotent
  const id2 = await mkUser()
  await sudo('select public.handle_new_user() from (select 1) x where false')
  eq(await count('select count(*)::int c from public.users where id = $1', [id2]), 1)
})

async function populatedUser() {
  // A has: profile, presence, outbound + inbound requests, an ally, a block each way, events, rate-limit rows, reports.
  const A = await mkUser('A'), B = await mkUser('B'), C = await mkUser('C'), D = await mkUser('D')
  const pa = await mkProfile(A, G.tarkov, { in_game_username: 'Alpha' })
  const pb = await mkProfile(B, G.tarkov, { in_game_username: 'Bravo' })
  const pc = await mkProfile(C, G.tarkov, { in_game_username: 'Charlie' })
  const pd = await mkProfile(D, G.tarkov, { in_game_username: 'Delta' })
  for (const u of [A, B, C, D]) { await online(u); await search(u, G.pvp) }
  const [{ request_id: toB }] = await send(A, G.pvp, pb)           // A → B (will be accepted)
  await U(B).q('select public.accept_squad_request($1)', [toB])
  await send(C, G.pvp, pa)                                           // C → A pending (inbound for A)
  await send(A, G.pvp, pd)                                           // A → D pending (outbound for A)
  await sudo(`insert into public.user_blocks (blocker_id, blocked_id, label) values ($1,$2,'x'), ($3,$1,'y')`, [A, C, D])
  await U(A).q('select public.report_ally((select ally_id from public.get_my_allies() limit 1), $1)', ['spam'])
  await sudo(`insert into public.reports (reporter_id, reported_user_id, game_id, reported_username, target_kind, reason)
              values ($1,$2,$3,'Alpha','ally','spam')`, [B, A, G.tarkov])
  return { A, B, C, D }
}

await test('D-01: deleting an account leaves zero rows behind and counterparties simply lose the entry', async () => {
  const { A, B, C, D } = await populatedUser()
  assert(await count('select count(*)::int c from public.squad_request_events where sender_id = $1 or recipient_id = $1', [A]) > 0, 'fixture has events')
  await sudo('delete from auth.users where id = $1', [A])

  const refs = [
    ['users', 'id'], ['game_profiles', 'user_id'], ['user_presence', 'user_id'], ['lfg_presence', 'user_id'],
    ['api_rate_limits', 'user_id'], ['squad_requests', 'sender_id'], ['squad_requests', 'recipient_id'],
    ['squad_request_events', 'sender_id'], ['squad_request_events', 'recipient_id'],
    ['allies', 'user_id'], ['allies', 'ally_user_id'], ['user_blocks', 'blocker_id'], ['user_blocks', 'blocked_id'],
    ['reports', 'reporter_id'], ['reports', 'reported_user_id'],
  ]
  for (const [t, c] of refs) eq(await count(`select count(*)::int c from public.${t} where ${c} = $1`, [A]), 0, `${t}.${c}`)

  // counterparties: no dangling ally, no ghost request, no leftover block pointing at nobody
  eq((await U(B).q('select * from public.get_my_allies()')).length, 0)
  eq((await cards(C)).length, 0)
  eq((await outbound(C)).length, 0)
  eq((await U(D).q('select * from public.get_my_blocks()')).length, 0)
  // reports A filed stay, anonymised, because the reported player is still there
  eq(await count('select count(*)::int c from public.reports where reporter_id is null', []), 1)
})

await test('D-02: export_my_data holds only the caller\'s own data (no other user ids, no pre-acceptance usernames)', async () => {
  const { A, B, C, D } = await populatedUser()
  const [{ export_my_data: dump }] = await U(A).q('select public.export_my_data()')
  const text = JSON.stringify(dump)
  for (const other of [B, C, D]) assert(!text.includes(other), 'no other user id')
  assert(!text.includes(A), 'not even its own id is needed')
  assert(!text.includes('Delta'), 'pending outbound target stays anonymous')
  assert(!text.includes('Charlie'), 'inbound sender stays out of the export')
  assert(text.includes('Bravo'), 'accepted ally username is included')
  assert(text.includes('Alpha'), 'own profile username is included')
  eq(Object.keys(dump).sort(), ['account', 'allies', 'blocks', 'exported_at', 'profiles', 'sent_requests'])
  eq(await U(await mkUser()).q('select public.export_my_data() as d').then((r) => r[0].d.profiles), [])
})

console.log('\nUsername bans (D-15)')

async function banFixture() {
  await sudo('delete from public.banned_usernames')
  const A = await mkUser('A'), B = await mkUser('B')
  const pa = await mkProfile(A, G.tarkov, { in_game_username: 'Alpha' })
  const pb = await mkProfile(B, G.tarkov, { in_game_username: 'BadActor' })
  await online(A); await online(B)
  await search(A, G.pvp); await search(B, G.pvp)
  return { A, B, pa, pb }
}
const ban = (name, game = null) => sudo('select public.ban_username($1, $2, $3) as id', [name, game, 'test']).then((r) => r[0].id)

await test('D-15: ban hides the profile from discovery, requests and ally lists — for everyone else and for itself', async () => {
  const { A, B, pa, pb } = await banFixture()
  const sees = async (uid, ref) => (await U(uid).q('select * from public.find_squad_matches($1)', [G.pvp])).some((r) => r.match_ref === ref)
  assert(await sees(A, pb), 'visible before the ban')
  const [{ request_id: pending }] = await send(A, G.pvp, pb)
  const id = await ban('  bad\u200Bactor  ')                         // case, spacing and zero-width variants
  assert(id, 'ban id returned')
  eq((await reqRow(pending)).status, 'withdrawn', 'pending requests involving the name are withdrawn')
  eq(await count('select count(*)::int c from public.lfg_presence where user_id = $1', [B]), 0, 'presence cleared')
  assert(!(await sees(A, pb)), 'gone from discovery')
  await rejects(send(A, G.pvp, pb), /no longer available/, 'cannot be requested')
  await search(B, G.pvp)                                             // the account still works…
  eq((await U(B).q('select * from public.find_squad_matches($1)', [G.pvp])).length, 0, '…but sees nobody')
  await rejects(send(B, G.pvp, pa), /no longer available/, 'and cannot send')
})
await test('D-15: a banned username cannot be saved (case, spacing and zero-width variants), but the account keeps working', async () => {
  const { A, B } = await banFixture()
  await ban('BadActor')
  const C = await mkUser('C')
  for (const variant of ['BADACTOR', 'bad actor', 'Bad\u200BActor', ' ＢａｄActor ']) {
    await rejects(mkProfile(C, G.cs2, { in_game_username: variant }), /isn't available/, variant)
  }
  await mkProfile(C, G.cs2, { in_game_username: 'Fine' })
  await rejects(U(B).q(`update public.game_profiles set in_game_username = 'bad actor' where user_id = $1`, [B]), /isn't available/)
  await U(B).q(`update public.game_profiles set in_game_username = 'NewName' where user_id = $1`, [B])   // renaming is allowed
  assert((await U(A).q('select * from public.find_squad_matches($1)', [G.pvp])).length >= 1, 'new name is visible again')
})
await test('D-15: bans hide existing allies, and unban restores everything', async () => {
  const { A, B, pb } = await banFixture()
  const [{ request_id }] = await send(A, G.pvp, pb)
  await U(B).q('select public.accept_squad_request($1)', [request_id])
  eq((await U(A).q('select * from public.get_my_allies()')).length, 1)
  const id = await ban('BadActor')
  eq((await U(A).q('select * from public.get_my_allies()')).length, 0, 'ally list loses the banned player')
  eq((await U(B).q('select * from public.get_my_allies()')).length, 0, 'and the banned player sees no allies')
  await sudo('select public.unban_username($1)', [id])
  eq((await U(A).q('select * from public.get_my_allies()')).length, 1, 'unban restores')
})
await test('D-15: per-game scope — a ban on one game leaves the same name usable elsewhere', async () => {
  const { A, B } = await banFixture()
  await ban('BadActor', G.cs2)
  assert((await U(A).q('select * from public.find_squad_matches($1)', [G.pvp])).length >= 1, 'tarkov unaffected')
  await rejects(mkProfile(await mkUser('C'), G.cs2, { in_game_username: 'badactor' }), /isn't available/)
  await mkProfile(await mkUser('D'), G.dayz, { in_game_username: 'badactor' })
  void B
})
await test('D-15: the ban list holds no user id and survives deleting the account that held the name', async () => {
  const { B } = await banFixture()
  await ban('BadActor')
  eq((await sudo(`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'banned_usernames'`))
    .map((r) => r.column_name).sort(), ['created_at', 'game_id', 'id', 'reason', 'username_norm'])
  await sudo('delete from auth.users where id = $1', [B])
  eq(await count(`select count(*)::int c from public.banned_usernames where username_norm = 'badactor'`, []), 1)
})
await test('D-15: pending requests from a banned sender never reach the recipient', async () => {
  const { A, B, pa } = await banFixture()
  await send(B, G.pvp, pa)
  eq((await cards(A)).length, 1)
  await ban('BadActor')
  eq((await cards(A)).length, 0)
  eq((await U(A).q('select public.count_my_pending_requests() as c'))[0].c, 0, 'bell follows the cards')
})

console.log('\nAbuse reports (D-03)')

await test('D-03: reports are unreadable to clients; the reporter never receives a user id', async () => {
  const { A, B, aAlly } = await allies()
  const res = await U(A).q('select public.report_ally($1, $2, $3)', [aAlly.ally_id, 'harassment', 'rude in voice'])
  assert(res.length === 1 && [null, ''].includes(Object.values(res[0])[0]), 'returns nothing')
  for (const t of ['reports', 'banned_usernames', 'open_reports']) await rejects(U(A).q(`select * from public.${t}`), /permission denied/, t)
  const [row] = await sudo('select * from public.open_reports where reports >= 1 and reporters = 1 limit 1')
  assert(row, 'review view has the report')
  assert(row.reported_username && !JSON.stringify(row).includes(B), 'review row carries the in-game username, not an id')
  void B
})
await test('D-03: de-duplicated per reporter and target; reporting reveals nothing to the reported player', async () => {
  const { A, B, aAlly } = await allies()
  await U(A).q('select public.report_ally($1, $2)', [aAlly.ally_id, 'spam'])
  await U(A).q('select public.report_ally($1, $2)', [aAlly.ally_id, 'hate'])
  eq(await count('select count(*)::int c from public.reports where reported_user_id = $1', [B]), 1)
  eq((await U(B).q('select * from public.get_my_allies()')).length, 1, 'B sees no change')
  eq((await U(B).q('select * from public.get_my_blocks()')).length, 0)
})
await test('D-03: a request can be reported by its recipient only; strangers cannot report allies', async () => {
  const { A, B, pb } = await pair()
  const [{ request_id }] = await send(A, G.pvp, pb)
  await rejects(U(A).q('select public.report_request($1, $2)', [request_id, 'spam']), /not found/, 'sender cannot')
  await U(B).q('select public.report_request($1, $2, $3)', [request_id, 'inappropriate_username', 'x'])
  eq(await count(`select count(*)::int c from public.reports where target_kind = 'request'`, []), 1)
  const { aAlly } = await allies()
  await rejects(U(await mkUser()).q('select public.report_ally($1, $2)', [aAlly.ally_id, 'spam']), /ally not found/)
  await rejects(U(B).q('select public.report_ally($1, $2)', [aAlly.ally_id, 'nonsense']), /invalid input value/)
})
await test('D-03: details are length-limited and reports are rate limited (10 per day)', async () => {
  const { A, aAlly } = await allies()
  await rejects(U(A).q('select public.report_ally($1, $2, $3)', [aAlly.ally_id, 'other', 'x'.repeat(1001)]), /too long/)
  const u = await mkUser()
  for (let i = 0; i < 10; i++) {
    const w = await allies()
    await sudo(`update public.api_rate_limits set n = n where false`)
    await U(w.A).q('select public.report_ally($1, $2)', [w.aAlly.ally_id, 'spam'])
  }
  void u
  // an eleventh report from one reporter inside the window is refused
  const w = await pair()
  const gp = await sudo('select id from public.game_profiles where user_id = $1', [w.B])
  void gp
  await sudo(`insert into public.api_rate_limits (user_id, bucket, window_start, n) values ($1,'report', now(), 10)
              on conflict (user_id, bucket) do update set n = 10, window_start = now()`, [A])
  await rejects(U(A).q('select public.report_ally($1, $2)', [aAlly.ally_id, 'other']), /slow down/)
})

console.log('\nHousekeeping and update audit (D-04, D-13)')

await test('D-04: run_housekeeping removes exactly the stale rows and is service-role only', async () => {
  const old = await mkUser('old'), fresh = await mkUser('fresh')
  await sudo(`insert into public.user_presence (user_id, last_seen_at) values ($1, now() - interval '2 days'), ($2, now() - interval '1 hour')
              on conflict (user_id) do update set last_seen_at = excluded.last_seen_at`, [old, fresh])
  await sudo(`insert into public.lfg_presence (user_id, game_id, last_seen_at) values ($1, $3, now() - interval '2 days'), ($2, $3, now() - interval '1 hour')
              on conflict (user_id) do update set last_seen_at = excluded.last_seen_at`, [old, fresh, G.pvp])
  await sudo(`insert into public.squad_request_events (sender_id, recipient_id, game_id, sent_at)
              values ($1, $2, $3, now() - interval '91 days'), ($1, $2, $3, now() - interval '5 days')`, [old, fresh, G.pvp])
  await sudo(`insert into public.api_rate_limits (user_id, bucket, window_start, n)
              values ($1, 'x', now() - interval '3 days', 1), ($2, 'x', now() - interval '1 hour', 1)
              on conflict (user_id, bucket) do update set window_start = excluded.window_start`, [old, fresh])

  const liveBefore = {
    users: await count('select count(*)::int c from public.users', []),
    requests: await count('select count(*)::int c from public.squad_requests', []),
  }
  const [{ r }] = await sudo('select public.run_housekeeping() as r')
  assert(r.user_presence >= 1 && r.lfg_presence >= 1 && r.squad_request_events >= 1 && r.api_rate_limits >= 1, 'counts reported')

  eq(await count('select count(*)::int c from public.user_presence where user_id = $1', [old]), 0)
  eq(await count('select count(*)::int c from public.user_presence where user_id = $1', [fresh]), 1)
  eq(await count('select count(*)::int c from public.lfg_presence where user_id = $1', [old]), 0)
  eq(await count('select count(*)::int c from public.lfg_presence where user_id = $1', [fresh]), 1)
  eq(await count('select count(*)::int c from public.squad_request_events where sender_id = $1', [old]), 1, 'only the 5-day-old event is left')
  eq(await count(`select count(*)::int c from public.api_rate_limits where bucket = 'x' and user_id = $1`, [old]), 0)
  eq(await count(`select count(*)::int c from public.api_rate_limits where bucket = 'x' and user_id = $1`, [fresh]), 1)
  eq({ users: await count('select count(*)::int c from public.users', []), requests: await count('select count(*)::int c from public.squad_requests', []) }, liveBefore, 'no live data touched')

  const [{ svc, auth, anon }] = await sudo(`select has_function_privilege('service_role', 'public.run_housekeeping()', 'execute') as svc,
    has_function_privilege('authenticated', 'public.run_housekeeping()', 'execute') as auth,
    has_function_privilege('anon', 'public.run_housekeeping()', 'execute') as anon`)
  eq([svc, auth, anon], [true, false, false])
  await rejects(U(fresh).q('select public.run_housekeeping()'), /permission denied/)
})

await test('D-13: reverting an applied update puts the catalogue back exactly as it was', async () => {
  const snap = async () => ({
    ref: (await sudo('select maps, weapons, roles from public.game_reference_data where game_id = $1', [G.tarkov]))[0],
    tile: (await sudo('select version_label, version_date from public.games where id = $1', [G.pvp]))[0],
  })
  const before = await snap()
  const firstCat = Object.keys(before.ref.weapons)[0]

  // what the cron would have written
  await sudo(`update public.game_reference_data set
      maps = maps || '["ZZ Test Map"]'::jsonb,
      roles = roles || '[{"value":"zz-role","label":"ZZ Role","subtitle":""}]'::jsonb,
      weapons = jsonb_set(jsonb_set(weapons, array[$2::text], (weapons -> $2::text) || '["ZZ Gun"]'::jsonb), array['ZZ Category'], '["ZZ Rifle"]'::jsonb)
    where game_id = $1`, [G.tarkov, firstCat])
  await sudo(`update public.games set version_label = 'ZZ Season' where id = $1`, [G.pvp])
  const ins = (game, kind, oldV, newV) => sudo(
    `insert into public.game_updates (game_id, kind, old_value, new_value, applied) values ($1,$2,$3,$4,true) returning id`, [game, kind, oldV, newV]).then((r) => r[0].id)
  const ids = [
    await ins(G.tarkov, 'map', null, 'ZZ Test Map'),
    await ins(G.tarkov, 'role', null, 'ZZ Role'),
    await ins(G.tarkov, 'weapon', null, `${firstCat}: ZZ Gun`),
    await ins(G.tarkov, 'weapon', null, 'ZZ Category: ZZ Rifle'),
    await ins(G.pvp, 'version', before.tile.version_label, 'ZZ Season'),
  ]
  assert(JSON.stringify(await snap()) !== JSON.stringify(before), 'the fixture really changed the catalogue')

  for (const id of ids) eq((await sudo('select public.revert_game_update($1) as ok', [id]))[0].ok, true)
  eq(await snap(), before, 'catalogue equals its prior state')
  eq(await count(`select count(*)::int c from public.game_updates where id = any($1::uuid[]) and status = 'reverted' and not applied`, [ids]), 5)
  eq((await sudo('select public.revert_game_update($1) as ok', [ids[0]]))[0].ok, false, 'a second revert is a no-op')
  eq(await snap(), before, 'and changes nothing')

  // a reverted addition can be recorded again
  await ins(G.tarkov, 'map', null, 'ZZ Test Map')
  await rejects(ins(G.tarkov, 'map', null, 'zz test map'), /duplicate key/, 'live duplicates are still refused')
  await sudo(`delete from public.game_updates where new_value ilike 'zz%' or id = any($1::uuid[])`, [ids])

  await rejects(sudo('select public.revert_game_update($1)', [randomUUID()]), /unknown game update/)
  const [{ auth }] = await sudo(`select has_function_privilege('authenticated', 'public.revert_game_update(uuid)', 'execute') as auth`)
  eq(auth, false)
})

// ── Summary ────────────────────────────────────────────────────────────────────────────────

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
