import type { MetadataRoute } from 'next'
import { LEGAL_UPDATED } from '@/lib/site'
import { siteUrl } from '@/lib/siteUrl'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl()
  const legal = new Date(LEGAL_UPDATED)
  return [
    { url: `${base}/`, changeFrequency: 'monthly', priority: 1 },
    { url: `${base}/privacy`, lastModified: legal, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms`, lastModified: legal, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
