import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/employee/shift
 * Returns the current active shift for the authenticated employee (or null).
 *
 * Resolves the employee by:
 *   1. JWT `employeeId` claim (set on employee-portal login)
 *   2. Employee row linked to the auth user via `userId`
 *   3. First employee in the user's workspace (graceful fallback for owners
 *      browsing the employee portal)
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const employee = await resolveEmployee(user);
    if (!employee) {
      return NextResponse.json({ shift: null, employee: null });
    }

    const shift = await db.employeeShift.findFirst({
      where: {
        employeeId: employee.id,
        status: { in: ['active', 'on_break'] },
      },
      orderBy: { clockIn: 'desc' },
    });

    return NextResponse.json({ shift, employee: { id: employee.id, name: employee.name } });
  } catch (error) {
    console.error('[employee/shift GET] error:', error);
    return NextResponse.json({ error: 'Failed to fetch shift' }, { status: 500 });
  }
}

/**
 * POST /api/employee/shift
 * Body: { latitude?, longitude? }
 * Clocks in: creates a new EmployeeShift with status='active'.
 * Returns 409 if there's already an active shift.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const employee = await resolveEmployee(user);
    if (!employee) {
      return NextResponse.json({ error: 'No employee record linked to your account' }, { status: 404 });
    }

    // Prevent duplicate active shifts
    const existing = await db.employeeShift.findFirst({
      where: {
        employeeId: employee.id,
        status: { in: ['active', 'on_break'] },
      },
    });
    if (existing) {
      return NextResponse.json({ error: 'Already clocked in', shift: existing }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));
    const latitude = typeof body.latitude === 'number' ? body.latitude : null;
    const longitude = typeof body.longitude === 'number' ? body.longitude : null;

    const shift = await db.employeeShift.create({
      data: {
        tenantId: user.tenantId || 'default',
        employeeId: employee.id,
        shiftDate: new Date(),
        clockIn: new Date(),
        clockInLat: latitude,
        clockInLng: longitude,
        status: 'active',
      },
    });

    return NextResponse.json({ shift });
  } catch (error) {
    console.error('[employee/shift POST] error:', error);
    return NextResponse.json({ error: 'Failed to clock in' }, { status: 500 });
  }
}

/**
 * PATCH /api/employee/shift
 * Body: { action: 'break' | 'resume' | 'clockout', latitude?, longitude? }
 * Updates the active shift.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const employee = await resolveEmployee(user);
    if (!employee) {
      return NextResponse.json({ error: 'No employee record linked to your account' }, { status: 404 });
    }

    const body = await request.json();
    const { action, latitude, longitude } = body as {
      action: 'break' | 'resume' | 'clockout';
      latitude?: number;
      longitude?: number;
    };

    if (!action || !['break', 'resume', 'clockout'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const shift = await db.employeeShift.findFirst({
      where: {
        employeeId: employee.id,
        status: { in: ['active', 'on_break'] },
      },
      orderBy: { clockIn: 'desc' },
    });
    if (!shift) {
      return NextResponse.json({ error: 'No active shift to update' }, { status: 404 });
    }

    const now = new Date();
    const breaks = parseBreaks(shift.breaksJson);

    if (action === 'break') {
      if (shift.status === 'on_break') {
        return NextResponse.json({ error: 'Already on break' }, { status: 400 });
      }
      breaks.push({ start: now.toISOString(), end: null, durationMinutes: 0, reason: 'manual' });
      const updated = await db.employeeShift.update({
        where: { id: shift.id },
        data: {
          status: 'on_break',
          breaksJson: JSON.stringify(breaks),
        },
      });
      return NextResponse.json({ shift: updated });
    }

    if (action === 'resume') {
      if (shift.status !== 'on_break') {
        return NextResponse.json({ error: 'Not on break' }, { status: 400 });
      }
      // Close the latest open break
      const openIdx = [...breaks].reverse().findIndex((b) => !b.end);
      if (openIdx >= 0) {
        const realIdx = breaks.length - 1 - openIdx;
        breaks[realIdx].end = now.toISOString();
        breaks[realIdx].durationMinutes = Math.max(
          1,
          Math.round((now.getTime() - new Date(breaks[realIdx].start).getTime()) / 60000),
        );
      }
      const updated = await db.employeeShift.update({
        where: { id: shift.id },
        data: {
          status: 'active',
          breaksJson: JSON.stringify(breaks),
        },
      });
      return NextResponse.json({ shift: updated });
    }

    // clockout
    // Close any open break
    const openBreakIdx = breaks.findIndex((b) => !b.end);
    if (openBreakIdx >= 0) {
      breaks[openBreakIdx].end = now.toISOString();
      breaks[openBreakIdx].durationMinutes = Math.max(
        1,
        Math.round((now.getTime() - new Date(breaks[openBreakIdx].start).getTime()) / 60000),
      );
    }

    // Defensive: Supabase (PostgREST) returns clockIn as an ISO string, not a
    // JS Date. Wrap in new Date() so .getTime() works in both environments.
    const clockInDate = new Date(shift.clockIn as unknown as string);
    const totalMinutes = Math.max(1, Math.round((now.getTime() - clockInDate.getTime()) / 60000));
    const breakMinutes = breaks.reduce((sum, b) => sum + (b.durationMinutes || 0), 0);
    const workingMinutes = Math.max(0, totalMinutes - breakMinutes);

    const updated = await db.employeeShift.update({
      where: { id: shift.id },
      data: {
        status: 'completed',
        clockOut: now,
        clockOutLat: typeof latitude === 'number' ? latitude : null,
        clockOutLng: typeof longitude === 'number' ? longitude : null,
        breaksJson: JSON.stringify(breaks),
        totalMinutes,
        workingMinutes,
        breakMinutes,
      },
    });

    return NextResponse.json({ shift: updated });
  } catch (error) {
    console.error('[employee/shift PATCH] error:', error);
    return NextResponse.json({ error: 'Failed to update shift' }, { status: 500 });
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

interface BreakEntry {
  start: string;
  end: string | null;
  durationMinutes: number;
  reason?: string;
}

function parseBreaks(json: string): BreakEntry[] {
  try {
    const parsed = JSON.parse(json || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Resolve the current employee for the auth user. Looks for an Employee row
 * linked via `userId`. If none, falls back to any employee in the user's
 * workspace (so owners browsing the portal still see something useful).
 */
export async function resolveEmployee(user: {
  id: string;
  employeeId?: string | null;
  workspaceId?: string | null;
  tenantId?: string | null;
}) {
  // 1. Direct employeeId claim
  if (user.employeeId) {
    const direct = await db.employee.findUnique({ where: { id: user.employeeId } });
    if (direct) return direct;
  }

  // 2. Linked via userId
  const linked = await db.employee.findFirst({ where: { userId: user.id } });
  if (linked) return linked;

  // 3. Fall back: any employee in the user's workspace
  if (user.workspaceId) {
    const fallback = await db.employee.findFirst({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: 'asc' },
    });
    if (fallback) return fallback;
  }

  return null;
}
