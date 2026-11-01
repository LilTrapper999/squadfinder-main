// A tiny stand-in for supabase-js that runs the app's lib/db/* wrappers against the real
// migrations in an in-memory Postgres (PGlite). It implements only the call shapes the wrappers
// use — rpc(), and from().select/update/upsert with eq/order/single — so column or return-shape
// drift between the SQL and the TypeScript shows up as a failing test rather than in production.

import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { randomUUID } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { ENV_SQL } from '../../supabase/tests/env.mjs'

const repoRoot = path.resolve(__dirname, '../..')

export interface TestDb {
  db: PGlite
  /** Superuser query (bypasses RLS and grants). */
  sudo: (sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>
  mkUser: () => Promise<string>
  /** A supabase-js look-alike signed in as `uid`. */
  clientFor: (uid: string | null) => FakeSupabase
}

type Result<T> = { data: T | null; error: { message: string } | null }

export interface FakeSupabase {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<Result<unknown>>
  from: (table: string) => Builder
}

export async function bootDb(): Promise<TestDb> {
  const db = new PGlite({ extensions: { pgcrypto } })
  await db.exec(ENV_SQL)
  const dir = path.join(repoRoot, 'supabase', 'migrations')
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(path.join(dir, f), 'utf8'))
  }
  await db.exec(readFileSync(path.join(repoRoot, 'supabase', 'seed.sql'), 'utf8'))

  const sudo = async (sql: string, params?: unknown[]) => (await db.query(sql, params as never[])).rows as Record<string, unknown>[]

  async function asUser<T>(uid: string | null, fn: () => Promise<T>): Promise<T> {
    await db.exec(uid ? 'set role authenticated' : 'set role anon')
    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? ''])
    try {
      return await fn()
    } finally {
      await db.exec('reset role')
      await db.query(`select set_config('request.jwt.claim.sub', '', false)`)
    }
  }

  function clientFor(uid: string | null): FakeSupabase {
    return {
      async rpc(fn, args = {}) {
        try {
          const meta = (
            await db.query<{ proretset: boolean; rettype: string }>(
              `select p.proretset, p.prorettype::regtype::text as rettype
                 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                where n.nspname = 'public' and p.proname = $1`,
              [fn],
            )
          ).rows[0]
          if (!meta) return { data: null, error: { message: `function ${fn} does not exist` } }
          const names = Object.keys(args)
          const call = `public.${fn}(${names.map((k, i) => `${k} := $${i + 1}`).join(', ')})`
          const rows = await asUser(uid, async () => (await db.query(`select * from ${call}`, names.map((k) => args[k]) as never[])).rows)
          if (meta.proretset) return { data: rows, error: null }
          const first = rows[0] ? Object.values(rows[0])[0] : null
          return { data: meta.rettype === 'void' ? null : first, error: null }
        } catch (e) {
          return { data: null, error: { message: String((e as Error).message ?? e) } }
        }
      },
      from: (table) => new Builder(db, uid, asUser, table),
    }
  }

  return {
    db,
    sudo,
    clientFor,
    async mkUser() {
      const id = randomUUID()
      await sudo(`insert into auth.users (id, raw_user_meta_data) values ($1, '{}'::jsonb)`, [id])
      return id
    },
  }
}

type AsUser = <T>(uid: string | null, fn: () => Promise<T>) => Promise<T>

class Builder implements PromiseLike<Result<unknown>> {
  private op: 'select' | 'update' | 'upsert' = 'select'
  private cols = '*'
  private filters: [string, unknown][] = []
  private patch: Record<string, unknown> = {}
  private conflict = ''
  private orderBy: { col: string; asc: boolean } | null = null
  private one = false

  constructor(private db: PGlite, private uid: string | null, private asUser: AsUser, private table: string) {}

  select(cols = '*') { this.cols = cols; return this }
  update(patch: Record<string, unknown>) { this.op = 'update'; this.patch = patch; return this }
  upsert(row: Record<string, unknown>, opts?: { onConflict?: string }) {
    this.op = 'upsert'; this.patch = row; this.conflict = opts?.onConflict ?? ''; return this
  }
  eq(col: string, val: unknown) { this.filters.push([col, val]); return this }
  order(col: string, opts?: { ascending?: boolean }) { this.orderBy = { col, asc: opts?.ascending !== false }; return this }
  single() { this.one = true; return this }

  then<A, B>(ok?: ((v: Result<unknown>) => A | PromiseLike<A>) | null, bad?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return this.run().then(ok, bad)
  }

  private where(start: number) {
    if (!this.filters.length) return { sql: '', params: [] as unknown[] }
    return {
      sql: ' where ' + this.filters.map(([c], i) => `"${c}" = $${start + i}`).join(' and '),
      params: this.filters.map(([, v]) => v),
    }
  }

  private async run(): Promise<Result<unknown>> {
    try {
      const t = `public."${this.table}"`
      let rows: Record<string, unknown>[] = []
      await this.asUser(this.uid, async () => {
        if (this.op === 'select') {
          // The one embedded select the wrappers use: "*, game:games(slug)".
          const embedded = this.cols.includes('game:games(slug)')
          const w = this.where(1)
          const embeddedWhere = this.filters.length
            ? ' where ' + this.filters.map(([c], i) => `t."${c}" = $${i + 1}`).join(' and ')
            : ''
          const sel = embedded
            ? `select t.*, jsonb_build_object('slug', g.slug) as game from ${t} t join public.games g on g.id = t.game_id${embeddedWhere}`
            : `select ${this.cols === '*' ? '*' : this.cols} from ${t}${w.sql}`
          const ord = this.orderBy ? ` order by ${this.orderBy.col} ${this.orderBy.asc ? 'asc' : 'desc'}` : ''
          rows = (await this.db.query(sel + ord, w.params as never[])).rows as Record<string, unknown>[]
        } else if (this.op === 'update') {
          const keys = Object.keys(this.patch)
          const w = this.where(keys.length + 1)
          const set = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ')
          await this.db.query(`update ${t} set ${set}${w.sql}`, [...keys.map((k) => this.patch[k]), ...w.params] as never[])
        } else {
          const keys = Object.keys(this.patch)
          const conflictCols = this.conflict.split(',').map((c) => `"${c.trim()}"`).join(', ')
          const updates = keys.filter((k) => !this.conflict.split(',').map((c) => c.trim()).includes(k)).map((k) => `"${k}" = excluded."${k}"`).join(', ')
          const cast = (k: string, v: unknown) => (Array.isArray(v) ? `$${keys.indexOf(k) + 1}::text[]` : v && typeof v === 'object' ? `$${keys.indexOf(k) + 1}::jsonb` : `$${keys.indexOf(k) + 1}`)
          await this.db.query(
            `insert into ${t} (${keys.map((k) => `"${k}"`).join(', ')}) values (${keys.map((k) => cast(k, this.patch[k])).join(', ')})
             on conflict (${conflictCols}) do update set ${updates}`,
            keys.map((k) => (this.patch[k] && typeof this.patch[k] === 'object' && !Array.isArray(this.patch[k]) ? JSON.stringify(this.patch[k]) : this.patch[k])) as never[],
          )
        }
      })
      if (this.one) {
        if (rows.length !== 1) return { data: null, error: { message: `expected one row, got ${rows.length}` } }
        return { data: rows[0], error: null }
      }
      return { data: this.op === 'select' ? rows : null, error: null }
    } catch (e) {
      return { data: null, error: { message: String((e as Error).message ?? e) } }
    }
  }
}
