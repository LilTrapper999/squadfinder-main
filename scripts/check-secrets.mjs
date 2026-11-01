// Scans tracked files and git history for secret-shaped strings. Prints file + pattern name
// only (never the matched value). Exit 1 on any hit.
//
//   npm run check:secrets                 tracked files + history
//   npm run check:secrets -- --tree       tracked files only
//   npm run check:secrets -- --bundle .next/static
//        fails if a server-only env *value* (from the environment or .env.local) appears in
//        the built output; under a `static` directory it also fails on any server-only variable
//        name or secret-shaped string (the public anon key is a JWT, so that pattern is skipped).

import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import path from 'node:path'

const PATTERNS = [
  ['supabase secret key', /sb_secret_[A-Za-z0-9_-]{20,}/],
  ['supabase access token', /sbp_[a-f0-9]{30,}/],
  ['google oauth client secret', /GOCSPX-[A-Za-z0-9_-]{20,}/],
  ['anthropic/openai-style key', /sk-(?:ant-)?[A-Za-z0-9_-]{32,}/],
  ['private key block', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['jwt', /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ['token in url', /[?&](?:access_token|apikey|api_key|token)=[A-Za-z0-9._-]{20,}/],
]

const SERVER_VARS = ['SUPABASE_SERVICE_ROLE_KEY', 'CRON_SECRET', 'ANTHROPIC_API_KEY']

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 })
const hits = []
const args = process.argv.slice(2)

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

function serverValues() {
  const values = new Map()
  for (const name of SERVER_VARS) if (process.env[name]) values.set(name, process.env[name])
  if (existsSync('.env.local')) {
    for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m && SERVER_VARS.includes(m[1]) && m[2].trim()) {
        values.set(m[1], m[2].trim().replace(/^["']|["']$/g, ''))
      }
    }
  }
  return values
}

const bundleIdx = args.indexOf('--bundle')
if (bundleIdx >= 0) {
  const values = serverValues()
  const dir = args[bundleIdx + 1]
  if (!dir || !existsSync(dir)) {
    console.error(`--bundle needs an existing directory (got ${dir ?? 'nothing'}); run npm run build first`)
    process.exit(1)
  }
  // Anything under .next/static is shipped to browsers, so even the NAME of a server-only variable there
  // means a server module was pulled into the client bundle (the value check below only works when the
  // value happens to be set on this machine, e.g. not in CI).
  const clientSide = path.resolve(dir).split(path.sep).includes('static')
  for (const file of walk(dir)) {
    if (/\.(png|jpe?g|gif|ico|webp|woff2?|ttf|otf)$/i.test(file)) continue
    const text = readFileSync(file, 'utf8')
    for (const [name, value] of values) {
      if (value.length >= 8 && text.includes(value)) hits.push(`${file}: value of ${name}`)
    }
    if (clientSide) {
      for (const name of SERVER_VARS) if (text.includes(name)) hits.push(`${file}: reference to server-only ${name}`)
      for (const [name, re] of PATTERNS) if (name !== 'jwt' && re.test(text)) hits.push(`${file}: ${name}`)
    }
  }
} else {
  const SKIP = /\.(png|jpe?g|gif|ico|webp|woff2?|ttf|otf|svg)$/i
  for (const file of git('ls-files', '-z').split('\0').filter(Boolean)) {
    if (SKIP.test(file) || file === 'package-lock.json' || file === 'scripts/check-secrets.mjs') continue
    if (!existsSync(file)) continue
    const text = readFileSync(file, 'utf8')
    for (const [name, re] of PATTERNS) if (re.test(text)) hits.push(`${file}: ${name}`)
  }
  if (!args.includes('--tree')) {
    // Walk every commit's patch; report commit ids only so the secret itself is never printed.
    const log = git(
      'log', '--all', '-p', '--no-color', '--format=@@commit %h', '--',
      '.', ':!package-lock.json', ':!scripts/check-secrets.mjs',
    )
    const seen = new Set()
    for (const chunk of log.split('@@commit ').slice(1)) {
      const id = chunk.split('\n', 1)[0].trim()
      for (const [name, re] of PATTERNS) {
        if (re.test(chunk) && !seen.has(name + id)) {
          seen.add(name + id)
          hits.push(`history: ${name} in commit ${id}`)
        }
      }
    }
  }
}

if (hits.length) {
  console.error('Possible secrets found (values not shown):')
  for (const h of hits) console.error('  - ' + h)
  process.exit(1)
}
console.log('check:secrets clean')
