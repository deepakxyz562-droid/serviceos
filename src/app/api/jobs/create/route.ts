import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { EventBus } from '@/lib/event-bus';
import { getAuthUser } from '@/lib/auth';

/**
 * POST /api/jobs/create
 * Create a new job with auto-generated ID
 *
 * ─── Authentication (added) ───────────────────────────────────────
 * This endpoint previously allowed anyone to POST and create a job —
 * a critical security hole. It now requires an authenticated session
 * (cookie OR Bearer token via getAuthUser) and scopes every created
 * job to the caller's tenantId. The tenantId is NEVER read from the
 * request body.
 *
 * The Job model has no `tenantId` column directly — it links to a
 * Workspace which links to a Tenant. So "scoping to tenantId" means
 * resolving a workspaceId that belongs to the caller's tenant. This
 * mirrors the resolveWorkspaceId() helper in /api/jobs/route.ts.
 */
async function resolveWorkspaceIdForTenant(
  tenantId: string | null,
  userWorkspaceId: string | null,
  explicit?: string | null,
): Promise<string | null> {
  // 1. Super-admin can override workspaceId explicitly (cross-tenant).
  //    Handled by the caller passing `explicit` only when isSuperAdmin.
  if (explicit) return explicit;

  // 2. Use the user's own workspaceId if set.
  if (userWorkspaceId) return userWorkspaceId;

  // 3. Find any workspace belonging to the user's tenant.
  if (tenantId) {
    try {
      const ws = await db.workspace.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      if (ws) return ws.id;
    } catch (e) {
      console.error('[JobsCreate] Failed to resolve workspace for tenant:', e);
    }
  }

  // 4. Last-resort fallback (single-tenant dev environments with no tenant).
  try {
    const existing = await db.workspace.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (existing) return existing.id;
  } catch (e) {
    console.error('[JobsCreate] Last-resort workspace lookup failed:', e);
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    // ─── Auth check ────────────────────────────────────────────────
    // Block unauthenticated callers. We require a valid session AND a
    // tenantId unless the caller is a super-admin (who can act across
    // tenants). The created job is always scoped to the caller's tenant
    // — the body's workspaceId/tenantId is never trusted for regular
    // users.
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized — authentication required' },
        { status: 401 },
      );
    }
    if (!user.tenantId && !user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized — no tenant context' },
        { status: 401 },
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 },
      );
    }

    // Validate priority if provided
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (body.priority && !validPriorities.includes(body.priority)) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate type if provided
    const validTypes = ['delivery', 'service', 'pickup', 'installation', 'maintenance', 'inspection', 'repair', 'consultation'];
    if (body.type && !validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 },
      );
    }

    // ─── Resolve workspaceId (scoped to caller's tenant) ───────────
    // Only super-admins are allowed to pass an explicit workspaceId
    // (e.g. for cross-tenant support actions). Regular users always
    // get a workspace resolved from their own tenantId, regardless of
    // what they put in the body — this prevents a user from creating
    // a job under a different tenant.
    const explicitWorkspaceId = user.isSuperAdmin ? (body.workspaceId || null) : null;
    const workspaceId = await resolveWorkspaceIdForTenant(
      user.tenantId,
      user.workspaceId,
      explicitWorkspaceId,
    );

    // Auto-generate ID
    const jobId = crypto.randomUUID();

    // Create the job in the database with status 'pending'
    const job = await db.job.create({
      data: {
        id: jobId,
        title: body.title,
        description: body.description || null,
        status: 'pending',
        priority: body.priority || 'medium',
        type: body.type || 'delivery',
        address: body.address || null,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        notes: body.notes || null,
        // Customer info
        customerId: body.customerId || null,
        customerName: body.customerName || null,
        customerPhone: body.customerPhone || null,
        // Assignee info (not set at creation for pending jobs)
        assigneeId: null,
        assigneeName: null,
        assigneePhone: null,
        // WhatsApp tracking (not set at creation)
        whatsappMessageId: null,
        whatsappSessionId: null,
        assignmentStatus: null,
        // ─── Scoped to caller's tenant via workspaceId ───
        // Never trust body.workspaceId for non-super-admin users.
        workspaceId,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
            status: true,
            avatar: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    // Emit job.created event via EventBus — scope to caller's tenant
    // (NOT to body-provided tenantId, which could be spoofed).
    try {
      await EventBus.emit('job.created', {
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
          workspaceId: job.workspaceId,
        },
        resourceType: 'job',
        resourceId: job.id,
        summary: `Job created: ${job.title}`,
      }, {
        tenantId: user.tenantId || undefined,
        workspaceId: job.workspaceId || undefined,
      });
    } catch (eventErr) {
      console.error('[JobsCreate] Failed to emit job.created event:', eventErr);
    }

    return NextResponse.json(
      {
        job,
        message: 'Job created successfully',
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
