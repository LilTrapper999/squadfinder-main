'use client'

import { useT } from '@/context/I18nContext'

/** First focusable element on every page: jumps keyboard and screen-reader users past the header to the content. */
export default function SkipLink() {
  const { t } = useT()
  return (
    <a href="#main-content" className="skip-link">
      {t('Skip to main content')}
    </a>
  )
}
