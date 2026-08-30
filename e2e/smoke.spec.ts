import { test, expect } from '@playwright/test'

// Smoke test — verifies the app boots and the homepage renders.
//
// This is the MINIMUM viable E2E test. It proves:
//   1. The dev server starts
//   2. The homepage returns HTTP 200
//   3. Critical content is visible (no white screen / hydration crash)
//
// As the suite grows, add tests for:
//   - Login flow
//   - CRM view rendering (jobs, customers, invoices, leads)
//   - Create customer → Create job → Complete job → Generate invoice
//   - Mobile viewport layout

test.describe('Smoke test', () => {
  test('homepage loads and renders content', async ({ page }) => {
    await page.goto('/')

    // Wait for the page to fully load (not just the HTTP response)
    await page.waitForLoadState('networkidle')

    // The homepage should not be a blank white screen
    // Check that the <body> has visible content
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toBeTruthy()
    expect(bodyText!.length).toBeGreaterThan(100)

    // No unhandled client-side errors (React error boundary would show text)
    // We check for common crash indicators
    const crashIndicators = [
      'Application error',
      'Something went wrong',
      'Internal Server Error',
      'This page could not be found',
    ]
    for (const indicator of crashIndicators) {
      expect(bodyText).not.toContain(indicator)
    }
  })

  test('API returns 401 for unauthenticated requests', async ({ request }) => {
    // Verify the Wave 0 security fixes: these endpoints must require auth
    const endpoints = [
      '/api/broadcasts',
      '/api/inbox-messages',
      '/api/wa-forms',
      '/api/journey-workflows',
      '/api/conversations',
      '/api/omnichannel/conversations',
      '/api/employees',
      '/api/teams',
      '/api/forms',
      '/api/leads',
      '/api/quotes',
      '/api/jobs',
      '/api/bookings',
    ]

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint)
      expect(response.status(), `GET ${endpoint} should require auth`).toBe(401)
    }
  })

  test('homepage has no console errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Allow some time for late console errors (hydration, etc.)
    await page.waitForTimeout(2000)

    // Filter out known-benign errors (e.g. browser extensions, third-party scripts)
    const realErrors = consoleErrors.filter(
      (err) =>
        !err.includes('favicon') &&
        !err.includes('chrome-extension') &&
        !err.includes('Download the React DevTools')
    )

    expect(realErrors, `Console errors on homepage: ${realErrors.join('\n')}`).toHaveLength(0)
  })
})
