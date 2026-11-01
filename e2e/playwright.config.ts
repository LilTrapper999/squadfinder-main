// End-to-end checks against a production build. Not run by `npm test` and not installed by default:
// CI installs Playwright for the job (see .github/workflows/e2e.yml); locally,
//   npm i --no-save @playwright/test && npx playwright install chromium
//   npm run build && npx playwright test -c e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 3100)

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx next start -p ${PORT}`,
    // The home page answers 200 with or without a database; /api/health would be 503 without one.
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
