import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { withCrmTrace } from '@/lib/crm-perf-trace'
import { getAuthUser } from '@/lib/auth'
import { cache } from '@/lib/cache'
import { cachedJson } from '@/lib/cache-headers'
import { notifyEmployeeJobAssigned, notifyCustomerBookingConfirmed } from '@/lib/whatsapp-notifications'
import { dispatchJobEvent } from '@/lib/event-webhook-dispatcher'
import { logActivity } from '@/lib/activity-log'
import { EventBus } from '@/lib/event-bus'
import { geocodeAddressOrNull as geocodeAddress } from '@/lib/geocode'
import { requireCrmTenant } from '@/lib/require-crm-tenant'
import { requirePlanFeature } from '@/lib/plan-gate'
import { computeNextOccurrence, nextVisitNumber, createRecurringSchedule } from '@/lib/recurring-jobs'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Set JOBS_TTL = 0 to ensure live CRM data refresh returns instant fresh database rows
const JOBS_TTL = 0;

// Note: `setDefaultResultOrder('ipv4first')` is now called as a module side
// effect inside `src/lib/geocode.ts`, so every importer gets IPv4-first DNS
// for Nominatim fetches automatically. See that file for the rationale
// (IPv6 route is unreachable in this sandbox).

/**
 * Resolve a workspaceId for a new job.
 *
 * The Create Job form does NOT send workspaceId, so without this resolution
 * the job would be created with `workspaceId: null`. That breaks downstream
 * features that rely on workspace → tenant context — most notably auto-invoice
 * creation on job completion: `autoCreateInvoiceFromJob` resolves the tenant
 * via `job.workspaceId → workspace.tenantId`, and when workspaceId is null it
 * falls back to "first tenant", which may be the WRONG tenant in multi-tenant
 * deployments (the invoice gets created with a foreign tenantId and never
 * shows up in the user's invoice list).
 *
 * Resolution order (mirrors /api/leads/convert):
 *   1. Explicitly provided `body.workspaceId`
 *   2. The authenticated user's `workspaceId`
 *   3. The first workspace in the DB
 *   4. A newly-created "Default Workspace"
 */
async function resolveWorkspaceId(
  provided: string | null | undefined,
  authUser: Awaited<ReturnType<typeof getAuthUser>>,
): Promise<string | null> {
  if (provided) return provided
  if (authUser?.workspaceId) return authUser.workspaceId
  try {
    const existing = await db.workspace.findFirst()
    if (existing) return existing.id
    const created = await db.workspace.create({
      data: {
        name: 'Default Workspace',
        slug: 'default',
        ownerId: authUser?.id || 'system',
        tenantId: authUser?.tenantId || null,
      },
    })
    return created.id
  } catch (e) {
    console.error('[Jobs POST] Failed to resolve workspaceId:', e)
    return null
  }
}

async function _GET(request: NextRequest) {
  try {
    const crmGuard = await requireCrmTenant(request);
    if (crmGuard) return crmGuard;
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const search = searchParams.get('search')
    const priority = searchParams.get('priority')
    const assigneeId = searchParams.get('assigneeId')
    const customerId = searchParams.get('customerId')
    // History mode: only completed + soft-deleted jobs (used by the Job
    // History tab). When true, we use a lighter `select` (no relations) and
    // a larger default pageSize for performance — the History list only needs
    // summary fields, not full assignee/customer/resource records.
    const historyMode = searchParams.get('history') === 'true'
    // includeDeleted=false → exclude soft-deleted jobs from the result set.
    // includeDeleted=true (or unset) → return soft-deleted jobs too (backward
    // compat — most callers client-side filter them anyway).
    const excludeDeleted = searchParams.get('includeDeleted') === 'false'

    // ── C-2A: Server-side pagination ──────────────────────────────────
    // Default pageSize=50 for active mode, 200 for history mode (preserves
    // the previous `take: 200` behavior). `limit` is honored as an alias
    // for `pageSize` (calendar-view passes ?limit=200, expenses-view and
    // whatsapp-dashboard pass ?limit=100). Hard cap: 100 for active, 200
    // for history.
    const maxPageSize = historyMode ? 200 : 100;
    const defaultPageSize = historyMode ? 200 : 50;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const pageSizeRaw = parseInt(
      searchParams.get('pageSize') || searchParams.get('limit') || String(defaultPageSize),
      10,
    ) || defaultPageSize;
    const pageSize = Math.min(Math.max(1, pageSizeRaw), maxPageSize);
    const skip = (page - 1) * pageSize;

    // ── Cache lookup (skip for search queries — results are too dynamic) ──
    // Cache key includes tenantId + all filter params + pagination so
    // different views (Active vs History vs Dispatch) and pages get separate
    // cache entries.
    if (!search && user.tenantId) {
      const cacheKey = `jobs:${user.tenantId}:${status || ''}:${type || ''}:${priority || ''}:${assigneeId || ''}:${customerId || ''}:${historyMode ? 'h' : 'a'}:${excludeDeleted ? 'xd' : 'ad'}:${searchParams.get('tenantId') || ''}:p${page}:ps${pageSize}`;
      const cached = cache.get<unknown>(cacheKey);
      if (cached !== undefined) {
        return cachedJson(cached);
      }
      // Store the cache key so we can set it after the query succeeds.
      (request as unknown as { _jobsCacheKey?: string })._jobsCacheKey = cacheKey;
    }

    const where: Record<string, unknown> = {}

    // Scope to user's workspace/tenant (unless super admin)
    if (user.tenantId && !user.isSuperAdmin) {
      // Job uses workspaceId, so find all workspaces in this tenant
      const tenantWorkspaces = await db.workspace.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true },
      });
      const workspaceIds = tenantWorkspaces.map(w => w.id);
      if (workspaceIds.length > 0) {
        where.workspaceId = { in: workspaceIds };
      } else if (user.workspaceId) {
        where.workspaceId = user.workspaceId;
      } else {
        // No workspaces found — return empty
        return NextResponse.json([]);
      }
    } else if (user.isSuperAdmin) {
      const queryTenantId = searchParams.get('tenantId');
      if (queryTenantId) {
        const tenantWorkspaces = await db.workspace.findMany({
          where: { tenantId: queryTenantId },
          select: { id: true },
        });
        where.workspaceId = { in: tenantWorkspaces.map(w => w.id) };
      }
    }

    // ── Multi-value filters ───────────────────────────────────────────
    // Several callers (notably the Smart Dispatch Center in
    // dispatch-view.tsx) pass a comma-separated list, e.g.
    //   ?status=pending,assigned,scheduled
    // Previously this was assigned verbatim (`where.status = status`),
    // which made Prisma do an EXACT string match against the literal
    // "pending,assigned,scheduled" — matching zero jobs. That broke the
    // dispatch board: Pending/Assigned counts were always 0 even though
    // jobs existed in the Jobs list, and a just-assigned job (status
    // 'assigned') still wouldn't appear.
    //
    // Fix: split on comma and use `{ in: [...] }` when there's more than
    // one value; keep the plain equality for the single-value case so
    // existing callers (and Prisma query plans) are unaffected.
    const splitList = (v: string | null) =>
      v ? v.split(',').map(s => s.trim()).filter(Boolean) : []

    const statusList = splitList(status)
    if (statusList.length === 1) where.status = statusList[0]
    else if (statusList.length > 1) where.status = { in: statusList }

    const typeList = splitList(type)
    if (typeList.length === 1) where.type = typeList[0]
    else if (typeList.length > 1) where.type = { in: typeList }

    const priorityList = splitList(priority)
    if (priorityList.length === 1) where.priority = priorityList[0]
    else if (priorityList.length > 1) where.priority = { in: priorityList }

    if (assigneeId) where.assigneeId = assigneeId
    if (customerId) where.customerId = customerId

    // ── History vs Active filtering ───────────────────────────────────
    // history=true  → lighter `select` (no relations) + take limit for the
    //                 History tab. Returns ALL jobs (including soft-deleted +
    //                 completed) — the client applies the same-day grace filter
    //                 so completed-today jobs stay in the Active list.
    // includeDeleted=false → exclude soft-deleted jobs (simple `deletedAt: null`
    //                 filter that works in both Prisma SQLite AND the Supabase
    //                 REST adapter).
    //
    // NOTE: The same-day grace filter (completed-today jobs stay in Active,
    // move to History tomorrow) is enforced CLIENT-SIDE using UTC comparison.
    // It was previously server-side, but the nested `OR` inside `OR` +
    // `{ not: ... }` inside `OR` structure was incompatible with the Supabase
    // REST adapter (which silently drops `{ not: ... }` conditions inside OR
    // and can't handle nested OR), causing jobs to disappear in production.
    if (excludeDeleted && !historyMode) {
      where.deletedAt = null
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { customerName: { contains: search } },
        { assigneeName: { contains: search } },
        { address: { contains: search } },
      ]
    }

    // ── C-2A: Explicit field selection + pagination envelope ────────
    //
    // BEFORE (C-1 measured): `include: { assignee: true, customer: true,
    //   resource: true }` + SELECT * on Job → 78KB for 17 jobs, 4 DB calls
    //   (Workspace + Job + Customer + Employee), no pagination.
    //
    // AFTER: explicit `select` with only fields actually rendered by the UI
    //   (41 scalar fields), NO relation includes (zero consumers read
    //   job.assignee.* / job.customer.* / job.resource.* — they all use the
    //   flat denormalized columns like assigneeName/customerName already on
    //   the Job row), server-side pagination (default 50, max 100), and a
    //   parallel count query for the pagination envelope.
    //
    // Response shape: { jobs: [...], pagination: { page, pageSize, total,
    //   totalPages } } — see C-2A-DISCOVERY worklog entry for consumer
    //   migration details.
    //
    // History mode keeps its lighter 17-field select (no JSON/detail fields)
    // but now also returns the pagination envelope for shape consistency.

    // Fields shared by both modes (the history-mode-specific payment fields
    // are only selected in history mode).
    const activeSelect = {
      id: true,
      jobNumber: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      type: true,
      address: true,
      pickup: true,
      dropoff: true,
      scheduledAt: true,
      scheduledTime: true,
      estimatedDuration: true,
      actualStartTime: true,
      actualEndTime: true,
      completedAt: true,
      deletedAt: true,
      cancelledAt: true,
      quotedAmount: true,
      customerId: true,
      customerName: true,
      customerPhone: true,
      customerEmail: true,
      assigneeId: true,
      assigneeName: true,
      assigneePhone: true,
      serviceId: true,
      resourceId: true,
      notes: true,
      visitInstructions: true,
      checkInLat: true,
      checkInLng: true,
      checkOutLat: true,
      checkOutLng: true,
      // Destination coordinates (geocoded from `address`). Required by the
      // Live Dispatch map to render the END/destination marker + route
      // polyline. Without these, `activeJobsForMap` filters every job out
      // (hasGps() returns false) and the map shows only technician vehicles.
      latitude: true,
      longitude: true,
      customerRating: true,
      whatsappMessageId: true,
      whatsappSessionId: true,
      assignmentStatus: true,
      lineItemsJson: true,
      customFieldsJson: true,
      attachmentsJson: true,
      linkedChecklistsJson: true,
      linkToRelatedJson: true,
      metadataJson: true,
      notificationLogJson: true,
      // ── Issue 1 (Close Job / Stop Schedule menu): include the recurring
      // schedule FK so the Jobs list More menu can branch on whether the job
      // was generated by a schedule. Without this, the menu would never show
      // the Pause/Resume/Stop Recurring Schedule items in list view.
      recurringScheduleId: true,
      createdAt: true,
      updatedAt: true,
    } as const;

    const historySelect = {
      id: true,
      jobNumber: true,
      title: true,
      status: true,
      priority: true,
      type: true,
      paymentStatus: true,
      paymentMethod: true,
      amountCollected: true,
      quotedAmount: true,
      customerName: true,
      assigneeName: true,
      completedAt: true,
      actualEndTime: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
    } as const;

    // ── Fetch jobs + total count in parallel ─────────────────────────
    // The count query is needed for the pagination envelope (total +
    // totalPages). Running it in parallel with the findMany via Promise.all
    // keeps the wall-clock time at ~max(findMany, count) instead of sum.
    //
    // C-3 (A6b): when `search` is present, the exact count(*) is OMITTED
    // because ILIKE '%term%' across 5 columns (title, description,
    // customerName, assigneeName, address) cannot use any B-tree index
    // (29ms warm Seq Scan at 20K rows → would be ~290ms at 200K). Instead
    // we return hasNextPage = (jobs.length === pageSize) and total = null.
    // This mirrors the ActivityLog B7b fix. Non-search paths keep the exact
    // count (they're indexed and fast — A2 count is 3.9ms warm).
    const isSearchActive = !!search?.trim();

    const [jobs, total] = await Promise.all([
      db.job.findMany({
        where,
        select: historyMode ? historySelect : activeSelect,
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip,
      }),
      isSearchActive ? Promise.resolve(null) : db.job.count({ where }),
    ]);

    const hasNextPage = jobs.length === pageSize;
    const totalPages = total === null ? null : (total === 0 ? 0 : Math.ceil(total / pageSize));
    const result = {
      jobs,
      pagination: {
        page,
        pageSize,
        total,           // null during search, exact count otherwise
        totalPages,      // null during search, exact count otherwise
        hasNextPage,     // true when the fetched page is full (more results likely)
      },
    };

    const cacheKey = (request as unknown as { _jobsCacheKey?: string })._jobsCacheKey;
    if (cacheKey) cache.set(cacheKey, result, JOBS_TTL);
    return cachedJson(result)
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const crmGuard = await requireCrmTenant(request);
    if (crmGuard) return crmGuard;
    const body = await request.json()
    const authUser = await getAuthUser()

    // Resolve workspaceId so the job has proper workspace → tenant context.
    // The Create Job form does not send workspaceId; without this, the job
    // would be created with workspaceId=null, which breaks auto-invoice
    // creation (the invoice gets the wrong tenantId and is invisible in the
    // user's invoice list). See resolveWorkspaceId() docblock above.
    const workspaceId = await resolveWorkspaceId(body.workspaceId, authUser)

    // ── V1.5: parse metadataJson + inject assetId if provided (kept in
    // metadataJson since the Job model has no dedicated assetId column).
    const baseMetadata: Record<string, unknown> = (() => {
      try {
        const parsed = body.metadataJson ? JSON.parse(body.metadataJson) : {}
        return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}
      } catch {
        return {}
      }
    })()
    if (body.assetId) baseMetadata.assetId = body.assetId

    // ── Build the job data object (shared between recurring + non-recurring paths) ──
    // Phase B: when body.recurring is present, we wrap schedule-create + job-create
    // + visit-create in a single transaction below. The job data is built once here.
    const jobData: Record<string, unknown> = {
      title: body.title,
      description: body.description,
      status: body.status || 'pending',
      priority: body.priority || 'medium',
      type: body.type || 'delivery',
      address: body.address,
      pickup: body.pickup,
      dropoff: body.dropoff,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      notes: body.notes,
      customerId: body.customerId,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail,
      assigneeId: body.assigneeId,
      assigneeName: body.assigneeName,
      assigneePhone: body.assigneePhone,
      resourceId: body.resourceId,
      externalId: body.externalId,
      externalSource: body.externalSource,
      serviceId: body.serviceId || null,
      estimatedDuration:
        body.estimatedDuration !== undefined && body.estimatedDuration !== null && body.estimatedDuration !== ''
          ? Number(body.estimatedDuration)
          : undefined,
      quotedAmount:
        body.quotedAmount !== undefined && body.quotedAmount !== null && body.quotedAmount !== ''
          ? Number(body.quotedAmount)
          : undefined,
      lineItemsJson: typeof body.lineItemsJson === 'string' ? body.lineItemsJson : JSON.stringify(body.lineItemsJson ?? []),
      visitInstructions: body.visitInstructions || null,
      scheduledTime: body.scheduledTime || null,
      customFieldsJson:
        typeof body.customFieldsJson === 'string'
          ? body.customFieldsJson
          : JSON.stringify(body.customFieldsJson ?? []),
      attachmentsJson:
        typeof body.attachmentsJson === 'string'
          ? body.attachmentsJson
          : JSON.stringify(body.attachmentsJson ?? []),
      linkedChecklistsJson:
        typeof body.linkedChecklistsJson === 'string'
          ? body.linkedChecklistsJson
          : JSON.stringify(body.linkedChecklistsJson ?? []),
      linkToRelatedJson:
        typeof body.linkToRelatedJson === 'string'
          ? body.linkToRelatedJson
          : JSON.stringify(body.linkToRelatedJson ?? []),
      metadataJson: JSON.stringify(baseMetadata),
      workspaceId,
    }

    // ── Phase B/3: Recurring schedule creation (optional) ────────────
    // When body.recurring is present, create a RecurringJobSchedule + the first
    // Job + the first JobVisit in a single transaction via the SHARED domain
    // service `createRecurringSchedule()`. This is the SAME function POST
    // /api/recurring-jobs calls — both entry points converge here.
    //
    // Per architectural directive: ONE RecurringJobSchedule, ONE recurrence
    // engine, ONE scheduler, MULTIPLE entry points/UI surfaces.
    let recurringSchedule: { id: string; generateInvoice: boolean; invoiceTiming: string; firstJobId?: string } | null = null

    if (body.recurring && typeof body.recurring === 'object') {
      const gate = await requirePlanFeature('recurring_jobs')
      if (!gate.ok) {
        return NextResponse.json({ error: gate.reason }, { status: gate.status })
      }

      const recurring = body.recurring as Record<string, unknown>
      const frequency = (recurring.frequency as string) || 'weekly'

      const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : new Date()
      const endDate = recurring.endDate ? new Date(recurring.endDate as string) : null
      const timezone = (recurring.timezone as string) || null

      const assigneeIds = Array.isArray(recurring.assigneeIds)
        ? (recurring.assigneeIds as string[])
        : (body.assigneeId ? [body.assigneeId] : [])
      const checklistIds = Array.isArray(recurring.checklistIds) ? (recurring.checklistIds as string[]) : []
      const lineItemsJson =
        typeof body.lineItemsJson === 'string' ? body.lineItemsJson : JSON.stringify(body.lineItemsJson ?? [])
      const visitInstructions = (recurring.visitInstructions as string) || body.visitInstructions || null

      // ── Call the shared domain service ──
      // generateFirstJob defaults to true — the first Job is created immediately
      // in the same transaction as the schedule. nextRunAt is set to the NEXT
      // future occurrence (NOT today).
      const recurringResult = await createRecurringSchedule({
        tenantId: authUser!.tenantId!,
        customerId: body.customerId || null,
        title: body.title,
        description: body.description || null,
        frequency,
        dayOfWeek: recurring.dayOfWeek != null ? Number(recurring.dayOfWeek) : null,
        dayOfMonth: recurring.dayOfMonth != null ? Number(recurring.dayOfMonth) : null,
        weekOfMonth: recurring.weekOfMonth != null ? Number(recurring.weekOfMonth) : null,
        weekdaysJson: typeof recurring.weekdaysJson === 'string' ? recurring.weekdaysJson : JSON.stringify(recurring.weekdaysJson ?? []),
        interval: recurring.interval != null ? Number(recurring.interval) : 1,
        nthWeekdayJson: typeof recurring.nthWeekdayJson === 'string' ? recurring.nthWeekdayJson : null,
        timeOfDay: (recurring.timeOfDay as string) || null,
        durationMins: Number(recurring.durationMins) || 60,
        startDate: scheduledAt,
        endDate,
        endAfterOccurrences: recurring.endAfterOccurrences != null ? Number(recurring.endAfterOccurrences) : null,
        asNeeded: recurring.asNeeded === true,
        timezone,
        assigneeIds,
        serviceId: body.serviceId || null,
        branchId: (recurring.branchId as string) || null,
        visitInstructions,
        checklistIds,
        lineItemsJson,
        generateInvoice: recurring.generateInvoice === true,
        invoiceTiming: recurring.invoiceTiming === 'on_generation' ? 'on_generation' : 'on_completion',
        generateFirstJob: true,
      })

      // Use created schedule values directly from the domain service result.
      recurringSchedule = {
        id: recurringResult.schedule.id,
        generateInvoice: recurringResult.schedule.generateInvoice ?? recurring.generateInvoice === true,
        invoiceTiming: recurringResult.schedule.invoiceTiming ?? 'on_completion',
        firstJobId: recurringResult.firstJobId,
      }

      // If the shared service created the first Job, fetch it for the response.
      if (recurringResult.firstJobId) {
        const firstJob = await db.job.findUnique({
          where: { id: recurringResult.firstJobId },
          include: { assignee: true, customer: true, resource: true },
        })
        if (firstJob) {
          ;(jobData as Record<string, unknown>).__recurringJob = firstJob
        }
      }
    }

    // ── Create the job (non-recurring path) OR pull from transaction result ──
    const job =
      (jobData as Record<string, unknown>).__recurringJob as Awaited<ReturnType<typeof db.job.create>> | undefined
        ?? await db.job.create({
            data: jobData as Parameters<typeof db.job.create>[0]['data'],
            include: {
              assignee: true,
              customer: true,
              resource: true,
            },
          })

    // ─── Background side-effects (don't block the response) ──────
    // Send WhatsApp notifications + event webhooks detached so the user
    // sees the new job in the list immediately. All errors are swallowed
    // and logged — they never affect the HTTP response.

    // ── Geocode the job address (best-effort, background) ──
    // Populates Job.latitude/longitude so the Live Dispatch map can show
    // job pins + route lines. Non-fatal: if geocoding fails, the job is
    // still created — it just won't have a pin on the map.
    if (job.address) {
      geocodeAddress(job.address)
        .then((coords) => {
          if (coords) {
            return db.job.update({
              where: { id: job.id },
              data: { latitude: coords.latitude, longitude: coords.longitude },
            });
          }
          return null;
        })
        .catch(() => {
          // Silent — geocoding is best-effort
        });
    }

    const employeePromise = job.assigneeId
      ? db.employee.findUnique({ where: { id: job.assigneeId } })
      : Promise.resolve(null)
    const customerPromise = job.customerId
      ? db.customer.findUnique({ where: { id: job.customerId } })
      : Promise.resolve(job.customerPhone ? { name: job.customerName, phone: job.customerPhone } as { name: string; phone: string } | null : null)

    Promise.all([employeePromise, customerPromise])
      .then(([employee, customer]) => {
        // Rule 5a: New job creation = email only. CRM-created jobs do not notify the customer via SMS.
        // The customer will be notified when an employee is assigned (consolidated SMS with PIN + tracking link).
        notifyCustomerBookingConfirmed(job, { emailOnly: true }).catch((e) =>
          console.error('Failed to send customer email booking confirmation:', e)
        )
        // Assignment WhatsApp to employee
        if (employee) {
          notifyEmployeeJobAssigned(job, employee).catch((e) =>
            console.error('Failed to send employee notification:', e)
          )
        }
        // Fire job.created webhook (n8n, Zapier, etc.)
        dispatchJobEvent('job.created', job, { employee, customer }).catch((err) =>
          console.error('[EventWebhook] Background dispatch failed for job.created:', err)
        )
        // If job was created with an assignee, also fire job.assigned
        if (job.assigneeId && employee) {
          dispatchJobEvent('job.assigned', job, { employee, customer }).catch((err) =>
            console.error('[EventWebhook] Background dispatch failed for job.assigned:', err)
          )
        }

        // ── Restore EventBus emissions (regression fix) ──────────────
        // Commit "3308534 integrate supabase" accidentally removed the
        // EventBus.emit calls, leaving only the webhook dispatcher. That
        // broke lifecycle-push-dispatcher (which listens on EventBus) so
        // employees stopped receiving push notifications on job assignment.
        // The ad-hoc notifyEmployeeJobAssigned path above is fragile and
        // silently no-ops when Employee.userId is null. Emitting on EventBus
        // routes through the central dispatcher which fans out to employee
        // + owner/admins with proper tenant resolution.
        const jobEventPayload = {
          job: {
            id: job.id,
            jobNumber: job.jobNumber,
            title: job.title,
            status: job.status,
            priority: job.priority,
            type: job.type,
            address: job.address,
            customerName: job.customerName,
            customerPhone: job.customerPhone,
            assigneeName: job.assigneeName,
            assigneePhone: job.assigneePhone,
            workspaceId: job.workspaceId,
          },
          employee: employee ? { id: employee.id, name: employee.name, phone: employee.phone } : null,
          customer: customer ? { name: customer.name, phone: customer.phone } : null,
          resourceType: 'job' as const,
          resourceId: job.id,
        }
        const eventCtx = { tenantId: job.workspaceId || undefined, workspaceId: job.workspaceId || undefined }
        EventBus.emit('job.created', jobEventPayload, eventCtx).catch((err) =>
          console.error('[EventBus] Failed to emit job.created:', err)
        )
        if (job.assigneeId && employee) {
          EventBus.emit('job.assigned', jobEventPayload, eventCtx).catch((err) =>
            console.error('[EventBus] Failed to emit job.assigned:', err)
          )
        }
      })
      .catch((e) => console.error('Failed to run post-create side-effects:', e))

    // ─── V1.5 Activity Log ──────────────────────────────────────────
    // Records the create action in the audit trail. Wrapped in a try/catch
    // so a logging failure never affects the main response.
    try {
      // Resolve tenantId (job uses workspaceId → workspace.tenantId)
      let jobTenantId: string | null = authUser?.tenantId || null
      if (!jobTenantId && job.workspaceId) {
        const ws = await db.workspace.findUnique({
          where: { id: job.workspaceId },
          select: { tenantId: true },
        })
        jobTenantId = ws?.tenantId ?? null
      }
      if (jobTenantId) {
        await logActivity({
          tenantId: jobTenantId,
          actorId: authUser?.id,
          actorName: authUser?.name || authUser?.email,
          actorType: 'user',
          action: 'create',
          entityType: 'job',
          entityId: job.id,
          entityName: job.title || job.customerName || null,
          description: `Created job "${job.title || 'Untitled'}" for ${job.customerName || 'customer'}`,
          metadataJson: JSON.stringify({
            status: job.status,
            priority: job.priority,
            type: job.type,
            assigneeName: job.assigneeName || null,
            quotedAmount: job.quotedAmount ?? null,
          }),
          severity: 'info',
        })
      }
    } catch (logErr) {
      console.error('[Jobs POST] Failed to log activity:', logErr)
    }

    // Bust jobs cache for this tenant (new job changes all lists)
    if (authUser?.tenantId) {
      cache.invalidateByPrefix(`jobs:${authUser.tenantId}:`);
    }

    // ── Phase C: Optional billing on generation ──────────────────────
    // If the job was created from a recurring schedule with generateInvoice=true
    // and invoiceTiming='on_generation', create a draft invoice linked to the job.
    // This runs OUTSIDE the transaction (autoCreateInvoiceFromJob has its own
    // per-job in-memory lock + does its own transaction). Failures are logged
    // but don't fail the job creation — the schedule advance already succeeded.
    if (recurringSchedule?.generateInvoice && recurringSchedule.invoiceTiming === 'on_generation') {
      try {
        const { autoCreateInvoiceFromJob } = await import('@/lib/invoice-automation');
        await autoCreateInvoiceFromJob(job.id, { force: true });
      } catch (invoiceErr) {
        console.error('[Jobs POST] auto-invoice on recurring generation failed:', invoiceErr);
      }
    }

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    console.error('Error creating job:', error)
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }

    const putAuthUser = await getAuthUser();

    // ── Detect assignee change (re-assignment) so we can notify the new
    // assignee. We snapshot the old assigneeId BEFORE the update; if it
    // differs from the incoming value, the new assignee gets the same
    // multi-channel (WhatsApp + in-app + push) notification as on creation.
    let previousAssigneeId: string | null = null
    if (data.assigneeId !== undefined) {
      const existing = await db.job.findUnique({
        where: { id },
        select: { assigneeId: true },
      })
      previousAssigneeId = existing?.assigneeId ?? null
    }

    // Handle date fields
    const updateData: Record<string, unknown> = { ...data }
    if (data.scheduledAt) updateData.scheduledAt = new Date(data.scheduledAt)
    if (data.actualStartTime) updateData.actualStartTime = new Date(data.actualStartTime)
    if (data.actualEndTime) updateData.actualEndTime = new Date(data.actualEndTime)

    const job = await db.job.update({
      where: { id },
      data: updateData,
      include: {
        assignee: true,
        customer: true,
        resource: true,
      },
    })

    // ── Re-assignment notification ───────────────────────────────────
    // If the assignee changed AND a new assignee exists, notify them the
    // same way as a fresh assignment (WhatsApp + in-app + push). Detached
    // so it never blocks the HTTP response.
    const newAssigneeId = (data.assigneeId as string | null) ?? null
    if (
      newAssigneeId &&
      newAssigneeId !== previousAssigneeId
    ) {
      db.employee
        .findUnique({ where: { id: newAssigneeId } })
        .then((employee) => {
          if (!employee) return
          notifyEmployeeJobAssigned(job as unknown as Record<string, unknown>, employee as unknown as Record<string, unknown>).catch((e) =>
            console.error('Failed to send re-assignment notification:', e)
          )
          dispatchJobEvent('job.assigned', job, { employee, customer: null }).catch((err) =>
            console.error('[EventWebhook] Background dispatch failed for job.assigned:', err)
          )
          // ── Restore EventBus emission for re-assignment (regression fix) ──
          EventBus.emit('job.assigned', {
            job: {
              id: job.id,
              jobNumber: job.jobNumber,
              title: job.title,
              status: job.status,
              priority: job.priority,
              type: job.type,
              address: job.address,
              customerName: job.customerName,
              customerPhone: job.customerPhone,
              assigneeName: job.assigneeName,
              assigneePhone: job.assigneePhone,
              workspaceId: job.workspaceId,
            },
            employee: { id: employee.id, name: employee.name, phone: employee.phone },
            customer: null,
            resourceType: 'job',
            resourceId: job.id,
          }, { tenantId: job.workspaceId || undefined, workspaceId: job.workspaceId || undefined }).catch((err) =>
            console.error('[EventBus] Failed to emit job.assigned (re-assign):', err)
          )
        })
        .catch((e) => console.error('[Jobs PUT] re-assign lookup failed:', e))
    }

    // ─── Fire event webhook: job.cancelled ────────────────────────
    if (data.status === 'cancelled') {
      try {
        dispatchJobEvent('job.cancelled', job, {
          employee: job.assigneeId ? { id: job.assigneeId, name: job.assigneeName, phone: job.assigneePhone } : null,
          customer: job.customerPhone ? { name: job.customerName, phone: job.customerPhone } : null,
        }).catch(err =>
          console.error('[EventWebhook] Background dispatch failed for job.cancelled:', err)
        )
      } catch (e) {
        console.error('Failed to dispatch job.cancelled webhook:', e)
      }
    }

    // Bust jobs cache for this tenant (updated job changes all lists)
    if (putAuthUser?.tenantId) {
      cache.invalidateByPrefix(`jobs:${putAuthUser.tenantId}:`);
    }

    return NextResponse.json(job)
  } catch (error) {
    console.error('Error updating job:', error)
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 })
  }
}

// C-1 perf trace — wraps GET with observational instrumentation (no-op when CRM_PERF_TRACE != 'true')
export const GET = withCrmTrace('GET /api/jobs', _GET);
