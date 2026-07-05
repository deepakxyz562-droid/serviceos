import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { resolveEmployee } from '../route';

/**
 * GET /api/employee/shift/today
 *
 * Returns today's shift + computed totals:
 *  - activeShift (or null)
 *  - jobsCompletedToday (count)
 *  - jobsAssignedToday (count)
 *  - workingMinutes (sum of workingMinutes across today's shifts)
 *  - breakMinutes
 *  - totalMinutes
 *  - travelDistanceMeters (sum of today's RouteHistory.distanceMeters)
 *
 * "Today" = calendar day in server local time.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const employee = await resolveEmployee(user);
    if (!employee) {
      return NextResponse.json({
        activeShift: null,
        jobsAssignedToday: 0,
        jobsCompletedToday: 0,
        workingMinutes: 0,
        breakMinutes: 0,
        totalMinutes: 0,
        travelDistanceMeters: 0,
      });
    }

    // Today's window
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // All shifts that started today
    const todayShifts = await db.employeeShift.findMany({
      where: {
        employeeId: employee.id,
        clockIn: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { clockIn: 'desc' },
    });

    const activeShift = todayShifts.find((s) => s.status === 'active' || s.status === 'on_break') || null;

    // Totals from completed shifts + the live shift
    let workingMinutes = 0;
    let breakMinutes = 0;
    let totalMinutes = 0;

    for (const shift of todayShifts) {
      if (shift.status === 'completed') {
        workingMinutes += shift.workingMinutes || 0;
        breakMinutes += shift.breakMinutes || 0;
        totalMinutes += shift.totalMinutes || 0;
      } else {
        // Live shift — compute on the fly
        const now = new Date();
        const elapsed = Math.max(0, Math.round((now.getTime() - shift.clockIn.getTime()) / 60000));
        let liveBreak = 0;
        try {
          const breaks = JSON.parse(shift.breaksJson || '[]') as Array<{
            start: string;
            end: string | null;
            durationMinutes?: number;
          }>;
          for (const b of breaks) {
            if (b.end) {
              liveBreak += b.durationMinutes || 0;
            } else {
              liveBreak += Math.max(1, Math.round((now.getTime() - new Date(b.start).getTime()) / 60000));
            }
          }
        } catch {
          // ignore
        }
        totalMinutes += elapsed;
        breakMinutes += liveBreak;
        workingMinutes += Math.max(0, elapsed - liveBreak);
      }
    }

    // Jobs assigned today (scheduled today OR created today)
    const jobsAssignedToday = await db.job.count({
      where: {
        assigneeId: employee.id,
        OR: [
          { scheduledAt: { gte: startOfDay, lte: endOfDay } },
          { createdAt: { gte: startOfDay, lte: endOfDay } },
        ],
      },
    });

    // Jobs completed today
    const jobsCompletedToday = await db.job.count({
      where: {
        assigneeId: employee.id,
        status: 'completed',
        completedAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    // Travel distance today (sum of RouteHistory.distanceMeters)
    const todayRoutes = await db.routeHistory.findMany({
      where: {
        employeeId: employee.id,
        startedAt: { gte: startOfDay, lte: endOfDay },
      },
      select: { distanceMeters: true },
    });
    const travelDistanceMeters = todayRoutes.reduce((sum, r) => sum + (r.distanceMeters || 0), 0);

    return NextResponse.json({
      activeShift,
      shiftsToday: todayShifts.length,
      jobsAssignedToday,
      jobsCompletedToday,
      workingMinutes,
      breakMinutes,
      totalMinutes,
      travelDistanceMeters,
    });
  } catch (error) {
    console.error('[employee/shift/today GET] error:', error);
    return NextResponse.json({ error: 'Failed to fetch today totals' }, { status: 500 });
  }
}
