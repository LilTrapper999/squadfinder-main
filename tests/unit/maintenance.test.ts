import { afterEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { maintenanceEnabled, shouldShowMaintenance } from '@/lib/maintenance'
import { middleware } from '@/middleware'

describe('maintenance switch (O-17)', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_MAINTENANCE_MODE
  })

  it('is off when the variable is absent, empty or anything but "true"', () => {
    for (const flag of [undefined, '', 'false', '0', 'yes']) {
      expect(maintenanceEnabled(flag)).toBe(false)
      expect(shouldShowMaintenance('/select-game', flag)).toBe(false)
    }
  })

  it('covers every page when on, except the legal pages and the maintenance page itself', () => {
    for (const path of ['/', '/select-game', '/build-profile', '/squad-matches', '/notifications', '/settings', '/reset-password', '/anything']) {
      expect(shouldShowMaintenance(path, 'true'), path).toBe(true)
    }
    for (const path of ['/privacy', '/terms', '/privacy/', '/maintenance']) {
      expect(shouldShowMaintenance(path, 'true'), path).toBe(false)
    }
  })

  it('never touches API routes, so cron and health keep working', () => {
    for (const path of ['/api/health', '/api/cron/housekeeping', '/api/account/delete']) {
      expect(shouldShowMaintenance(path, 'true'), path).toBe(false)
    }
  })

  it('tolerates case and whitespace in the flag', () => {
    expect(maintenanceEnabled(' TRUE ')).toBe(true)
  })

  it('the middleware passes requests through when off', () => {
    const res = middleware(new NextRequest('http://localhost/select-game'))
    expect(res.headers.get('x-middleware-next')).toBe('1')
    expect(res.headers.get('x-middleware-rewrite')).toBeNull()
  })

  it('the middleware rewrites to the maintenance page with a 503 when on', () => {
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE = 'true'
    const res = middleware(new NextRequest('http://localhost/select-game?x=1'))
    expect(res.status).toBe(503)
    expect(res.headers.get('x-middleware-rewrite')).toBe('http://localhost/maintenance')
    expect(res.headers.get('retry-after')).toBe('3600')

    const legal = middleware(new NextRequest('http://localhost/privacy'))
    expect(legal.headers.get('x-middleware-next')).toBe('1')
  })
})
