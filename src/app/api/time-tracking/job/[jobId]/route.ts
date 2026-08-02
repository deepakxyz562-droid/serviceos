import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * Job Time Tracking
 * -----------------
 *   GET    /api/time-tracking/job/[jobId]   → active JobTimeEntry for this job + current user, or null
 *   POST   /api/time-tracking/job/[jobId]   → start a new JobTimeEntry { entryType? }
 *   PATCH  /api/time-tracking/job/[jobId]   → update { action: 'pause'|'resume'|'complete' }
 *
 * Pauses are stored on JobTimeEntry.pausesJson as:
 *   [{ start: ISO, end: ISO|null }]
 *
 * On 'complete', we compute and persist durationMinutes / pauseMinutes / workingMinutes.
 */

function safeParseJson<T>(str: string | null | undefined, fallback: T): T {
  try {
    return str ? (JSON.parse(str) as T) : fallback;
  } catch {
    return fallback;
  }
}

interface PauseEntry {
  start: string;
  end?: string | null;
}

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

function computePauseMinutes(
  pauses: PauseEntry[],
  now: Date = new Date(),
  entryEndedAt: Date | null = null,
): number {
  let totalMs = 0;
  for (const p of pauses) {
    if (!p.start) continue;
    const start = new Date(p.start).getTime();
    const end = p.end ? new Date(p.end).getTime() : (entryEndedAt ?? now).getTime();
    if (end > start) totalMs += end - start;
  }
  return Math.round(totalMs / 60000);
}

// ─── GET — active JobTimeEntry for this job + user ───────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const employee = await resolveCurrentEmployee(authUser);
    if (!employee) {
      return NextResponse.json({ timeEntry: null });
    }

    const timeEntry = await db.jobTimeEntry.findFirst({
      where: {
        jobId,
        employeeId: employee.id,
        status: { in: ['active', 'paused'] },
      },
      orderBy: { startedAt: 'desc' },
    });

    if (!timeEntry) {
      // Also return the most recent completed entry so the UI can show "last work session".
      const lastCompleted = await db.jobTimeEntry.findFirst({
        where: { jobId, employeeId: employee.id, status: 'completed' },
        orderBy: { endedAt: 'desc' },
      });
      return NextResponse.json({ timeEntry: null, lastCompleted });
    }

    return NextResponse.json({ timeEntry });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch time entry';
    console.error('[JobTime GET]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST — start a JobTimeEntry ─────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const employee = await resolveCurrentEmployee(authUser);
    if (!employee) {
      return NextResponse.json({ error: 'No employee record for this user' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { entryType } = (body ?? {}) as { entryType?: string };
    const validEntryType = entryType && ['work', 'travel', 'break'].includes(entryType) ? entryType : 'work';

    // Don't allow starting if there's already an active entry for this employee+job.
    const existing = await db.jobTimeEntry.findFirst({
      where: { jobId, employeeId: employee.id, status: { in: ['active', 'paused'] } },
      orderBy: { startedAt: 'desc' },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Already an active time entry for this job', timeEntry: existing },
        { status: 400 },
      );
    }

    const job = await db.job.findUnique({ where: { id: jobId }, select: { workspaceId: true } });
    const tenantId = await resolveTenantId(job?.workspaceId ?? employee.workspaceId);
    const now = new Date();

    const timeEntry = await db.jobTimeEntry.create({
      data: {
        tenantId: tenantId ?? 'unknown',
        jobId,
        employeeId: employee.id,
        startedAt: now,
        status: 'active',
        entryType: validEntryType,
        pausesJson: '[]',
      },
    });

    return NextResponse.json({ timeEntry });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to start time entry';
    console.error('[JobTime POST]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PATCH — pause / resume / complete ──────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const employee = await resolveCurrentEmployee(authUser);
    if (!employee) {
      return NextResponse.json({ error: 'No employee record for this user' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { action } = (body ?? {}) as { action?: 'pause' | 'resume' | 'complete' };

    if (!action || !['pause', 'resume', 'complete'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be one of: pause, resume, complete' },
        { status: 400 },
      );
    }

    const timeEntry = await db.jobTimeEntry.findFirst({
      where: { jobId, employeeId: employee.id, status: { in: ['active', 'paused'] } },
      orderBy: { startedAt: 'desc' },
    });

    if (!timeEntry) {
      return NextResponse.json({ error: 'No active time entry to update' }, { status: 404 });
    }

    const now = new Date();
    const pauses = safeParseJson<PauseEntry[]>(timeEntry.pausesJson, []);

    if (action === 'pause') {
      if (timeEntry.status !== 'active') {
        return NextResponse.json({ error: 'Time entry is not active — cannot pause' }, { status: 400 });
      }
      pauses.push({ start: now.toISOString(), end: null });
      const updated = await db.jobTimeEntry.update({
        where: { id: timeEntry.id },
        data: { status: 'paused', pausesJson: JSON.stringify(pauses) },
      });
      return NextResponse.json({ timeEntry: updated });
    }

    if (action === 'resume') {
      if (timeEntry.status !== 'paused') {
        return NextResponse.json({ error: 'Time entry is not paused — cannot resume' }, { status: 400 });
      }
      for (let i = pauses.length - 1; i >= 0; i--) {
        if (!pauses[i].end) {
          pauses[i].end = now.toISOString();
          break;
        }
      }
      const updated = await db.jobTimeEntry.update({
        where: { id: timeEntry.id },
        data: { status: 'active', pausesJson: JSON.stringify(pauses) },
      });
      return NextResponse.json({ timeEntry: updated });
    }

    // action === 'complete'
    // Close any open pause.
    for (const p of pauses) {
      if (!p.end) p.end = now.toISOString();
    }

    const durationMinutes = Math.round((now.getTime() - timeEntry.startedAt.getTime()) / 60000);
    const pauseMinutes = computePauseMinutes(pauses, now, now);
    const workingMinutes = Math.max(0, durationMinutes - pauseMinutes);

    const updated = await db.jobTimeEntry.update({
      where: { id: timeEntry.id },
      data: {
        endedAt: now,
        status: 'completed',
        durationMinutes,
        pauseMinutes,
        workingMinutes,
        pausesJson: JSON.stringify(pauses),
      },
    });

    return NextResponse.json({ timeEntry: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update time entry';
    console.error('[JobTime PATCH]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
