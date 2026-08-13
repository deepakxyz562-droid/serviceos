import { after } from 'next/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  clearSitemapCache,
  getSitemapIds,
  buildStaticSitemap,
  buildBusinessSitemap,
  BUSINESS_PER_FILE,
} from '@/lib/sitemap-builder';

/**
 * GET /api/sitemap-warm — pre-warm the sitemap cache (background, non-blocking).
 *
 * DESIGN (background-warm via `after()`):
 *   This endpoint returns 200 INSTANTLY (<100ms) and schedules the actual
 *   cache warming to run in the background via Next.js `after()`. This fixes
 *   cron-job.org timeouts: the cron service gets an immediate 200 response
 *   regardless of how long the warming takes.
 *
 *   Previously the endpoint ran warming synchronously and waited up to 60s
 *   before responding. On Vercel Hobby (10s function cap) this was impossible
 *   to complete, and external cron services (cron-job.org ~10s default
 *   timeout) always timed out.
 *
 *   Background warming is BEST-EFFORT:
 *     - On Vercel Hobby, `after()` tasks share the function's 10s maxDuration.
 *       Warming may be partially completed — that's OK.
 *     - The PRIMARY protection for Googlebot is the CDN's
 *       `stale-while-revalidate=86400` on the sitemap routes (serves stale
 *       sitemap instantly while regenerating).
 *     - This warmer is a SECONDARY layer: it pre-populates the in-memory
 *       cache so regeneration is instant when the CDN does revalidate.
 *
 *   Warming is idempotent and guarded against overlapping runs.
 *
 * AUTH:
 *   Requires a secret token via EITHER:
 *     - Query param:  /api/sitemap-warm?token=YOUR_TOKEN
 *     - Header:       Authorization: Bearer YOUR_TOKEN
 *   If SITEMAP_WARM_TOKEN is not set, the endpoint returns 503 (disabled).
 *
 * EXTERNAL CRON SETUP (e.g. cron-job.org):
 *   URL:      https://fieseros.com/api/sitemap-warm?token=YOUR_TOKEN
 *   Method:   GET (or POST — both supported)
 *   Schedule: every 50 minutes
 *   Timeout:  any value works now (response is instant) — default is fine
 *
 * RESPONSE:
 *   200 — { ok, scheduledAt, previousWarm, message }
 *   401 — Unauthorized (bad/missing token)
 *   503 — SITEMAP_WARM_TOKEN not configured
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// On Vercel Hobby this is capped at 10s regardless. On Pro it allows longer
// background work. The per-operation timeout (PER_OP_TIMEOUT_MS) is set
// conservatively so all ops fit within a 10s function window.
export const maxDuration = 60;

/** Per-operation timeout. Each warmer gets this long; if it exceeds, it's
 * abandoned (recorded in errors) but doesn't block the others. */
const PER_OP_TIMEOUT_MS = 7_000;

/** Read the token from env. Empty/undefined = endpoint disabled. */
const WARM_TOKEN = process.env.SITEMAP_WARM_TOKEN;

// ── Background-warming state (module-level) ────────────────────────────────
// On serverless (Vercel), each instance has its own state — this is best-effort
// and primarily prevents overlapping calls WITHIN a single instance.
let warmingInProgress = false;
let lastWarmResult: {
  at: string;
  elapsedMs: number;
  sitemapCount?: number;
  staticUrlCount?: number;
  businessUrlCount?: number;
  errors: string[];
} | null = null;

/** Extract the token from either the ?token= query param or Authorization header. */
function extractToken(request: NextRequest): string | null {
  const queryToken = request.nextUrl.searchParams.get('token');
  if (queryToken) return queryToken;

  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) return match[1].trim();
  }

  return null;
}

/** Constant-time string comparison to prevent timing attacks on the token. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/** Reject a promise after `ms` so one slow operation can't block the others. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Timed out after ${ms}ms`)),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * The actual warming work — runs in the background via `after()`.
 *
 * Three independent warmers run in parallel:
 *   1. getSitemapIds()        → warms the "sitemap-ids" cache (count query)
 *   2. buildStaticSitemap()   → warms Prisma connection pool (result isn't
 *                               cached, but connection warming helps)
 *   3. buildBusinessSitemap(0) → warms the "all-business-urls" cache (the
 *                               expensive cursor-paginated list)
 *
 * Each has its own timeout (PER_OP_TIMEOUT_MS) so a slow op can't block the
 * others. Results are recorded in `lastWarmResult` for diagnostic visibility.
 */
async function performWarm(): Promise<void> {
  warmingInProgress = true;
  const startedAt = Date.now();
  const errors: string[] = [];
  let sitemapCount: number | undefined;
  let staticUrlCount: number | undefined;
  let businessUrlCount: number | undefined;

  try {
    // Clear the in-memory cache so we regenerate fresh data.
    clearSitemapCache();

    // Run the three warmers in parallel, each with its own timeout.
    const results = await Promise.allSettled([
      withTimeout(getSitemapIds(), PER_OP_TIMEOUT_MS),
      withTimeout(buildStaticSitemap(), PER_OP_TIMEOUT_MS),
      withTimeout(buildBusinessSitemap(0), PER_OP_TIMEOUT_MS),
    ]);

    if (results[0].status === 'fulfilled') {
      sitemapCount = results[0].value.length;
    } else {
      errors.push(
        `getSitemapIds: ${results[0].reason?.message ?? 'failed'}`,
      );
    }

    if (results[1].status === 'fulfilled') {
      staticUrlCount = results[1].value.length;
    } else {
      errors.push(
        `buildStaticSitemap: ${results[1].reason?.message ?? 'failed'}`,
      );
    }

    if (results[2].status === 'fulfilled') {
      businessUrlCount = results[2].value.length;
    } else {
      errors.push(
        `buildBusinessSitemap: ${results[2].reason?.message ?? 'failed'}`,
      );
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'unknown error');
  } finally {
    lastWarmResult = {
      at: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
      sitemapCount,
      staticUrlCount,
      businessUrlCount,
      errors,
    };
    warmingInProgress = false;
  }
}

export async function GET(request: NextRequest) {
  // ── Auth gate ────────────────────────────────────────────────────────────
  if (!WARM_TOKEN) {
    return NextResponse.json(
      {
        ok: false,
        error: 'SITEMAP_WARM_TOKEN env var is not set. Configure it to enable warming.',
      },
      { status: 503 },
    );
  }

  const providedToken = extractToken(request);
  if (!providedToken || !safeEqual(providedToken, WARM_TOKEN)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  // ── Guard against overlapping cron calls ─────────────────────────────────
  // If a previous warm is still running (e.g. cron fired again early), skip
  // and report the in-progress status. This prevents pile-up.
  if (warmingInProgress) {
    return NextResponse.json(
      {
        ok: true,
        skipped: true,
        message: 'Warming already in progress — skipped this call.',
        previousWarm: lastWarmResult,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      },
    );
  }

  // ── Schedule warming in the background, return 200 instantly ─────────────
  // This is the key fix: the response is flushed to the client immediately,
  // so cron-job.org never times out. The warming runs via `after()` after
  // the response is sent.
  after(performWarm);

  return NextResponse.json(
    {
      ok: true,
      scheduledAt: new Date().toISOString(),
      message:
        'Warming scheduled in background. Returns instantly so cron never times out.',
      previousWarm: lastWarmResult,
      config: {
        perOpTimeoutMs: PER_OP_TIMEOUT_MS,
        businessPerPage: BUSINESS_PER_FILE,
        cacheTtlMinutes: 60,
      },
      note: 'Background warming is best-effort. The CDN stale-while-revalidate (86400s) is the primary protection for Googlebot.',
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    },
  );
}

/**
 * Also support POST — some external cron services prefer it.
 * Delegates to GET with the same request (token extraction works for both).
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
