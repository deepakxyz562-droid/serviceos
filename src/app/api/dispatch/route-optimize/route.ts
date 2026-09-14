import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';
import { requirePlanFeature } from '@/lib/plan-gate';
import { optimizeRoute, type RouteStop, type GeoCoordinate } from '@/lib/route-optimizer';

export async function POST(request: NextRequest) {
  const log = withRequestId(request);
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const gate = await requirePlanFeature('jobs');
    if (!gate.ok) {
      return NextResponse.json({ error: gate.reason }, { status: gate.status });
    }

    const body = await request.json().catch(() => ({}));
    const {
      employeeId,
      date,
      startLat,
      startLng,
      applyImmediately,
      startTimeStr,
    } = body as {
      employeeId?: string;
      date?: string;
      startLat?: number;
      startLng?: number;
      applyImmediately?: boolean;
      startTimeStr?: string;
    };

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
    }

    // Determine target date range (default to today)
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch employee + today's jobs for employee
    const [employee, jobs, defaultShop] = await Promise.all([
      db.employee.findUnique({
        where: { id: employeeId },
        select: { id: true, name: true, latitude: true, longitude: true, tenantId: true },
      }),
      db.job.findMany({
        where: {
          assigneeId: employeeId,
          scheduledAt: { gte: startOfDay, lte: endOfDay },
          status: { notIn: ['completed', 'cancelled'] },
          ...(authUser.tenantId && !authUser.isSuperAdmin ? { tenantId: authUser.tenantId } : {}),
        },
        orderBy: { scheduledAt: 'asc' },
        include: {
          customer: { select: { id: true, name: true, address: true, phone: true } },
        },
      }),
      db.warehouse.findFirst({
        where: {
          tenantId: authUser.tenantId ?? undefined,
          type: 'main',
          isActive: true,
        },
        select: { id: true, name: true, address: true },
      }),
    ]);

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (jobs.length === 0) {
      return NextResponse.json({
        message: 'No active scheduled jobs found for this technician on the selected date.',
        originalStops: [],
        optimizedStops: [],
        distanceSavedKm: 0,
        timeSavedMinutes: 0,
      });
    }

    // Resolve start location: provided -> employee's last GPS -> default shop (or standard default coords)
    let startLocation: GeoCoordinate = {
      lat: typeof startLat === 'number' ? startLat : (employee.latitude ?? 37.7749),
      lng: typeof startLng === 'number' ? startLng : (employee.longitude ?? -122.4194),
      name: `${employee.name}'s Location / Shop`,
      address: defaultShop?.address || 'Main Depot',
    };

    // Build RouteStop objects with geo coordinates
    const stops: RouteStop[] = jobs.map((job) => {
      // Fallback coordinate generation if lat/lng missing on job: derive from customer or default delta
      const lat = job.latitude ?? (employee.latitude ? employee.latitude + 0.015 : 37.775);
      const lng = job.longitude ?? (employee.longitude ? employee.longitude + 0.015 : -122.418);

      return {
        id: job.id,
        title: job.title || `Job #${job.jobNumber || job.id.slice(0, 6)}`,
        customerName: job.customer?.name || 'Customer',
        address: job.address || job.customer?.address || 'Job Location',
        lat,
        lng,
        scheduledAt: job.scheduledAt ? job.scheduledAt.toISOString() : null,
        estimatedDurationMinutes: job.estimatedDuration || 60,
        priority: job.priority || 'medium',
        status: job.status,
      };
    });

    const routeStartTime = startTimeStr ? new Date(startTimeStr) : new Date(startOfDay.getTime() + 8 * 3600000); // 8:00 AM default
    const result = optimizeRoute(startLocation, stops, routeStartTime);

    // If applyImmediately: update scheduledAt and stopSequence on jobs
    if (applyImmediately && result.timeline.length > 0) {
      await db.$transaction(
        result.timeline.map((item) => {
          return db.job.update({
            where: { id: item.stopId },
            data: {
              scheduledAt: new Date(item.estimatedArrival),
            },
          });
        })
      );
      log.info({ employeeId, jobCount: jobs.length }, 'Optimized route applied to schedule');
    }

    return NextResponse.json({
      success: true,
      employee: { id: employee.id, name: employee.name },
      applied: !!applyImmediately,
      ...result,
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to optimize route');
    const message = error instanceof Error ? error.message : 'Failed to optimize route';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
