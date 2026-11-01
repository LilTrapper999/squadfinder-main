'use client'

import { usePathname } from 'next/navigation'
import LegalFooter from '@/components/ui/LegalFooter'

/** Pages with room to spare carry the trademark line too; the busy app screens get links only. */
const FULL_FOOTER = ['/', '/settings', '/privacy', '/terms']

export default function AppFooter() {
  return <LegalFooter compact={!FULL_FOOTER.includes(usePathname())} />
}
