// Backend-free checks: everything here works with placeholder Supabase values.
import { expect, test } from '@playwright/test'

test.describe('login page', () => {
  test('renders the sign-in options', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/SquadFinder/)
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible()
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
  })

  test('the skip link is the first tab stop and lands on the main landmark', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: /skip to main content/i })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#main-content$/)
    await expect(page.locator('main#main-content')).toHaveCount(1)
  })

  test('footer links reach the legal pages', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Legal' }).getByRole('link', { name: 'Privacy' }).click()
    await expect(page).toHaveURL(/\/privacy$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/privacy/i)
    await page.getByRole('navigation', { name: 'Legal' }).getByRole('link', { name: 'Terms' }).click()
    await expect(page).toHaveURL(/\/terms$/)
  })
})

test.describe('signed out', () => {
  for (const path of ['/select-game', '/build-profile', '/squad-matches', '/notifications', '/settings']) {
    test(`${path} sends a visitor to the login page`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(/\/$/)
    })
  }

  test('the header offers no account controls', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page.getByRole('button', { name: /sign out/i })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /settings/i })).toHaveCount(0)
  })

  test('an unknown URL gets the branded 404', async ({ page }) => {
    const res = await page.goto('/definitely-not-a-page')
    expect(res?.status()).toBe(404)
    await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible()
    await expect(page).toHaveTitle(/Page not found/)
  })
})

test.describe('headers and metadata', () => {
  test('security headers are present', async ({ request }) => {
    const res = await request.get('/')
    const h = res.headers()
    expect(h['x-content-type-options']).toBe('nosniff')
    expect(h['x-frame-options']).toBe('DENY')
    expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(h['strict-transport-security']).toContain('max-age=')
    expect(h['content-security-policy'] ?? h['content-security-policy-report-only']).toContain("default-src 'self'")
  })

  test('private pages are not indexable', async ({ request }) => {
    const res = await request.get('/settings')
    expect(res.headers()['x-robots-tag']).toContain('noindex')
  })

  test('robots, sitemap, manifest and icon respond', async ({ request }) => {
    for (const path of ['/robots.txt', '/sitemap.xml', '/manifest.webmanifest', '/icon.svg']) {
      expect((await request.get(path)).status(), path).toBe(200)
    }
  })

  test('the share image renders as a PNG', async ({ request }) => {
    const res = await request.get('/opengraph-image')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('image/png')
  })
})
