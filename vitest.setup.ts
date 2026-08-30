// Vitest global setup — runs before every test file.
// Adds @testing-library/jest-dom matchers (toBeInTheDocument, toBeVisible, etc.)
// to Vitest's expect().

import '@testing-library/jest-dom/vitest'

// jsdom doesn't implement matchMedia — some components call it at render time
// (e.g. useReducedMotion). Polyfill it so tests don't crash.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

// jsdom doesn't implement IntersectionObserver (used by some lazy-loaded
// components). Polyfill with a no-op.
if (!window.IntersectionObserver) {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
    root = null
    rootMargin = ''
    thresholds = []
  } as unknown as typeof IntersectionObserver
}
