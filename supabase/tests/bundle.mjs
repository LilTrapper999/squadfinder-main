// D-11 / D-12: the one-file bundle must build the same schema as applying the files one by one,
// and must be safe to run a second time.
//
//   node supabase/tests/bundle.mjs

import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ENV_SQL } from './env.mjs'
import { buildBundle } from '../../scripts/build-sql-bundle.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..', '..')
const migrationsDir = path.join(root, 'supabase', 'migrations')
const bundleFile = path.join(root, 'supabase', 'bundle', 'all_migrations.sql')

let failed = 0
function check(name, ok, detail = '') {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `\n       ${detail}`}`)
  if (!ok) failed++
}

async function fresh() {
  const db = new PGlite({ extensions: { pgcrypto } })
  await db.exec(ENV_SQL)
  return db
}

/** Everything about the public schema that matters, as sorted text lines. */
async function snapshot(db) {
  const q = async (sql) => (await db.query(sql)).rows
  const lines = []
  const push = (kind, rows) => rows.forEach((r) => lines.push(`${kind} ${Object.values(r).join(' | ')}`))

  push('column', await q(`select table_name, column_name, data_type, udt_name, is_nullable, column_default, is_generated, generation_expression
    from information_schema.columns where table_schema = 'public' order by 1, 2`))
  push('constraint', await q(`select conrelid::regclass::text, conname, pg_get_constraintdef(oid) from pg_constraint
    where connamespace = 'public'::regnamespace order by 1, 2`))
  push('index', await q(`select tablename, indexname, indexdef from pg_indexes where schemaname = 'public' order by 1, 2`))
  push('policy', await q(`select tablename, policyname, cmd, roles::text, qual, with_check from pg_policies where schemaname = 'public' order by 1, 2`))
  push('rls', await q(`select relname, relrowsecurity, relforcerowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' order by 1`))
  push('function', await q(`select p.proname, pg_get_function_identity_arguments(p.oid), pg_get_function_result(p.oid), p.prosecdef, p.provolatile,
      coalesce(p.proconfig::text, ''), md5(replace(p.prosrc, chr(13), ''))  -- line endings are not behaviour
    from pg_proc p where p.pronamespace = 'public'::regnamespace order by 1, 2`))
  push('trigger', await q(`select tgrelid::regclass::text, tgname, pg_get_triggerdef(oid) from pg_trigger
    where not tgisinternal and tgrelid in (select oid from pg_class where relnamespace = 'public'::regnamespace) order by 1, 2`))
  push('enum', await q(`select t.typname, string_agg(e.enumlabel, ',' order by e.enumsortorder) from pg_type t join pg_enum e on e.enumtypid = t.oid
    where t.typnamespace = 'public'::regnamespace group by 1 order by 1`))
  push('view', await q(`select viewname, definition from pg_views where schemaname = 'public' order by 1`))
  push('table-grant', await q(`select table_name, grantee, privilege_type from information_schema.role_table_grants
    where table_schema = 'public' and grantee in ('anon', 'authenticated', 'service_role') order by 1, 2, 3`))
  push('column-grant', await q(`select table_name, column_name, grantee, privilege_type from information_schema.column_privileges
    where table_schema = 'public' and grantee in ('anon', 'authenticated', 'service_role') order by 1, 2, 3, 4`))
  push('routine-grant', await q(`select routine_name, grantee, privilege_type from information_schema.routine_privileges
    where routine_schema = 'public' and grantee in ('anon', 'authenticated', 'service_role') order by 1, 2, 3`))
  for (const t of ['games', 'game_reference_data']) {
    push(`rows:${t}`, await q(`select count(*) from public.${t}`))
  }
  return lines.sort()
}

const digest = (lines) => createHash('sha256').update(lines.join('\n')).digest('hex')

console.log('SQL bundle (D-11, D-12)')

check('bundle builds deterministically', buildBundle() === buildBundle())
check('the committed bundle is current (npm run bundle:sql)', existsSync(bundleFile) && readFileSync(bundleFile, 'utf8').replace(/\r\n/g, '\n') === buildBundle(),
  'supabase/bundle/all_migrations.sql is missing or stale')

const bundle = buildBundle()

// A: file by file, then seed
const a = await fresh()
for (const f of readdirSync(migrationsDir).filter((x) => x.endsWith('.sql')).sort()) {
  await a.exec(readFileSync(path.join(migrationsDir, f), 'utf8'))
}
await a.exec(readFileSync(path.join(root, 'supabase', 'seed.sql'), 'utf8'))
const snapA = await snapshot(a)

// B: the bundle, once
const b = await fresh()
let firstRunError = null
try {
  await b.exec(bundle)
} catch (e) {
  firstRunError = e.message
}
check('bundle applies to an empty database', firstRunError === null, firstRunError ?? '')
const snapB = await snapshot(b)
const onlyA = snapA.filter((l) => !snapB.includes(l))
const onlyB = snapB.filter((l) => !snapA.includes(l))
check('bundle schema equals the file-by-file schema', onlyA.length === 0 && onlyB.length === 0,
  `only file-by-file:\n         ${onlyA.slice(0, 5).join('\n         ')}\n       only bundle:\n         ${onlyB.slice(0, 5).join('\n         ')}`)

// B again: second run
let secondRunError = null
try {
  await b.exec(bundle)
} catch (e) {
  secondRunError = e.message
}
check('running the bundle a second time succeeds', secondRunError === null, secondRunError ?? '')
check('and changes nothing', digest(await snapshot(b)) === digest(snapB))
const marks = (await b.query('select count(*)::int c from sf_migrations.applied')).rows[0].c
check('every file is recorded exactly once', marks === readdirSync(migrationsDir).filter((x) => x.endsWith('.sql')).length + 1, `marks=${marks}`)

// The marker table must not be reachable by API roles.
const reachable = (await b.query(`select has_table_privilege('authenticated', 'sf_migrations.applied', 'select') as s,
  has_table_privilege('anon', 'sf_migrations.applied', 'select') as a`)).rows[0]
check('the marker table is closed to anon and authenticated', !reachable.s && !reachable.a)

process.exit(failed ? 1 : 0)
