import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * Employee Shift Time Tracking
 * ----------------------------
 *   GET    /api/time-tracking/shift            → current user's active shift (active|on_break), or null
 *   POST   /api/time-tracking/shift            → clock in   body: { latitude?, longitude? }
 *   PATCH  /api/time-tracking/shift            → update     body: { action: 'break'|'resume'|'clockout', latitude?, longitude? }
 *
 * Breaks are stored on EmployeeShift.breaksJson as an array of
 *   { start: ISO, end: ISO|null, durationMinutes: number|null, reason?: string }
 *
 * Totals (totalMinutes / workingMinutes / breakMinutes) are computed at
 * clock-out and persisted on the shift row.
 */

// ─── Helpers ───────────────────────────────────────────────────────────────

function safeParseJson<T>(str: string | null | undefined, fallback: T): T {
  try {
    return str ? (JSON.parse(str) as T) : fallback;
  } catch {
    return fallback;
  }
}

interface BreakEntry {
  start: string;
  end?: string | null;
  durationMinutes?: number | null;
  reason?: string | null;
}

/**
 * Resolve the Employee row for the current authenticated user (if any).
 */
async function resolveCurrentEmployee(authUser: Awaited<ReturnType<typeof getAuthUser>>) {
  if (!authUser) return null;
  if (authUser.employeeId) {
    try {
      return await db.employee.findUnique({ where: { id: authUser.employeeId } });
    } catch {
      // fall through
    }
  }
  try {
    return await db.employee.findFirst({ where: { email: authUser.email } });
  } catch {
    return null;
  }
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

function computeBreakMinutes(breaks: BreakEntry[], now: Date = new Date(), shiftEndedAt: Date | null = null): number {
  let totalMs = 0;
  for (const b of breaks) {
    if (!b.start) continue;
    const start = new Date(b.start).getTime();
    const end = b.end ? new Date(b.end).getTime() : (shiftEndedAt ?? now).getTime();
    if (end > start) totalMs += end - start;
  }
  return Math.round(totalMs / 60000);
}

// ─── GET — active shift ─────────────────────────────────────────────────────

export async function GET(_request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const employee = await resolveCurrentEmployee(authUser);
    if (!employee) {
      return NextResponse.json({ shift: null, message: 'No employee record for this user' });
    }

    const shift = await db.employeeShift.findFirst({
      where: {
        employeeId: employee.id,
        status: { in: ['active', 'on_break'] },
      },
      orderBy: { clockIn: 'desc' },
    });

    if (!shift) {
      return NextResponse.json({ shift: null });
    }

    return NextResponse.json({ shift });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch shift';
    console.error('[Shift GET]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST — clock in ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const employee = await resolveCurrentEmployee(authUser);
    if (!employee) {
      return NextResponse.json({ error: 'No employee record for this user' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { latitude, longitude } = (body ?? {}) as { latitude?: number; longitude?: number };

    // Don't allow clock-in if there's already an active shift.
    const existing = await db.employeeShift.findFirst({
      where: { employeeId: employee.id, status: { in: ['active', 'on_break'] } },
      orderBy: { clockIn: 'desc' },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Already clocked in. Clock out first.', shift: existing },
        { status: 400 },
      );
    }

    const tenantId = await resolveTenantId(employee.workspaceId);
    const now = new Date();

    const shift = await db.employeeShift.create({
      data: {
        tenantId: tenantId ?? 'unknown',
        employeeId: employee.id,
        shiftDate: now,
        clockIn: now,
        status: 'active',
        breaksJson: '[]',
        clockInLat: latitude ?? null,
        clockInLng: longitude ?? null,
      },
    });

    return NextResponse.json({ shift });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to clock in';
    console.error('[Shift POST]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PATCH — break / resume / clockout ──────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const employee = await resolveCurrentEmployee(authUser);
    if (!employee) {
      return NextResponse.json({ error: 'No employee record for this user' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, latitude, longitude, reason } = (body ?? {}) as {
      action?: 'break' | 'resume' | 'clockout';
      latitude?: number;
      longitude?: number;
      reason?: string;
    };

    if (!action || !['break', 'resume', 'clockout'].includes(action)) {
      return NextResponse.json({ error: 'action must be one of: break, resume, clockout' }, { status: 400 });
    }

    const shift = await db.employeeShift.findFirst({
      where: { employeeId: employee.id, status: { in: ['active', 'on_break'] } },
      orderBy: { clockIn: 'desc' },
    });

    if (!shift) {
      return NextResponse.json({ error: 'No active shift to update' }, { status: 404 });
    }

    const now = new Date();
    const breaks = safeParseJson<BreakEntry[]>(shift.breaksJson, []);

    if (action === 'break') {
      if (shift.status !== 'active') {
        return NextResponse.json({ error: 'Shift is not active — cannot start a break' }, { status: 400 });
      }
      breaks.push({ start: now.toISOString(), end: null, durationMinutes: null, reason: reason ?? null });
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
        return NextResponse.json({ error: 'Shift is not on break — cannot resume' }, { status: 400 });
      }
      // Close the most recent open break.
      for (let i = breaks.length - 1; i >= 0; i--) {
        if (!breaks[i].end) {
          breaks[i].end = now.toISOString();
          breaks[i].durationMinutes = Math.round(
            (now.getTime() - new Date(breaks[i].start).getTime()) / 60000,
          );
          break;
        }
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

    // action === 'clockout'
    // Close any open break.
    for (const b of breaks) {
      if (!b.end) {
        b.end = now.toISOString();
        b.durationMinutes = Math.round(
          (now.getTime() - new Date(b.start).getTime()) / 60000,
        );
      }
    }

    const totalMinutes = Math.round((now.getTime() - shift.clockIn.getTime()) / 60000);
    const breakMinutes = computeBreakMinutes(breaks, now, now);
    const workingMinutes = Math.max(0, totalMinutes - breakMinutes);

    const updated = await db.employeeShift.update({
      where: { id: shift.id },
      data: {
        status: 'completed',
        clockOut: now,
        clockOutLat: latitude ?? null,
        clockOutLng: longitude ?? null,
        breaksJson: JSON.stringify(breaks),
        totalMinutes,
        workingMinutes,
        breakMinutes,
      },
    });

    return NextResponse.json({ shift: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update shift';
    console.error('[Shift PATCH]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
