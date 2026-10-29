export type LangCode = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'ru' | 'zh' | 'ja' | 'ko' | 'ar' | 'hi'

export interface Language {
  code: LangCode
  /** Name written in the language itself — what the picker shows */
  label: string
  dir: 'ltr' | 'rtl'
}

export const LANGUAGE_LIST: Language[] = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'es', label: 'Español', dir: 'ltr' },
  { code: 'fr', label: 'Français', dir: 'ltr' },
  { code: 'de', label: 'Deutsch', dir: 'ltr' },
  { code: 'pt', label: 'Português', dir: 'ltr' },
  { code: 'ru', label: 'Русский', dir: 'ltr' },
  { code: 'zh', label: '中文', dir: 'ltr' },
  { code: 'ja', label: '日本語', dir: 'ltr' },
  { code: 'ko', label: '한국어', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'hi', label: 'हिन्दी', dir: 'ltr' },
]

export const DEFAULT_LANG: LangCode = 'en'
export const LANG_STORAGE_KEY = 'squadfinder-lang'
