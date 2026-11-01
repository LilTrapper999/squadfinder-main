// D-08: query plans and timings at scale. Loads a large synthetic population into PGlite, then
//   1. times the real read functions as a signed-in user, and
//   2. EXPLAINs the queries inside them (functions are opaque to EXPLAIN, so the statements below
//      mirror the function bodies; keep them in step when a function changes),
// and fails if a selective lookup falls back to a sequential scan of a hot table.
//
//   npm run test:scale                 default: 20,000 users
//   SCALE_USERS=50000 npm run test:scale
//   node supabase/tests/scale.mjs --skip=20261101000600   baseline: leave a migration out ("before")
//
// PGlite is single-threaded WebAssembly, so absolute timings are pessimistic and only the
// relative change and the plan shapes carry over to a real project.

import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { randomUUID } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ENV_SQL } from './env.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..', '..')
const USERS = Number(process.env.SCALE_USERS ?? 20000)
const skip = (process.argv.find((a) => a.startsWith('--skip=')) ?? '').slice(7)
const budgetMs = Number(process.env.SCALE_BUDGET_MS ?? 1500)

const db = new PGlite({ extensions: { pgcrypto } })
const log = (...a) => console.log(...a)
const t0 = Date.now()
const lap = (what) => log(`  ${what} (${((Date.now() - t0) / 1000).toFixed(1)}s)`)

await db.exec(ENV_SQL)
for (const f of readdirSync(path.join(root, 'supabase', 'migrations')).filter((x) => x.endsWith('.sql')).sort()) {
  if (skip && f.startsWith(skip)) continue
  await db.exec(readFileSync(path.join(root, 'supabase', 'migrations', f), 'utf8'))
}
await db.exec(readFileSync(path.join(root, 'supabase', 'seed.sql'), 'utf8'))
log(`Scale test: ${USERS} users${skip ? `, without migration ${skip}*` : ''}`)

const one = async (sql, p) => (await db.query(sql, p)).rows[0]
const { pvp, base } = await one(`select g.id as pvp, g.base_game_id as base from public.games g where g.slug = 'tarkov-eft-pvp'`)

// ── Load ──────────────────────────────────────────────────────────────────────────────────────
// Triggers are skipped for the bulk load (they enforce rules, not shape); every row satisfies the constraints.
await db.exec(`set session_replication_role = replica`)
await db.query(`insert into auth.users (id, raw_user_meta_data) select gen_random_uuid(), '{}'::jsonb from generate_series(1, $1)`, [USERS])
await db.exec(`insert into public.users (id) select id from auth.users on conflict do nothing`)
await db.exec(`create temp table su as select id, row_number() over (order by id) as n from auth.users`)
await db.exec(`create index on su (n)`)

await db.query(
  `insert into public.game_profiles
     (user_id, game_id, in_game_username, platform, weapons, maps, roles, skill, role_match_preference, rage,
      personality, willing_to_chat, willing_to_speak, languages)
   select su.id, $1, 'player' || su.n, 'PC',
          array['AK-74','M4A1'], array['Customs','Woods'], array['Assault'],
          (su.n % 10) + 1, (su.n % 10) + 1, (su.n % 10) + 1,
          array['chill'], su.n % 2 = 0, su.n % 3 = 0, array['en']
     from su`, [base])

// 40% online, 10% searching PvP (fresh); 5% stale searches and 10% stale online
await db.query(`insert into public.user_presence (user_id, last_seen_at)
  select id, case when n % 10 < 4 then now() else now() - interval '3 days' end from su where n % 10 < 5 or n % 10 = 9`)
await db.query(`insert into public.lfg_presence (user_id, game_id, last_seen_at)
  select id, $1, case when n % 20 < 2 then now() else now() - interval '3 days' end from su where n % 20 in (0, 1, 2)`, [pvp])

// ~4 requests per user among neighbours, mixed states; distinct pairs by construction
await db.query(`insert into public.squad_requests (game_id, sender_id, recipient_id, status, created_at, last_sent_at, declined_at)
  select $1, a.id, b.id,
         (array['pending','declined','withdrawn','ended','accepted'])[(a.n + k) % 5 + 1]::public.request_status,
         now() - (k || ' days')::interval, now() - (k || ' days')::interval,
         case when (a.n + k) % 5 = 1 then now() - (k || ' hours')::interval end
    from su a cross join generate_series(1, 4) k
    join su b on b.n = ((a.n + k * 7919 - 1) % $2) + 1
   where a.id <> b.id`, [pvp, USERS])
await db.query(`insert into public.squad_request_events (request_id, sender_id, recipient_id, game_id, sent_at)
  select r.id, r.sender_id, r.recipient_id, r.game_id, r.created_at - (s || ' hours')::interval
    from public.squad_requests r cross join generate_series(0, 1) s`)
await db.query(`insert into public.allies (squad_request_id, user_id, ally_user_id, game_id, ally_gaming_user_id, match_score_at_acceptance)
  select r.id, r.sender_id, r.recipient_id, r.game_id, 'ally' || n, 80 from (select r.*, row_number() over () n from public.squad_requests r where status = 'accepted') r`)
await db.exec(`set session_replication_role = origin`)
await db.exec(`analyze`)

const counts = await one(`select
  (select count(*) from public.game_profiles) profiles, (select count(*) from public.squad_requests) requests,
  (select count(*) from public.squad_request_events) events, (select count(*) from public.allies) allies,
  (select count(*) from public.lfg_presence where last_seen_at > now() - interval '1 hour') searching`)
lap(`loaded ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}`)

// A user who is searching, has pending requests and allies.
const me = (await one(`select s.user_id from public.lfg_presence s
  where s.game_id = $1 and s.last_seen_at > now() - interval '1 hour'
    and exists (select 1 from public.squad_requests r where r.recipient_id = s.user_id and r.status = 'pending')
    and exists (select 1 from public.allies a where a.user_id = s.user_id)
  limit 1`, [pvp])).user_id

async function asUser(fn) {
  await db.exec('set role authenticated')
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [me])
  try {
    return await fn()
  } finally {
    await db.exec('reset role')
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`)
  }
}

// ── Timings ───────────────────────────────────────────────────────────────────────────────────
let failures = 0
const fail = (m) => { failures++; log(`  FAIL ${m}`) }

log('\nTimings (signed-in user, PGlite)')
const calls = [
  ['find_squad_matches', `select * from public.find_squad_matches($1, true, 50)`, [pvp]],
  ['get_my_pending_request_cards', `select * from public.get_my_pending_request_cards()`, []],
  ['get_my_allies', `select * from public.get_my_allies()`, []],
  ['count_searching_by_game', `select * from public.count_searching_by_game()`, []],
  ['get_my_outbound_requests', `select * from public.get_my_outbound_requests()`, []],
]
for (const [name, sql, params] of calls) {
  // find_squad_matches is rate limited to 20/min per user; reset between runs
  await db.exec(`delete from public.api_rate_limits`)
  const ms = await asUser(async () => {
    const s = Date.now()
    const r = await db.query(sql, params)
    return { ms: Date.now() - s, rows: r.rows.length }
  })
  log(`  ${name.padEnd(30)} ${String(ms.ms).padStart(6)} ms   ${ms.rows} rows`)
  if (ms.ms > budgetMs) fail(`${name} took ${ms.ms} ms (budget ${budgetMs} ms)`)
}

// ── Plans ─────────────────────────────────────────────────────────────────────────────────────
const HOT = new Set(['game_profiles', 'squad_requests', 'squad_request_events', 'lfg_presence', 'allies', 'user_presence'])
const MIN_ROWS_FOR_SEQ_TO_MATTER = 2000

function seqScans(node, out = []) {
  if (node['Node Type'] === 'Seq Scan' && HOT.has(node['Relation Name']) && node['Plan Rows'] >= 0) {
    out.push({ table: node['Relation Name'], rows: node['Plan Rows'], filter: node['Filter'] ?? '(none)' })
  }
  for (const child of node.Plans ?? []) seqScans(child, out)
  return out
}

// $1 = me, $2 = pvp tile, $3 = base game
const plans = [
  ['find_squad_matches: candidates', `
    with present as (
      (select l.user_id as pid, l.last_seen_at as seen, true as is_searching from public.lfg_presence l
        where l.game_id = $2 and l.user_id <> $1 and l.last_seen_at > now() - interval '3 minutes')
      union all
      (select u.user_id, u.last_seen_at, false from public.user_presence u
        where u.user_id <> $1 and u.last_seen_at > now() - interval '3 minutes'
          and not exists (select 1 from public.lfg_presence l2 where l2.user_id = u.user_id and l2.game_id = $2
                            and l2.last_seen_at > now() - interval '3 minutes'))
    ), capped as (select pid, is_searching from present order by is_searching desc, seen desc, pid limit 1500)
    select c.id from capped cp join public.game_profiles c on c.user_id = cp.pid and c.game_id = $3`,
   // "who is present right now" is a range over fresh rows, not a keyed lookup: with this population 40% of users
   // are online, so a sequential scan is the right plan. The work it feeds is bounded by the 1500 candidate cap.
   ['user_presence', 'lfg_presence', 'game_profiles']],
  ['find_squad_matches: presence_status lookup', `
    select 1 from public.lfg_presence l where l.user_id = $1 and l.game_id = $2 and l.last_seen_at > now() - interval '3 minutes'`],
  ['can_contact: allies', `select 1 from public.allies a where a.user_id = $1 and a.ally_user_id = (select id from su where n = 77) and a.game_id = $2`],
  ['can_contact: requests either way', `
    select 1 from public.squad_requests sr where sr.game_id = $2
       and ((sr.sender_id = $1 and sr.recipient_id = (select id from su where n = 77))
         or (sr.sender_id = (select id from su where n = 77) and sr.recipient_id = $1))`],
  ['get_my_pending_request_cards', `
    select sr.id from public.squad_requests sr where sr.recipient_id = $1 and sr.status = 'pending'
       and sr.last_sent_at > now() - interval '14 days'`],
  ['get_my_outbound_requests', `select sr.id from public.squad_requests sr where sr.sender_id = $1 order by sr.last_sent_at desc limit 100`],
  ['get_my_allies', `select a.id from public.allies a where a.user_id = $1 order by a.created_at desc`],
  ['rate caps: pending cap', `select count(*) from public.squad_requests sr where sr.sender_id = $1 and sr.status = 'pending'`],
  ['rate caps: daily cap', `select count(*) from public.squad_request_events e where e.sender_id = $1 and e.sent_at > now() - interval '1 day'`],
  ['rate caps: pair cap', `select count(*) from public.squad_request_events e where e.sender_id = $1 and e.recipient_id = (select id from su where n = 77) and e.game_id = $2 and e.sent_at > now() - interval '30 days'`],
  ['count_searching_by_game', `select l.game_id, count(*) from public.lfg_presence l where l.last_seen_at > now() - interval '3 minutes' group by l.game_id`,
   ['lfg_presence']], // aggregates every fresh row by design; housekeeping keeps the table close to the fresh set
]

log('\nPlans (a Seq Scan of a hot table over ' + MIN_ROWS_FOR_SEQ_TO_MATTER + ' estimated rows fails, except the declared range scans)')
for (const [name, sql, rangeScans = []] of plans) {
  const { 'QUERY PLAN': plan } = await one(`explain (format json) ${sql}`, sql.includes('$3') ? [me, pvp, base] : sql.includes('$2') ? [me, pvp] : sql.includes('$1') ? [me] : [])
  const scans = seqScans(plan[0].Plan).filter((s) => s.rows >= MIN_ROWS_FOR_SEQ_TO_MATTER)
  const bad = scans.filter((s) => !rangeScans.includes(s.table))
  log(`  ${bad.length ? 'FAIL' : 'ok  '} ${name}${bad.length ? `\n         ${bad.map((s) => `Seq Scan on ${s.table} (~${s.rows} rows) filter: ${s.filter}`).join('\n         ')}` : ''}`)
  if (bad.length) failures++
}

log(`\n${failures ? `${failures} problem(s)` : 'all plans use indexes'}; total ${((Date.now() - t0) / 1000).toFixed(1)}s`)
process.exit(failures ? 1 : 0)
