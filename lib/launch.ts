/**
 * Single switch for everything that exists only to help develop/demo the app.
 *
 * When the app is officially launched: remove every block guarded by SHOW_DEV_FEATURES (and this
 * file), not just flip the flag — launch means the dev code is gone, not hidden.
 *
 * Current dev-only features:
 *   - login page: "Enter Without Login (Dev)" bypass button
 *   - login page: "Returning user (demo)" toggle
 *   - /db-smoke-test page (Supabase connectivity check)
 *   - AppContext: on localhost the demo squad requests (MOCK_SQUAD_REQUESTS) are seeded at start
 */
export const SHOW_DEV_FEATURES = true
