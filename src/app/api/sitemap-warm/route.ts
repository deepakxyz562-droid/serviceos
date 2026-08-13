import { after } from 'next/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  clearSitemapCache,
  getSitemapIds,
  buildStaticSitemap,
  buildBusinessSitemap,
  buildAndCacheAllSitemapXmlPages,
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
 *   Schedule: every 30 minutes
 *   Timeout:  any value works now (response is instant) — default is fine
 *
 * WHY 30 MINUTES (was 50):
 *   The CDN cache TTL is 24h, but the in-memory cache TTL is 1h. If the cron
 *   runs every 50 min, there's a 10-min window where the in-memory cache could
 *   expire before the next warm — meaning the next Googlebot fetch after
 *   expiry hits a cold in-memory cache and pays the full Supabase query cost.
 *   At 30-min intervals, the in-memory cache is always fresh (well within the
 *   1h TTL), so regeneration is always instant when the CDN revalidates.
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

/** Per-operation timeout for the Phase A warmers. */
const PER_OP_TIMEOUT_MS = 7_000;

/** Timeout for Phase B (XML pre-serialization). Generous since it processes
 * ~37 pages sequentially, each needing slice + serialize + Redis SET. */
const XML_PRECACHE_TIMEOUT_MS = 15_000;

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
  xmlPagesBuilt?: number;
  xmlPagesFailed?: number;
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
 * Two phases:
 *   Phase A — Warm the underlying data caches (parallel, fast):
 *     1. getSitemapIds()         → warms the "sitemap-ids" cache (count query)
 *     2. buildStaticSitemap()    → warms the "static-sitemap" cache
 *     3. buildBusinessSitemap(0) → warms the "all-business-urls" cache
 *
 *   Phase B — Pre-serialize all sitemap pages' XML into Redis:
 *     buildAndCacheAllSitemapXmlPages() iterates all sitemap IDs, builds
 *     each page's XML, and stores it under `fieseros:sitemap:xml:{id}`.
 *     This is the KEY fix: each page is stored as its own ~250KB key
 *     (well under Upstash's 10MB limit), so the route handler can serve
 *     any page with a single Redis GET (~50ms) instead of a 3-15s Supabase query.
 *
 * Each phase has its own timeout so a slow op can't block the others.
 */
async function performWarm(): Promise<void> {
  warmingInProgress = true;
  const startedAt = Date.now();
  const errors: string[] = [];
  let sitemapCount: number | undefined;
  let staticUrlCount: number | undefined;
  let businessUrlCount: number | undefined;
  let xmlPagesBuilt: number | undefined;
  let xmlPagesFailed: number | undefined;

  try {
    // Clear the in-memory cache so we regenerate fresh data.
    clearSitemapCache();

    // ── Phase A: Warm the underlying data caches (parallel) ────────────
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

    // ── Phase B: Pre-serialize all sitemap pages' XML into Redis ────────
    // This is the critical fix for the Upstash 10MB limit. Instead of
    // storing one ~10MB blob of all URLs, we store each page's finished
    // XML as its own key (~250KB each). The route handler then reads the
    // pre-built XML directly — zero DB queries on cache hit.
    //
    // We use a generous timeout (XML_PRECACHE_TIMEOUT_MS) since this
    // processes ~37 pages sequentially, each requiring a slice + serialize
    // + Redis SET (~5ms each = ~200ms total, but allow headroom).
    const xmlResult = await withTimeout(
      buildAndCacheAllSitemapXmlPages(),
      XML_PRECACHE_TIMEOUT_MS,
    );
    xmlPagesBuilt = xmlResult.pagesBuilt;
    xmlPagesFailed = xmlResult.pagesFailed;
    if (xmlResult.errors.length > 0) {
      errors.push(...xmlResult.errors.slice(0, 5)); // cap error list
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
      xmlPagesBuilt,
      xmlPagesFailed,
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
