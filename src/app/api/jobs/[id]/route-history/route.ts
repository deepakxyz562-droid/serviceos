import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/jobs/[id]/route-history
 * -------------------------------
 * Returns the breadcrumb trail (RouteHistory.pathJson) for a job so the
 * Live Dispatch map can render an Uber-style polyline of the technician's
 * actual driven path — instead of the straight 2-point line currently
 * drawn by `live-dispatch-map.tsx`.
 *
 * Response shape:
 *   {
 *     jobId: string,
 *     active:     RouteHistoryDto | null,      // status === 'in_progress', most recent
 *     completed:  RouteHistoryDto[] | null,    // status === 'completed', most recent first, max 5
 *     destination: { latitude: number, longitude: number } | null  // from Job.latitude/longitude
 *   }
 *
 * Auth: any authenticated user (owner/admin/manager/employee). Employees
 * are restricted to their own jobs (defensive — the dispatch map is
 * admin-only anyway, but this guards against a curious employee probing
 * other jobs' route histories).
 */

// ─── Types ──────────────────────────────────────────────────────────────────

type PathPoint = {
  lat: number;
  lng: number;
  capturedAt: string;
  accuracy?: number | null;
};

type RouteHistoryDto = {
  id: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  startedAt: string;
  endedAt: string | null;
  startLat: number | null;
  startLng: number | null;
  endLat: number | null;
  endLng: number | null;
  distanceMeters: number;
  durationMinutes: number;
  path: PathPoint[];
  pointCount: number;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Parse a RouteHistory.pathJson string into a sorted, validated array of
 * path points. Drops any point missing `lat` or `lng` (or with non-numeric
 * values) and sorts ascending by `capturedAt` so the polyline draws in
 * chronological order (oldest first).
 *
 * Returns `[]` on any parse failure or if no valid points remain.
 */
function parsePathJson(pathJson: string | null | undefined): PathPoint[] {
  if (!pathJson) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(pathJson);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const points: PathPoint[] = [];
  for (const raw of parsed) {
    if (!raw || typeof raw !== 'object') continue;
    const p = raw as Record<string, unknown>;
    const lat = typeof p.lat === 'number' ? p.lat : Number(p.lat);
    const lng = typeof p.lng === 'number' ? p.lng : Number(p.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const capturedAt =
      typeof p.capturedAt === 'string' ? p.capturedAt : new Date().toISOString();
    const accuracy =
      typeof p.accuracy === 'number'
        ? p.accuracy
        : p.accuracy == null
          ? null
          : Number(p.accuracy);
    points.push({
      lat,
      lng,
      capturedAt,
      accuracy: Number.isFinite(accuracy as number) ? (accuracy as number) : null,
    });
  }

  // Sort ascending by capturedAt (oldest first) so the polyline draws in
  // chronological order. Stable sort preserves insertion order on ties.
  points.sort((a, b) => {
    const ta = new Date(a.capturedAt).getTime();
    const tb = new Date(b.capturedAt).getTime();
    if (isNaN(ta) && isNaN(tb)) return 0;
    if (isNaN(ta)) return 1;
    if (isNaN(tb)) return -1;
    return ta - tb;
  });

  return points;
}

/**
 * Map a raw RouteHistory row (Prisma) to the client-facing DTO.
 */
function toDto(row: {
  id: string;
  status: string;
  startedAt: Date;
  endedAt: Date | null;
  startLat: number | null;
  startLng: number | null;
  endLat: number | null;
  endLng: number | null;
  distanceMeters: number;
  durationMinutes: number;
  pathJson: string;
}): RouteHistoryDto {
  const path = parsePathJson(row.pathJson);
  const status: RouteHistoryDto['status'] =
    row.status === 'completed' || row.status === 'cancelled'
      ? row.status
      : 'in_progress';
  return {
    id: row.id,
    status,
    startedAt: row.startedAt instanceof Date ? row.startedAt.toISOString() : new Date(row.startedAt).toISOString(),
    endedAt: row.endedAt
      ? row.endedAt instanceof Date
        ? row.endedAt.toISOString()
        : new Date(row.endedAt).toISOString()
      : null,
    startLat: row.startLat,
    startLng: row.startLng,
    endLat: row.endLat,
    endLng: row.endLng,
    distanceMeters: row.distanceMeters ?? 0,
    durationMinutes: row.durationMinutes ?? 0,
    path,
    pointCount: path.length,
  };
}

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 1. Auth — any authenticated user.
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: jobId } = await params;

    // 2. Fetch the Job — confirm it exists and pull lat/lng for `destination`.
    // Also pull `assigneeId` so we can enforce the employee-owns-job check.
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        assigneeId: true,
        latitude: true,
        longitude: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 3. Defensive authorization: employees can only see route history for
    // jobs assigned to them. The dispatch map is admin-only, but this
    // prevents a curious employee from probing other jobs' breadcrumbs.
    if (
      authUser.role === 'employee' &&
      authUser.employeeId &&
      job.assigneeId &&
      job.assigneeId !== authUser.employeeId
    ) {
      return NextResponse.json(
        { error: 'Forbidden: you can only view route history for your own jobs' },
        { status: 403 },
      );
    }

    // 4. Fetch the ACTIVE route (status === 'in_progress'), most recent first.
    // `findFirst` intrinsically limits to 1 row.
    let activeRoute: Awaited<ReturnType<typeof db.routeHistory.findFirst>> | null = null;
    try {
      activeRoute = await db.routeHistory.findFirst({
        where: { jobId, status: 'in_progress' },
        orderBy: { startedAt: 'desc' },
      });
    } catch {
      // RouteHistory table might not exist yet in some environments — treat
      // as "no active route" rather than 500'ing the whole endpoint.
      activeRoute = null;
    }

    // 5. Fetch up to 5 COMPLETED routes, most recent first.
    let completedRows: Awaited<ReturnType<typeof db.routeHistory.findMany>> = [];
    try {
      completedRows = await db.routeHistory.findMany({
        where: { jobId, status: 'completed' },
        orderBy: { startedAt: 'desc' },
        take: 5,
      });
    } catch {
      completedRows = [];
    }

    // 6. Assemble response. `destination` is null when the job has no
    // geocoded lat/lng (the dispatch map shows "⚠ Location unavailable").
    const destination =
      job.latitude != null && job.longitude != null
        ? { latitude: job.latitude, longitude: job.longitude }
        : null;

    return NextResponse.json({
      jobId: job.id,
      active: activeRoute ? toDto(activeRoute) : null,
      completed: completedRows.length > 0 ? completedRows.map(toDto) : null,
      destination,
    });
  } catch (error) {
    console.error('[route-history GET] unexpected error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: 'Failed to fetch route history',
        ...(process.env.NODE_ENV !== 'production' ? { message } : {}),
      },
      { status: 500 },
    );
  }
}
