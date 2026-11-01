import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { DICTIONARY } from '@/lib/i18n/dict'
import { LANGUAGE_LIST } from '@/lib/i18n/languages'
import { ERROR_MESSAGES } from '@/lib/db/rpc'
import { REPORT_REASONS } from '@/lib/db/reports'

const root = path.resolve(__dirname, '../..')
const SOURCE_DIRS = ['app', 'components', 'context', 'lib']

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f)
    if (f === 'node_modules' || f === 'i18n') return []
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) ? [p] : []
  })
}

// t('literal') and t("literal") — with an optional second argument. Template literals with
// ${} are dynamic and cannot be checked statically.
const T_CALL = /\bt\(\s*(?:'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)")/g

// <T>Plain text</T> — the server-renderable wrapper around t().
const T_JSX = /<T(?:\s[^>]*)?>\s*([^<{][^<]*?)\s*<\/T>/g

function unescape(s: string) {
  return s.replace(/\\(['"\\])/g, '$1').replace(/\\n/g, '\n')
}

export function usedStrings(): Set<string> {
  const used = new Set<string>()
  for (const dir of SOURCE_DIRS) {
    for (const file of walk(path.join(root, dir))) {
      const src = readFileSync(file, 'utf8')
      for (const m of src.matchAll(T_CALL)) used.add(unescape(m[1] ?? m[2]))
      for (const m of src.matchAll(T_JSX)) used.add(m[1].replace(/\s+/g, ' ').replace(/&apos;|&#39;/g, "'"))
    }
  }
  for (const v of Object.values(ERROR_MESSAGES)) used.add(v)
  for (const r of REPORT_REASONS) used.add(r.label)
  return used
}

const TARGETS = LANGUAGE_LIST.filter((l) => l.code !== 'en')

describe('i18n completeness', () => {
  const used = usedStrings()

  it('finds a plausible number of strings (scanner sanity)', () => {
    expect(used.size).toBeGreaterThan(100)
  })

  it.each(TARGETS.map((l) => [l.code] as const))('%s has a translation for every t() literal', (code) => {
    const dict = DICTIONARY[code] ?? {}
    const missing = [...used].filter((s) => !(s in dict))
    expect(missing, `${missing.length} untranslated, first: ${JSON.stringify(missing.slice(0, 15))}`).toEqual([])
  })

  it.each(TARGETS.map((l) => [l.code] as const))('%s keeps {placeholders} intact', (code) => {
    const dict = DICTIONARY[code] ?? {}
    const bad: string[] = []
    for (const [en, tr] of Object.entries(dict)) {
      const want = [...en.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
      const got = [...tr.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
      if (want !== got) bad.push(en)
    }
    expect(bad).toEqual([])
  })
})
