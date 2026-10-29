'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { DICTIONARY } from '@/lib/i18n/dict'
import { DEFAULT_LANG, LANGUAGE_LIST, LANG_STORAGE_KEY, LangCode } from '@/lib/i18n/languages'

type Vars = Record<string, string | number>

interface I18nValue {
  lang: LangCode
  setLang: (lang: LangCode) => void
  /** Translate an English source string; falls back to the English text if there is no entry. */
  t: (text: string, vars?: Vars) => string
}

const I18nContext = createContext<I18nValue | null>(null)

function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match))
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // Always start on English so the server render and first client render match; the saved
  // choice is applied right after mount.
  const [lang, setLangState] = useState<LangCode>(DEFAULT_LANG)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY) as LangCode | null
      if (saved && LANGUAGE_LIST.some((l) => l.code === saved)) setLangState(saved)
    } catch {
      // Storage can be blocked (private mode) — English is a fine fallback.
    }
  }, [])

  useEffect(() => {
    const meta = LANGUAGE_LIST.find((l) => l.code === lang)
    document.documentElement.lang = lang
    document.documentElement.dir = meta?.dir ?? 'ltr'
  }, [lang])

  function setLang(next: LangCode) {
    setLangState(next)
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next)
    } catch {
      // Not persisted — still applies for this session.
    }
  }

  function t(text: string, vars?: Vars): string {
    const translated = lang === DEFAULT_LANG ? text : DICTIONARY[lang]?.[text] ?? text
    return interpolate(translated, vars)
  }

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export function useT() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useT must be used within I18nProvider')
  return ctx
}
