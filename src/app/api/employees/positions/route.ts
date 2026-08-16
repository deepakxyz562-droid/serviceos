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
 * refresh presence badges:
 *   [{ id, latitude, longitude, lastSeenAt, status, currentJobId }]
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
 *     - selects only 6 scalar columns (no joins, no large blobs)
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

    // FIX C: Diagnostic log — includes email (not just id.slice(-8)) so the
    // dispatcher can self-verify which employees are in scope. Previously
    // only the last 8 chars of the cuid were logged, which made it look like
    // "xyz" was missing from the results when it was actually present as
    // "hfM08RbT" (the tail of I58eXzN1qCZMHo3RFhfM08RbT). Keeping this log
    // until live tracking is confirmed stable in production.
    const summary = rows.map((r: { id: string; email: string | null; lastSeenAt: string | null; latitude: unknown; longitude: unknown }) => ({
      id: r.id.slice(-8),
      email: r.email ?? '—',
      last: r.lastSeenAt ? Math.round((Date.now() - new Date(r.lastSeenAt).getTime()) / 1000) + 's' : 'null',
      hasCoords: r.latitude != null && r.longitude != null,
    }));
    console.log('[positions] user=' + authUser.email + ' scope=' + (isSuperAdmin ? 'super' : authUser.workspaceId ?? authUser.tenantId ?? 'none') + ' rows=' + rows.length, JSON.stringify(summary));

    return cachedJson(rows);
  } catch (error) {
    console.error('[employees/positions GET] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch positions' },
      { status: 500 },
    );
  }
}
