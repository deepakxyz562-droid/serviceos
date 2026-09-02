import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { cachedJson } from '@/lib/cache-headers';
import { LOCATION_FRESHNESS, deriveGpsStatus as deriveGpsStatusShared } from '@/lib/gps-freshness';

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

// ── GPS freshness thresholds (Phase F-3) ────────────────────────────────────
// Now sourced from the unified contract in src/lib/gps-freshness.ts so the
// positions API, the PWA, and the dispatch map all agree on live/stale/offline.

// Re-export the shared derivation for backward compat with the rest of this
// file (which calls `deriveGpsStatus(lastGpsAt)` directly).
function deriveGpsStatus(lastGpsAt: string | null): 'live' | 'stale' | 'offline' {
  return deriveGpsStatusShared(lastGpsAt);
}

// Keep the old constants as aliases for any inline use in this file.
const GPS_LIVE_MS = LOCATION_FRESHNESS.LIVE_MS;
const GPS_STALE_MS = LOCATION_FRESHNESS.STALE_MS;

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
        // Phase F-2: lastLocationAt is written ONLY by the GPS ping path
        // (/api/gps/track line 431 + /api/employees/heartbeat line 111 when
        // coords are provided). It's the authoritative GPS telemetry timestamp
        // on the Employee row itself — so we can read it directly instead of
        // running N separate GPSLocation.findFirst queries (the old N+1).
        // Falls back to null for legacy employees who never had a GPS ping.
        lastLocationAt: true,
        status: true,
        currentJobId: true,
      },
      take: 200,
    });

    // ── Phase F-2: Eliminate the N+1 query ──────────────────────────────
    // Previously this ran N `GPSLocation.findFirst` queries (one per employee)
    // to get the latest GPS timestamp — ~201 DB queries per 5s poll for 200
    // employees. Now we read `Employee.lastLocationAt` directly (already on
    // the row, already written by every GPS ping). This collapses the N+1 to
    // a single employee query.
    //
    // The GPSLocation table is still the source of truth for raw telemetry
    // history — but for "where is the technician RIGHT NOW", lastLocationAt
    // is equivalent and ~200x cheaper to read.
    const lastGpsMap = new Map<string, string | null>();
    const missingLastLocationAt: string[] = [];

    for (const r of rows as Array<{ id: string; lastLocationAt: string | Date | null }>) {
      const lastGpsAt = r.lastLocationAt;
      if (lastGpsAt) {
        lastGpsMap.set(r.id, toUtcIso(lastGpsAt));
      } else {
        // Legacy employee with no lastLocationAt — collect for a single
        // batched fallback query (rare; only employees who never sent a GPS
        // ping). Kept as a safety net so we never show 'offline' for an
        // employee who actually has GPS history but a null lastLocationAt.
        missingLastLocationAt.push(r.id);
      }
    }

    // Fallback: for employees without lastLocationAt, do ONE batched query
    // (not N) to find their latest GPSLocation. This is rare and only runs
    // for employees who never pinged (or whose lastLocationAt column was
    // somehow null). For a healthy fleet this loop is a no-op.
    if (missingLastLocationAt.length > 0) {
      try {
        const fallbackRows = await db.gPSLocation.findMany({
          where: { employeeId: { in: missingLastLocationAt } },
          orderBy: { capturedAt: 'desc' },
          // Take the latest per employee — we dedupe client-side since PostgREST
          // doesn't support DISTINCT ON. Capped at 1 row per missing employee.
          take: missingLastLocationAt.length,
          select: { employeeId: true, capturedAt: true },
        });
        const seen = new Set<string>();
        for (const g of fallbackRows) {
          if (seen.has(g.employeeId)) continue;
          seen.add(g.employeeId);
          lastGpsMap.set(g.employeeId, toUtcIso(g.capturedAt));
        }
      } catch (e) {
        // Non-fatal — fall back to 'offline' for these employees.
        console.error('[positions] fallback GPSLocation fetch failed:', e);
      }
    }

    // Merge lastGpsAt + gpsStatus into each row.
    const enriched = rows.map((r: { id: string; email: string | null; latitude: number | null; longitude: number | null; lastSeenAt: string | Date | null; lastLocationAt: string | Date | null; status: string; currentJobId: string | null }) => {
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
