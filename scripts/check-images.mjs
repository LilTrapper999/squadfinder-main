// On-demand check (not part of CI: it needs the network): HEAD-requests every game logo URL in
// lib/mockData.ts and reports the dead ones. The tiles already fall back to a labelled placeholder
// when an image fails, so a dead URL costs looks, not function; use this to find them.
//
//   npm run check:images                 report; exit 1 if any URL is dead
//   npm run check:images -- --lenient    report; always exit 0

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = readFileSync(path.join(root, 'lib', 'mockData.ts'), 'utf8')

// The two Steam helpers are template literals over an app id; read them from the source so this
// script cannot drift from the catalogue.
const helper = (name) => {
  const m = src.match(new RegExp('const ' + name + ' = \\(id: number\\) =>\\s*`([^`]+)`'))
  if (!m) throw new Error('could not find ' + name + ' in lib/mockData.ts')
  return (id) => m[1].replace('${id}', String(id))
}
const STEAM = helper('STEAM')
const STEAM_HERO = helper('STEAM_HERO')

const urls = new Map() // url -> game name
const entry = /name: '((?:[^'\\]|\\.)*)'[\s\S]*?logoUrl: (?:(STEAM|STEAM_HERO)\((\d+)\)|'([^']+)')/g
for (const m of src.matchAll(entry)) {
  const [, name, fn, appId, literal] = m
  const url = literal ?? (fn === 'STEAM' ? STEAM(appId) : STEAM_HERO(appId))
  if (!urls.has(url)) urls.set(url, name)
}

console.log(`Checking ${urls.size} logo URLs…`)
const dead = []
const queue = [...urls]
async function worker() {
  for (let next = queue.pop(); next; next = queue.pop()) {
    const [url, name] = next
    try {
      const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(15000) })
      if (!res.ok) dead.push(`${name}: HTTP ${res.status} ${url}`)
    } catch (e) {
      dead.push(`${name}: ${e instanceof Error ? e.name : 'error'} ${url}`)
    }
  }
}
await Promise.all(Array.from({ length: 6 }, worker))

if (dead.length) {
  console.error(`${dead.length} dead or unreachable:`)
  for (const d of dead.sort()) console.error('  - ' + d)
  process.exit(process.argv.includes('--lenient') ? 0 : 1)
}
console.log('all logo URLs respond')
