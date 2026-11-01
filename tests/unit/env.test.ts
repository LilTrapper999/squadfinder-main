import { describe, expect, it } from 'vitest'
import { parseClientEnv } from '@/lib/env'
import { parseServerEnv, requireAnthropicKey } from '@/lib/env.server'

const client = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
}

describe('parseClientEnv', () => {
  it('returns trimmed values and an optional site url', () => {
    expect(parseClientEnv({ ...client, NEXT_PUBLIC_SITE_URL: ' https://a.test ' })).toEqual({
      supabaseUrl: 'https://x.supabase.co',
      supabaseAnonKey: 'anon',
      siteUrl: 'https://a.test',
    })
    expect(parseClientEnv(client).siteUrl).toBeUndefined()
  })

  it.each(['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'])(
    'names %s when it is missing or blank',
    (name) => {
      expect(() => parseClientEnv({ ...client, [name]: undefined })).toThrow(name)
      expect(() => parseClientEnv({ ...client, [name]: '  ' })).toThrow(name)
    },
  )
})

describe('parseServerEnv', () => {
  const server = { ...client, SUPABASE_SERVICE_ROLE_KEY: 'svc', CRON_SECRET: 'cron' }

  it('adds the server-only values', () => {
    expect(parseServerEnv(server)).toMatchObject({ serviceRoleKey: 'svc', cronSecret: 'cron' })
  })

  it.each(['SUPABASE_SERVICE_ROLE_KEY', 'CRON_SECRET', 'NEXT_PUBLIC_SUPABASE_URL'])(
    'names %s when missing',
    (name) => {
      expect(() => parseServerEnv({ ...server, [name]: undefined })).toThrow(name)
    },
  )

  it('requires the Anthropic key only when asked', () => {
    expect(() => requireAnthropicKey({})).toThrow('ANTHROPIC_API_KEY')
    expect(requireAnthropicKey({ ANTHROPIC_API_KEY: 'k' })).toBe('k')
  })
})
