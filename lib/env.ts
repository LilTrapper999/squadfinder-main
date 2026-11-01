// Environment validation. Client values must be read as literal `process.env.NEXT_PUBLIC_*`
// accesses so Next can inline them into the bundle, which is why callers pass them in explicitly.
// Server values live in lib/env.server.ts (server-only).

export interface ClientEnv {
  supabaseUrl: string
  supabaseAnonKey: string
  siteUrl: string | undefined
}

function required(source: Record<string, string | undefined>, name: string): string {
  const value = source[name]
  if (!value || !value.trim()) {
    throw new Error(`Missing environment variable ${name}. See .env.example.`)
  }
  return value.trim()
}

export function parseClientEnv(source: Record<string, string | undefined>): ClientEnv {
  return {
    supabaseUrl: required(source, 'NEXT_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: required(source, 'NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    siteUrl: source.NEXT_PUBLIC_SITE_URL?.trim() || undefined,
  }
}

export function readClientEnv(): ClientEnv {
  return parseClientEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  })
}

export { required as requireVar }
