'use client'

import { useT } from '@/context/I18nContext'

/**
 * Translates a literal English string. A tiny client component so server-rendered markup (the
 * legal footer) emits the English text in the HTML and swaps language after hydration.
 * `children` must be a plain string literal so the i18n completeness test can find it.
 */
export default function T({ children, vars }: { children: string; vars?: Record<string, string | number> }) {
  const { t } = useT()
  return <>{t(children, vars)}</>
}
