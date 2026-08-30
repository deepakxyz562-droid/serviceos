import { describe, it, expect, beforeEach } from 'vitest'
import {
  recordVital,
  getVitals,
  getVitalsSummary,
  getSlowestPages,
  clearVitals,
} from '@/lib/vitals-store'

describe('vitals-store', () => {
  beforeEach(() => {
    clearVitals()
  })

  describe('recordVital + getVitals', () => {
    it('stores and retrieves metrics', () => {
      recordVital({ name: 'LCP', value: 2.5, rating: 'good', path: '/', timestamp: Date.now() })
      recordVital({ name: 'CLS', value: 0.1, rating: 'good', path: '/', timestamp: Date.now() })

      const all = getVitals()
      expect(all).toHaveLength(2)
    })

    it('filters by name', () => {
      recordVital({ name: 'LCP', value: 2.5, rating: 'good', path: '/', timestamp: Date.now() })
      recordVital({ name: 'INP', value: 150, rating: 'good', path: '/', timestamp: Date.now() })

      const lcp = getVitals({ name: 'LCP' })
      expect(lcp).toHaveLength(1)
      expect(lcp[0].name).toBe('LCP')
    })

    it('filters by path', () => {
      recordVital({ name: 'LCP', value: 2.5, rating: 'good', path: '/jobs', timestamp: Date.now() })
      recordVital({ name: 'LCP', value: 3.5, rating: 'needs-improvement', path: '/invoices', timestamp: Date.now() })

      const jobs = getVitals({ path: '/jobs' })
      expect(jobs).toHaveLength(1)
      expect(jobs[0].path).toBe('/jobs')
    })

    it('respects limit param', () => {
      for (let i = 0; i < 50; i++) {
        recordVital({ name: 'LCP', value: i, rating: 'good', path: '/', timestamp: Date.now() })
      }
      const limited = getVitals({ limit: 10 })
      expect(limited).toHaveLength(10)
    })
  })

  describe('getVitalsSummary', () => {
    it('returns per-metric aggregate stats', () => {
      recordVital({ name: 'LCP', value: 2.0, rating: 'good', path: '/', timestamp: Date.now() })
      recordVital({ name: 'LCP', value: 4.0, rating: 'needs-improvement', path: '/', timestamp: Date.now() })
      recordVital({ name: 'LCP', value: 6.0, rating: 'poor', path: '/', timestamp: Date.now() })

      const summary = getVitalsSummary()
      expect(summary.LCP.count).toBe(3)
      expect(summary.LCP.good).toBe(1)
      expect(summary.LCP.needsImprovement).toBe(1)
      expect(summary.LCP.poor).toBe(1)
    })

    it('calculates percentiles correctly', () => {
      // Values 1-10
      for (let i = 1; i <= 10; i++) {
        recordVital({ name: 'LCP', value: i, rating: 'good', path: '/', timestamp: Date.now() })
      }

      const summary = getVitalsSummary()
      expect(summary.LCP.p50).toBe(5) // median of 1-10
      expect(summary.LCP.p95).toBe(10) // 95th percentile
    })
  })

  describe('getSlowestPages', () => {
    it('returns pages sorted by p75 (slowest first)', () => {
      recordVital({ name: 'LCP', value: 5.0, rating: 'poor', path: '/slow', timestamp: Date.now() })
      recordVital({ name: 'LCP', value: 5.5, rating: 'poor', path: '/slow', timestamp: Date.now() })
      recordVital({ name: 'LCP', value: 1.0, rating: 'good', path: '/fast', timestamp: Date.now() })
      recordVital({ name: 'LCP', value: 1.5, rating: 'good', path: '/fast', timestamp: Date.now() })

      const pages = getSlowestPages({ metric: 'LCP' })
      expect(pages[0].path).toBe('/slow')
      expect(pages[0].p75).toBeGreaterThan(pages[1].p75)
    })

    it('respects limit param', () => {
      for (let i = 0; i < 30; i++) {
        recordVital({ name: 'LCP', value: i, rating: 'good', path: `/page-${i}`, timestamp: Date.now() })
      }

      const pages = getSlowestPages({ limit: 5 })
      expect(pages).toHaveLength(5)
    })

    it('defaults to LCP metric', () => {
      recordVital({ name: 'LCP', value: 3.0, rating: 'good', path: '/a', timestamp: Date.now() })
      recordVital({ name: 'INP', value: 200, rating: 'good', path: '/b', timestamp: Date.now() })

      const pages = getSlowestPages()
      expect(pages).toHaveLength(1)
      expect(pages[0].path).toBe('/a')
    })
  })
})
