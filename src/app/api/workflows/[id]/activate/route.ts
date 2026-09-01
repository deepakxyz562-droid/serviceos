import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

function safeJsonParse(str: string | null, fallback: unknown = []) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Security-3 IDOR fix: auth + tenant + permission BEFORE any side effect ──
    // Activating a workflow creates webhook registrations (side effect), so
    // authorization MUST complete BEFORE any DB writes.
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const isSuperAdmin = user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin';
    const allowedRoles = ['owner', 'admin', 'manager', 'superadmin', 'super_admin'];
    if (!isSuperAdmin && !allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to activate workflows' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const tenantFilter = isSuperAdmin ? {} : { tenantId: user.tenantId };
    const workflow = await db.workflow.findFirst({ where: { id, ...tenantFilter } });
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // ── Authorization complete — safe to mutate from here ──

    const body = await request.json().catch(() => ({}));
    const newActiveStatus = body.active !== undefined ? body.active : !workflow.active;

    const updated = await db.workflow.update({
      where: { id },
      data: { active: newActiveStatus },
    });

    // If activating, register webhooks for trigger nodes
    if (newActiveStatus && !workflow.active) {
      const nodes: any[] = safeJsonParse(updated.nodesJson, []);
      const webhookNodes = nodes.filter(
        (n) => n.type === 'webhookTrigger' || n.data?.nodeType === 'webhookTrigger' || n.type === 'httpRequestTrigger' || n.data?.nodeType === 'httpRequestTrigger'
      );

      for (const node of webhookNodes) {
        const config = node.data?.config || {};
        const path = config.path || `webhook/${updated.id}/${node.id}`;
        const method = config.httpMethod || 'POST';

        await db.webhookRegistration.create({
          data: {
            workflowId: updated.id,
            path,
            method,
            active: true,
          },
        });
      }
    }

    // If deactivating, remove webhook registrations
    if (!newActiveStatus && workflow.active) {
      await db.webhookRegistration.deleteMany({
        where: { workflowId: updated.id },
      });
    }

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      active: updated.active,
      message: updated.active
        ? 'Workflow activated successfully'
        : 'Workflow deactivated successfully',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to toggle workflow status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Security-3 IDOR fix: same auth + tenant + permission as POST ──
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const isSuperAdmin = user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin';
    const allowedRoles = ['owner', 'admin', 'manager', 'superadmin', 'super_admin'];
    if (!isSuperAdmin && !allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const tenantFilter = isSuperAdmin ? {} : { tenantId: user.tenantId };
    const workflow = await db.workflow.findFirst({ where: { id, ...tenantFilter } });
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Deactivate the workflow
    await db.workflow.update({
      where: { id },
      data: { active: false },
    });

    // Remove webhook registrations
    await db.webhookRegistration.deleteMany({
      where: { workflowId: id },
    });

    return NextResponse.json({
      id,
      active: false,
      message: 'Workflow deactivated successfully',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to deactivate workflow';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
