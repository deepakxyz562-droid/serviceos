import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

/**
 * Job Time Entries (Labor section)
 * --------------------------------
 *   GET   /api/jobs/[id]/time-entries         → list all JobTimeEntry rows for a job
 *   POST  /api/jobs/[id]/time-entries         → manually log a completed time entry
 *       body: { employeeId, startedAt, endedAt, entryType?, notes? }
 *
 * Used by the Job Detail "Labor" section. Employees/owners can both read; only
 * owners/admins can manually create entries (employees use the live timer).
 */

async function resolveTenantId(authUser: Awaited<ReturnType<typeof getAuthUser>>): Promise<string | null> {
  if (authUser?.tenantId) return authUser.tenantId;
  try {
    const firstTenant = await db.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
    return firstTenant?.id ?? null;
  } catch {
    return null;
  }
}

function computeMinutes(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { id: jobId } = await params;

    const entries = await db.jobTimeEntry.findMany({
      where: { jobId },
      orderBy: { startedAt: 'desc' },
      take: 500,
    });

    // Resolve employee names (denormalized for fast render).
    const employeeIds = Array.from(new Set(entries.map((e) => e.employeeId).filter(Boolean)));
    let nameMap: Record<string, string> = {};
    if (employeeIds.length > 0) {
      try {
        const emps = await db.employee.findMany({
          where: { id: { in: employeeIds } },
          select: { id: true, name: true },
        });
        nameMap = Object.fromEntries(emps.map((e) => [e.id, e.name]));
      } catch {
        // ignore
      }
    }

    const enriched = entries.map((e) => ({
      ...e,
      employeeName: nameMap[e.employeeId] || 'Unknown',
    }));

    const totalMinutes = enriched.reduce(
      (sum, e) => sum + (e.entryType === 'work' ? e.workingMinutes || 0 : 0),
      0,
    );

    return NextResponse.json({
      entries: enriched,
      totals: {
        totalMinutes,
        totalWorkingMinutes: enriched.reduce((s, e) => s + (e.workingMinutes || 0), 0),
        totalTravelMinutes: enriched
          .filter((e) => e.entryType === 'travel')
          .reduce((s, e) => s + (e.workingMinutes || 0), 0),
        count: enriched.length,
      },
    });
  } catch (error) {
    console.error('Error fetching job time entries:', error);
    return NextResponse.json({ error: 'Failed to fetch time entries' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (authUser.role === 'employee') {
      return NextResponse.json(
        { error: 'Forbidden: employees must use the live timer to track time' },
        { status: 403 },
      );
    }
    const { id: jobId } = await params;

    const body = await request.json();
    const { employeeId, startedAt, endedAt, entryType = 'work', notes } = body;

    if (!employeeId || !startedAt || !endedAt) {
      return NextResponse.json(
        { error: 'employeeId, startedAt, and endedAt are required' },
        { status: 400 },
      );
    }

    const start = new Date(startedAt);
    const end = new Date(endedAt);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return NextResponse.json(
        { error: 'startedAt must be before endedAt, and both must be valid dates' },
        { status: 400 },
      );
    }

    const tenantId = await resolveTenantId(authUser);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    const durationMinutes = computeMinutes(start, end);

    const entry = await db.jobTimeEntry.create({
      data: {
        tenantId,
        jobId,
        employeeId,
        startedAt: start,
        endedAt: end,
        pausesJson: '[]',
        durationMinutes,
        pauseMinutes: 0,
        workingMinutes: durationMinutes,
        entryType: String(entryType || 'work'),
        status: 'completed',
        notes: notes ? String(notes) : null,
      },
    });

    try {
      await logActivity({
        tenantId,
        actorId: authUser.id,
        actorName: authUser.name || authUser.email,
        actorType: 'user',
        action: 'create',
        entityType: 'jobTimeEntry',
        entityId: entry.id,
        entityName: `Job ${jobId}`,
        description: `Manually logged ${durationMinutes} min (${entryType}) on job ${jobId}`,
        metadataJson: JSON.stringify({ jobId, employeeId, durationMinutes, entryType }),
        severity: 'info',
      });
    } catch (logErr) {
      console.error('[TimeEntries POST] activity log failed:', logErr);
    }

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error('Error creating time entry:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to create time entry', message: process.env.NODE_ENV === 'production' ? undefined : message },
      { status: 500 },
    );
  }
}
