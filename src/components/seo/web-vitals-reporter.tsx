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

// ─── Bot detection ─────────────────────────────────────────────────────
// Crawlers (Googlebot, Bingbot, etc.) and headless renderers should NOT
// contribute to RUM data — their CLS/INP/LCP measurements reflect a
// synthetic headless environment, not real-user experience. Skipping them
// also prevents Googlebot's renderer from firing sendBeacon('/api/vitals'),
// which was causing "Other error" notifications in Google Search Console
// (the renderer discovered the URL, the crawler then tried GET, and got
// 405 Method Not Allowed because the endpoint only accepts POST).
//
// This is NOT cloaking — cloaking is serving different *content* to bots
// vs users. Suppressing analytics for bots is standard practice (GA4,
// Vercel Analytics, and Datadog RUM all do this).
const BOT_PATTERN = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|ia_archiver|semrushbot|ahrefsbot|headless|puppeteer|phantomjs|webdriver|lighthouse|pagespeed|chrome-lighthouse|googleother|google-inspectiontool/i;

function isBot(): boolean {
  if (typeof navigator === 'undefined') return false;
  // navigator.userAgent is the canonical signal. Browsers are deprecating
  // userAgentClientHints, so we stick with the string match — Googlebot
  // still identifies itself clearly in userAgent.
  return BOT_PATTERN.test(navigator.userAgent);
}

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
    // Skip RUM registration for crawlers/headless renderers. See isBot()
    // comment above for rationale. Returning early means sendBeacon is
    // never called, so Googlebot's renderer never discovers /api/vitals.
    if (isBot()) {
      return;
    }
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
