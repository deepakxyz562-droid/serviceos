import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { requirePlanFeature } from '@/lib/plan-gate';
import { createRecurringSchedule } from '@/lib/recurring-jobs';
import { logActivity } from '@/lib/activity-log';
import {
  calculateOccurrences,
  formatSchedulePreview,
  validateSchedule,
  type RecurrenceInput,
} from '@/lib/recurrence-engine';

// GET /api/recurring-jobs — List recurring job schedules for the tenant.
//   Query: active=true|false, customerId=...
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeFilter = searchParams.get('active'); // 'true' | 'false' | null
    const customerId = searchParams.get('customerId');

    const where: Record<string, unknown> = { tenantId: user.tenantId };
    if (activeFilter === 'true') where.active = true;
    if (activeFilter === 'false') where.active = false;
    if (customerId) where.customerId = customerId;

    // Fast-path: Postgres RPC (1 DB round trip for schedule list + customer + last job + counts)
    try {
      const rpcRes = await db.$queryRawUnsafe<Array<{ get_recurring_jobs: { schedules: any[] } }>>(
        `SELECT get_recurring_jobs($1, $2, $3);`,
        user.tenantId,
        activeFilter || '',
        customerId || ''
      );
      const rpcData = rpcRes?.[0]?.get_recurring_jobs;
      if (rpcData && Array.isArray(rpcData.schedules)) {
        return NextResponse.json({ schedules: rpcData.schedules });
      }
    } catch {
      // Fallback to optimized Prisma query below
    }

    const schedules = await db.recurringJobSchedule.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
      },
      orderBy: [{ active: 'desc' }, { nextRunAt: 'asc' }],
    });

    // For each schedule, look up its last-generated job (best-effort) so the
    // UI can render the "Last Run" column without an extra round-trip per row.
    const lastJobIds = schedules
      .map((s) => s.lastJobId)
      .filter((id): id is string => Boolean(id));

    // Also count generated jobs per schedule (for the "Generated" column).
    const scheduleIds = schedules.map((s) => s.id);

    // Resolve primary assignee name for each schedule (best-effort, in-memory).
    const allAssigneeIds = schedules.flatMap((s) => {
      try {
        const arr = JSON.parse(s.assigneeIdsJson || '[]');
        return Array.isArray(arr) ? (arr as string[]).slice(0, 1) : [];
      } catch {
        return [];
      }
    });
    const assigneeIds = Array.from(new Set(allAssigneeIds));

    // Execute secondary queries in parallel via Promise.all
    const [lastJobs, generatedCounts, employees] = await Promise.all([
      lastJobIds.length
        ? db.job.findMany({
            where: { id: { in: lastJobIds } },
            select: {
              id: true,
              jobNumber: true,
              title: true,
              status: true,
              scheduledAt: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
      scheduleIds.length
        ? db.job.groupBy({
            by: ['recurringScheduleId'],
            where: { recurringScheduleId: { in: scheduleIds } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      assigneeIds.length
        ? db.employee.findMany({
            where: { id: { in: assigneeIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);

    const lastJobById = new Map(lastJobs.map((j) => [j.id, j]));
    const countById = new Map(
      generatedCounts.map((c) => [c.recurringScheduleId, c._count._all]),
    );
    const empById = new Map(employees.map((e) => [e.id, e.name]));

    const enriched = schedules.map((s) => {
      let assigneeIdsArr: string[] = [];
      try {
        const parsed = JSON.parse(s.assigneeIdsJson || '[]');
        if (Array.isArray(parsed)) assigneeIdsArr = parsed as string[];
      } catch {
        // ignore
      }
      const primaryAssigneeId = assigneeIdsArr[0] ?? null;
      const primaryAssigneeName = primaryAssigneeId ? empById.get(primaryAssigneeId) ?? null : null;

      // Compute a preview using the shared engine (for the schedule card summary).
      const recurrenceInput: RecurrenceInput = {
        frequency: s.frequency,
        dayOfWeek: s.dayOfWeek,
        dayOfMonth: s.dayOfMonth,
        weekOfMonth: s.weekOfMonth,
        weekdaysJson: (s as any).weekdaysJson ?? '[]',
        interval: (s as any).interval ?? 1,
        nthWeekdayJson: (s as any).nthWeekdayJson ?? null,
        timeOfDay: s.timeOfDay,
        durationMins: s.durationMins,
        startDate: s.startDate,
        endDate: s.endDate,
        endAfterOccurrences: (s as any).endAfterOccurrences ?? null,
        asNeeded: (s as any).asNeeded ?? false,
        timezone: s.timezone,
      };
      const preview = formatSchedulePreview(recurrenceInput);

      return {
        ...s,
        lastJob: s.lastJobId ? lastJobById.get(s.lastJobId) ?? null : null,
        generatedCount: countById.get(s.id) ?? 0,
        primaryAssigneeId,
        primaryAssigneeName,
        recurrencePreview: preview,
      };
    });

    return NextResponse.json({ schedules: enriched });
  } catch (error) {
    console.error('List recurring jobs error:', error);
    return NextResponse.json({ error: 'Failed to fetch recurring job schedules' }, { status: 500 });
  }
}

// POST /api/recurring-jobs — Create a new recurring job schedule.
// Plan-gated: requires `recurring_jobs` (Business tier and above).
//
// Phase 3: BOTH /api/jobs (recurring block) and /api/recurring-jobs now call
// the SAME shared domain service `createRecurringSchedule()`. This guarantees
// identical DB state regardless of entry point.
//
// Request body fields (all new Phase 1 fields supported):
//   title, customerId, templateJobId, description,
//   frequency (daily|weekly|biweekly|monthly|quarterly|annually|as_needed|custom),
//   dayOfWeek, dayOfMonth, weekOfMonth, weekdaysJson, interval, nthWeekdayJson,
//   timeOfDay, durationMins, startDate, endDate, endAfterOccurrences, asNeeded, timezone,
//   assigneeIds[], serviceId, branchId, visitInstructions, checklistIds[], lineItemsJson,
//   generateInvoice, invoiceTiming ('on_generation'|'on_completion'),
//   generateFirstJob (default true)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const gate = await requirePlanFeature('recurring_jobs');
    if (!gate.ok) {
      return NextResponse.json({ error: gate.reason }, { status: gate.status });
    }

    const body = await request.json();

    // ── Basic validation ───────────────────────────────────────────────
    if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!body.startDate) {
      return NextResponse.json({ error: 'startDate is required' }, { status: 400 });
    }

    const startDate = new Date(body.startDate);
    if (Number.isNaN(startDate.getTime())) {
      return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 });
    }

    const endDate = body.endDate ? new Date(body.endDate) : null;
    if (endDate && Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid endDate' }, { status: 400 });
    }

    // ── Validate recurrence via the shared engine ─────────────────────
    const recurrenceInput: RecurrenceInput = {
      frequency: body.frequency || 'weekly',
      dayOfWeek: body.dayOfWeek != null ? Number(body.dayOfWeek) : null,
      dayOfMonth: body.dayOfMonth != null ? Number(body.dayOfMonth) : null,
      weekOfMonth: body.weekOfMonth != null ? Number(body.weekOfMonth) : null,
      weekdaysJson: body.weekdaysJson || null,
      interval: body.interval != null ? Number(body.interval) : 1,
      nthWeekdayJson: body.nthWeekdayJson || null,
      timeOfDay: body.timeOfDay || null,
      durationMins: body.durationMins != null ? Number(body.durationMins) : 60,
      startDate,
      endDate,
      endAfterOccurrences: body.endAfterOccurrences != null ? Number(body.endAfterOccurrences) : null,
      asNeeded: body.asNeeded === true,
      timezone: body.timezone || null,
    };
    const validation = validateSchedule(recurrenceInput);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid recurrence configuration', details: validation.errors },
        { status: 400 },
      );
    }

    // ── Normalize lineItemsJson ───────────────────────────────────────
    const lineItemsJson =
      typeof body.lineItemsJson === 'string'
        ? body.lineItemsJson
        : JSON.stringify(Array.isArray(body.lineItems) ? body.lineItems : []);

    // ── Call the shared domain service ────────────────────────────────
    // This is the SAME function POST /api/jobs calls — both entry points
    // converge here. Transactional: schedule + first job + first visit are
    // created atomically. If first-job creation fails, the schedule is NOT
    // created.
    const result = await createRecurringSchedule({
      tenantId: user.tenantId,
      customerId: body.customerId || null,
      templateJobId: body.templateJobId || null,
      title: body.title,
      description: body.description || null,
      frequency: body.frequency || 'weekly',
      dayOfWeek: body.dayOfWeek != null ? Number(body.dayOfWeek) : null,
      dayOfMonth: body.dayOfMonth != null ? Number(body.dayOfMonth) : null,
      weekOfMonth: body.weekOfMonth != null ? Number(body.weekOfMonth) : null,
      weekdaysJson: body.weekdaysJson || '[]',
      interval: body.interval != null ? Number(body.interval) : 1,
      nthWeekdayJson: body.nthWeekdayJson || null,
      timeOfDay: body.timeOfDay || null,
      durationMins: body.durationMins != null ? Number(body.durationMins) : 60,
      startDate,
      endDate: endDate || null,
      endAfterOccurrences: body.endAfterOccurrences != null ? Number(body.endAfterOccurrences) : null,
      asNeeded: body.asNeeded === true,
      timezone: body.timezone || null,
      assigneeIds: Array.isArray(body.assigneeIds) ? body.assigneeIds : [],
      serviceId: body.serviceId || null,
      branchId: body.branchId || null,
      visitInstructions: body.visitInstructions || null,
      checklistIds: Array.isArray(body.checklistIds) ? body.checklistIds : [],
      lineItemsJson,
      generateInvoice: body.generateInvoice === true,
      invoiceTiming: body.invoiceTiming === 'on_generation' ? 'on_generation' : 'on_completion',
      generateFirstJob: body.generateFirstJob !== false, // default true
    });

    // ── Fetch the full schedule row for the response ──────────────────
    const schedule = await db.recurringJobSchedule.findUnique({
      where: { id: result.schedule.id },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    return NextResponse.json(
      {
        schedule,
        firstJobCreated: result.firstJobCreated,
        firstJobId: result.firstJobId,
        recurrencePreview: formatSchedulePreview(recurrenceInput),
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error('Create recurring job error:', error);
    const message = error instanceof Error ? error.message : String(error);
    // Distinguish validation errors (400) from server errors (500).
    if (message.startsWith('Invalid recurring schedule:') || message.startsWith('The first recurring occurrence')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to create recurring job schedule', message },
      { status: 500 },
    );
  }
}
