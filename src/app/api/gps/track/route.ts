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

async function resolveTenantId(workspaceId: string | null): Promise<string | null> {
  try {
    if (workspaceId) {
      const ws = await db.workspace.findUnique({ where: { id: workspaceId }, select: { tenantId: true } });
      if (ws?.tenantId) return ws.tenantId;
    }
    const anyWs = await db.workspace.findFirst({ select: { tenantId: true } });
    return anyWs?.tenantId ?? null;
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
      select: { id: true, workspaceId: true },
    });
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const tenantId = await resolveTenantId(employee.workspaceId);
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

    // 1. Create the GPSLocation record.
    const gps = await db.gPSLocation.create({
      data: {
        tenantId: tenantId ?? 'unknown',
        employeeId: targetEmployeeId,
        jobId: jobId ?? null,
        latitude,
        longitude,
        accuracy: accuracy ?? null,
        heading: heading ?? null,
        speed: speed ?? null,
        altitude: altitude ?? null,
        batteryLevel: batteryLevel ?? null,
        isMoving: isMoving ?? false,
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
