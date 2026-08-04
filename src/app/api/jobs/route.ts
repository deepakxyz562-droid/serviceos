import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { cache } from '@/lib/cache'
import { cachedJson } from '@/lib/cache-headers'
import { notifyEmployeeJobAssigned } from '@/lib/whatsapp-notifications'
import { dispatchJobEvent } from '@/lib/event-webhook-dispatcher'
import { logActivity } from '@/lib/activity-log'
import { EventBus } from '@/lib/event-bus'
import { setDefaultResultOrder } from 'dns'
import { requireCrmTenant } from '@/lib/require-crm-tenant'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Set JOBS_TTL = 0 to ensure live CRM data refresh returns instant fresh database rows
const JOBS_TTL = 0;

// Force IPv4-first for server-side Nominatim fetches (same reason as the
// geocode proxy route — IPv6 route is unreachable in this sandbox).
setDefaultResultOrder('ipv4first')

/**
 * Geocode an address string using OpenStreetMap Nominatim.
 * Returns { latitude, longitude } or null on failure.
 * Best-effort: never throws — used as a background task after job creation.
 */
async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    if (!address || address.trim().length < 3) return null;
    const upstreamUrl =
      'https://nominatim.openstreetmap.org/search?format=json' +
      `&q=${encodeURIComponent(address)}` +
      '&limit=1';
    const res = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': process.env.NOMINATIM_USER_AGENT || 'Fieseros-Dispatch/1.0 (dispatch@fieseros.app)',
      },
      // Short timeout — geocoding is best-effort, don't hang the server.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch {
    return null;
  }
}

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

export async function GET(request: NextRequest) {
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
    // a `take` limit for performance — the History list only needs summary
    // fields, not full assignee/customer/resource records.
    const historyMode = searchParams.get('history') === 'true'
    // includeDeleted=false → exclude soft-deleted jobs from the result set.
    // includeDeleted=true (or unset) → return soft-deleted jobs too (backward
    // compat — most callers client-side filter them anyway).
    const excludeDeleted = searchParams.get('includeDeleted') === 'false'

    // ── Cache lookup (skip for search queries — results are too dynamic) ──
    // Cache key includes tenantId + all filter params so different views
    // (Active vs History vs Dispatch) get separate cache entries.
    if (!search && user.tenantId) {
      const cacheKey = `jobs:${user.tenantId}:${status || ''}:${type || ''}:${priority || ''}:${assigneeId || ''}:${customerId || ''}:${historyMode ? 'h' : 'a'}:${excludeDeleted ? 'xd' : 'ad'}:${searchParams.get('tenantId') || ''}`;
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

    // ── History mode: lighter query ───────────────────────────────────
    // The History tab only renders summary cards (title, customer, assignee
    // names, dates, amounts) — it doesn't need full relation records. Using
    // `select` instead of `include` avoids fetching large text fields
    // (description, metadataJson, lineItemsJson, etc.) and entire related
    // rows, dramatically reducing payload size and query time.
    if (historyMode) {
      const historyJobs = await db.job.findMany({
        where,
        select: {
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
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      })
      const cacheKey = (request as unknown as { _jobsCacheKey?: string })._jobsCacheKey;
      if (cacheKey) cache.set(cacheKey, historyJobs, JOBS_TTL);
      return cachedJson(historyJobs)
    }

    const jobs = await db.job.findMany({
      where,
      include: {
        assignee: true,
        customer: true,
        resource: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const cacheKey = (request as unknown as { _jobsCacheKey?: string })._jobsCacheKey;
    if (cacheKey) cache.set(cacheKey, jobs, JOBS_TTL);
    return cachedJson(jobs)
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

    const job = await db.job.create({
      data: {
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
        // ── Jobber-style itemized billing + on-site instructions ──
        lineItemsJson: typeof body.lineItemsJson === 'string' ? body.lineItemsJson : JSON.stringify(body.lineItemsJson ?? []),
        visitInstructions: body.visitInstructions || null,
        scheduledTime: body.scheduledTime || null,
        // ── "#job" Customize / Attach files & photos / Linked checklists / Link to related ──
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
      },
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
        // (Previously: `notifyCustomerBookingConfirmed(job)` sent an SMS to the customer here — removed per Rule 5a.)
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
