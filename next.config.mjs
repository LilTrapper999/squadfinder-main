// Security headers and CSP (SPEC_LAUNCH_READINESS O-02).
//
// The CSP ships as Report-Only until the console is clean on every page, then CSP_MODE=enforce
// switches it on (see docs/RUNBOOK.md). script-src keeps 'unsafe-inline' because Next 14's App Router
// emits inline hydration scripts and nonces would force every page to be dynamic; nothing in this
// app renders user-controlled HTML, so there is no injection point for the allowance to open.

const isDev = process.env.NODE_ENV !== 'production'

function origin(value) {
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

const supabaseOrigin = origin(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
const supabaseWs = supabaseOrigin ? supabaseOrigin.replace(/^http/, 'ws') : null

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  // Game logos are hot-linked from publisher / Steam CDNs, so any https image host is allowed.
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${[supabaseOrigin, supabaseWs].filter(Boolean).join(' ')}${isDev ? ' ws://localhost:* http://localhost:*' : ''}`.trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ')

const cspHeader = process.env.CSP_MODE === 'enforce' ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only'

const securityHeaders = [
  { key: cspHeader, value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
]

// Pages that need an account have nothing for a search engine to index.
const PRIVATE_PATHS = ['/select-game', '/build-profile', '/squad-matches', '/notifications', '/settings', '/reset-password']

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      ...PRIVATE_PATHS.map((source) => ({ source, headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] })),
    ]
  },
}

export default nextConfig
