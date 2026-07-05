import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
    };

    if (!employeeId || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'employeeId, latitude, and longitude are required' },
        { status: 400 },
      );
    }

    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, workspaceId: true },
    });
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const tenantId = await resolveTenantId(employee.workspaceId);
    const now = new Date();

    // 1. Create the GPSLocation record.
    const gps = await db.gPSLocation.create({
      data: {
        tenantId: tenantId ?? 'unknown',
        employeeId,
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
          employeeId,
          jobId: jobId ?? null,
          status: 'in_progress',
        },
        orderBy: { startedAt: 'desc' },
      });

      if (route) {
        const path = safeParseJson<PathPoint[]>(route.pathJson, []);
        const newPoint: PathPoint = {
          lat: latitude,
          lng: longitude,
          capturedAt: now.toISOString(),
          accuracy: accuracy ?? null,
        };
        path.push(newPoint);

        // Recompute distance (add the haversine distance from the previous endpoint).
        let newDistance = route.distanceMeters;
        if (route.endLat != null && route.endLng != null) {
          newDistance += haversineMeters(route.endLat, route.endLng, latitude, longitude);
        } else if (route.startLat != null && route.startLng != null) {
          newDistance += haversineMeters(route.startLat, route.startLng, latitude, longitude);
        }

        await db.routeHistory.update({
          where: { id: route.id },
          data: {
            pathJson: JSON.stringify(path),
            endLat: latitude,
            endLng: longitude,
            distanceMeters: newDistance,
            // Recompute durationMinutes (live).
            durationMinutes: Math.round((now.getTime() - route.startedAt.getTime()) / 60000),
          },
        });
        routeUpdated = true;
      }
    } catch (e) {
      console.error('[GPS POST] route update failed:', e);
    }

    // 3. Update the employee's lastSeenAt / lastLocationAt / lat / lng (best-effort).
    try {
      await db.employee.update({
        where: { id: employeeId },
        data: {
          latitude,
          longitude,
          lastSeenAt: now,
          lastLocationAt: now,
        },
      });
    } catch (e) {
      console.error('[GPS POST] employee update failed:', e);
    }

    return NextResponse.json({ gps, routeUpdated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record GPS ping';
    console.error('[GPS POST]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── GET — latest GPS location for an employee ──────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
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
