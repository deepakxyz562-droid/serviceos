import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * POST /api/bookings/auto-assign
 * Auto-assigns the best available employee to a booking using one of three
 * strategies: 'workload' (default), 'rating', or 'round_robin'.
 *
 * Body: { bookingId: string, strategy?: 'workload' | 'rating' | 'round_robin' }
 *  - Also accepts `?bookingId=` and `?strategy=` query params as a fallback.
 *
 * Returns: { booking, employee, score, strategy, reasoning: string[] }
 *  - 409 if no available employees exist.
 */

type Strategy = 'workload' | 'rating' | 'round_robin';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function parseStrategy(value: unknown): Strategy {
  if (value === 'rating' || value === 'round_robin') return value;
  return 'workload';
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse body — fall back to query params if body missing/invalid
    let body: { bookingId?: string; strategy?: string } = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const url = new URL(request.url);
    const bookingId =
      body.bookingId || url.searchParams.get('bookingId') || '';
    const strategy = parseStrategy(
      body.strategy || url.searchParams.get('strategy')
    );

    if (!bookingId) {
      return NextResponse.json(
        { error: 'bookingId is required' },
        { status: 400 }
      );
    }

    // Fetch the booking — enforce tenant isolation
    const booking = await db.booking.findUnique({ where: { id: bookingId } });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (booking.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Fetch all available employees for the tenant (excluding anyone on leave)
    const now = new Date();
    const employees = await db.employee.findMany({
      where: {
        workspaceId: user.workspaceId || undefined,
        status: 'available',
        OR: [{ onLeaveUntil: null }, { onLeaveUntil: { lt: now } }],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        rating: true,
        completedJobs: true,
        lastSeenAt: true,
      },
    });

    if (employees.length === 0) {
      return NextResponse.json(
        {
          error: 'No available employees',
          booking,
          candidates: 0,
        },
        { status: 409 }
      );
    }

    // Gather per-employee workload data in parallel.
    // - activeJobs: count of jobs currently pending/in_progress/assigned
    // - todayBookings: count of bookings scheduled today for that employee
    // - pastAssignments: count of all bookings ever assigned (used by round_robin)
    const dayStart = startOfDay(now);
    const dayEnd = endOfDay(now);

    const [activeJobCounts, todayBookingCounts, pastAssignmentCounts, lastAssignedMap] =
      await Promise.all([
        db.job.groupBy({
          by: ['assigneeId'],
          where: {
            assigneeId: { in: employees.map((e) => e.id) },
            status: { in: ['pending', 'in_progress', 'assigned'] },
          },
          _count: { id: true },
        }),
        db.booking.groupBy({
          by: ['employeeId'],
          where: {
            employeeId: { in: employees.map((e) => e.id) },
            scheduledAt: { gte: dayStart, lte: dayEnd },
            status: { in: ['confirmed', 'in_progress'] },
          },
          _count: { id: true },
        }),
        db.booking.groupBy({
          by: ['employeeId'],
          where: {
            employeeId: { in: employees.map((e) => e.id) },
          },
          _count: { id: true },
        }),
        // For round-robin: find the most recently assigned booking per employee
        db.booking.findMany({
          where: {
            employeeId: { in: employees.map((e) => e.id) },
            tenantId: user.tenantId,
          },
          orderBy: { updatedAt: 'desc' },
          select: { employeeId: true, updatedAt: true },
        }),
      ]);

    const activeMap = new Map<string, number>();
    for (const item of activeJobCounts) {
      if (item.assigneeId) activeMap.set(item.assigneeId, item._count.id);
    }
    const todayMap = new Map<string, number>();
    for (const item of todayBookingCounts) {
      if (item.employeeId) todayMap.set(item.employeeId, item._count.id);
    }
    const pastMap = new Map<string, number>();
    for (const item of pastAssignmentCounts) {
      if (item.employeeId) pastMap.set(item.employeeId, item._count.id);
    }
    // For round_robin — track the latest updatedAt per employee
    const lastAssignedAtMap = new Map<string, Date>();
    for (const b of lastAssignedMap) {
      if (!b.employeeId) continue;
      const existing = lastAssignedAtMap.get(b.employeeId);
      if (!existing || (b.updatedAt && b.updatedAt > existing)) {
        if (b.updatedAt) lastAssignedAtMap.set(b.employeeId, b.updatedAt);
      }
    }

    // Score each employee depending on the strategy.
    // We always compute the workload-based score (used as the default and as
    // a tiebreaker for the other strategies).
    interface ScoredEmployee {
      employee: (typeof employees)[number];
      score: number;
      activeJobs: number;
      todayBookings: number;
      pastAssignments: number;
      lastAssignedAt: Date | null;
      reasoning: string[];
    }

    const scored: ScoredEmployee[] = employees.map((employee) => {
      const activeJobs = activeMap.get(employee.id) || 0;
      const todayBookings = todayMap.get(employee.id) || 0;
      const pastAssignments = pastMap.get(employee.id) || 0;
      const lastAssignedAt = lastAssignedAtMap.get(employee.id) ?? null;

      // Workload-based score (the spec formula):
      // rating * 20 - activeJobs * 15 - todayBookings * 10 + completedJobs * 0.5
      const workloadScore =
        employee.rating * 20 -
        activeJobs * 15 -
        todayBookings * 10 +
        employee.completedJobs * 0.5;

      const reasoning: string[] = [];
      reasoning.push(
        `Workload score: ${workloadScore.toFixed(2)} (rating=${employee.rating}, activeJobs=${activeJobs}, todayBookings=${todayBookings}, completedJobs=${employee.completedJobs})`
      );

      return {
        employee,
        score: workloadScore,
        activeJobs,
        todayBookings,
        pastAssignments,
        lastAssignedAt,
        reasoning,
      };
    });

    // Apply strategy
    let chosen: ScoredEmployee | null = null;
    const strategyReasoning: string[] = [];

    if (strategy === 'rating') {
      // Highest rating wins; tiebreak with workload score; then random
      scored.sort((a, b) => {
        if (b.employee.rating !== a.employee.rating) {
          return b.employee.rating - a.employee.rating;
        }
        if (b.score !== a.score) return b.score - a.score;
        return Math.random() - 0.5;
      });
      chosen = scored[0];
      strategyReasoning.push(
        `Strategy 'rating': selected ${chosen.employee.name} with rating ${chosen.employee.rating}/5`
      );
    } else if (strategy === 'round_robin') {
      // Pick the employee who was assigned least recently (or never).
      // Employees with no past assignment get top priority.
      // Tiebreak: fewest past assignments, then workload score, then random.
      scored.sort((a, b) => {
        const aTime = a.lastAssignedAt?.getTime() ?? 0;
        const bTime = b.lastAssignedAt?.getTime() ?? 0;
        if (aTime !== bTime) return aTime - bTime; // earlier (or 0) first
        if (a.pastAssignments !== b.pastAssignments) {
          return a.pastAssignments - b.pastAssignments; // fewer first
        }
        if (b.score !== a.score) return b.score - a.score;
        return Math.random() - 0.5;
      });
      chosen = scored[0];
      strategyReasoning.push(
        `Strategy 'round_robin': selected ${chosen.employee.name} (last assigned ${
          chosen.lastAssignedAt ? chosen.lastAssignedAt.toISOString() : 'never'
        }, past assignments=${chosen.pastAssignments})`
      );
    } else {
      // Default: 'workload' — highest workload score; tiebreak random
      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return Math.random() - 0.5;
      });
      chosen = scored[0];
      strategyReasoning.push(
        `Strategy 'workload': selected ${chosen.employee.name} with score ${chosen.score.toFixed(2)}`
      );
    }

    if (!chosen) {
      return NextResponse.json(
        { error: 'Failed to select an employee' },
        { status: 500 }
      );
    }

    // Update the booking: assign employee, optionally bump status to confirmed
    const updateData: Record<string, unknown> = {
      employeeId: chosen.employee.id,
    };
    if (booking.status === 'pending') {
      updateData.status = 'confirmed';
      if (!booking.confirmedAt) {
        updateData.confirmedAt = new Date();
      }
    }

    const updatedBooking = await db.booking.update({
      where: { id: booking.id },
      data: updateData,
      include: {
        employee: {
          select: { id: true, name: true, phone: true, avatar: true },
        },
      },
    });

    const finalReasoning = [
      `Auto-assigned based on workload, rating, and availability`,
      ...strategyReasoning,
      ...chosen.reasoning,
      `Considered ${employees.length} available employee${employees.length === 1 ? '' : 's'}`,
    ];

    return NextResponse.json({
      booking: updatedBooking,
      employee: chosen.employee,
      score: Math.round(chosen.score * 100) / 100,
      strategy,
      candidates: employees.length,
      reasoning: finalReasoning,
    });
  } catch (error) {
    console.error('[BookingAutoAssign] Error:', error);
    return NextResponse.json(
      { error: 'Failed to auto-assign booking' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bookings/auto-assign
 * Returns metadata about the supported strategies (useful for UI hints).
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user || !user.tenantId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  return NextResponse.json({
    endpoint: '/api/bookings/auto-assign',
    method: 'POST',
    description:
      'Auto-assigns the best available employee to a booking using a chosen strategy.',
    strategies: [
      {
        name: 'workload',
        description:
          'Picks the employee with the best workload score: rating*20 - activeJobs*15 - todayBookings*10 + completedJobs*0.5',
      },
      {
        name: 'rating',
        description: 'Picks the highest-rated available employee.',
      },
      {
        name: 'round_robin',
        description:
          'Picks the employee who was assigned least recently (or never).',
      },
    ],
    body: {
      bookingId: 'string (required)',
      strategy: "'workload' | 'rating' | 'round_robin' (optional, default 'workload')",
    },
  });
}
