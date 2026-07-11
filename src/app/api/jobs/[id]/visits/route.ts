import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

/**
 * Resolves a tenant ID from the auth user, falling back to the first tenant
 * for demo / cookieless sessions.
 */
async function resolveTenantId(authUser: Awaited<ReturnType<typeof getAuthUser>>): Promise<string | null> {
  if (authUser?.tenantId) {
    return authUser.tenantId;
  }
  try {
    const firstTenant = await db.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
    if (firstTenant) {
      return firstTenant.id;
    }
  } catch {
    // DB lookup failed
  }
  return null;
}

/**
 * Compute the next sequential visit number for a job (1, 2, 3 ...).
 * Uses max(jobVisitNumber) + 1 so deleted visits don't shift numbering.
 */
async function nextVisitNumber(jobId: string): Promise<number> {
  try {
    const last = await db.jobVisit.findFirst({
      where: { jobId },
      orderBy: { jobVisitNumber: 'desc' },
      select: { jobVisitNumber: true },
    });
    return (last?.jobVisitNumber ?? 0) + 1;
  } catch {
    return 1;
  }
}

/**
 * Generate expanded visit dates from a repeat rule.
 * Returns an array of Date objects (the start date + each recurrence).
 * Capped at 60 occurrences to protect against runaway rules.
 */
function expandRepeatDates(
  startDate: Date,
  repeats: string,
  interval: number,
  repeatUntil: Date | null,
  weekdays: number[],
): Date[] {
  if (repeats === 'none' || interval < 1) return [startDate];
  const dates: Date[] = [startDate];
  const cap = 60;
  const hardStop = repeatUntil
    ? new Date(Math.min(repeatUntil.getTime(), startDate.getTime() + 365 * 24 * 60 * 60 * 1000))
    : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

  if (repeats === 'daily') {
    let cursor = new Date(startDate.getTime() + interval * 24 * 60 * 60 * 1000);
    while (cursor <= hardStop && dates.length < cap) {
      dates.push(new Date(cursor));
      cursor = new Date(cursor.getTime() + interval * 24 * 60 * 60 * 1000);
    }
  } else if (repeats === 'weekly') {
    if (weekdays.length > 0) {
      // Weekly on specific weekdays — iterate day by day.
      let cursor = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
      while (cursor <= hardStop && dates.length < cap) {
        const wd = cursor.getDay();
        if (weekdays.includes(wd)) {
          dates.push(new Date(cursor));
        }
        cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
      }
    } else {
      // Weekly on the same weekday as start, every N weeks.
      let cursor = new Date(startDate.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
      while (cursor <= hardStop && dates.length < cap) {
        dates.push(new Date(cursor));
        cursor = new Date(cursor.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
      }
    }
  } else if (repeats === 'monthly') {
    // Monthly: same day-of-month, every N months.
    const baseDay = startDate.getDate();
    let monthsAdded = interval;
    while (dates.length < cap) {
      const next = new Date(startDate.getFullYear(), startDate.getMonth() + monthsAdded, baseDay, startDate.getHours(), startDate.getMinutes());
      if (next > hardStop) break;
      // Skip invalid month-overflow (e.g. Feb 30) — Date rolls over, so guard.
      if (next.getDate() === baseDay) {
        dates.push(next);
      }
      monthsAdded += interval;
    }
  }
  return dates;
}

/**
 * GET /api/jobs/[id]/visits
 * List all visits for a job, ordered by scheduledDate asc.
 *
 * Query: status (optional filter)
 */
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
    if (!jobId) {
      return NextResponse.json({ error: 'Job id is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: Record<string, unknown> = { jobId };
    if (status && status !== 'all') where.status = status;

    const visits = await db.jobVisit.findMany({
      where,
      orderBy: [{ scheduledDate: 'asc' }, { jobVisitNumber: 'asc' }],
      take: 500,
    });

    return NextResponse.json({ visits });
  } catch (error) {
    console.error('Error fetching job visits:', error);
    return NextResponse.json({ error: 'Failed to fetch visits' }, { status: 500 });
  }
}

/**
 * POST /api/jobs/[id]/visits
 * Create one or more visits for a job.
 *
 * If `repeats` != "none", expands the rule into multiple visit rows
 * (one per occurrence, sharing the same title/instructions/assignment).
 *
 * Body:
 *   title, instructions, scheduledDate, endDate?, scheduledTime?, endTime?,
 *   anytime, scheduleLater, repeats, repeatInterval, repeatWeekdays, repeatUntil,
 *   assigneeIds[], emailTeam, teamReminder, checklistIds[]
 *
 * Returns: { visits: JobVisit[], created: number }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { id: jobId } = await params;
    if (!jobId) {
      return NextResponse.json({ error: 'Job id is required' }, { status: 400 });
    }

    const body = await request.json();
    const {
      title,
      instructions,
      scheduledDate,
      endDate,
      scheduledTime,
      endTime,
      anytime = true,
      scheduleLater = false,
      repeats = 'none',
      repeatInterval = 1,
      repeatWeekdays = [],
      repeatUntil,
      assigneeIds = [],
      emailTeam = false,
      teamReminder = 'none',
      checklistIds = [],
    } = body;

    if (!scheduledDate && !scheduleLater) {
      return NextResponse.json({ error: 'scheduledDate is required (or set scheduleLater)' }, { status: 400 });
    }

    const tenantId = await resolveTenantId(authUser);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    // Verify the job exists. (Job has no tenantId column — it links via workspaceId,
    // so we look up by id only. Tenant scoping is enforced on the JobVisit rows.)
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: { id: true, title: true, customerName: true },
    });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Resolve assignee names for denormalized storage.
    let assigneeNames: string[] = [];
    if (Array.isArray(assigneeIds) && assigneeIds.length > 0) {
      try {
        const emps = await db.employee.findMany({
          where: { id: { in: assigneeIds as string[] } },
          select: { id: true, name: true },
        });
        // Preserve the order requested by the caller.
        assigneeNames = (assigneeIds as string[])
          .map((id) => emps.find((e) => e.id === id)?.name)
          .filter((n): n is string => Boolean(n));
      } catch {
        // ignore — names will just be empty
      }
    }

    const startDate = scheduleLater ? new Date() : new Date(scheduledDate);
    const endDateParsed = endDate ? new Date(endDate) : null;
    const repeatUntilDate = repeatUntil ? new Date(repeatUntil) : null;

    // Expand repeat rule into one date per occurrence.
    const occurrenceDates = expandRepeatDates(
      startDate,
      String(repeats),
      Number(repeatInterval) || 1,
      repeatUntilDate,
      Array.isArray(repeatWeekdays) ? (repeatWeekdays as number[]) : [],
    );

    const baseVisitNumber = await nextVisitNumber(jobId);

    // Build all the visit rows.
    const visitRows = occurrenceDates.map((occDate, idx) => ({
      jobVisitNumber: baseVisitNumber + idx,
      tenantId,
      jobId,
      title: String(title || '').trim() || `${job.customerName || job.title || 'Visit'} - Visit ${baseVisitNumber + idx}`,
      instructions: instructions ? String(instructions).trim() : null,
      scheduledDate: occDate,
      endDate: endDateParsed,
      scheduledTime: anytime ? null : (scheduledTime || null),
      endTime: anytime ? null : (endTime || null),
      anytime: Boolean(anytime),
      scheduleLater: Boolean(scheduleLater),
      repeats: 'none', // the generated visits themselves do not repeat
      repeatInterval: 1,
      repeatWeekdays: '[]',
      repeatUntil: null,
      assigneeIdsJson: JSON.stringify(assigneeIds as string[]),
      assigneeNamesJson: JSON.stringify(assigneeNames),
      emailTeam: Boolean(emailTeam),
      teamReminder: String(teamReminder || 'none'),
      checklistIdsJson: JSON.stringify(
        Array.isArray(checklistIds) ? (checklistIds as string[]) : [],
      ),
      status: 'scheduled',
    }));

    // Create each row individually so we can return them to the client.
    // Acceptable for ≤60 rows (the expansion cap).
    const created: Array<Awaited<ReturnType<typeof db.jobVisit.create>>> = [];
    for (const row of visitRows) {
      try {
        const v = await db.jobVisit.create({ data: row });
        created.push(v);
      } catch (err) {
        console.error('[Visits POST] create failed for row', row.jobVisitNumber, err);
      }
    }

    // If this is the first visit for the job, mirror it onto Job.scheduledAt /
    // Job.scheduledTime / Job.visitInstructions for backward compatibility with
    // any code that still reads those legacy fields.
    if (created.length > 0 && created[0].jobVisitNumber === 1) {
      try {
        await db.job.update({
          where: { id: jobId },
          data: {
            scheduledAt: created[0].scheduledDate,
            scheduledTime: created[0].anytime ? null : created[0].scheduledTime,
            visitInstructions: created[0].instructions,
          },
        });
      } catch (err) {
        console.error('[Visits POST] failed to mirror first visit onto Job:', err);
      }
    }

    // Best-effort activity log
    try {
      await logActivity({
        tenantId: tenantId ?? '',
        actorId: authUser.id,
        actorName: authUser.name || authUser.email,
        actorType: 'user',
        action: 'create',
        entityType: 'jobVisit',
        entityId: jobId,
        entityName: job.title || jobId,
        description: `Created ${created.length} visit${created.length === 1 ? '' : 's'} for job "${job.title || jobId}"${repeats !== 'none' ? ` (repeats ${repeats})` : ''}`,
        metadataJson: JSON.stringify({
          jobId,
          count: created.length,
          repeats,
          firstDate: created[0]?.scheduledDate,
          assigneeIds: assigneeIds as string[],
        }),
        severity: 'info',
      });
    } catch (logErr) {
      console.error('[Visits POST] activity log failed:', logErr);
    }

    return NextResponse.json({ visits: created, created: created.length }, { status: 201 });
  } catch (error) {
    console.error('Error creating job visits:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to create visits', message: process.env.NODE_ENV === 'production' ? undefined : message },
      { status: 500 },
    );
  }
}
