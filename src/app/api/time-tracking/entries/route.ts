import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * Time-tracking entries API — Jobber-style manual entry CRUD.
 *
 *   POST  /api/time-tracking/entries          — add a manual entry (admin/owner/manager)
 *   GET   /api/time-tracking/entries          — list entries for a date range
 *   GET   /api/time-tracking/entries/:id      — fetch a single entry   (separate file)
 *   PUT   /api/time-tracking/entries/:id      — edit an entry           (separate file)
 *   DELETE /api/time-tracking/entries/:id     — delete an entry         (separate file)
 *
 * Supabase-safe: we use `findFirst`/`create`/`updateMany`/`findMany` only.
 * No `upsert`, no compound-unique keys, no raw SQL.
 */

interface ShiftRow {
  id: string;
  tenantId: string;
  employeeId: string;
  shiftDate: Date | string;
  clockIn: Date | string;
  clockOut: Date | string | null;
  breaksJson: string;
  totalMinutes: number;
  workingMinutes: number;
  breakMinutes: number;
  travelMinutes: number;
  clockInLat: number | null;
  clockInLng: number | null;
  clockOutLat: number | null;
  clockOutLng: number | null;
  status: string;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  category: string;
  jobId: string | null;
  isManual: boolean;
  approvalStatus: string;
  approvedBy: string | null;
  approvedAt: Date | string | null;
  editHistoryJson: string;
}

/** Always return an ISO string for any date-shaped value. */
function toIso(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  try {
    return value.toISOString();
  } catch {
    return null;
  }
}

/** Serialize a shift row for the API response. */
function serializeShift(row: ShiftRow) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    employeeId: row.employeeId,
    shiftDate: toIso(row.shiftDate),
    clockIn: toIso(row.clockIn),
    clockOut: toIso(row.clockOut),
    breaksJson: row.breaksJson,
    totalMinutes: row.totalMinutes,
    workingMinutes: row.workingMinutes,
    breakMinutes: row.breakMinutes,
    travelMinutes: row.travelMinutes,
    clockInLat: row.clockInLat,
    clockInLng: row.clockInLng,
    clockOutLat: row.clockOutLat,
    clockOutLng: row.clockOutLng,
    status: row.status,
    notes: row.notes,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    category: row.category,
    jobId: row.jobId,
    isManual: row.isManual,
    approvalStatus: row.approvalStatus,
    approvedBy: row.approvedBy,
    approvedAt: toIso(row.approvedAt),
    editHistoryJson: row.editHistoryJson,
  };
}

/** Combine a 'YYYY-MM-DD' date with an 'HH:mm' time into a local Date. */
function combineDateTime(dateStr: string, timeStr: string): Date {
  // Be explicit about local time semantics. new Date('YYYY-MM-DDTHH:mm')
  // is parsed as local time per ES2015+, but constructing from parts is
  // even safer across runtimes.
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  if (!y || !m || !d || isNaN(hh) || isNaN(mm)) {
    throw new Error(`Invalid date/time: ${dateStr} ${timeStr}`);
  }
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

function safeParseJson<T>(str: string | null | undefined, fallback: T): T {
  try {
    return str ? (JSON.parse(str) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Auth: owner / admin / manager only (employees can't add time for others). */
function requireManager(role: string | undefined): boolean {
  return role !== 'employee' && role !== 'customer';
}

// ─── POST — add a manual time entry ──────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!requireManager(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden — only owners, admins and managers can add manual time entries' },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const {
      employeeId,
      jobId,
      category,
      startDate,
      startTime,
      endTime,
      notes,
    } = body as {
      employeeId?: string;
      jobId?: string | null;
      category?: string;
      startDate?: string;
      startTime?: string;
      endTime?: string;
      notes?: string;
    };

    // 1. Validate required fields.
    const missing: string[] = [];
    if (!employeeId) missing.push('employeeId');
    if (!category) missing.push('category');
    if (!startDate) missing.push('startDate');
    if (!startTime) missing.push('startTime');
    if (!endTime) missing.push('endTime');
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate date/time formats before constructing Date.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate as string)) {
      return NextResponse.json({ error: 'startDate must be YYYY-MM-DD' }, { status: 400 });
    }
    if (!/^\d{2}:\d{2}$/.test(startTime as string) || !/^\d{2}:\d{2}$/.test(endTime as string)) {
      return NextResponse.json(
        { error: 'startTime and endTime must be HH:mm (24h)' },
        { status: 400 },
      );
    }

    let clockIn: Date;
    let clockOut: Date;
    try {
      clockIn = combineDateTime(startDate as string, startTime as string);
      clockOut = combineDateTime(startDate as string, endTime as string);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid date/time';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // If endTime < startTime, assume end is the next day.
    if (clockOut.getTime() < clockIn.getTime()) {
      clockOut = new Date(clockOut.getTime() + 24 * 60 * 60 * 1000);
    }

    // 3. Compute minutes.
    const totalMinutes = Math.max(0, Math.round((clockOut.getTime() - clockIn.getTime()) / 60000));
    const workingMinutes = totalMinutes; // no breaks for manual entries
    const breakMinutes = 0;
    const travelMinutes = category === 'driving' ? totalMinutes : 0;

    // 4. Create the shift row.
    const created = await db.employeeShift.create({
      data: {
        tenantId: user.tenantId || 'default',
        employeeId: employeeId as string,
        jobId: jobId || null,
        category: category as string,
        notes: notes || null,
        shiftDate: clockIn,
        clockIn,
        clockOut,
        totalMinutes,
        workingMinutes,
        breakMinutes,
        travelMinutes,
        status: 'completed', // manual entries are immediately complete
        isManual: true,
        approvalStatus: 'pending',
      },
    });

    // 5. Return 201 with serialized row.
    return NextResponse.json(
      { entry: serializeShift(created as unknown as ShiftRow) },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create time entry';
    console.error('[time-tracking/entries POST]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── GET — list time entries for a date range ────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!requireManager(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden — only owners, admins and managers can list team entries' },
        { status: 403 },
      );
    }

    const tenantId = user.tenantId || 'default';
    const { searchParams } = new URL(request.url);
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');
    const employeeId = searchParams.get('employeeId');

    if (!fromStr || !toStr) {
      return NextResponse.json({ error: 'Missing required query params: from, to' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromStr) || !/^\d{4}-\d{2}-\d{2}$/.test(toStr)) {
      return NextResponse.json({ error: 'from and to must be YYYY-MM-DD' }, { status: 400 });
    }

    // Build the date range: from = start of from-day (00:00 local),
    // to = start of (to-day + 1) (so we include the entire to-day).
    const [fy, fm, fd] = fromStr.split('-').map(Number);
    const [ty, tm, td] = toStr.split('-').map(Number);
    const fromStart = new Date(fy, fm - 1, fd, 0, 0, 0, 0);
    const toEnd = new Date(ty, tm - 1, td + 1, 0, 0, 0, 0); // +1 day

    const shifts = await db.employeeShift.findMany({
      where: {
        tenantId,
        clockIn: { gte: fromStart, lt: toEnd },
        ...(employeeId ? { employeeId } : {}),
      },
      orderBy: { clockIn: 'desc' },
      take: 1000,
    });

    if (shifts.length === 0) {
      return NextResponse.json({ entries: [] });
    }

    // Manual employee lookup (Supabase-safe — no reliance on Prisma `include`).
    const employeeIds = Array.from(new Set(shifts.map((s) => s.employeeId)));
    const employees = await db.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, name: true, role: true, avatar: true },
    });
    const empMap = new Map(employees.map((e) => [e.id, e]));

    const entries = shifts.map((s) => {
      const serialized = serializeShift(s as unknown as ShiftRow);
      const emp = empMap.get(s.employeeId);
      return {
        ...serialized,
        employeeName: emp?.name ?? null,
        employeeRole: emp?.role ?? null,
        employeeAvatar: emp?.avatar ?? null,
        editHistory: safeParseJson(serialized.editHistoryJson, [] as unknown[]),
      };
    });

    return NextResponse.json({ entries });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list time entries';
    console.error('[time-tracking/entries GET]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
