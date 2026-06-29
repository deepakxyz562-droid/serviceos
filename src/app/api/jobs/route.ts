import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { notifyCustomerBookingConfirmed, notifyEmployeeJobAssigned } from '@/lib/whatsapp-notifications'
import { dispatchJobEvent } from '@/lib/event-webhook-dispatcher'

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

    if (status) where.status = status
    if (type) where.type = type
    if (priority) where.priority = priority
    if (assigneeId) where.assigneeId = assigneeId
    if (customerId) where.customerId = customerId
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { customerName: { contains: search } },
        { assigneeName: { contains: search } },
        { address: { contains: search } },
      ]
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

    return NextResponse.json(jobs)
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const authUser = await getAuthUser()

    // Resolve workspaceId so the job has proper workspace → tenant context.
    // The Create Job form does not send workspaceId; without this, the job
    // would be created with workspaceId=null, which breaks auto-invoice
    // creation (the invoice gets the wrong tenantId and is invisible in the
    // user's invoice list). See resolveWorkspaceId() docblock above.
    const workspaceId = await resolveWorkspaceId(body.workspaceId, authUser)

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
    const employeePromise = job.assigneeId
      ? db.employee.findUnique({ where: { id: job.assigneeId } })
      : Promise.resolve(null)
    const customerPromise = job.customerId
      ? db.customer.findUnique({ where: { id: job.customerId } })
      : Promise.resolve(job.customerPhone ? { name: job.customerName, phone: job.customerPhone } as { name: string; phone: string } | null : null)

    Promise.all([employeePromise, customerPromise])
      .then(([employee, customer]) => {
        // Booking confirmation WhatsApp to customer
        if (job.customerPhone) {
          notifyCustomerBookingConfirmed(job).catch((e) =>
            console.error('Failed to send booking confirmation:', e)
          )
        }
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
      })
      .catch((e) => console.error('Failed to run post-create side-effects:', e))

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

    return NextResponse.json(job)
  } catch (error) {
    console.error('Error updating job:', error)
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 })
  }
}
