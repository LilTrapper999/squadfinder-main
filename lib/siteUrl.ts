// Canonical origin for metadata, sitemap and auth redirects. NEXT_PUBLIC_SITE_URL wins; on Vercel
// the production/preview host is used; localhost is the last resort for `next dev`.

export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) return configured.replace(/\/+$/, '')
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL
  if (vercel) return `https://${vercel}`
  return 'http://localhost:3000'
}

/**
 * The origin to hand to Supabase as a redirect target. In the browser the current origin is the
 * only value that is always right (previews, custom domains); the configured one is for server code.
 */
export function redirectOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : siteUrl()
}
