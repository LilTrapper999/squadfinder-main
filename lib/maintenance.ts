// O-17: a switch that neutralises a bad release without a rollback.
//
// NEXT_PUBLIC_MAINTENANCE_MODE=true makes every page show the "back soon" page (HTTP 503), except the
// legal pages, which must stay readable. API routes are untouched: the cron jobs and the health
// check keep working, and every API route authenticates for itself.

export const MAINTENANCE_PATH = '/maintenance'

/** Pages that stay up during maintenance. */
const ALWAYS_UP = ['/privacy', '/terms', MAINTENANCE_PATH]

export function maintenanceEnabled(flag: string | undefined): boolean {
  return flag?.trim().toLowerCase() === 'true'
}

export function shouldShowMaintenance(pathname: string, flag: string | undefined): boolean {
  if (!maintenanceEnabled(flag)) return false
  if (pathname === '/api' || pathname.startsWith('/api/')) return false
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return !ALWAYS_UP.includes(clean)
}
