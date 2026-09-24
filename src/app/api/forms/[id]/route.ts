import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { encryptSecretFields } from '@/lib/payments/credentials';

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
    // can access their tenant or unassigned templates/forms.
    const tenantFilter =
      user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin'
        ? {}
        : user.tenantId
        ? { OR: [{ tenantId: user.tenantId }, { tenantId: null }] }
        : {};

    const form = await db.form.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        ...tenantFilter,
      },
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

    // Tenant-scoped lookup: verify the form exists AND belongs to user or is unassigned (by id or slug)
    const tenantFilter =
      user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin'
        ? {}
        : user.tenantId
        ? { OR: [{ tenantId: user.tenantId }, { tenantId: null }] }
        : {};

    const existing = await db.form.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        ...tenantFilter,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Form not found or access denied' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    // Only update fields that are provided
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.fieldsJson !== undefined) {
      const fieldsData = typeof body.fieldsJson === 'string' ? body.fieldsJson : body.fieldsJson;
      // Encrypt secret payment credentials before storing in DB.
      // Walks every field's widgetConfig and encrypts any secret key found
      // (secretKey, clientSecret, keySecret, accessToken, etc.).
      const sanitized = encryptSecretFieldsInFields(fieldsData);
      updateData.fieldsJson = typeof sanitized === 'string' ? sanitized : JSON.stringify(sanitized);
    }
    if (body.schemaJson !== undefined) {
      const schemaData = typeof body.schemaJson === 'string' ? body.schemaJson : body.schemaJson;
      // Same encryption pass for schemaJson-based forms (modern format).
      const sanitized = encryptSecretFieldsInSchema(schemaData);
      updateData.schemaJson = typeof sanitized === 'string' ? sanitized : JSON.stringify(sanitized);
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

    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.createdById !== undefined) updateData.createdById = body.createdById;

    // Use existing.id for mutation
    const updateResult = await db.form.updateMany({
      where: { id: existing.id },
      data: updateData,
    });

    if (updateResult.count === 0) {
      return NextResponse.json({ error: 'Form not found or access denied' }, { status: 404 });
    }

    // Fetch the updated form to return (tenant-scoped for safety)
    const form = await db.form.findFirst({
      where: { id: existing.id },
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
        : user.tenantId
        ? { OR: [{ tenantId: user.tenantId }, { tenantId: null }] }
        : {};

    const existing = await db.form.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        ...tenantFilter,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Tenant-scoped delete: use deleteMany with existing.id
    const deleteResult = await db.form.deleteMany({
      where: { id: existing.id },
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

// ─── Helpers: encrypt secret payment credentials on save ────────────────

/**
 * Walk a fieldsJson array (legacy format) and encrypt any secret field found
 * in each field's widgetConfig. Leaves public keys (publishableKey, clientId,
 * applicationId, merchantId, keyId, apiLoginId, clientKey, subdomain) untouched.
 */
function encryptSecretFieldsInFields(fieldsData: string | unknown[]): string | unknown[] {
  if (typeof fieldsData === 'string') {
    try {
      const parsed = JSON.parse(fieldsData);
      if (Array.isArray(parsed)) {
        return JSON.stringify(encryptSecretFieldsInFields(parsed));
      }
    } catch { /* ignore */ }
    return fieldsData;
  }
  if (!Array.isArray(fieldsData)) return fieldsData;
  return fieldsData.map((field) => {
    if (field && typeof field === 'object' && 'widgetConfig' in field) {
      const f = field as Record<string, unknown>;
      const wc = f.widgetConfig as Record<string, unknown> | undefined;
      if (wc && typeof wc === 'object') {
        return { ...f, widgetConfig: encryptSecretFields(wc) };
      }
    }
    return field;
  });
}

/**
 * Walk a schemaJson object (modern format) and encrypt any secret field found
 * in each field's widgetConfig. Same logic as encryptSecretFieldsInFields but
 * for the { fields: [...], steps: [...], ... } schema structure.
 */
function encryptSecretFieldsInSchema(schemaData: string | Record<string, unknown>): string | Record<string, unknown> {
  if (typeof schemaData === 'string') {
    try {
      const parsed = JSON.parse(schemaData);
      if (parsed && typeof parsed === 'object') {
        return JSON.stringify(encryptSecretFieldsInSchema(parsed));
      }
    } catch { /* ignore */ }
    return schemaData;
  }
  if (!schemaData || typeof schemaData !== 'object') return schemaData;
  const schema = schemaData as Record<string, unknown>;
  const result: Record<string, unknown> = { ...schema };
  if (Array.isArray(schema.fields)) {
    result.fields = encryptSecretFieldsInFields(schema.fields as unknown[]) as unknown[];
  }
  if (Array.isArray(schema.steps)) {
    result.steps = (schema.steps as unknown[]).map((step) => {
      if (step && typeof step === 'object') {
        const s = step as Record<string, unknown>;
        if (Array.isArray(s.fields)) {
          return { ...s, fields: encryptSecretFieldsInFields(s.fields as unknown[]) };
        }
      }
      return step;
    });
  }
  return result;
}
