import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { normalizeFormSchema } from '@/lib/forms/form-schema-types';

/**
 * GET /api/public/forms/[id]
 *
 * Public endpoint to fetch form configuration by ID or slug.
 * Used by standalone form pages, JS embeds, and WordPress plugins.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const form = await db.form.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        status: { not: 'archived' },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        type: true,
        status: true,
        schemaJson: true,
        fieldsJson: true,
        submissionActions: true,
        welcomeMessage: true,
        completionMessage: true,
        tenantId: true,
        workspaceId: true,
        tenant: {
          select: {
            name: true,
            phone: true,
            email: true,
          },
        },
        workspace: {
          select: {
            name: true,
            brandingJson: true,
          },
        },
      },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found or inactive' }, { status: 404 });
    }

    // Increment submissions/views count asynchronously
    db.form
      .update({
        where: { id: form.id },
        data: { submissions: { increment: 0 } },
      })
      .catch(() => {});

    let schema;
    try {
      schema = form.schemaJson && form.schemaJson !== '{}'
        ? JSON.parse(form.schemaJson)
        : null;
    } catch {
      schema = null;
    }

    let rawFields: any[] = [];
    if (form.fieldsJson) {
      try {
        const parsed = typeof form.fieldsJson === 'string' ? JSON.parse(form.fieldsJson) : form.fieldsJson;
        if (Array.isArray(parsed)) rawFields = parsed;
      } catch { /* ignore */ }
    }

    const normalizedSchema = normalizeFormSchema(schema, rawFields);

    // Resolve branding: prefer tenant for CRM-bound forms, fall back to
    // workspace branding for standalone (Forms-only) forms.
    let workspaceBranding: { productName?: string; supportEmail?: string } = {};
    if (form.workspace?.brandingJson) {
      try {
        workspaceBranding = JSON.parse(form.workspace.brandingJson);
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      id: form.id,
      name: form.name,
      slug: form.slug,
      description: form.description,
      type: form.type,
      schema: normalizedSchema,
      branding: {
        businessName:
          form.tenant?.name ||
          workspaceBranding.productName ||
          form.workspace?.name ||
          'Service Provider',
        businessPhone: form.tenant?.phone || null,
        businessEmail: form.tenant?.email || workspaceBranding.supportEmail || null,
      },
    });
  } catch (error) {
    console.error('[public-form-get] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch form' }, { status: 500 });
  }
}
