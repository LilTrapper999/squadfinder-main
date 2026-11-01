import { describe, expect, it, vi, afterEach } from 'vitest'
import { isAuthorizedCron } from '@/lib/server/cronAuth'
import { deleteAccount, lastSignInAt, REAUTH_WINDOW_SECONDS } from '@/lib/server/accountDelete'
import { GET as health } from '@/app/api/health/route'

const req = (authorization?: string) =>
  new Request('http://localhost/api/cron/x', { headers: authorization ? { authorization } : {} })

describe('isAuthorizedCron', () => {
  it('fails closed when the secret is not configured', () => {
    expect(isAuthorizedCron(req('Bearer '), undefined)).toBe(false)
    expect(isAuthorizedCron(req('Bearer undefined'), undefined)).toBe(false)
    expect(isAuthorizedCron(req('Bearer '), '')).toBe(false)
  })

  it('accepts only the exact bearer secret', () => {
    expect(isAuthorizedCron(req('Bearer s3cret'), 's3cret')).toBe(true)
    expect(isAuthorizedCron(req('Bearer s3cret2'), 's3cret')).toBe(false)
    expect(isAuthorizedCron(req('bearer s3cret'), 's3cret')).toBe(false)
    expect(isAuthorizedCron(req('s3cret'), 's3cret')).toBe(false)
    expect(isAuthorizedCron(req(), 's3cret')).toBe(false)
  })
})

// ─── account deletion ────────────────────────────────────────────────────────
const NOW = 1_800_000_000
function jwt(amr: unknown): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${b64({ alg: 'HS256' })}.${b64({ sub: 'u1', amr })}.sig`
}

function fakeAdmin(opts: { user?: { id: string } | null; rpcError?: boolean; deleteError?: boolean } = {}) {
  const calls = { deleted: [] as string[], rpc: [] as unknown[] }
  const admin = {
    auth: {
      getUser: vi.fn(async () => (opts.user === null ? { data: { user: null }, error: { message: 'bad' } } : { data: { user: opts.user ?? { id: 'u1' } }, error: null })),
      admin: {
        deleteUser: vi.fn(async (id: string) => {
          calls.deleted.push(id)
          return { error: opts.deleteError ? { message: 'boom' } : null }
        }),
      },
    },
    rpc: vi.fn(async (fn: string, args: unknown) => {
      calls.rpc.push([fn, args])
      return { error: opts.rpcError ? { message: 'Too many requests' } : null }
    }),
  }
  return { admin: admin as never, calls }
}

describe('lastSignInAt', () => {
  it('returns the newest amr timestamp', () => {
    expect(lastSignInAt(jwt([{ method: 'password', timestamp: 100 }, { method: 'otp', timestamp: 250 }]))).toBe(250)
  })
  it('returns null for malformed tokens or claims', () => {
    expect(lastSignInAt('garbage')).toBeNull()
    expect(lastSignInAt(jwt('nope'))).toBeNull()
    expect(lastSignInAt(jwt([{ method: 'password' }]))).toBeNull()
  })
})

describe('deleteAccount', () => {
  const fresh = jwt([{ method: 'password', timestamp: NOW - 30 }])

  it('rejects a missing or non-bearer header with 401 unauthorized', async () => {
    const { admin, calls } = fakeAdmin()
    expect((await deleteAccount(admin, null, NOW)).body).toEqual({ error: 'unauthorized' })
    expect((await deleteAccount(admin, 'Basic abc', NOW)).status).toBe(401)
    expect(calls.deleted).toEqual([])
  })

  it('rejects a token Supabase does not verify', async () => {
    const { admin, calls } = fakeAdmin({ user: null })
    const r = await deleteAccount(admin, `Bearer ${fresh}`, NOW)
    expect(r).toEqual({ status: 401, body: { error: 'unauthorized' } })
    expect(calls.deleted).toEqual([])
  })

  it('requires a sign-in within the last 10 minutes (reauth_required)', async () => {
    const { admin, calls } = fakeAdmin()
    const stale = jwt([{ method: 'password', timestamp: NOW - REAUTH_WINDOW_SECONDS - 1 }])
    expect(await deleteAccount(admin, `Bearer ${stale}`, NOW)).toEqual({ status: 401, body: { error: 'reauth_required' } })
    expect((await deleteAccount(admin, `Bearer ${jwt(undefined)}`, NOW)).body).toEqual({ error: 'reauth_required' })
    expect(calls.deleted).toEqual([])
  })

  it('is rate limited', async () => {
    const { admin, calls } = fakeAdmin({ rpcError: true })
    expect(await deleteAccount(admin, `Bearer ${fresh}`, NOW)).toEqual({ status: 429, body: { error: 'rate_limited' } })
    expect(calls.deleted).toEqual([])
  })

  it('deletes only the account that owns the token', async () => {
    const { admin, calls } = fakeAdmin({ user: { id: 'owner-1' } })
    expect(await deleteAccount(admin, `Bearer ${fresh}`, NOW)).toEqual({ status: 200, body: { ok: true } })
    expect(calls.deleted).toEqual(['owner-1'])
    expect(calls.rpc).toEqual([['consume_rate_limit', expect.objectContaining({ p_user_id: 'owner-1', p_bucket: 'account_delete' })]])
  })

  it('reports a failed delete without detail', async () => {
    const { admin } = fakeAdmin({ deleteError: true })
    expect(await deleteAccount(admin, `Bearer ${fresh}`, NOW)).toEqual({ status: 500, body: { error: 'server_error' } })
  })
})

// ─── health ──────────────────────────────────────────────────────────────────
describe('GET /api/health', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('is 200 when the auth service answers', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })))
    const res = await health()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, db: true })
  })

  it('is 503 with db:false when it does not', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down') }))
    const res = await health()
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ ok: false, db: false })
  })
})
