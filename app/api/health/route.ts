import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Liveness plus a cheap reachability check of the auth service. No secrets, no versions.
 * 200 {ok:true, db:true} when Supabase answers, 503 {ok:false, db:false} otherwise.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  let db = false
  if (url && key) {
    try {
      const res = await fetch(`${url}/auth/v1/health`, {
        headers: { apikey: key },
        signal: AbortSignal.timeout(3000),
        cache: 'no-store',
      })
      db = res.ok
    } catch {
      db = false
    }
  }
  return NextResponse.json({ ok: db, db }, { status: db ? 200 : 503, headers: { 'cache-control': 'no-store' } })
}
