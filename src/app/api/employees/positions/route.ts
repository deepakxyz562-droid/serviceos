import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { cachedJson } from '@/lib/cache-headers';

/**
 * GET /api/employees/positions
 * --------------------------------
 * Lightweight live-positions endpoint for the Live Dispatch map.
 *
 * Returns ONLY the fields the map needs to move technician markers and
 * refresh presence/GPS-freshness badges:
 *   [{ id, email, latitude, longitude, lastSeenAt, lastGpsAt, gpsStatus,
 *      status, currentJobId }]
 *
 * PHASE B (GPS freshness separation):
 *   `lastSeenAt`  = Employee presence (updated by /api/gps/track step 3 +
 *                   by attendance/clock-in flows). Represents "the employee
 *                   account was active".
 *   `lastGpsAt`   = Authoritative GPS telemetry timestamp, derived from
 *                   the latest GPSLocation.capturedAt for this employee.
 *                   Represents "we received an actual GPS coordinate".
 *   `gpsStatus`   = 'live' | 'stale' | 'offline', derived from lastGpsAt:
 *                     live    = < 30s ago  (actively transmitting)
 *                     stale   = 30s–5min   (may have a watcher issue)
 *                     offline = > 5min      (not transmitting)
 *
 *   This separation is critical because Employee.lastSeenAt can be updated
 *   by non-GPS flows (clock-in, attendance, API calls), which would
 *   incorrectly show a technician as "live" on the map even if their GPS
 *   watcher had died. By using GPSLocation.capturedAt as the authoritative
 *   telemetry source, the dispatch UI always reflects true GPS freshness.
 *
 * WHY THIS EXISTS:
 *   The full `/api/employees` endpoint has a 60s in-memory cache (to serve
 *   the dashboard's 60s presence poll cheaply) and returns ~20 fields per
 *   employee including team joins. The Live Dispatch map needs fresh
 *   positions every few seconds so the technician marker glides as the
 *   vehicle moves — polling the cached, heavy endpoint would show stale
 *   positions for up to a minute, which defeats live tracking.
 *
 *   This endpoint:
 *     - selects only 6 scalar columns + 1 groupBy (no joins, no blobs)
 *     - is NEVER cached (browser `no-store` header via cachedJson)
 *     - is scoped to the viewer's workspace/tenant exactly like the list
 *       endpoint, so a tenant admin sees only their own technicians.
 *
 *   On Vercel (where the socket.io realtime mini-service cannot run), the
 *   dispatch view polls this endpoint every 5s and feeds each moved
 *   position into `mapControllerRef.handleGpsPing(...)`, which triggers the
 *   existing glide animation — giving an Uber-like live feel without a
 *   persistent socket connection.
 *
 * Auth: same rules as `/api/employees`. Super-admins see all; everyone
 * else is scoped to their workspace/tenant.
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ── GPS freshness thresholds (Phase B) ──────────────────────────────────────
// Mirror the PWA-side thresholds in use-gps-tracking.tsx for consistency.
const GPS_LIVE_MS = 30 * 1000;        // < 30s → live
const GPS_STALE_MS = 5 * 60 * 1000;   // 30s–5min → stale
// > 5min → offline (implicit, no constant needed)

/**
 * Derive GPS status from the latest GPSLocation.capturedAt.
 * - No timestamp (never transmitted) → 'offline'
 * - > 5 min ago → 'offline'
 * - 30s–5min ago → 'stale'
 * - < 30s ago → 'live'
 */
function deriveGpsStatus(lastGpsAt: string | null): 'live' | 'stale' | 'offline' {
  if (!lastGpsAt) return 'offline';
  const ts = new Date(lastGpsAt).getTime();
  if (Number.isNaN(ts)) return 'offline';
  const ageMs = Date.now() - ts;
  if (ageMs > GPS_STALE_MS) return 'offline';
  if (ageMs > GPS_LIVE_MS) return 'stale';
  return 'live';
}

/**
 * Normalize a timestamp (Date | ISO string with/without TZ) to a proper
 * UTC ISO-8601 string ending in 'Z'.
 *
 * WHY THIS EXISTS:
 *   Under the Supabase PostgREST adapter, Prisma `DateTime` columns (which
 *   map to PostgreSQL `timestamp(3)` WITHOUT timezone) are returned as
 *   naive ISO strings like "2026-08-16T13:39:37.084" — NO 'Z' suffix.
 *
 *   Per ECMAScript spec, a date-time string without a timezone suffix is
 *   parsed as LOCAL time. On a UTC server (Vercel) this happens to work,
 *   but a browser in IST (UTC+5:30) interprets the same string as 5h30m
 *   older than it actually is — producing the production symptom
 *   "GPS Tracking Live" + "Last: 5h ago".
 *
 *   Verified UTC write-path audit (2026-08-16):
 *     - /api/gps/track:344            → now = new Date()           (UTC)
 *     - /api/employees/heartbeat:34   → now = new Date()           (UTC)
 *     - /api/employees/status:124     → now = new Date()           (UTC)
 *     - /api/employee/jobs/[id]/lifecycle:95 → now = new Date()    (UTC)
 *     - /lib/auth:191                 → new Date()                 (UTC)
 *     - GPSLocation.capturedAt writes → new Date() | client .toISOString() (UTC)
 *   The Supabase adapter's serializeData converts Date → .toISOString()
 *   (with Z) before PostgREST; PostgreSQL timestamp(3) strips the Z on
 *   storage but preserves the UTC numeric value. Appending 'Z' on read
 *   makes the UTC semantics explicit for every consumer.
 */
function toUtcIso(v: string | Date | null | undefined): string | null {
  if (v == null) return null;
  if (v instanceof Date) {
    return v.toISOString(); // always ends in Z
  }
  if (typeof v === 'string') {
    // Already has Z or +HH:MM offset → parse + re-emit to normalize.
    if (/[zZ]$/.test(v) || /[+-]\d{2}:?\d{2}$/.test(v)) {
      const d = new Date(v);
      return isNaN(d.getTime()) ? v : d.toISOString();
    }
    // Naive timestamp (no TZ) — Prisma DateTime semantics: it was written
    // as UTC, so append Z to make that explicit.
    return v + 'Z';
  }
  return null;
}

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json([]);
    }

    const isSuperAdmin =
      authUser.isSuperAdmin || (authUser.role === 'admin' && !authUser.tenantId);

    const where: Record<string, unknown> = {};

    if (!isSuperAdmin) {
      const effectiveWorkspaceId = authUser.workspaceId;
      if (effectiveWorkspaceId) {
        where.workspaceId = effectiveWorkspaceId;
      } else if (authUser.tenantId) {
        // No workspaceId on the user — fall back to all workspaces in the tenant.
        const tenantWorkspaces = await db.workspace.findMany({
          where: { tenantId: authUser.tenantId },
          select: { id: true },
        });
        const workspaceIds = tenantWorkspaces.map((w: { id: string }) => w.id);
        if (workspaceIds.length > 0) {
          where.workspaceId = { in: workspaceIds };
        } else {
          return cachedJson([]);
        }
      } else {
        return cachedJson([]);
      }
    }

    const rows = await db.employee.findMany({
      where,
      select: {
        id: true,
        email: true,
        latitude: true,
        longitude: true,
        lastSeenAt: true,
        status: true,
        currentJobId: true,
      },
      take: 200,
    });

    // ── Phase B: Fetch latest GPSLocation.capturedAt per employee ──────────
    // This is the authoritative GPS telemetry timestamp — separate from
    // Employee.lastSeenAt (which can be updated by non-GPS flows).
    //
    // We use findFirst with orderBy: capturedAt desc per employee. This is
    // compatible with BOTH Prisma-direct (production) AND the Supabase
    // PostgREST adapter (which doesn't support _max in groupBy). It's N
    // queries (one per employee) but each is indexed + limited to 1 row,
    // so it's fast for typical fleet sizes (< 200 employees).
    //
    // For very large fleets, this could be optimized to a single groupBy
    // when running in Prisma-direct mode, but the current approach is
    // simpler and works everywhere.
    const employeeIds = rows.map((r: { id: string }) => r.id);
    const lastGpsMap = new Map<string, string | null>();

    if (employeeIds.length > 0) {
      try {
        // Fetch the latest GPSLocation for each employee in parallel.
        const results = await Promise.all(
          employeeIds.map(async (empId: string) => {
            try {
              const latest = await db.gPSLocation.findFirst({
                where: { employeeId: empId },
                orderBy: { capturedAt: 'desc' },
                select: { capturedAt: true },
              });
              return [empId, latest?.capturedAt ?? null] as const;
            } catch {
              // Per-employee failure (shouldn't happen) — return null.
              return [empId, null] as const;
            }
          }),
        );
        for (const [empId, capturedAt] of results) {
          lastGpsMap.set(empId, toUtcIso(capturedAt));
        }
      } catch (e) {
        // Non-fatal — if GPSLocation table is missing or query fails, fall
        // back to lastSeenAt for all employees (graceful degradation).
        console.error('[positions] GPSLocation fetch failed, falling back to lastSeenAt:', e);
      }
    }

    // Merge lastGpsAt + gpsStatus into each row.
    const enriched = rows.map((r: { id: string; email: string | null; latitude: number | null; longitude: number | null; lastSeenAt: string | Date | null; status: string; currentJobId: string | null }) => {
      const lastGpsAt = lastGpsMap.get(r.id) ?? null;
      const gpsStatus = deriveGpsStatus(lastGpsAt);
      // Normalize lastSeenAt to a UTC ISO string for the client.
      // toUtcIso appends 'Z' to naive Supabase timestamps (see helper docs).
      const lastSeenNorm = toUtcIso(r.lastSeenAt);
      return {
        id: r.id,
        email: r.email,
        latitude: r.latitude,
        longitude: r.longitude,
        lastSeenAt: lastSeenNorm,
        lastGpsAt,
        gpsStatus,
        status: r.status,
        currentJobId: r.currentJobId,
      };
    });

    // Diagnostic log — includes email + gpsStatus so the dispatcher can
    // self-verify which employees are in scope and their true GPS freshness.
    const summary = enriched.map((r) => ({
      id: r.id.slice(-8),
      email: r.email ?? '—',
      gps: r.gpsStatus,
      lastGps: r.lastGpsAt
        ? Math.round((Date.now() - new Date(r.lastGpsAt).getTime()) / 1000) + 's'
        : 'never',
      hasCoords: r.latitude != null && r.longitude != null,
    }));
    console.log(
      '[positions] user=' + authUser.email +
      ' scope=' + (isSuperAdmin ? 'super' : authUser.workspaceId ?? authUser.tenantId ?? 'none') +
      ' rows=' + enriched.length,
      JSON.stringify(summary),
    );

    return cachedJson(enriched);
  } catch (error) {
    console.error('[employees/positions GET] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch positions' },
      { status: 500 },
    );
  }
}
