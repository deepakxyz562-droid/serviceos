import { NextResponse } from 'next/server';

/**
 * P3-1 (SEO): Core Web Vitals RUM endpoint.
 *
 * Receives field CWV metrics (CLS, INP, LCP, FCP, TTFB) from the
 * WebVitalsReporter client component. In production, forward these to
 * GA4 / Vercel Analytics / Datadog. For now, we log them so they're
 * visible in server logs for monitoring.
 *
 * This endpoint is NOT cached and accepts any origin (RUM data is anonymous).
 */

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const metric = await request.json();

    // Validate the payload has the expected shape
    if (!metric || typeof metric.name !== 'string' || typeof metric.value !== 'number') {
      return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400 });
    }

    // In production: forward to GA4 / Vercel Analytics / Datadog here.
    // For now: structured log so monitoring tools can pick it up.
    console.log('[vitals]', JSON.stringify({
      name: metric.name,
      value: Math.round(metric.value * 100) / 100,
      rating: metric.rating,
      path: metric.path,
      navType: metric.navigationType,
    }));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'parse error' }, { status: 400 });
  }
}

// Handle OPTIONS for CORS preflight (RUM may be sent from various contexts)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// Handle GET — defensive 204 for crawlers that discover /api/vitals.
//
// Why this exists: the WebVitalsReporter fires navigator.sendBeacon('/api/vitals')
// on every page render. Googlebot's renderer executes that JS and records the
// network request. Googlebot's crawler then tries GET /api/vitals — without a
// GET handler, it received 405 Method Not Allowed, which surfaced as "Other
// error" in Google Search Console. Returning 204 (No Content) tells the
// crawler "this endpoint exists but has nothing for you," which is a clean,
// non-error response. The endpoint is also covered by robots.txt's /api/
// disallow, so this is belt-and-suspenders.
export async function GET() {
  return new NextResponse(null, { status: 204 });
}
