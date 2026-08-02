'use client';

import { useEffect } from 'react';
import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals';

/**
 * P3-1 (SEO): Core Web Vitals Real User Monitoring (RUM).
 *
 * Reports field CWV metrics (CLS, INP, LCP, FCP, TTFB) to a backend endpoint
 * so we can track real-user performance in production (not just lab data from
 * Lighthouse). This is the ONLY way to see how actual users experience the
 * site across devices, networks, and geographies.
 *
 * In production, forward these to GA4 / Vercel Analytics / Datadog. In dev,
 * the endpoint just logs to console.
 *
 * This component renders nothing — it's a side-effect-only observer.
 */
function reportMetric(metric: Metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
    id: metric.id,
    delta: metric.delta,
    navigationType: metric.navigationType,
    path: typeof window !== 'undefined' ? window.location.pathname : '/',
    timestamp: Date.now(),
  });

  // Use sendBeacon for reliability — it survives page unload (which is when
  // LCP/INP often fire). Falls back to fetch if sendBeacon is unavailable.
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon('/api/vitals', body);
  } else if (typeof fetch !== 'undefined') {
    fetch('/api/vitals', { body, method: 'POST', keepalive: true }).catch(() => {});
  }
}

export function WebVitalsReporter() {
  useEffect(() => {
    // Each onXxx callback fires when the metric is available (not on every render).
    // The web-vitals library handles deduplication and only reports the final value.
    onCLS(reportMetric);
    onINP(reportMetric);
    onLCP(reportMetric);
    onFCP(reportMetric);
    onTTFB(reportMetric);
  }, []);

  return null;
}
