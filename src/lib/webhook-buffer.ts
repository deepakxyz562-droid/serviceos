// Webhook test request buffer.
//
// Primary store: database (WebhookTestRequest table) — survives across
// Next.js route handlers and is shared between the ingest route
// (/api/webhook-test/[path]) and the polling route (/api/webhook-test-requests).
//
// Fallback store: in-memory Map (globalThis-persisted). Used when the DB
// table doesn't exist (e.g. on a fresh Supabase deployment where the
// migration hasn't been applied yet) so the "Listen for test event" feature
// still works. Without this fallback, addWebhookRequest silently swallows
// the DB error and the polling endpoint always returns [] — which is
// exactly the bug users hit on production.

import { db } from '@/lib/db';

interface WebhookRequest {
  id: string;
  path: string;
  method: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body: unknown;
  receivedAt: string;
  contentType: string;
}

const MAX_BUFFER_PER_PATH = 50;
const EVENT_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ── In-memory fallback store (shared across HMR / route handlers) ──────────
const globalForBuffer = globalThis as unknown as {
  __webhookBufferFallback?: Map<string, WebhookRequest[]>;
};

function getFallbackStore(): Map<string, WebhookRequest[]> {
  if (!globalForBuffer.__webhookBufferFallback) {
    globalForBuffer.__webhookBufferFallback = new Map();
  }
  return globalForBuffer.__webhookBufferFallback;
}

function pruneFallback(store: Map<string, WebhookRequest[]>, path: string): void {
  const events = store.get(path);
  if (!events) return;
  const now = Date.now();
  const fresh = events.filter((e) => {
    try {
      return now - new Date(e.receivedAt).getTime() < EVENT_TTL_MS;
    } catch {
      return false;
    }
  });
  // Keep only the most recent MAX_BUFFER_PER_PATH
  const trimmed = fresh.slice(-MAX_BUFFER_PER_PATH);
  store.set(path, trimmed);
}

function pushToFallback(request: WebhookRequest): void {
  const store = getFallbackStore();
  const events = store.get(request.path) || [];
  events.push(request);
  store.set(request.path, events);
  pruneFallback(store, request.path);
}

function readFromFallback(path: string, since?: string): WebhookRequest[] {
  const store = getFallbackStore();
  const events = store.get(path) || [];
  const sinceMs = since ? new Date(since).getTime() : 0;
  return events
    .filter((e) => {
      try {
        return new Date(e.receivedAt).getTime() > sinceMs;
      } catch {
        return false;
      }
    })
    .reverse(); // most recent first, to match DB ordering
}

function clearFallback(path: string): void {
  const store = getFallbackStore();
  store.delete(path);
}

// ── DB-backed primary store (with fallback on failure) ─────────────────────

export async function addWebhookRequest(request: WebhookRequest): Promise<void> {
  // Always push to the in-memory fallback first so the polling endpoint can
  // pick it up even if the DB write fails. This makes the "Listen for test
  // event" feature resilient to missing tables / DB connectivity issues.
  pushToFallback(request);

  try {
    await db.webhookTestRequest.create({
      data: {
        path: request.path,
        method: request.method,
        headersJson: JSON.stringify(request.headers),
        queryParamsJson: JSON.stringify(request.queryParams),
        bodyJson: request.body != null ? JSON.stringify(request.body) : null,
        contentType: request.contentType,
        receivedAt: new Date(request.receivedAt),
      },
    });

    // Prune old requests (keep only last MAX_BUFFER_PER_PATH per path)
    const allForPath = await db.webhookTestRequest.findMany({
      where: { path: request.path },
      orderBy: { receivedAt: 'desc' },
      select: { id: true },
    });

    if (allForPath.length > MAX_BUFFER_PER_PATH) {
      const idsToDelete = allForPath.slice(MAX_BUFFER_PER_PATH).map((r) => r.id);
      await db.webhookTestRequest.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }
  } catch (error) {
    // DB write failed (table missing, connection issue, etc.) — the request
    // is already in the in-memory fallback, so the polling endpoint will
    // still return it. Log for debugging but don't throw.
    console.error('[WebhookBuffer] DB write failed (using in-memory fallback):', error);
  }
}

export async function getWebhookRequests(
  path: string,
  since?: string,
): Promise<WebhookRequest[]> {
  // Try DB first
  let dbRequests: WebhookRequest[] = [];
  try {
    const where: { path: string; receivedAt?: { gt: Date } } = { path };
    if (since) {
      where.receivedAt = { gt: new Date(since) };
    }

    const records = await db.webhookTestRequest.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      take: 50,
    });

    dbRequests = records.map((r) => ({
      id: r.id,
      path: r.path,
      method: r.method,
      headers: JSON.parse(r.headersJson || '{}'),
      queryParams: JSON.parse(r.queryParamsJson || '{}'),
      body: r.bodyJson ? JSON.parse(r.bodyJson) : null,
      receivedAt: r.receivedAt.toISOString(),
      contentType: r.contentType,
    }));
  } catch (dbError) {
    // DB read failed (table missing, etc.) — will rely on in-memory fallback.
    console.error('[WebhookBuffer] DB read failed (using in-memory fallback):', dbError);
  }

  // Always also check the in-memory fallback — it captures requests that
  // were received but couldn't be persisted to the DB (e.g. missing table).
  // Merge both sources, dedupe by a composite key (the DB and in-memory store
  // use different ID schemes for the same request: DB uses cuid(), in-memory
  // uses the requestId from the ingest route, so ID-based dedup isn't enough).
  // Dedupe by (method + receivedAt + body) which uniquely identifies a request.
  const fallback = readFromFallback(path, since);
  const merged = [...dbRequests, ...fallback];
  const seen = new Set<string>();
  const deduped = merged.filter((r) => {
    const bodyKey = r.body ? JSON.stringify(r.body) : '';
    const key = `${r.method}|${r.receivedAt}|${bodyKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  deduped.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  return deduped.slice(0, 50);
}

export async function clearWebhookRequests(path: string): Promise<void> {
  // Clear both stores for consistency
  clearFallback(path);
  try {
    await db.webhookTestRequest.deleteMany({ where: { path } });
  } catch (error) {
    console.error('[WebhookBuffer] DB clear failed (in-memory cleared):', error);
  }
}
