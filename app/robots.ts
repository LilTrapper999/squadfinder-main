import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/siteUrl'

// Only the login page and the two legal pages are for search engines. Everything else needs an
// account and has nothing to index; the same paths also carry an X-Robots-Tag header (next.config).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: ['/', '/privacy', '/terms'], disallow: ['/api/', '/select-game', '/build-profile', '/squad-matches', '/notifications', '/settings', '/reset-password'] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
