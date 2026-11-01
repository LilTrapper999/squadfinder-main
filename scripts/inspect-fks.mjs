// Prints every foreign key in `public` that points at users / auth.users with its ON DELETE rule.
// Handy when adding a table: node scripts/inspect-fks.mjs
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ENV_SQL } from '../supabase/tests/env.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const db = new PGlite({ extensions: { pgcrypto } })
await db.exec(ENV_SQL)
const dir = path.join(root, 'supabase', 'migrations')
for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) await db.exec(readFileSync(path.join(dir, f), 'utf8'))

const { rows } = await db.query(`
  select conrelid::regclass::text as tbl, a.attname as col, confrelid::regclass::text as refs,
         case confdeltype when 'c' then 'cascade' when 'n' then 'set null' when 'a' then 'NO ACTION' when 'r' then 'RESTRICT' else confdeltype::text end as on_delete
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
   where c.contype = 'f' and confrelid in ('public.users'::regclass, 'auth.users'::regclass)
   order by 1, 2`)
console.table(rows)
await db.close()
