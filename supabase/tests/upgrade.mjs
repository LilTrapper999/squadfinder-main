// Upgrade-path test: the five original migrations are applied, legacy-shaped data is loaded
// (version-row profiles, duplicate profiles, 'blocked' statuses/ratings, opposite pending
// requests, dirty arrays/usernames), then the new migrations run on top and the data is checked.
//
//   node supabase/tests/upgrade.mjs

import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFileSync, readdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ENV_SQL } from './env.mjs'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations')
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
const OLD = files.filter((f) => f < '20261031')
const NEW = files.filter((f) => f >= '20261031')

const db = new PGlite({ extensions: { pgcrypto } })
await db.exec(ENV_SQL)
for (const f of OLD) await db.exec(readFileSync(path.join(dir, f), 'utf8'))
console.log(`applied ${OLD.length} original migrations`)

const id = () => randomUUID()
const [anchor, pvp, pve, cs2] = [id(), id(), id(), id()]
const [u1, u2, u3, u4] = [id(), id(), id(), id()]
for (const u of [u1, u2, u3, u4])
  await db.query(`insert into auth.users (id, raw_user_meta_data) values ($1, '{}'::jsonb)`, [u])

await db.query(`insert into public.games (id, name, category, is_selectable) values ($1,'Tarkov','extraction',false)`, [anchor])
await db.query(`insert into public.games (id, name, category, base_game_id) values ($1,'Tarkov PvP','extraction',$3),($2,'Tarkov PvE','extraction',$3)`, [pvp, pve, anchor])
await db.query(`insert into public.games (id, name, category) values ($1,'CS2','competitive')`, [cs2])

const prof = (u, g, name, arr, updated) => db.query(
  `insert into public.game_profiles (user_id, game_id, in_game_username, weapons, skill, rage, updated_at)
   values ($1,$2,$3,$4::text[],5,5,$5)`, [u, g, name, arr, updated])
await prof(u1, pvp, 'older-pvp', ['a'], '2026-01-01')
await prof(u1, pve, 'newer-pve\u0007' + 'x'.repeat(50), ['x', 'x', 'y'], '2026-06-01')   // duplicate across versions, dirty values
await prof(u2, pvp, 'two', ['a'], '2026-01-01')
await prof(u3, cs2, 'three', [], '2026-01-01')

// legacy blocks, three ways
const reqBlocked = id(), reqOld = id(), reqNew = id(), reqAcc = id()
await db.query(`insert into public.squad_requests (id, game_id, sender_id, recipient_id, status) values ($1,$2,$3,$4,'blocked')`, [reqBlocked, pvp, u1, u2])
await db.query(`insert into public.squad_requests (id, game_id, sender_id, recipient_id, status, created_at) values ($1,$2,$3,$4,'pending','2026-01-01')`, [reqOld, cs2, u3, u4])
await db.query(`insert into public.squad_requests (id, game_id, sender_id, recipient_id, status, created_at) values ($1,$2,$3,$4,'pending','2026-02-01')`, [reqNew, cs2, u4, u3])
await db.query(`insert into public.squad_requests (id, game_id, sender_id, recipient_id, status) values ($1,$2,$3,$4,'accepted')`, [reqAcc, pve, u2, u3])
await db.query(`insert into public.allies (squad_request_id, user_id, ally_user_id, game_id, ally_gaming_user_id, rating)
                values ($1,$2,$3,$4,'three','blocked'), ($1,$3,$2,$4,'two','favorite')`, [reqAcc, u2, u3, pve])

for (const f of NEW) {
  try { await db.exec(readFileSync(path.join(dir, f), 'utf8')) }
  catch (e) { console.error(`FAIL: ${f}: ${e.message}`); process.exit(1) }
}
console.log(`applied ${NEW.length} new migrations on top of legacy data`)

const q = async (sql, p) => (await db.query(sql, p)).rows
let bad = 0
const check = (name, cond, extra = '') => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}${cond ? '' : ' ' + extra}`); if (!cond) bad++ }

const slugs = await q(`select slug from public.games`)
check('every game got a placeholder slug', slugs.length === 4 && slugs.every((r) => r.slug.startsWith('legacy-')))

const profs = await q(`select game_id, in_game_username, weapons from public.game_profiles where user_id = $1`, [u1])
check('duplicate version profiles collapsed to one on the base game', profs.length === 1 && profs[0].game_id === anchor, JSON.stringify(profs))
check('the most recently updated profile won', profs[0]?.in_game_username.startsWith('newer-pve'))
check('username cleaned and capped', profs[0]?.in_game_username.length <= 40 && !/[\x00-\x1f]/.test(profs[0]?.in_game_username))
check('array de-duplicated', JSON.stringify(profs[0]?.weapons) === JSON.stringify(['x', 'y']), JSON.stringify(profs[0]?.weapons))
check('version-row profile of another user re-pointed to base', (await q(`select game_id from public.game_profiles where user_id = $1`, [u2]))[0].game_id === anchor)
check('single-version game profile untouched', (await q(`select game_id from public.game_profiles where user_id = $1`, [u3]))[0].game_id === cs2)

const blocks = await q(`select blocker_id, blocked_id from public.user_blocks`)
const has = (a, b) => blocks.some((r) => r.blocker_id === a && r.blocked_id === b)
check("request 'blocked' became a block by the recipient", has(u2, u1))
check("ally rating 'blocked' became a block by the rater", has(u2, u3))
check('ally rating enum lost blocked', (await q(`select enum_range(null::public.ally_rating)::text t`))[0].t === '{favorite,meh}')
check("blocked rating cleared, favorite kept", JSON.stringify((await q(`select rating from public.allies order by user_id = $1 desc`, [u2])).map((r) => r.rating)) === JSON.stringify([null, 'favorite']))

check("'blocked' request is now plain 'declined' with declined_at", (await q(`select status, declined_at is not null d from public.squad_requests where id = $1`, [reqBlocked]))[0].status === 'declined')
check('older of two opposite pending requests was withdrawn', (await q(`select status from public.squad_requests where id = $1`, [reqOld]))[0].status === 'withdrawn'
  && (await q(`select status from public.squad_requests where id = $1`, [reqNew]))[0].status === 'pending')
check('accepted request untouched', (await q(`select status from public.squad_requests where id = $1`, [reqAcc]))[0].status === 'accepted')
check('request_status enum is the new set', (await q(`select enum_range(null::public.request_status)::text t`))[0].t === '{pending,accepted,declined,withdrawn,ended}')
check('notifications_enabled renamed and reset', (await q(`select show_online_players from public.users`)).every((r) => r.show_online_players === false))

console.log(bad ? `\n${bad} check(s) failed` : '\nupgrade path OK')
process.exit(bad ? 1 : 0)
