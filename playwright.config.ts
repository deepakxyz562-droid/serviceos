import { defineConfig, devices } from '@playwright/test'

// Playwright configuration for the Fieseros CRM.
//
// WHAT THIS ENABLES:
//   - End-to-end tests that exercise real user journeys in a real browser
//   - Cross-browser coverage (Chrome, Firefox, Safari)
//   - Mobile viewport testing
//   - Screenshot/trace capture on failure
//
// WHERE TESTS LIVE:
//   - e2e/ directory at the project root (e.g. e2e/auth.spec.ts)
//
// HOW TO RUN:
//   bun run e2e:install   # install browser binaries (one-time)
//   bun run e2e           # run all E2E tests
//   bun run e2e:ui        # run with interactive UI mode
//
// NOTE: This establishes the E2E FOUNDATION. The codebase previously had
// zero E2E tests (scripts/*-e2e-test.ts were ad-hoc bun smoke scripts, not
// Playwright). Start with smoke tests (homepage loads, login works, main
// CRM views render) then expand to business-critical workflows:
//
//   Login → Create customer → Create job → Assign employee → Complete job → Generate invoice

const PORT = 3000
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      // Firefox is slower in CI — skip on PRs until the suite is stable
      onlyIn: !process.env.CI ? undefined : ['chromium'],
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      // Run mobile tests only on main (not every PR) to save CI minutes
      onlyIn: !process.env.CI ? undefined : ['chromium'],
    },
  ],
  // Start the dev server automatically before running tests.
  // In CI, the server is started separately (see .github/workflows/ci-e2e.yml).
  webServer: process.env.CI
    ? undefined
    : {
        command: 'node node_modules/.bin/next dev -p 3000',
        url: BASE_URL,
        timeout: 120_000,
        reuseExistingServer: true,
      },
})
