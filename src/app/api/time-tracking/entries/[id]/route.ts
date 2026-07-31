import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * Single-entry CRUD endpoints.
 *
 *   GET    /api/time-tracking/entries/:id  — fetch one entry (for the edit dialog)
 *   PUT    /api/time-tracking/entries/:id  — edit an entry
 *   DELETE /api/time-tracking/entries/:id  — delete an entry
 *
 * Supabase-safe: `findFirst` by id, `update`, `delete`. No `upsert`, no raw SQL.
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

interface EditHistoryEntry {
  at: string;
  by: string;
  byName?: string;
  field: string;
  prev: string;
  next: string;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  try {
    return value.toISOString();
  } catch {
    return null;
  }
}

function toDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  return new Date(value);
}

function safeParseJson<T>(str: string | null | undefined, fallback: T): T {
  try {
    return str ? (JSON.parse(str) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Format a Date as 'YYYY-MM-DD' in local time. */
function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Format a Date as 'HH:mm' in local time. */
function toLocalTimeString(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Combine 'YYYY-MM-DD' + 'HH:mm' into a local Date. */
function combineDateTime(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  if (!y || !m || !d || isNaN(hh) || isNaN(mm)) {
    throw new Error(`Invalid date/time: ${dateStr} ${timeStr}`);
  }
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

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

function requireManager(role: string | undefined): boolean {
  return role !== 'employee' && role !== 'customer';
}

/** Fetch the entry, scoped to the caller's tenant. Returns null if not found. */
async function fetchEntryForUser(id: string, tenantId: string | null) {
  return db.employeeShift.findFirst({
    where: { id, tenantId: tenantId || 'default' },
  });
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!requireManager(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden — only owners, admins and managers can view time entries' },
        { status: 403 },
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing entry id' }, { status: 400 });
    }

    const entry = await fetchEntryForUser(id, user.tenantId);
    if (!entry) {
      return NextResponse.json({ error: 'Time entry not found' }, { status: 404 });
    }

    // Look up the employee name separately (Supabase-safe — no `include`).
    const employee = entry.employeeId
      ? await db.employee.findFirst({
          where: { id: entry.employeeId },
          select: { id: true, name: true, role: true, avatar: true },
        })
      : null;

    const serialized = serializeShift(entry as unknown as ShiftRow);
    return NextResponse.json({
      entry: {
        ...serialized,
        employeeName: employee?.name ?? null,
        employeeRole: employee?.role ?? null,
        employeeAvatar: employee?.avatar ?? null,
        editHistory: safeParseJson<EditHistoryEntry[]>(serialized.editHistoryJson, []),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch time entry';
    console.error('[time-tracking/entries/:id GET]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PUT ─────────────────────────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!requireManager(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden — only owners, admins and managers can edit time entries' },
        { status: 403 },
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing entry id' }, { status: 400 });
    }

    const existing = await fetchEntryForUser(id, user.tenantId);
    if (!existing) {
      return NextResponse.json({ error: 'Time entry not found' }, { status: 404 });
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

    // Existing clockIn / clockOut (defensive — Supabase returns ISO strings).
    const existingClockIn = toDate(existing.clockIn as unknown as string);
    const existingClockOut = existing.clockOut ? toDate(existing.clockOut as unknown as string) : null;

    // Derive current date/time parts (used as fallbacks for partial updates).
    const existingStartDate = toLocalDateString(existingClockIn);
    const existingStartTime = toLocalTimeString(existingClockIn);
    const existingEndTime = existingClockOut ? toLocalTimeString(existingClockOut) : null;

    // 2. If the entry is a running timer, only notes + clockIn (startDate/startTime) can be edited.
    const isActive = existing.status === 'active' || existing.status === 'on_break';
    if (isActive) {
      const forbidden: string[] = [];
      if (employeeId !== undefined && employeeId !== existing.employeeId) forbidden.push('employeeId');
      const newJobId = jobId !== undefined ? (jobId || null) : existing.jobId;
      if (jobId !== undefined && newJobId !== (existing.jobId || null)) forbidden.push('jobId');
      if (category !== undefined && category !== existing.category) forbidden.push('category');
      if (endTime !== undefined) forbidden.push('endTime');
      if (forbidden.length > 0) {
        return NextResponse.json(
          {
            error:
              `While the timer is currently running, only the start time and notes can be edited. ` +
              `Cannot change: ${forbidden.join(', ')}.`,
          },
          { status: 400 },
        );
      }
    }

    // Compute the final field values.
    const finalEmployeeId = employeeId !== undefined ? employeeId : existing.employeeId;
    const finalJobId = jobId !== undefined ? (jobId || null) : existing.jobId;
    const finalCategory = category !== undefined ? category : existing.category;
    const finalNotes = notes !== undefined ? (notes || null) : existing.notes;

    // For active timers, we don't change clockOut/totals.
    let newClockIn: Date;
    let newClockOut: Date | null = existingClockOut;
    let newTotalMinutes = existing.totalMinutes;
    let newWorkingMinutes = existing.workingMinutes;
    let newBreakMinutes = existing.breakMinutes;
    let newTravelMinutes = existing.travelMinutes;

    // Validate date/time formats if provided.
    if (startDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return NextResponse.json({ error: 'startDate must be YYYY-MM-DD' }, { status: 400 });
    }
    if (startTime !== undefined && !/^\d{2}:\d{2}$/.test(startTime)) {
      return NextResponse.json({ error: 'startTime must be HH:mm' }, { status: 400 });
    }
    if (endTime !== undefined && !/^\d{2}:\d{2}$/.test(endTime)) {
      return NextResponse.json({ error: 'endTime must be HH:mm' }, { status: 400 });
    }

    const finalStartDate = startDate ?? existingStartDate;
    const finalStartTime = startTime ?? existingStartTime;

    try {
      newClockIn = combineDateTime(finalStartDate, finalStartTime);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid start date/time';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (!isActive) {
      // For completed entries, re-derive clockOut + minutes.
      const finalEndTime = endTime ?? existingEndTime ?? finalStartTime;
      try {
        newClockOut = combineDateTime(finalStartDate, finalEndTime);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Invalid end date/time';
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      if (newClockOut.getTime() < newClockIn.getTime()) {
        newClockOut = new Date(newClockOut.getTime() + 24 * 60 * 60 * 1000);
      }
      newTotalMinutes = Math.max(0, Math.round((newClockOut.getTime() - newClockIn.getTime()) / 60000));
      // Same logic as POST: manual entries have no breaks.
      newWorkingMinutes = newTotalMinutes;
      newBreakMinutes = 0;
      newTravelMinutes = finalCategory === 'driving' ? newTotalMinutes : 0;
    }

    // 4. Build edit-history entries for each changed field.
    const editHistory = safeParseJson<EditHistoryEntry[]>(existing.editHistoryJson, []);
    const byName = user.name || user.email;
    const nowIso = new Date().toISOString();

    const pushChange = (field: string, prev: unknown, next: unknown) => {
      const prevStr = prev === null || prev === undefined ? '' : String(prev);
      const nextStr = next === null || next === undefined ? '' : String(next);
      if (prevStr === nextStr) return;
      editHistory.push({ at: nowIso, by: user.id, byName, field, prev: prevStr, next: nextStr });
    };

    pushChange('employeeId', existing.employeeId, finalEmployeeId);
    pushChange('jobId', existing.jobId, finalJobId);
    pushChange('category', existing.category, finalCategory);
    pushChange('notes', existing.notes, finalNotes);
    pushChange('clockIn', toIso(existingClockIn), toIso(newClockIn));
    if (!isActive) {
      pushChange('clockOut', toIso(existingClockOut), toIso(newClockOut));
      pushChange('totalMinutes', existing.totalMinutes, newTotalMinutes);
      pushChange('workingMinutes', existing.workingMinutes, newWorkingMinutes);
      pushChange('breakMinutes', existing.breakMinutes, newBreakMinutes);
      pushChange('travelMinutes', existing.travelMinutes, newTravelMinutes);
    }

    // Cap at 100 entries — drop the oldest.
    while (editHistory.length > 100) {
      editHistory.shift();
    }

    // 5. Reset approvalStatus to 'pending' if it was 'approved'.
    const newApprovalStatus =
      existing.approvalStatus === 'approved' ? 'pending' : existing.approvalStatus;

    // 6. Update the row.
    const updated = await db.employeeShift.update({
      where: { id },
      data: {
        employeeId: finalEmployeeId,
        jobId: finalJobId,
        category: finalCategory,
        notes: finalNotes,
        clockIn: newClockIn,
        clockOut: newClockOut,
        totalMinutes: newTotalMinutes,
        workingMinutes: newWorkingMinutes,
        breakMinutes: newBreakMinutes,
        travelMinutes: newTravelMinutes,
        approvalStatus: newApprovalStatus,
        editHistoryJson: JSON.stringify(editHistory),
      },
    });

    return NextResponse.json({ entry: serializeShift(updated as unknown as ShiftRow) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update time entry';
    console.error('[time-tracking/entries/:id PUT]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!requireManager(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden — only owners, admins and managers can delete time entries' },
        { status: 403 },
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing entry id' }, { status: 400 });
    }

    const existing = await fetchEntryForUser(id, user.tenantId);
    if (!existing) {
      return NextResponse.json({ error: 'Time entry not found' }, { status: 404 });
    }

    // 2. Cannot delete a running timer.
    if (existing.status === 'active' || existing.status === 'on_break') {
      return NextResponse.json(
        { error: 'Time entries cannot be deleted while the timer is currently running.' },
        { status: 400 },
      );
    }

    await db.employeeShift.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete time entry';
    console.error('[time-tracking/entries/:id DELETE]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
