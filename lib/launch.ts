/**
 * Single switch for everything that exists only to help develop/demo the app.
 *
 * When the app is officially launched: remove every block guarded by SHOW_DEV_FEATURES (and this
 * file), not just flip the flag — launch means the dev code is gone, not hidden.
 *
 * Off by default. Shown only when running `next dev` AND NEXT_PUBLIC_SHOW_DEV_FEATURES=true is
 * set in .env.local. Never set that variable on Vercel — preview and production builds also
 * ignore it, because NODE_ENV is "production" there.
 *
 * Current dev-only features:
 *   - login page: "Enter Without Login (Dev)" bypass button
 *   - login page: "Returning user (demo)" toggle
 *   - /db-smoke-test page (Supabase connectivity check) — not gated by this flag yet
 *   - AppContext: on localhost the demo squad requests (MOCK_SQUAD_REQUESTS) are seeded at start
 */
export const SHOW_DEV_FEATURES =
  process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SHOW_DEV_FEATURES === 'true'
