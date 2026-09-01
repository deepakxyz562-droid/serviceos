import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// ─── GET /api/forms/[id] ───────────────────────────────────────────────────
// Get a single form with its recent responses.
//
// Security-3 IDOR fix: require authentication + tenant isolation.
// Previously this endpoint had NO authentication — any unauthenticated user
// could read any form by ID. Now it requires authentication and constrains
// the lookup to the user's tenant (super-admins can access any tenant).

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Security-3 IDOR fix: require authentication + tenant isolation ──
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    // Tenant-scoped lookup: super-admins can access any tenant; everyone else
    // is constrained to their own tenant.
    const tenantFilter =
      user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin'
        ? {}
        : { tenantId: user.tenantId };

    const form = await db.form.findFirst({
      where: { id, ...tenantFilter },
      include: {
        responses: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { responses: true } },
      },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    return NextResponse.json({ form });
  } catch (error) {
    console.error('Get form error:', error);
    return NextResponse.json({ error: 'Failed to fetch form' }, { status: 500 });
  }
}

// ─── PUT /api/forms/[id] ───────────────────────────────────────────────────
// Update a form (all fields, including submission actions, field mapping, WhatsApp templates)
//
// Security-3 IDOR fix:
//   1. Require authentication + tenant isolation
//   2. REMOVED body.tenantId and body.workspaceId from update data — ordinary
//      users CANNOT reassign forms to other tenants. Only super-admins can
//      change tenantId (via a separate superadmin endpoint if needed).

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Security-3 IDOR fix: require authentication + tenant isolation ──
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Tenant-scoped lookup: verify the form exists AND belongs to the user's tenant
    const tenantFilter =
      user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin'
        ? {}
        : { tenantId: user.tenantId };

    const existing = await db.form.findFirst({ where: { id, ...tenantFilter } });
    if (!existing) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    // Only update fields that are provided
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.fieldsJson !== undefined) {
      updateData.fieldsJson = typeof body.fieldsJson === 'string' ? body.fieldsJson : JSON.stringify(body.fieldsJson);
    }
    if (body.submissionActions !== undefined) {
      updateData.submissionActions = typeof body.submissionActions === 'string' ? body.submissionActions : JSON.stringify(body.submissionActions);
    }
    if (body.fieldMappingJson !== undefined) {
      updateData.fieldMappingJson = typeof body.fieldMappingJson === 'string' ? body.fieldMappingJson : JSON.stringify(body.fieldMappingJson);
    }
    if (body.welcomeMessage !== undefined) updateData.welcomeMessage = body.welcomeMessage;
    if (body.completionMessage !== undefined) updateData.completionMessage = body.completionMessage;
    if (body.whatsappOwnerTemplate !== undefined) updateData.whatsappOwnerTemplate = body.whatsappOwnerTemplate;
    if (body.whatsappUserTemplate !== undefined) updateData.whatsappUserTemplate = body.whatsappUserTemplate;
    if (body.whatsappAiGenerated !== undefined) updateData.whatsappAiGenerated = body.whatsappAiGenerated;
    if (body.embedScriptEnabled !== undefined) updateData.embedScriptEnabled = body.embedScriptEnabled;
    if (body.embedIframeEnabled !== undefined) updateData.embedIframeEnabled = body.embedIframeEnabled;

    // SECURITY: tenantId and workspaceId are NO LONGER accepted from the
    // request body for ordinary users. This prevents cross-tenant form
    // reassignment. Super-admins can change tenantId via a dedicated
    // superadmin endpoint (not this one).
    // (Previously lines 75-76 allowed body.tenantId/body.workspaceId — REMOVED)

    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.createdById !== undefined) updateData.createdById = body.createdById;

    // Use updateMany with tenant scope so a race-condition ID swap can't
    // mutate a form that was just moved to another tenant.
    const updateResult = await db.form.updateMany({
      where: { id, ...tenantFilter },
      data: updateData,
    });

    if (updateResult.count === 0) {
      return NextResponse.json({ error: 'Form not found or access denied' }, { status: 404 });
    }

    // Fetch the updated form to return (tenant-scoped for safety)
    const form = await db.form.findFirst({
      where: { id, ...tenantFilter },
      include: { _count: { select: { responses: true } } },
    });

    return NextResponse.json({ form });
  } catch (error) {
    console.error('Update form error:', error);
    return NextResponse.json({ error: 'Failed to update form' }, { status: 500 });
  }
}

// ─── DELETE /api/forms/[id] ────────────────────────────────────────────────
// Delete a form and all its responses
//
// Security-3 IDOR fix: require authentication + tenant isolation.

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Security-3 IDOR fix: require authentication + tenant isolation ──
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    const tenantFilter =
      user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin'
        ? {}
        : { tenantId: user.tenantId };

    // Tenant-scoped delete: use deleteMany with tenantId in WHERE
    const deleteResult = await db.form.deleteMany({
      where: { id, ...tenantFilter },
    });

    if (deleteResult.count === 0) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Form and all responses deleted' });
  } catch (error) {
    console.error('Delete form error:', error);
    return NextResponse.json({ error: 'Failed to delete form' }, { status: 500 });
  }
}
