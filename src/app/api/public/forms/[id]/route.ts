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
        tenant: {
          select: {
            name: true,
            phone: true,
            email: true,
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

    const normalizedSchema = normalizeFormSchema(schema);

    return NextResponse.json({
      id: form.id,
      name: form.name,
      slug: form.slug,
      description: form.description,
      type: form.type,
      schema: normalizedSchema,
      branding: {
        businessName: form.tenant?.name || 'Service Provider',
        businessPhone: form.tenant?.phone || null,
        businessEmail: form.tenant?.email || null,
      },
    });
  } catch (error) {
    console.error('[public-form-get] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch form' }, { status: 500 });
  }
}
