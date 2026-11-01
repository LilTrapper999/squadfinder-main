import 'server-only'
import { parseClientEnv, requireVar, type ClientEnv } from './env'

export interface ServerEnv extends ClientEnv {
  serviceRoleKey: string
  cronSecret: string
}

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  return {
    ...parseClientEnv(source),
    serviceRoleKey: requireVar(source, 'SUPABASE_SERVICE_ROLE_KEY'),
    cronSecret: requireVar(source, 'CRON_SECRET'),
  }
}

/** Anthropic key is only needed by the game-update cron, so it is validated separately. */
export function requireAnthropicKey(source: Record<string, string | undefined> = process.env): string {
  return requireVar(source, 'ANTHROPIC_API_KEY')
}

export function readServerEnv(): ServerEnv {
  return parseServerEnv(process.env)
}
