import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Vitest configuration for the Fieseros CRM.
//
// WHAT THIS ENABLES:
//   - Unit tests for business logic (calculateInvoiceTotal, calculateJobPrice,
//     recurring schedule, permission checks, status transitions, etc.)
//   - Component tests with React Testing Library (@testing-library/react)
//   - jsdom environment for DOM APIs
//
// WHERE TESTS LIVE:
//   - Co-located: src/lib/currency.test.ts, src/components/shared/error-state.test.tsx
//   - Or in a top-level tests/ directory (both patterns are picked up)
//
// HOW TO RUN:
//   bun run test           # watch mode
//   bun run test:run       # single run (CI)
//   bun run test:coverage  # with coverage report
//
// NOTE: This establishes the testing FOUNDATION. The codebase currently has
// zero tests (the prior "Playwright suite" turned out to be ad-hoc bun smoke
// scripts, not a real test framework). Start by adding tests for the shared
// helpers (api-auth, currency, validation) and the new ErrorState component,
// then expand to business logic.

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'src/**/*.test.{ts,tsx}',
      'tests/**/*.test.{ts,tsx}',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'mobile-app',
      'mini-services',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'mobile-app/',
        'mini-services/',
        '**/*.config.{ts,js,mjs}',
        '**/*.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
