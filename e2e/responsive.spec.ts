// U-17: no page scrolls sideways at any supported width, and the login card never slides under the footer.
import { expect, test } from '@playwright/test'

const WIDTHS = [360, 390, 768, 1024, 1440]
const ROUTES = ['/', '/privacy', '/terms', '/reset-password', '/definitely-not-a-page']

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: width < 768 ? 740 : 900 } })

    for (const route of ROUTES) {
      test(`${route} has no horizontal scroll and no hydration warnings`, async ({ page }) => {
        const hydration: string[] = []
        page.on('console', (m) => {
          if (/hydrat/i.test(m.text())) hydration.push(m.text())
        })
        await page.goto(route)
        await page.waitForLoadState('networkidle')
        const { scrollWidth, innerWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }))
        expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
        expect(hydration).toEqual([])
      })
    }
  })
}

test('on a short phone screen the login card scrolls inside the page, never under the footer', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  await page.goto('/')
  const footer = await page.locator('footer').boundingBox()
  const main = await page.locator('main#main-content').boundingBox()
  expect(footer && main && main.y + main.height <= footer.y + 1).toBeTruthy()
})
