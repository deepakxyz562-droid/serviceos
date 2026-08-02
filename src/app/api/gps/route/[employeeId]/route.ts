import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/gps/route/[employeeId]
 * -------------------------------
 * Returns the route history (path) for an employee for today, or for a
 * specific job.
 *
 * Query params:
 *   jobId=<id>   — restrict to a specific job's route
 *   date=YYYY-MM-DD — restrict to a specific date (defaults to today)
 *
 * Response:
 *   { routes: RouteHistory[], gpsPoints: GPSLocation[] }
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  try {
    const { employeeId } = await params;
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const dateStr = searchParams.get('date');

    // Resolve the date range.
    let start: Date;
    let end: Date;
    if (dateStr) {
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 });
      }
      start = new Date(parsed);
      start.setHours(0, 0, 0, 0);
      end = new Date(parsed);
      end.setHours(23, 59, 59, 999);
    } else {
      start = new Date();
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }

    // 1. RouteHistory records for this employee in the date range (optionally for a job).
    const where: Record<string, unknown> = {
      employeeId,
      startedAt: { gte: start, lte: end },
    };
    if (jobId) {
      where.jobId = jobId;
    }

    const routes = await db.routeHistory.findMany({
      where,
      orderBy: { startedAt: 'asc' },
    });

    // 2. Raw GPS points for the same employee (+ optional job) in the date range.
    const gpsWhere: Record<string, unknown> = {
      employeeId,
      capturedAt: { gte: start, lte: end },
    };
    if (jobId) {
      gpsWhere.jobId = jobId;
    }

    const gpsPoints = await db.gPSLocation.findMany({
      where: gpsWhere,
      orderBy: { capturedAt: 'asc' },
      take: 2000, // safety cap
    });

    // 3. Build a unified "path" array (from routes' pathJson, merged + sorted).
    const path: PathPoint[] = [];
    for (const r of routes) {
      const pts = safeParseJson<PathPoint[]>(r.pathJson, []);
      path.push(...pts);
    }
    // If no path points exist in route history, fall back to the raw GPS points.
    if (path.length === 0 && gpsPoints.length > 0) {
      for (const g of gpsPoints) {
        path.push({
          lat: g.latitude,
          lng: g.longitude,
          capturedAt: g.capturedAt.toISOString(),
          accuracy: g.accuracy,
        });
      }
    }
    path.sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());

    // 4. Summary stats.
    const totalDistanceMeters = routes.reduce((sum, r) => sum + (r.distanceMeters || 0), 0);
    const totalDurationMinutes = routes.reduce((sum, r) => sum + (r.durationMinutes || 0), 0);

    return NextResponse.json({
      employeeId,
      date: start.toISOString().slice(0, 10),
      jobId: jobId ?? null,
      routes: routes.map((r) => ({
        id: r.id,
        jobId: r.jobId,
        startedAt: r.startedAt,
        endedAt: r.endedAt,
        arrivedAt: r.arrivedAt,
        status: r.status,
        distanceMeters: r.distanceMeters,
        durationMinutes: r.durationMinutes,
        etaMinutes: r.etaMinutes,
        avgSpeedKmh: r.avgSpeedKmh,
        startLat: r.startLat,
        startLng: r.startLng,
        endLat: r.endLat,
        endLng: r.endLng,
        path: safeParseJson<PathPoint[]>(r.pathJson, []),
      })),
      gpsPoints: gpsPoints.map((g) => ({
        id: g.id,
        latitude: g.latitude,
        longitude: g.longitude,
        accuracy: g.accuracy,
        heading: g.heading,
        speed: g.speed,
        capturedAt: g.capturedAt,
        isMoving: g.isMoving,
        batteryLevel: g.batteryLevel,
        jobId: g.jobId,
      })),
      path,
      summary: {
        totalDistanceMeters,
        totalDistanceKm: totalDistanceMeters / 1000,
        totalDurationMinutes,
        routeCount: routes.length,
        gpsPointCount: gpsPoints.length,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch route history';
    console.error('[GPS Route GET]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
