import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { requirePlanFeature } from '@/lib/plan-gate';
import { computeNextOccurrence } from '@/lib/recurring-jobs';
import { logActivity } from '@/lib/activity-log';

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
    const lastJobs = lastJobIds.length
      ? await db.job.findMany({
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
      : [];
    const lastJobById = new Map(lastJobs.map((j) => [j.id, j]));

    const enriched = schedules.map((s) => ({
      ...s,
      lastJob: s.lastJobId ? lastJobById.get(s.lastJobId) ?? null : null,
    }));

    return NextResponse.json({ schedules: enriched });
  } catch (error) {
    console.error('List recurring jobs error:', error);
    return NextResponse.json({ error: 'Failed to fetch recurring job schedules' }, { status: 500 });
  }
}

// POST /api/recurring-jobs — Create a new recurring job schedule.
// Plan-gated: requires `recurring_jobs` (Business tier and above).
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

    // ── Validation ──────────────────────────────────────────────────────
    if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const frequency = body.frequency || 'weekly';
    const VALID_FREQ = ['weekly', 'biweekly', 'monthly', 'quarterly', 'annually'];
    if (!VALID_FREQ.includes(frequency)) {
      return NextResponse.json({ error: `Invalid frequency: ${frequency}` }, { status: 400 });
    }

    const dayOfWeek =
      body.dayOfWeek !== undefined && body.dayOfWeek !== null
        ? Number(body.dayOfWeek)
        : null;
    const dayOfMonth =
      body.dayOfMonth !== undefined && body.dayOfMonth !== null
        ? Number(body.dayOfMonth)
        : null;
    const weekOfMonth =
      body.weekOfMonth !== undefined && body.weekOfMonth !== null
        ? Number(body.weekOfMonth)
        : null;

    if (
      dayOfWeek != null &&
      (Number.isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6)
    ) {
      return NextResponse.json({ error: 'dayOfWeek must be 0-6' }, { status: 400 });
    }
    if (
      dayOfMonth != null &&
      (Number.isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31)
    ) {
      return NextResponse.json({ error: 'dayOfMonth must be 1-31' }, { status: 400 });
    }
    if (
      weekOfMonth != null &&
      (Number.isNaN(weekOfMonth) || weekOfMonth < 1 || weekOfMonth > 5)
    ) {
      return NextResponse.json({ error: 'weekOfMonth must be 1-5' }, { status: 400 });
    }

    const startDate = body.startDate ? new Date(body.startDate) : new Date();
    if (Number.isNaN(startDate.getTime())) {
      return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 });
    }

    const endDate = body.endDate ? new Date(body.endDate) : null;
    if (endDate && Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid endDate' }, { status: 400 });
    }

    // ── Compute the first nextRunAt ─────────────────────────────────────
    const timezone = body.timezone ?? null;
    const nextRunAt = computeNextOccurrence(
      {
        frequency,
        dayOfWeek,
        dayOfMonth,
        weekOfMonth,
        timeOfDay: body.timeOfDay ?? null,
        endDate,
        timezone,
      },
      // Start the search from "the day before startDate" so the first
      // occurrence can land on startDate itself.
      new Date(startDate.getTime() - 24 * 60 * 60 * 1000),
    );

    if (!nextRunAt) {
      return NextResponse.json(
        { error: 'The first occurrence is already past the end date.' },
        { status: 400 },
      );
    }

    // ── JSON-encoded fields ─────────────────────────────────────────────
    const assigneeIdsJson = JSON.stringify(
      Array.isArray(body.assigneeIds) ? body.assigneeIds : [],
    );
    const checklistIdsJson = JSON.stringify(
      Array.isArray(body.checklistIds) ? body.checklistIds : [],
    );
    const lineItemsJson =
      typeof body.lineItemsJson === 'string'
        ? body.lineItemsJson
        : JSON.stringify(Array.isArray(body.lineItems) ? body.lineItems : []);

    // ── Persist ─────────────────────────────────────────────────────────
    const schedule = await db.recurringJobSchedule.create({
      data: {
        tenantId: user.tenantId,
        customerId: body.customerId || null,
        templateJobId: body.templateJobId || null,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        frequency,
        dayOfWeek,
        dayOfMonth,
        weekOfMonth,
        timeOfDay: body.timeOfDay || null,
        durationMins: Number(body.durationMins) || 60,
        startDate,
        endDate,
        nextRunAt,
        assigneeIdsJson,
        serviceId: body.serviceId || null,
        branchId: body.branchId || null,
        visitInstructions: body.visitInstructions?.trim() || null,
        checklistIdsJson,
        lineItemsJson,
        // ── Phase C: Optional billing ──
        generateInvoice: body.generateInvoice === true,
        invoiceTiming: body.invoiceTiming === 'on_generation' ? 'on_generation' : 'on_completion',
        // ── Phase F: Timezone ──
        timezone,
        active: true,
      },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    // Activity log (best-effort)
    try {
      await logActivity({
        tenantId: user.tenantId,
        actorId: user.id,
        actorName: user.name || user.email,
        actorType: 'user',
        action: 'create',
        entityType: 'recurringJobSchedule',
        entityId: schedule.id,
        entityName: schedule.title,
        description: `Created recurring job schedule "${schedule.title}" (${frequency})`,
        metadataJson: JSON.stringify({
          frequency,
          customerId: schedule.customerId,
          nextRunAt,
          durationMins: schedule.durationMins,
        }),
        severity: 'info',
      });
    } catch (logErr) {
      console.error('[RecurringJobs POST] activity log failed:', logErr);
    }

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    console.error('Create recurring job error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to create recurring job schedule', message },
      { status: 500 },
    );
  }
}
