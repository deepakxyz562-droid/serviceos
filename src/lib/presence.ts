/**
 * Tenant presence helpers (server-side only).
 *
 * A tenant is "online" if at least one of its users (admin/agent) is
 * currently connected to the realtime socket.io service AND has sent a
 * heartbeat within the last 2 minutes — OR made any authenticated API
 * request within the last 2 minutes.
 *
 * Source of truth:
 *   1. `AgentMonitor.lastActivityAt` — updated by:
 *        - the realtime service's heartbeat handler (socket.io `heartbeat`
 *          event from the browser)
 *        - the realtime service's disconnect + cleanup handlers (sets to
 *          offline + lastActivityAt=now)
 *        - `recordUserActivity()` (below) — called from `getAuthUser()` on
 *          every authenticated API request as a heartbeat fallback.
 *   2. `User.lastActivityAt` — fallback when no `AgentMonitor` rows exist
 *      for the tenant (e.g. seed-only tenants that have never had a socket
 *      connect). Also updated by `recordUserActivity()`.
 *
 * The realtime service's in-memory `onlineTenants` map is the FAST signal
 * (no DB round-trip), but it lives in a separate Bun process and isn't
 * directly readable from here. The Next.js `/api/presence/status` route
 * queries it via `GET /presence/:tenantId` over HTTP (internal secret) and
 * combines the answer with this DB-backed check. The DB check alone is the
 * durable signal — if the realtime service is down or restarted, the DB row
 * still reflects the last known activity.
 *
 * IMPORTANT: This module uses the `@/lib/db` alias and Prisma client —
 * NEVER import it from a client component. It's intended for use in
 * Next.js route handlers, server actions, and `getAuthUser()` only.
 */

import { db } from '@/lib/db';

const PRESENCE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
type DayKey = (typeof DAY_KEYS)[number];

interface BusinessHoursDay {
  open?: string;
  close?: string;
  enabled?: boolean;
}
type BusinessHoursJson = Partial<Record<DayKey, BusinessHoursDay>>;

/**
 * Check if a tenant has at least one user online right now.
 *
 * Decision tree (fail-safe — returns `false` if anything errors so the
 * auto-reply fires):
 *   1. If `respectBusinessHours` and the tenant is outside business hours,
 *      return false (auto-reply fires even if a user is technically online
 *      at 2am).
 *   2. Look for any `AgentMonitor` row with `lastActivityAt` within the
 *      threshold — if found, return true.
 *   3. If no `AgentMonitor` rows exist for the tenant AT ALL, fall back to
 *      `User.lastActivityAt` within the threshold (covers users who made
 *      API requests recently but never had a socket heartbeat).
 *   4. Otherwise return false.
 *
 * @param tenantId The tenant to check.
 * @param options.respectBusinessHours If true, parse `Tenant.businessHoursJson`
 *   and return false when current time (UTC) is outside the configured hours.
 *   Parse errors are swallowed — we never block presence on a malformed
 *   business-hours blob.
 */
export async function isTenantOnline(
  tenantId: string,
  options?: { respectBusinessHours?: boolean },
): Promise<boolean> {
  if (!tenantId) return false;

  try {
    // 1. Business hours check (optional).
    if (options?.respectBusinessHours) {
      const withinHours = await isWithinBusinessHours(tenantId);
      if (withinHours === false) {
        // Outside business hours — tenant is "offline" for auto-reply.
        return false;
      }
      // If we couldn't determine business hours (parse error, missing row,
      // empty JSON), `withinHours` is `null` — fall through to the activity
      // check rather than blocking presence.
    }

    const cutoff = new Date(Date.now() - PRESENCE_THRESHOLD_MS);

    // 2. AgentMonitor — the realtime / API-activity signal.
    const recentAgent = await db.agentMonitor.findFirst({
      where: {
        tenantId,
        lastActivityAt: { gt: cutoff },
      },
      select: { id: true },
    });
    if (recentAgent) return true;

    // 3. Fallback: User.lastActivityAt (only meaningful if no AgentMonitor
    //    rows exist for the tenant at all — otherwise the realtime service
    //    would have created one for any socket-connected user).
    const agentCount = await db.agentMonitor.count({ where: { tenantId } });
    if (agentCount === 0) {
      const recentUser = await db.user.findFirst({
        where: {
          tenantId,
          lastActivityAt: { gt: cutoff },
        },
        select: { id: true },
      });
      if (recentUser) return true;
    }

    return false;
  } catch (err) {
    // Fail-safe: if we can't determine presence, treat as offline so the
    // auto-reply fires (a missed "we're away" message is worse than a
    // redundant one).
    console.warn(
      '[presence] isTenantOnline error:',
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}

/**
 * Record that a user made an API request. Fire-and-forget — never throws.
 *
 * Updates BOTH:
 *   - `User.lastActivityAt` (the fallback signal used by `isTenantOnline`
 *     when no `AgentMonitor` rows exist)
 *   - `AgentMonitor.lastActivityAt` + `status='online'` (the realtime signal
 *     shared with the socket.io service)
 *
 * `AgentMonitor` has no unique constraint on `[tenantId, agentId]`, so we
 * use `findFirst` + `update` / `create` rather than `upsert`.
 *
 * Intended to be called from `getAuthUser()` on every authenticated API
 * request. Cheap (two indexed lookups) and async — the request handler
 * never awaits it.
 */
export function recordUserActivity(userId: string, tenantId: string): void {
  if (!userId || !tenantId) return;

  const now = new Date();

  // Fire-and-forget — do NOT await. The caller (getAuthUser) must not block
  // on DB I/O for presence tracking.
  (async () => {
    try {
      // Update User.lastActivityAt (fallback signal).
      await db.user.update({
        where: { id: userId },
        data: { lastActivityAt: now },
      }).catch(() => {
        // User row might not exist (e.g. customer session with cust_ prefix
        // already stripped). Non-fatal.
      });

      // Upsert AgentMonitor (primary signal).
      const existing = await db.agentMonitor.findFirst({
        where: { tenantId, agentId: userId },
        select: { id: true },
      });
      if (existing) {
        await db.agentMonitor.update({
          where: { id: existing.id },
          data: { lastActivityAt: now, status: 'online' },
        });
      } else {
        await db.agentMonitor.create({
          data: {
            agentId: userId,
            tenantId,
            status: 'online',
            lastActivityAt: now,
          },
        });
      }
    } catch (err) {
      console.warn(
        '[presence] recordUserActivity error:',
        err instanceof Error ? err.message : err,
      );
    }
  })();
}

/**
 * Get the set of tenant IDs that currently have at least one online user.
 *
 * Used for bulk operations (e.g. routing inbound messages only to tenants
 * that are online, or showing an admin dashboard of currently-active
 * tenants).
 */
export async function getOnlineTenants(): Promise<Set<string>> {
  try {
    const cutoff = new Date(Date.now() - PRESENCE_THRESHOLD_MS);
    const rows = await db.agentMonitor.findMany({
      where: { lastActivityAt: { gt: cutoff } },
      select: { tenantId: true },
      distinct: ['tenantId'],
    });
    const set = new Set<string>();
    for (const r of rows) {
      if (r.tenantId) set.add(r.tenantId);
    }
    return set;
  } catch (err) {
    console.warn(
      '[presence] getOnlineTenants error:',
      err instanceof Error ? err.message : err,
    );
    return new Set();
  }
}

// ── Business hours ───────────────────────────────────────────────────────

/**
 * Check if "now" (UTC) is within the tenant's configured business hours.
 *
 * Returns:
 *   - `true` if within hours (or if business hours are unset / malformed and
 *     we should fall through to the activity check).
 *   - `false` if explicitly outside business hours.
 *   - `null` if business hours are missing/unparseable (caller should fall
 *     through rather than block presence).
 *
 * The Tenant model has no `timezone` field, so we use UTC. The
 * `businessHoursJson` shape is:
 *   `{ mon: { open: "09:00", close: "17:00", enabled: true }, tue: {...}, ... }`
 * with day abbreviations: sun/mon/tue/wed/thu/fri/sat.
 */
async function isWithinBusinessHours(tenantId: string): Promise<boolean | null> {
  try {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { businessHoursJson: true },
    });
    if (!tenant) return null;

    const parsed = safelyParseBusinessHours(tenant.businessHoursJson);
    if (!parsed) return null;

    const now = new Date();
    // Tenant has no timezone field — use UTC.
    const dayKey = DAY_KEYS[now.getUTCDay()];
    const dayConfig = parsed[dayKey];
    if (!dayConfig || dayConfig.enabled === false) {
      // Closed today.
      return false;
    }
    const { open, close } = dayConfig;
    if (!open || !close) {
      // Incomplete config — don't block presence.
      return null;
    }
    const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const openMinutes = parseHHMM(open);
    const closeMinutes = parseHHMM(close);
    if (openMinutes === null || closeMinutes === null) {
      return null;
    }
    // Support overnight ranges (e.g. open=22:00, close=02:00).
    if (openMinutes <= closeMinutes) {
      return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
    }
    return nowMinutes >= openMinutes || nowMinutes < closeMinutes;
  } catch (err) {
    console.warn(
      '[presence] isWithinBusinessHours error:',
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

function safelyParseBusinessHours(raw: string | null | undefined): BusinessHoursJson | null {
  if (!raw || typeof raw !== 'string' || raw.trim() === '' || raw.trim() === '{}') {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as BusinessHoursJson;
  } catch {
    return null;
  }
}

function parseHHMM(value: string): number | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}
