import { NextResponse, type NextRequest } from 'next/server'
import { MAINTENANCE_PATH, shouldShowMaintenance } from '@/lib/maintenance'

/** Maintenance switch (O-17). With the flag off this does nothing but call next(). */
export function middleware(request: NextRequest) {
  if (!shouldShowMaintenance(request.nextUrl.pathname, process.env.NEXT_PUBLIC_MAINTENANCE_MODE)) {
    return NextResponse.next()
  }
  const url = request.nextUrl.clone()
  url.pathname = MAINTENANCE_PATH
  url.search = ''
  const response = NextResponse.rewrite(url, { status: 503 })
  response.headers.set('Retry-After', '3600')
  response.headers.set('Cache-Control', 'no-store')
  return response
}

export const config = {
  // Pages only: static assets, generated images and metadata files are never rewritten.
  matcher: ['/((?!_next/|favicon.ico|icon.svg|apple-icon|opengraph-image|twitter-image|robots.txt|sitemap.xml|manifest.webmanifest).*)'],
}
