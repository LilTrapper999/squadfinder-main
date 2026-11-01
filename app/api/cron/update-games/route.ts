// Daily catalogue refresh. Triggered by Vercel Cron (see vercel.json), which sends
// `Authorization: Bearer $CRON_SECRET`. The work itself lives in lib/server/gameUpdates.ts.
//
//   GET /api/cron/update-games           applies additions + label changes
//   GET /api/cron/update-games?dry=1     same lookups, writes nothing, reports what it would do
//
// Set GAME_UPDATES_ENABLED=false to stop it without a deploy-time code change.
// Server only: uses the service-role key, so never import this file from client code.

import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { GAMES_BY_CATEGORY, GAME_QUESTIONS } from '@/lib/mockData'
import { requireAnthropicKey } from '@/lib/env.server'
import { adminClient } from '@/lib/server/admin'
import { isAuthorizedCron, unauthorized } from '@/lib/server/cronAuth'
import { buildBaseGames, DEFAULT_OPTIONS, runGameUpdates, type ModelClient, type RunOptions } from '@/lib/server/gameUpdates'

export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

function intFromEnv(name: string, fallback: number): number {
  const n = Number(process.env[name])
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return unauthorized()

  if (['false', '0', 'off'].includes((process.env.GAME_UPDATES_ENABLED ?? '').toLowerCase())) {
    return NextResponse.json({ ok: true, skipped: 'disabled' })
  }

  try {
    const anthropic = new Anthropic({ apiKey: requireAnthropicKey() })
    const db = adminClient()

    const opts: RunOptions = {
      ...DEFAULT_OPTIONS,
      dry: new URL(request.url).searchParams.get('dry') === '1',
      maxGames: intFromEnv('GAME_UPDATES_MAX_GAMES', DEFAULT_OPTIONS.maxGames),
      maxTotalTokens: intFromEnv('GAME_UPDATES_MAX_TOKENS', DEFAULT_OPTIONS.maxTotalTokens),
    }

    const all = [...GAMES_BY_CATEGORY.extraction, ...GAMES_BY_CATEGORY.competitive, ...GAMES_BY_CATEGORY.fps]
    const eligible = buildBaseGames(all).filter((b) => GAME_QUESTIONS[b.baseId])

    const report = await runGameUpdates(db, anthropic as unknown as ModelClient, eligible, opts)
    // Token totals go to the function log so cost can be watched without a dashboard.
    console.info('[update-games]', JSON.stringify({ ...report, changed: undefined, errors: report.errors.length }))
    return NextResponse.json(report)
  } catch {
    // Configuration problems are visible in the function log; the caller gets no detail.
    console.error('[update-games] failed to start')
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
