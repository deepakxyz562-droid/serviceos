/**
 * CRM Performance Trace — C-1 Instrumentation
 *
 * STRICTLY OBSERVATIONAL. This module does NOT change query behavior,
 * pagination, caching, or any response content. It only MEASURES.
 *
 * When CRM_PERF_TRACE=true, the `withCrmTrace()` HOF wraps route handlers
 * and records:
 *   - api_total   : wall-clock time of the entire route handler (ms)
 *   - db_total    : sum of time spent in Supabase/PostgREST fetch calls (ms)
 *   - db_calls    : number of Supabase REST calls made during the request
 *   - rows        : row count of the response payload (best-effort shape detection)
 *   - payload     : serialized response size (bytes)
 *   - params      : query-string parameters (filters, search, page, limit, …)
 *
 * The DB-call measurement uses AsyncLocalStorage + a scoped globalThis.fetch
 * interceptor. The interceptor:
 *   1. Is installed at most once (idempotent).
 *   2. Only activates inside a `withCrmTrace` request scope (zero overhead
 *      for untraced requests — the original fetch is called directly).
 *   3. Only counts calls whose URL matches the Supabase project URL.
 *
 * When CRM_PERF_TRACE is unset or != 'true', `withCrmTrace` returns the
 * original handler unchanged — zero runtime overhead in production.
 *
 * This instrumentation is TEMPORARY. It exists to answer "where is the time
 * being spent?" during C-1. It should be removed (or the env var left off)
 * before final commit, per the Phase C methodology.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextRequest } from 'next/server';

// ── Context ────────────────────────────────────────────────────────────────

interface DbCall {
  /** Table or RPC name extracted from the PostgREST URL path. */
  label: string;
  /** Duration of this individual call in ms. */
  ms: number;
}

interface TraceContext {
  routeName: string;
  dbCalls: number;
  dbTimeMs: number;
  /** Per-call breakdown for the queries: line. */
  calls: DbCall[];
  startTime: number;
  params: string;
}

const traceStorage = new AsyncLocalStorage<TraceContext>();

// ── Env gate ───────────────────────────────────────────────────────────────

export function isCrmPerfTraceEnabled(): boolean {
  return process.env.CRM_PERF_TRACE === 'true';
}

// ── Fetch interceptor (scoped, idempotent) ─────────────────────────────────

const SUPABASE_HOST = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    return url ? new URL(url).hostname : '';
  } catch {
    return '';
  }
})();

let interceptorInstalled = false;

/**
 * Installs a one-time globalThis.fetch wrapper that counts Supabase REST
 * calls made within a traced request scope. Outside a trace scope, the
 * original fetch is used with zero overhead.
 */
function ensureFetchInterceptor(): void {
  if (interceptorInstalled) return;
  interceptorInstalled = true;

  const originalFetch = globalThis.fetch;
  // Preserve any existing Next.js fetch patching by calling through to it.
  globalThis.fetch = async function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const ctx = traceStorage.getStore();
    if (!ctx) {
      // Not in a trace scope — zero overhead pass-through.
      return originalFetch.call(this, input, init);
    }

    // Only count calls to the Supabase project (PostgREST).
    let urlStr = '';
    if (typeof input === 'string') urlStr = input;
    else if (input instanceof URL) urlStr = input.href;
    else if (input && typeof input === 'object' && 'url' in input)
      urlStr = (input as Request).url;

    const isSupabase =
      SUPABASE_HOST !== '' && urlStr.includes(SUPABASE_HOST);

    if (!isSupabase) {
      return originalFetch.call(this, input, init);
    }

    const start = performance.now();
    try {
      return await originalFetch.call(this, input, init);
    } finally {
      const elapsed = performance.now() - start;
      ctx.dbCalls += 1;
      ctx.dbTimeMs += elapsed;
      ctx.calls.push({ label: extractPostgrestLabel(urlStr), ms: elapsed });
    }
  };
}

// ── HOF ─────────────────────────────────────────────────────────────────────

type RouteHandler<TArgs extends unknown[]> = (...args: TArgs) => Promise<Response>;

/**
 * Wraps a Next.js route handler with C-1 performance instrumentation.
 *
 * Usage:
 *   async function handleGet(request: NextRequest) { … }
 *   export const GET = withCrmTrace('GET /api/customers', handleGet);
 *
 * When CRM_PERF_TRACE != 'true', returns the original handler unchanged.
 */
export function withCrmTrace<TArgs extends unknown[]>(
  routeName: string,
  handler: RouteHandler<TArgs>,
): RouteHandler<TArgs> {
  if (!isCrmPerfTraceEnabled()) {
    return handler;
  }

  ensureFetchInterceptor();

  return async function tracedHandler(...args: TArgs): Promise<Response> {
    // Extract query params from the first argument if it's a NextRequest.
    let params = '';
    const firstArg = args[0] as NextRequest | undefined;
    if (firstArg && typeof firstArg === 'object' && 'url' in firstArg) {
      try {
        const url = new URL(firstArg.url);
        params = url.search ? url.search.slice(1) : '';
      } catch {
        params = '';
      }
    }

    const ctx: TraceContext = {
      routeName,
      dbCalls: 0,
      dbTimeMs: 0,
      calls: [],
      startTime: performance.now(),
      params,
    };

    return traceStorage.run(ctx, async () => {
      let response: Response;
      try {
        response = await handler(...args);
      } catch (err) {
        logTrace(ctx, 500, 0, 0, 'error');
        throw err;
      }

      // Measure response payload without consuming the original stream.
      // response.clone() creates an independent copy that can be read separately.
      try {
        const cloned = response.clone();
        const text = await cloned.text();
        const payloadBytes = Buffer.byteLength(text, 'utf-8');
        const { rows, shape } = countRows(text);
        logTrace(ctx, response.status, payloadBytes, rows, shape);
      } catch {
        // If we can't read the body (e.g. streaming response), log what we have.
        logTrace(ctx, response.status, 0, 0, 'unreadable');
      }

      return response;
    });
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

interface RowCount {
  rows: number;
  shape: string;
}

/**
 * Best-effort row counter. Detects common CRM response shapes:
 *   - bare array            → rows = array.length
 *   - { leads: [...] }      → rows = leads.length
 *   - { entries: [...] }    → rows = entries.length
 *   - { assets: [...] }     → rows = assets.length
 *   - { jobs: [...] }       → rows = jobs.length
 *   - { customers: [...] }  → rows = customers.length
 *   - { invoices: [...] }   → rows = invoices.length
 *   - { employees: [...] }  → rows = employees.length
 *   - { items: [...] }      → rows = items.length
 *   - { data: [...] }       → rows = data.length
 *   - { pagination: { total } } + array → rows = array.length
 *   - single object         → rows = 1
 */
function countRows(bodyText: string): RowCount {
  if (!bodyText) return { rows: 0, shape: 'empty' };
  try {
    const data: unknown = JSON.parse(bodyText);
    if (Array.isArray(data)) {
      return { rows: data.length, shape: 'array' };
    }
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      const arrayKeys = [
        'leads', 'entries', 'assets', 'jobs', 'customers',
        'invoices', 'employees', 'items', 'data', 'results',
      ];
      for (const key of arrayKeys) {
        if (Array.isArray(obj[key])) {
          return { rows: (obj[key] as unknown[]).length, shape: `${key}[]` };
        }
      }
      if (obj.pagination && typeof obj.pagination === 'object') {
        return { rows: 1, shape: 'paginated-object' };
      }
      return { rows: 1, shape: 'object' };
    }
    return { rows: 0, shape: 'primitive' };
  } catch {
    return { rows: 0, shape: 'unparseable' };
  }
}

function logTrace(
  ctx: TraceContext,
  status: number,
  payloadBytes: number,
  rows: number,
  shape: string,
): void {
  const apiTotal = performance.now() - ctx.startTime;

  // db_sum = total across all calls (useful for seeing aggregate DB work).
  // db_max = slowest single call (the real floor for parallel calls).
  // db_min = fastest single call (context for variance).
  const dbSum = ctx.dbTimeMs;
  const dbMax = ctx.calls.length > 0
    ? Math.max(...ctx.calls.map((c) => c.ms))
    : 0;
  const dbMin = ctx.calls.length > 0
    ? Math.min(...ctx.calls.map((c) => c.ms))
    : 0;

  const paramsPart = ctx.params ? ` params={${ctx.params}}` : '';

  // Main line: includes db_sum AND db_max so parallel-call overhead is clear.
  // (api − db_sum is misleading for parallel calls; api − db_max ≈ overhead.)
  console.log(
    `[CRM-PERF] ${ctx.routeName} | ` +
      `api=${apiTotal.toFixed(1)}ms ` +
      `db_sum=${dbSum.toFixed(1)}ms ` +
      `db_max=${dbMax.toFixed(1)}ms ` +
      `db_min=${dbMin.toFixed(1)}ms ` +
      `dbCalls=${ctx.dbCalls} ` +
      `rows=${rows} ` +
      `payload=${formatBytes(payloadBytes)} ` +
      `shape=${shape} ` +
      `status=${status}` +
      paramsPart,
  );

  // Per-query breakdown line — only when there are DB calls to show.
  // Aggregates by label (multiple calls to the same table are summed + counted).
  if (ctx.calls.length > 0) {
    const byLabel = new Map<string, { ms: number; n: number; max: number }>();
    for (const c of ctx.calls) {
      const existing = byLabel.get(c.label);
      if (existing) {
        existing.ms += c.ms;
        existing.n += 1;
        if (c.ms > existing.max) existing.max = c.ms;
      } else {
        byLabel.set(c.label, { ms: c.ms, n: 1, max: c.ms });
      }
    }
    const parts = Array.from(byLabel.entries()).map(([label, v]) =>
      v.n > 1
        ? `${label}=${v.ms.toFixed(0)}ms×${v.n}(max${v.max.toFixed(0)})`
        : `${label}=${v.ms.toFixed(0)}ms`,
    );
    console.log(`[CRM-PERF]   queries: ${parts.join('  ')}`);
  }
}

/**
 * Extracts a human-readable label from a PostgREST URL.
 *
 * PostgREST URLs look like:
 *   https://<project>.supabase.co/rest/v1/Customer?select=...
 *   https://<project>.supabase.co/rest/v1/rpc/get_customer_timeline
 *
 * Returns "Customer", "rpc:get_customer_timeline", etc.
 * Falls back to "?" if the path can't be parsed.
 */
function extractPostgrestLabel(urlStr: string): string {
  try {
    // Find the path after the host — cheapest parse without full URL ctor.
    const hostIdx = urlStr.indexOf(SUPABASE_HOST);
    if (hostIdx < 0) return '?';
    const pathStart = urlStr.indexOf('/', hostIdx);
    if (pathStart < 0) return '?';
    const path = urlStr.slice(pathStart).split('?')[0];
    // path = /rest/v1/Customer  or  /rest/v1/rpc/func_name
    const segs = path.split('/').filter(Boolean); // ['rest','v1','Customer']
    // Find the segment after 'v1'
    const v1Idx = segs.indexOf('v1');
    if (v1Idx >= 0 && v1Idx + 1 < segs.length) {
      const next = segs[v1Idx + 1];
      if (next === 'rpc' && v1Idx + 2 < segs.length) {
        return `rpc:${segs[v1Idx + 2]}`;
      }
      return next;
    }
    return segs[segs.length - 1] || '?';
  } catch {
    return '?';
  }
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0B';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}
