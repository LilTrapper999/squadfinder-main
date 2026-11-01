// Daily table housekeeping (stale presence, old request events, old rate-limit windows).
// Triggered by Vercel Cron, which sends `Authorization: Bearer $CRON_SECRET`.
// Correctness never depends on this: reads already ignore stale and expired rows.

import 'server-only'
import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/server/admin'
import { isAuthorizedCron, unauthorized } from '@/lib/server/cronAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return unauthorized()
  try {
    const { data, error } = await adminClient().rpc('run_housekeeping')
    if (error) throw new Error(error.message)
    console.info('[housekeeping]', JSON.stringify(data))
    return NextResponse.json({ ok: true, deleted: data })
  } catch (e) {
    console.error('[housekeeping] failed', e instanceof Error ? e.message : 'unknown')
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
