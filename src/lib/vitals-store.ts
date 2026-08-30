/**
 * vitals-store.ts
 * ================
 * Bounded in-memory ring buffer for Core Web Vitals RUM data.
 *
 * WHY THIS EXISTS:
 *   The /api/vitals endpoint previously just console.log'd each metric — no
 *   way to query "what's our actual LCP?" or "which page is slow?". This
 *   store keeps the last 10,000 metrics in memory (bounded — no leak) and
 *   provides aggregate queries for the monitoring dashboard.
 *
 * WHAT IT TRACKS:
 *   - Per-metric: name (CLS/INP/LCP/FCP/TTFB), value, rating (good/needs-improvement/poor),
 *     path, timestamp
 *   - Aggregate: p50/p75/p95 per metric, per path, per rating
 *
 * LIMITS:
 *   - 10,000 entries (≈ 10,000 page loads × 5 metrics = 50,000 metrics, but we
 *     cap at 10k total to keep memory < 2MB). Old entries are evicted FIFO.
 *   - Process-local (not shared across serverless instances). For multi-instance
 *     deployments, upgrade to a persistent sink (database, Datadog, GA4).
 *
 * UPGRADE PATH:
 *   When ready for production observability, replace the in-memory store with
 *   a forward to GA4 Measurement Protocol or Datadog's API. The route handler
 *   is the only file that needs to change.
 */

export interface VitalMetric {
  name: string // CLS | INP | LCP | FCP | TTFB
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  path: string
  navType?: string
  timestamp: number
}

const MAX_ENTRIES = 10_000
const buffer: VitalMetric[] = []

/**
 * Store a vital metric. Called from /api/vitals POST.
 */
export function recordVital(metric: VitalMetric): void {
  buffer.push(metric)
  // FIFO eviction — drop oldest entries when over cap
  if (buffer.length > MAX_ENTRIES) {
    buffer.splice(0, buffer.length - MAX_ENTRIES)
  }
}

/**
 * Get raw metrics (optionally filtered by name/path). Limited to `limit` entries.
 */
export function getVitals(opts: {
  name?: string
  path?: string
  limit?: number
} = {}): VitalMetric[] {
  let result = buffer
  if (opts.name) {
    result = result.filter((m) => m.name === opts.name)
  }
  if (opts.path) {
    result = result.filter((m) => m.path === opts.path)
  }
  const limit = opts.limit ?? 1000
  return result.slice(-limit)
}

/**
 * Compute percentile from an array of numbers.
 */
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

/**
 * Get aggregate stats: p50/p75/p95 per metric name, plus count + rating breakdown.
 */
export function getVitalsSummary(): Record<
  string,
  {
    count: number
    p50: number
    p75: number
    p95: number
    good: number
    needsImprovement: number
    poor: number
  }
> {
  const byName: Record<string, VitalMetric[]> = {}
  for (const m of buffer) {
    if (!byName[m.name]) byName[m.name] = []
    byName[m.name].push(m)
  }

  const summary: Record<string, typeof byName[string] extends never ? never : {
    count: number
    p50: number
    p75: number
    p95: number
    good: number
    needsImprovement: number
    poor: number
  }> = {}

  for (const [name, metrics] of Object.entries(byName)) {
    const values = metrics.map((m) => m.value)
    summary[name] = {
      count: metrics.length,
      p50: Math.round(percentile(values, 50) * 100) / 100,
      p75: Math.round(percentile(values, 75) * 100) / 100,
      p95: Math.round(percentile(values, 95) * 100) / 100,
      good: metrics.filter((m) => m.rating === 'good').length,
      needsImprovement: metrics.filter((m) => m.rating === 'needs-improvement').length,
      poor: metrics.filter((m) => m.rating === 'poor').length,
    }
  }

  return summary
}

/**
 * Get slowest pages (by p75 LCP or INP).
 */
export function getSlowestPages(opts: { metric?: string; limit?: number } = {}): Array<{
  path: string
  count: number
  p75: number
  p95: number
}> {
  const metricName = opts.metric ?? 'LCP'
  const byPath: Record<string, number[]> = {}
  for (const m of buffer) {
    if (m.name !== metricName) continue
    if (!byPath[m.path]) byPath[m.path] = []
    byPath[m.path].push(m.value)
  }

  return Object.entries(byPath)
    .map(([path, values]) => ({
      path,
      count: values.length,
      p75: Math.round(percentile(values, 75) * 100) / 100,
      p95: Math.round(percentile(values, 95) * 100) / 100,
    }))
    .sort((a, b) => b.p75 - a.p75)
    .slice(0, opts.limit ?? 20)
}

/**
 * Clear all stored metrics (for testing).
 */
export function clearVitals(): void {
  buffer.length = 0
}
