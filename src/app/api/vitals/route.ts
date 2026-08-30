import { NextResponse } from 'next/server';
import { recordVital, getVitalsSummary, getSlowestPages, getVitals } from '@/lib/vitals-store';

/**
 * Core Web Vitals RUM endpoint.
 *
 * POST: receives field CWV metrics (CLS, INP, LCP, FCP, TTFB) from the
 * WebVitalsReporter client component. Stores them in a bounded in-memory
 * ring buffer (10k entries, FIFO eviction) so they can be queried.
 *
 * GET: returns aggregate stats (p50/p75/p95 per metric, slowest pages).
 * Query params: ?summary=1 (default), ?slowest=1, ?raw=1&name=LCP&limit=100
 *
 * This endpoint is NOT cached and accepts any origin (RUM data is anonymous).
 * The in-memory store is process-local — for multi-instance deployments,
 * upgrade to GA4 / Datadog / database persistence.
 */

export const runtime = 'nodejs'; // need in-memory store (not edge)

export async function POST(request: Request) {
  try {
    const metric = await request.json();

    // Validate the payload has the expected shape
    if (!metric || typeof metric.name !== 'string' || typeof metric.value !== 'number') {
      return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400 });
    }

    // Store in the ring buffer for querying
    recordVital({
      name: metric.name,
      value: Math.round(metric.value * 100) / 100,
      rating: metric.rating || 'good',
      path: metric.path || '/',
      navType: metric.navigationType,
      timestamp: Date.now(),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'parse error' }, { status: 400 });
  }
}

// GET — query aggregate stats or raw metrics
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // ?slowest=1 → slowest pages by p75 LCP (or ?slowest=1&metric=INP)
  if (searchParams.get('slowest') === '1') {
    const metric = searchParams.get('metric') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    return NextResponse.json({
      metric: metric || 'LCP',
      pages: getSlowestPages({ metric, limit }),
    });
  }

  // ?raw=1 → raw metrics (optionally filtered)
  if (searchParams.get('raw') === '1') {
    const name = searchParams.get('name') || undefined;
    const path = searchParams.get('path') || undefined;
    const limit = parseInt(searchParams.get('limit') || '1000');
    return NextResponse.json({
      metrics: getVitals({ name, path, limit }),
    });
  }

  // Default: aggregate summary
  return NextResponse.json({
    summary: getVitalsSummary(),
  });
}

// Handle OPTIONS for CORS preflight (RUM may be sent from various contexts)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
