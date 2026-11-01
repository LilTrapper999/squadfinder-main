'use client'

import Link from 'next/link'
import { Fragment } from 'react'
import { useT } from '@/context/I18nContext'
import { MIN_AGE } from '@/lib/site'

const linkStyle: React.CSSProperties = { color: '#e8a020', textUnderlineOffset: '3px' }

/** Shown above the "create account" button: consent to the Terms and Privacy Policy, plus the age line. */
export default function ConsentLine() {
  const { t } = useT()
  // The sentence is translated as one unit, then the placeholders become real links.
  const parts = t('By creating an account you agree to the {terms} and the {privacy}.').split(/(\{terms\}|\{privacy\})/)
  return (
    <p style={{ margin: '0 0 12px', fontSize: '12px', lineHeight: 1.5, color: 'rgba(255,255,255,0.7)' }}>
      {parts.map((part, i) =>
        part === '{terms}' ? (
          <Link key={i} href="/terms" style={linkStyle}>{t('Terms of Service')}</Link>
        ) : part === '{privacy}' ? (
          <Link key={i} href="/privacy" style={linkStyle}>{t('Privacy Policy')}</Link>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}{' '}
      {t('You must be at least {age} years old to use SquadFinder.', { age: MIN_AGE })}
    </p>
  )
}
