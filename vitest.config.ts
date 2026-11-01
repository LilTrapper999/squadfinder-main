import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  // tsconfig keeps jsx as "preserve" for Next; tests need it compiled.
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      // `server-only` throws outside a React Server build; tests run in plain Node.
      'server-only': path.resolve(__dirname, 'tests/stubs/server-only.ts'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'node',
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    },
    coverage: {
      provider: 'v8',
      include: ['lib/matching.ts', 'lib/profileAnswers.ts', 'lib/env.ts', 'lib/env.server.ts'],
    },
  },
})
