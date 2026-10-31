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

console.log('\nPrivileges (§0)')

const CLIENT_FUNCTIONS = [
  'base_game_id(uuid)', 'text_array_is_clean(text[])', 'is_ally_for_profile(uuid,uuid)',
  'heartbeat()', 'start_searching(uuid)', 'stop_searching()', 'count_searching_by_game()',
  'get_my_blocks()', 'unblock_user(uuid)', 'block_ally(uuid)',
  'accept_squad_request(uuid)', 'decline_squad_request(uuid)', 'decline_and_block_squad_request(uuid)',
  'withdraw_squad_request(uuid)', 'send_squad_request(uuid,uuid)',
  'get_my_pending_request_cards()', 'count_my_pending_requests()', 'get_my_outbound_requests()',
  'is_chat_participant(uuid)', 'find_squad_matches(uuid,boolean,integer)',
  'get_my_allies()', 'remove_ally(uuid)', 'chat_message_visible(uuid,timestamp with time zone)',
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
await test('locked tables are unreachable to clients', async () => {
  const u = await mkUser()
  for (const t of ['squad_requests', 'squad_request_events', 'user_blocks', 'user_presence', 'lfg_presence', 'api_rate_limits']) {
    await rejects(U(u).q(`select * from public.${t}`), /permission denied/, t)
    await rejects(U(u).q(`insert into public.${t} default values`), /permission denied/, t)
  }
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

await test('full flow: send → card → accept → allies, chat, outbound status', async () => {
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
  eq((await sudo('select count(*)::int c from public.ally_chats where squad_request_id = $1', [sent.request_id]))[0].c, 1)
  eq((await outbound(A))[0].status, 'accepted')
  const allies = await U(A).q('select * from public.get_my_allies()')
  eq(allies.length, 1)
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

console.log('\nAllies and chat (§3.10, §3.11, D8, D10)')

async function allies() {
  const w = await pair()
  const [{ request_id }] = await send(w.A, G.pvp, w.pb)
  await U(w.B).q('select public.accept_squad_request($1)', [request_id])
  const chat = (await sudo('select id from public.ally_chats where squad_request_id = $1', [request_id]))[0].id
  const aAlly = (await U(w.A).q('select * from public.get_my_allies()'))[0]
  return { ...w, request_id, chat, aAlly }
}

await test('chat: server sets expires_at/sent_at; content length enforced; chat columns locked', async () => {
  const { A, B, chat, request_id } = await allies()
  const far = '2099-01-01T00:00:00Z'
  await U(A).q(`insert into public.chat_messages (ally_chat_id, sender_id, content, sent_at, expires_at) values ($1,$2,'hi',$3,$3)`, [chat, A, far])
  let m = (await sudo('select * from public.chat_messages where ally_chat_id = $1', [chat]))[0]
  assert(m.expires_at === null, 'expires_at must ignore client value when disappearing is off')
  assert(new Date(m.sent_at).getFullYear() < 2090, 'sent_at is server time')
  await U(B).q('update public.ally_chats set disappearing_messages = true where id = $1', [chat])
  await U(A).q(`insert into public.chat_messages (ally_chat_id, sender_id, content, expires_at) values ($1,$2,'bye',null)`, [chat, A])
  m = (await sudo(`select * from public.chat_messages where content = 'bye'`))[0]
  const hrs = (new Date(m.expires_at) - Date.now()) / 36e5
  assert(hrs > 23 && hrs < 25, `expected ~24h, got ${hrs}`)
  await rejects(U(A).q(`insert into public.chat_messages (ally_chat_id, sender_id, content) values ($1,$2,'')`, [chat, A]), /chat_messages_content_len/)
  await rejects(U(A).q(`insert into public.chat_messages (ally_chat_id, sender_id, content) values ($1,$2,$3)`, [chat, A, 'x'.repeat(2001)]), /chat_messages_content_len/)
  await rejects(U(A).q('update public.ally_chats set squad_request_id = $1 where id = $2', [randomUUID(), chat]), /only disappearing_messages/)
  // sender spoofing / strangers
  const stranger = await mkUser()
  await rejects(U(stranger).q(`insert into public.chat_messages (ally_chat_id, sender_id, content) values ($1,$2,'x')`, [chat, stranger]), /row-level security/)
  await rejects(U(B).q(`insert into public.chat_messages (ally_chat_id, sender_id, content) values ($1,$2,'x')`, [chat, A]), /row-level security/)
})
await test('chat: expired messages are hidden even if never purged', async () => {
  const { A, B, chat } = await allies()
  await U(A).q(`insert into public.chat_messages (ally_chat_id, sender_id, content) values ($1,$2,'old')`, [chat, A])
  await sudo(`update public.chat_messages set expires_at = now() - interval '1 minute' where content = 'old'`)
  eq((await U(B).q('select * from public.chat_messages where ally_chat_id = $1', [chat])).length, 0)
})
await test('D8: block_ally → blocker stops receiving; blocked party notices nothing; unblock restores', async () => {
  const { A, B, chat, aAlly } = await allies()
  await U(B).q(`insert into public.chat_messages (ally_chat_id, sender_id, content) values ($1,$2,'from B before')`, [chat, B])
  await U(A).q(`insert into public.chat_messages (ally_chat_id, sender_id, content) values ($1,$2,'from A before')`, [chat, A])
  await U(A).q('select public.block_ally($1)', [aAlly.ally_id])

  // B keeps sending: accepted, no error
  await U(B).q(`insert into public.chat_messages (ally_chat_id, sender_id, content) values ($1,$2,'from B after')`, [chat, B])
  const seenByA = (await U(A).q('select content from public.chat_messages where ally_chat_id = $1', [chat])).map((r) => r.content)
  eq(seenByA, ['from A before'], 'A (blocker) sees none of B\'s messages')
  const seenByB = (await U(B).q('select content from public.chat_messages where ally_chat_id = $1 order by sent_at, content', [chat])).map((r) => r.content).sort()
  eq(seenByB, ['from A before', 'from B after', 'from B before'], 'B\'s view of the thread is unchanged')

  // block_id is only ever the caller's OWN block
  assert((await U(A).q('select * from public.get_my_allies()'))[0].block_id, 'blocker gets block_id')
  eq((await U(B).q('select * from public.get_my_allies()'))[0].block_id, null, 'blocked party gets nothing')

  // presence reads as plain offline; B can no longer read A's live profile
  eq((await U(B).q('select * from public.get_my_allies()'))[0].status, 'offline')
  eq((await U(B).q('select 1 from public.game_profiles where user_id = $1', [A])).length, 0)

  const [{ block_id }] = await U(A).q('select * from public.get_my_blocks()')
  await U(A).q('select public.unblock_user($1)', [block_id])
  eq((await U(A).q('select content from public.chat_messages where ally_chat_id = $1', [chat])).length, 3, 'unblock restores everything')
  eq((await U(B).q('select 1 from public.game_profiles where user_id = $1', [A])).length, 1)
})
await test('D10: remove_ally ends the relationship for both sides and allows a fresh request later', async () => {
  const { A, B, chat, pb, request_id, aAlly } = await allies()
  await U(A).q(`insert into public.chat_messages (ally_chat_id, sender_id, content) values ($1,$2,'hello')`, [chat, A])
  await U(A).q('select public.remove_ally($1)', [aAlly.ally_id])
  eq((await sudo('select count(*)::int c from public.allies where user_id in ($1,$2)', [A, B]))[0].c, 0)
  eq((await sudo('select count(*)::int c from public.ally_chats where id = $1', [chat]))[0].c, 0)
  eq((await sudo('select count(*)::int c from public.chat_messages where ally_chat_id = $1', [chat]))[0].c, 0)
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

// ── Summary ────────────────────────────────────────────────────────────────────────────────

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
