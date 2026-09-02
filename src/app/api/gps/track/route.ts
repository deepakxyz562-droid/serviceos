import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { EventBus } from '@/lib/event-bus';
import { getAuthUser } from '@/lib/auth';

/**
 * GPS Tracking
 * ------------
 *   POST /api/gps/track
 *      body: { employeeId, jobId?, latitude, longitude, accuracy?, heading?,
 *              speed?, altitude?, batteryLevel?, isMoving? }
 *      → creates a GPSLocation record. If there's an in-progress RouteHistory
 *        for this employee+job, appends to its pathJson + updates endLat/endLng.
 *
 *   GET  /api/gps/track?employeeId=<id>
 *      → most recent GPSLocation for the employee (for the admin map).
 */

function safeParseJson<T>(str: string | null | undefined, fallback: T): T {
  try {
    return str ? (JSON.parse(str) as T) : fallback;
  } catch {
    return fallback;
  }
}

interface PathPoint {
  lat: number;
  lng: number;
  capturedAt: string;
  accuracy?: number | null;
}

/**
 * Haversine distance (meters) between two lat/lng points.
 */
function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000; // Earth radius, meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Resolve the tenantId for a GPS ping.
 *
 * Priority:
 *   1. The employee's workspace.tenantId (most accurate — the workspace owns
 *      the employee).
 *   2. The User record linked to this employee (authUser.tenantId / user.tenantId).
 *      Handles employees whose workspaceId is null or whose workspace has no
 *      tenantId (schema drift on legacy Supabase deployments).
 *   3. null — the caller must NOT write 'unknown' to the DB (that creates fake
 *      tenant scoping and breaks the realtime gps.ping fanout because the
 *      dispatch viewer is joined to room `tenant:<viewerTenantId>`, not
 *      `tenant:unknown`).
 */
async function resolveTenantId(
  workspaceId: string | null,
  userId?: string | null,
): Promise<string | null> {
  try {
    if (workspaceId) {
      const ws = await db.workspace.findUnique({
        where: { id: workspaceId },
        select: { tenantId: true },
      });
      if (ws?.tenantId) return ws.tenantId;
    }
    // Fallback: look up the tenantId on the linked User record. This is the
    // correct source of truth when the Employee row has no workspaceId or the
    // workspace row is missing its tenantId (schema drift).
    if (userId) {
      const u = await db.user.findUnique({
        where: { id: userId },
        select: { tenantId: true },
      });
      if (u?.tenantId) return u.tenantId;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── POST — receive a GPS ping ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      employeeId,
      jobId,
      latitude,
      longitude,
      accuracy,
      heading,
      speed,
      altitude,
      batteryLevel,
      isMoving,
      // B2 fix (2025-08-15): Accept capturedAt from the client so offline
      // pings can be backdated. If not provided, server stamps now (legacy
      // behavior). Validated below to prevent future-dated or absurdly old
      // pings.
      capturedAt,
    } = (body ?? {}) as {
      employeeId?: string;
      jobId?: string;
      latitude?: number;
      longitude?: number;
      accuracy?: number;
      heading?: number;
      speed?: number;
      altitude?: number;
      batteryLevel?: number;
      isMoving?: boolean;
      capturedAt?: string;
    };

    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    let targetEmployeeId = employeeId;
    if (!targetEmployeeId) {
      const emp = await db.employee.findFirst({
        where: { OR: [{ userId: authUser.id }, { email: authUser.email }] },
        select: { id: true },
      });
      if (emp) {
        targetEmployeeId = emp.id;
      }
    }

    if (!targetEmployeeId || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'employeeId, latitude, and longitude are required' },
        { status: 400 },
      );
    }

    // ── Phase E-1: Coordinate + telemetry bounds validation ────────────
    // Reject obviously invalid GPS data before writing to the DB. Prevents
    // garbage coordinates (lat 999, lng -999) from polluting the dispatch
    // map + route history. Also clamps optional telemetry fields to sane
    // ranges so a buggy/malicious client can't send impossible values.
    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        { error: 'Coordinates out of range (lat [-90,90], lng [-180,180])' },
        { status: 400 },
      );
    }
    if (accuracy != null && (!Number.isFinite(accuracy) || accuracy < 0)) {
      return NextResponse.json(
        { error: 'accuracy must be a non-negative number' },
        { status: 400 },
      );
    }
    if (heading != null && (!Number.isFinite(heading) || heading < 0 || heading > 360)) {
      return NextResponse.json(
        { error: 'heading must be in [0, 360]' },
        { status: 400 },
      );
    }
    if (speed != null && (!Number.isFinite(speed) || speed < 0)) {
      return NextResponse.json(
        { error: 'speed must be a non-negative number' },
        { status: 400 },
      );
    }
    if (
      batteryLevel != null &&
      (!Number.isFinite(batteryLevel) || batteryLevel < 0 || batteryLevel > 100)
    ) {
      return NextResponse.json(
        { error: 'batteryLevel must be in [0, 100]' },
        { status: 400 },
      );
    }
    const ADMIN_ROLES = ['owner', 'admin', 'manager', 'super_admin'];
    if (!ADMIN_ROLES.includes(authUser.role)) {
      // Employee: verify the employeeId belongs to them.
      // authUser.employeeId is set during login if the user has an Employee record.
      // Fallback: look up Employee by userId (handles older sessions).
      let ownEmployeeId = authUser.employeeId;
      if (!ownEmployeeId) {
        const ownEmp = await db.employee.findFirst({
          where: { userId: authUser.id },
          select: { id: true },
        });
        ownEmployeeId = ownEmp?.id ?? null;
      }
      if (targetEmployeeId !== ownEmployeeId && authUser.role !== 'employee') {
        // Allow employee self-resolution
      } else if (targetEmployeeId !== ownEmployeeId) {
        return NextResponse.json(
          { error: 'Forbidden: you can only submit GPS data for your own employee record' },
          { status: 403 },
        );
      }
    }

    const employee = await db.employee.findUnique({
      where: { id: targetEmployeeId },
      select: { id: true, workspaceId: true, userId: true },
    });
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // ── Phase E-2: jobId ownership validation ──────────────────────────
    // If a jobId is supplied, verify it belongs to the same workspace as the
    // employee AND is assigned to this employee. Prevents a malicious client
    // from contaminating another job's route history by submitting
    // `{ employeeId: A, jobId: B, coordinates }` where job B belongs to a
    // different tenant or a different employee.
    if (jobId) {
      const job = await db.job.findUnique({
        where: { id: jobId },
        select: {
          id: true,
          workspaceId: true,
          assigneeId: true,
          status: true,
        },
      });
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      // Cross-tenant check: the job's workspace must match the employee's.
      if (
        job.workspaceId &&
        employee.workspaceId &&
        job.workspaceId !== employee.workspaceId
      ) {
        return NextResponse.json(
          { error: 'Job does not belong to this employee workspace' },
          { status: 403 },
        );
      }
      // Assignment check: the job must be assigned to this employee (or have
      // no assignee — some jobs are unassigned while being dispatched).
      if (job.assigneeId && job.assigneeId !== targetEmployeeId) {
        return NextResponse.json(
          { error: 'Job is not assigned to this employee' },
          { status: 403 },
        );
      }
    }

    // Resolve tenantId from workspace → User fallback (see resolveTenantId docs).
    // If both are null, fall back to the authenticated user's tenantId (from
    // the JWT). We do NOT write 'unknown' to the DB — that would pollute the
    // GPSLocation.tenantId column with a value that matches no real tenant and
    // break downstream queries + the realtime gps.ping fanout.
    let tenantId = await resolveTenantId(employee.workspaceId, employee.userId);
    if (!tenantId && authUser.tenantId) {
      tenantId = authUser.tenantId;
    }
    // B2 fix (2025-08-15): Use client-provided capturedAt if valid, else now.
    // Validates: must parse to a Date, not more than 5 minutes in the future,
    // not older than 24 hours (stale offline pings beyond 24h are dropped to
    // prevent route history pollution).
    let now = new Date();
    if (capturedAt) {
      const clientTime = new Date(capturedAt);
      if (!isNaN(clientTime.getTime())) {
        const fiveMinFromNow = Date.now() + 5 * 60 * 1000;
        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
        if (clientTime.getTime() <= fiveMinFromNow && clientTime.getTime() >= twentyFourHoursAgo) {
          now = clientTime;
        }
        // If the client time is out of range, fall back to server now.
      }
    }

    // ── Phase F-6: Server-side movement validation ─────────────────────
    // Derive `isMoving` + `speed` from the coordinate delta vs the previous
    // GPS ping, rather than blindly trusting the client-supplied values.
    // A malicious/buggy client could send `isMoving: false` while moving 80
    // km/h, or `speed: 999` while stationary. We compute the authoritative
    // values server-side and use them if the client didn't supply them, or
    // if the client's values are implausible (> 300 km/h, i.e. faster than
    // any commercial vehicle).
    let serverIsMoving = isMoving;
    let serverSpeed = speed;
    try {
      const prev = await db.gPSLocation.findFirst({
        where: { employeeId: targetEmployeeId },
        orderBy: { capturedAt: 'desc' },
        select: { latitude: true, longitude: true, capturedAt: true },
      });
      if (prev) {
        const prevTime = new Date(prev.capturedAt as string | Date).getTime();
        const dtSec = Math.max(1, (now.getTime() - prevTime) / 1000); // min 1s to avoid div-by-zero
        const distM = haversineMeters(
          prev.latitude as number,
          prev.longitude as number,
          latitude,
          longitude,
        );
        const computedSpeed = distM / dtSec; // m/s

        // Derive isMoving: moved > 10m since the last ping.
        // (10m ≈ the GPS_MIN_DISTANCE_M threshold the mobile app uses.)
        if (serverIsMoving === undefined || serverIsMoving === null) {
          serverIsMoving = distM > 10;
        } else {
          // Cross-check: if client says "not moving" but we moved > 50m, the
          // client is wrong — override.
          if (!serverIsMoving && distM > 50) {
            serverIsMoving = true;
          }
        }

        // Derive speed if the client didn't supply it OR supplied an
        // implausible value (> 83 m/s ≈ 300 km/h).
        const implausibleSpeed = serverSpeed != null && serverSpeed > 83;
        if (serverSpeed === undefined || serverSpeed === null || implausibleSpeed) {
          serverSpeed = computedSpeed;
        }
      }
    } catch (e) {
      // Non-fatal — fall back to client values.
      console.warn('[GPS POST] movement validation lookup failed (non-fatal):', e instanceof Error ? e.message : e);
    }

    // 1. Create the GPSLocation record.
    //    If tenantId is null, we still write the row (the GPS data is valuable
    //    for the employee's own route history) but set tenantId to null. The
    //    realtime fanout will skip this ping (no tenant room).
    const gps = await db.gPSLocation.create({
      data: {
        tenantId: tenantId,
        employeeId: targetEmployeeId,
        jobId: jobId ?? null,
        latitude,
        longitude,
        accuracy: accuracy ?? null,
        heading: heading ?? null,
        speed: serverSpeed ?? null,
        altitude: altitude ?? null,
        batteryLevel: batteryLevel ?? null,
        isMoving: serverIsMoving ?? false,
        capturedAt: now,
      },
    });

    // 2. Update the active RouteHistory (if any) for this employee+job.
    let routeUpdated = false;
    try {
      const route = await db.routeHistory.findFirst({
        where: {
          employeeId: targetEmployeeId,
          jobId: jobId ?? null,
          status: 'in_progress',
        },
        orderBy: { startedAt: 'desc' },
      });

      if (route) {
        // ── Supabase/Postgres jsonb compatibility ──
        // The Prisma schema declares pathJson as `String @default("[]")`, so
        // on SQLite it is TEXT and JSON.parse/JSON.stringify round-trips
        // cleanly. On Supabase/Postgres the column MAY have been created as
        // `jsonb` (recommended Postgres practice) instead of `text`. If so,
        // sending a stringified string into a jsonb column causes a PostgREST
        // 400 ("invalid input syntax for type json") which the outer
        // try/catch would silently swallow — GPS pings would "succeed" (the
        // GPSLocation insert works) but the route trail would NEVER grow on
        // the live map.
        //
        // safeParseJson already tolerates both shapes: if PostgREST returns
        // a parsed JSON array (jsonb column), JSON.parse(array) throws and
        // we fall back to treating it as already-parsed. If it returns a
        // string (text column), JSON.parse works normally.
        const raw = route.pathJson as unknown;
        let path: PathPoint[];
        if (typeof raw === 'string') {
          path = safeParseJson<PathPoint[]>(raw, []);
        } else if (Array.isArray(raw)) {
          // jsonb column — PostgREST already parsed it into an array.
          path = raw as PathPoint[];
        } else {
          path = [];
        }

        const newPoint: PathPoint = {
          lat: latitude,
          lng: longitude,
          capturedAt: now.toISOString(),
          accuracy: accuracy ?? null,
        };
        path.push(newPoint);

        // Phase F-4: Cap pathJson length at 500 points (prune oldest).
        // Without this, a long shift (6h × 10s pings = ~2,160 points) would
        // cause every subsequent GPS ping to read → parse → append → stringify
        // → write a growing JSON document — O(n) per ping, quadratic overall.
        // Capping at 500 keeps the JSON document small (~25KB max) + the
        // read/parse/write cycle fast, while preserving enough breadcrumbs for
        // the dispatch map's polyline rendering. The pruned points are still
        // available in the GPSLocation table (raw telemetry history).
        const PATH_MAX_POINTS = 500;
        if (path.length > PATH_MAX_POINTS) {
          // Drop the oldest points (keep the most recent 500).
          path = path.slice(path.length - PATH_MAX_POINTS);
        }

        // Recompute distance (add the haversine distance from the previous endpoint).
        let newDistance = route.distanceMeters as number;
        if (route.endLat != null && route.endLng != null) {
          newDistance += haversineMeters(
            route.endLat as number,
            route.endLng as number,
            latitude,
            longitude,
          );
        } else if (route.startLat != null && route.startLng != null) {
          newDistance += haversineMeters(
            route.startLat as number,
            route.startLng as number,
            latitude,
            longitude,
          );
        }

        // Send pathJson as a STRING regardless of column type. For text
        // columns this is correct. For jsonb columns, Prisma's PostgREST
        // adapter path in supabase-db.ts forwards the value as-is, and
        // PostgREST will coerce a valid JSON string into jsonb. If your
        // Supabase deployment rejects this, the catch below logs the exact
        // PostgREST error code + hint so you can diagnose the column type
        // mismatch without a silent failure.
        await db.routeHistory.update({
          where: { id: route.id },
          data: {
            pathJson: JSON.stringify(path),
            endLat: latitude,
            endLng: longitude,
            distanceMeters: newDistance,
            // Recompute durationMinutes (live).
            durationMinutes: Math.round(
              (now.getTime() - new Date(route.startedAt as string | Date).getTime()) / 60000,
            ),
          },
        });
        routeUpdated = true;
      }
    } catch (e) {
      // Log with full context so Supabase/PostgREST errors are diagnosable
      // in production. Previously this was a bare console.error that was
      // easy to miss in log streams. The most common production failure is
      // a jsonb/text column type mismatch on pathJson — the error message
      // from PostgREST will contain "invalid input syntax for type json"
      // or "column pathJson of relation RouteHistory does not exist".
      const err = e as { message?: string; code?: string; hint?: string };
      console.error('[GPS POST] route update failed:', {
        message: err?.message,
        code: err?.code,
        hint: err?.hint,
        employeeId: targetEmployeeId,
        jobId: jobId ?? null,
      });
    }

    // 3. Update the employee's lastSeenAt / lastLocationAt / lat / lng (best-effort).
    try {
      await db.employee.update({
        where: { id: targetEmployeeId },
        data: {
          latitude,
          longitude,
          lastSeenAt: now,
          lastLocationAt: now,
        },
      });
    } catch (e) {
      // Same Supabase diagnostic treatment as the route update above.
      // If this fails, the technician's marker won't move on the Live
      // Dispatch map and they'll show as "Offline" after 30 minutes.
      const err = e as { message?: string; code?: string; hint?: string };
      console.error('[GPS POST] employee update failed:', {
        message: err?.message,
        code: err?.code,
        hint: err?.hint,
        employeeId: targetEmployeeId,
      });
    }

    // 4. Emit gps.ping via EventBus so the realtime service can push the
    //    updated location to the Live Dispatch map (Uber/Jobber-style live
    //    tracking).
    try {
      EventBus.emit('gps.ping', {
        employeeId: targetEmployeeId,
        jobId: jobId ?? null,
        latitude,
        longitude,
        accuracy: accuracy ?? null,
        heading: heading ?? null,
        speed: speed ?? null,
        batteryLevel: batteryLevel ?? null,
        isMoving: isMoving ?? false,
        capturedAt: now.toISOString(),
        tenantId: tenantId ?? undefined,
        workspaceId: employee.workspaceId ?? undefined,
      }, { tenantId: tenantId ?? undefined, workspaceId: employee.workspaceId ?? undefined });
    } catch (e) {
      // non-fatal — GPS ping already saved
    }

    return NextResponse.json({ gps, routeUpdated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record GPS ping';
    console.error('[GPS POST]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── GET — latest GPS location for an employee ──────────────────────────────
// C1 fix (2025-08-15): Auth required. Employees can only query their own
// location; admins can query any employee.

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
    }

    // Authorization: employees can only query their own location.
    // Admins can query any employee — BUT only within their own workspace/
    // tenant (Phase E-3: tenant isolation). Previously the admin bypass let
    // a tenant-A admin query a tenant-B employee's GPS by guessing the ID.
    const ADMIN_ROLES = ['owner', 'admin', 'manager', 'super_admin'];
    if (!ADMIN_ROLES.includes(authUser.role)) {
      let ownEmployeeId = authUser.employeeId;
      if (!ownEmployeeId) {
        const ownEmp = await db.employee.findFirst({
          where: { userId: authUser.id },
          select: { id: true },
        });
        ownEmployeeId = ownEmp?.id ?? null;
      }
      if (employeeId !== ownEmployeeId) {
        return NextResponse.json(
          { error: 'Forbidden: you can only query your own GPS location' },
          { status: 403 },
        );
      }
    } else {
      // Admin: verify the target employee belongs to the same workspace/tenant.
      // Super-admins (platform-level) bypass this scope.
      if (!authUser.isSuperAdmin && !(authUser.role === 'admin' && !authUser.tenantId)) {
        const empWhere: Record<string, unknown> = { id: employeeId };
        if (authUser.workspaceId) {
          empWhere.workspaceId = authUser.workspaceId;
        } else if (authUser.tenantId) {
          const tenantWorkspaces = await db.workspace.findMany({
            where: { tenantId: authUser.tenantId },
            select: { id: true },
          });
          const workspaceIds = tenantWorkspaces.map((w: { id: string }) => w.id);
          if (workspaceIds.length === 0) {
            return NextResponse.json({ location: null });
          }
          empWhere.workspaceId = { in: workspaceIds };
        } else {
          return NextResponse.json({ location: null });
        }
        const scopedEmp = await db.employee.findFirst({ where: empWhere, select: { id: true } });
        if (!scopedEmp) {
          // 404-style (returning null) avoids leaking whether the employeeId
          // exists in another tenant (no enumeration oracle).
          return NextResponse.json({ location: null });
        }
      }
    }

    const latest = await db.gPSLocation.findFirst({
      where: { employeeId },
      orderBy: { capturedAt: 'desc' },
    });

    if (!latest) {
      return NextResponse.json({ location: null });
    }

    return NextResponse.json({ location: latest });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch GPS location';
    console.error('[GPS GET]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
