import type { LangCode } from '../languages'
import { common } from './common'
import { login } from './login'
import { auth } from './auth'
import { selectGame } from './selectGame'
import { profile } from './profile'
import { matches } from './matches'
import { social } from './social'

/**
 * Translations are keyed by the English source text itself, so `t('Select Game')` reads naturally
 * in components and an untranslated string simply falls back to English. Each namespace file owns
 * the strings for one area of the app so they can be edited independently.
 *
 * Interpolation uses {name} placeholders: t('Find more allies for {game}.', { game }).
 */
export type Namespace = Partial<Record<Exclude<LangCode, 'en'>, Record<string, string>>>

const NAMESPACES: Namespace[] = [common, login, auth, selectGame, profile, matches, social]

export const DICTIONARY: Partial<Record<LangCode, Record<string, string>>> = {}

for (const ns of NAMESPACES) {
  for (const [lang, entries] of Object.entries(ns) as [LangCode, Record<string, string>][]) {
    DICTIONARY[lang] = { ...DICTIONARY[lang], ...entries }
  }
}
