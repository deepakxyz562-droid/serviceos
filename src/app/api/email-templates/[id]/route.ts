import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

/** Parse the variablesJson string into an array (best-effort). */
function parseVariables(json: string | null | undefined): unknown[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Encode variablesJson: accept array or string, normalize to a JSON string. */
function encodeVariablesJson(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === 'string') {
    try {
      JSON.parse(raw);
      return raw;
    } catch {
      throw new Error('variablesJson must be valid JSON');
    }
  }
  if (Array.isArray(raw)) {
    return JSON.stringify(raw);
  }
  throw new Error(
    'variablesJson must be an array of { key, label, required, example } objects'
  );
}

/**
 * GET /api/email-templates/[id]
 * Fetch one template by id. Allowed if:
 *   - it's a global platform template (tenantId null), OR
 *   - it belongs to the current tenant.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';
    const { id } = await params;

    const template = await db.emailTemplate.findUnique({ where: { id } });
    if (!template) {
      return NextResponse.json(
        { error: 'Email template not found' },
        { status: 404 }
      );
    }
    // Allow if global OR belongs to current tenant.
    if (template.tenantId !== null && template.tenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Email template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...template,
      variables: parseVariables(template.variablesJson),
    });
  } catch (error) {
    console.error('Error fetching email template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email template' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/email-templates/[id]
 * Update a template.
 *  - Built-in templates: allow editing subject, htmlBody, textBody, description,
 *    variablesJson. Reject changes to slug / name / category / isBuiltIn.
 *  - Custom templates: allow editing all fields (except isBuiltIn — user
 *    templates can never become built-in).
 *  - Reject edits to a template not visible to this tenant (must be global or
 *    owned by current tenant).
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';
    const { id } = await params;

    const existing = await db.emailTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Email template not found' },
        { status: 404 }
      );
    }
    // Ownership check — must be global OR owned by current tenant.
    if (existing.tenantId !== null && existing.tenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Email template not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      slug,
      category,
      description,
      subject,
      htmlBody,
      textBody,
      variablesJson,
      isDefault,
      language,
      status,
      isFavorite,
      tagsJson,
      attachmentsJson,
      brandKitId,
    } = body as Record<string, unknown>;

    const updateData: Record<string, unknown> = {};

    if (existing.isBuiltIn) {
      // Built-in: only allow content edits.
      if (
        name !== undefined ||
        slug !== undefined ||
        category !== undefined ||
        isDefault !== undefined
      ) {
        return NextResponse.json(
          {
            error:
              'Built-in templates do not allow changing name, slug, category, or default status. You can edit subject, body, description, and variables.',
          },
          { status: 400 }
        );
      }
      if (description !== undefined) {
        updateData.description =
          typeof description === 'string' && description.trim()
            ? description.trim()
            : null;
      }
      if (subject !== undefined) {
        if (typeof subject !== 'string' || !subject.trim()) {
          return NextResponse.json(
            { error: 'subject cannot be empty' },
            { status: 400 }
          );
        }
        updateData.subject = subject.trim();
      }
      if (htmlBody !== undefined) {
        if (typeof htmlBody !== 'string' || !htmlBody.trim()) {
          return NextResponse.json(
            { error: 'htmlBody cannot be empty' },
            { status: 400 }
          );
        }
        updateData.htmlBody = htmlBody;
      }
      if (textBody !== undefined) {
        updateData.textBody =
          typeof textBody === 'string' && textBody.trim() ? textBody.trim() : null;
      }
      if (variablesJson !== undefined) {
        try {
          const encoded = encodeVariablesJson(variablesJson);
          if (encoded !== null) updateData.variablesJson = encoded;
        } catch (e) {
          return NextResponse.json(
            { error: e instanceof Error ? e.message : 'Invalid variablesJson' },
            { status: 400 }
          );
        }
      }
    } else {
      // Custom template: allow all fields except isBuiltIn.
      if (name !== undefined) {
        if (typeof name !== 'string' || !name.trim()) {
          return NextResponse.json(
            { error: 'name cannot be empty' },
            { status: 400 }
          );
        }
        updateData.name = name.trim();
      }
      if (slug !== undefined) {
        if (typeof slug !== 'string' || !slug.trim()) {
          return NextResponse.json(
            { error: 'slug cannot be empty' },
            { status: 400 }
          );
        }
        // Reject if another template (same tenant) already uses this slug.
        const dup = await db.emailTemplate.findFirst({
          where: {
            slug: slug.trim(),
            tenantId: existing.tenantId, // same scope (current tenant or null)
            NOT: { id },
          },
        });
        if (dup) {
          return NextResponse.json(
            { error: `A template with slug "${slug.trim()}" already exists` },
            { status: 409 }
          );
        }
        updateData.slug = slug.trim();
      }
      if (category !== undefined) {
        if (
          typeof category !== 'string' ||
          !['transactional', 'marketing', 'system'].includes(category)
        ) {
          return NextResponse.json(
            { error: 'category must be one of: transactional, marketing, system' },
            { status: 400 }
          );
        }
        updateData.category = category;
      }
      if (description !== undefined) {
        updateData.description =
          typeof description === 'string' && description.trim()
            ? description.trim()
            : null;
      }
      if (subject !== undefined) {
        if (typeof subject !== 'string' || !subject.trim()) {
          return NextResponse.json(
            { error: 'subject cannot be empty' },
            { status: 400 }
          );
        }
        updateData.subject = subject.trim();
      }
      if (htmlBody !== undefined) {
        if (typeof htmlBody !== 'string' || !htmlBody.trim()) {
          return NextResponse.json(
            { error: 'htmlBody cannot be empty' },
            { status: 400 }
          );
        }
        updateData.htmlBody = htmlBody;
      }
      if (textBody !== undefined) {
        updateData.textBody =
          typeof textBody === 'string' && textBody.trim() ? textBody.trim() : null;
      }
      if (variablesJson !== undefined) {
        try {
          const encoded = encodeVariablesJson(variablesJson);
          if (encoded !== null) updateData.variablesJson = encoded;
        } catch (e) {
          return NextResponse.json(
            { error: e instanceof Error ? e.message : 'Invalid variablesJson' },
            { status: 400 }
          );
        }
      }
      if (isDefault !== undefined) {
        updateData.isDefault = Boolean(isDefault);
      }
      // Template Studio extension fields (custom templates only)
      if (language !== undefined) {
        updateData.language = typeof language === 'string' && language.trim() ? language.trim() : 'en';
      }
      if (status !== undefined) {
        updateData.status = typeof status === 'string' && ['draft', 'published'].includes(status) ? status : 'published';
      }
      if (isFavorite !== undefined) {
        updateData.isFavorite = Boolean(isFavorite);
      }
      if (tagsJson !== undefined) {
        try { updateData.tagsJson = typeof tagsJson === 'string' ? tagsJson : JSON.stringify(tagsJson ?? []); } catch { /* ignore */ }
      }
      if (attachmentsJson !== undefined) {
        try { updateData.attachmentsJson = typeof attachmentsJson === 'string' ? attachmentsJson : JSON.stringify(attachmentsJson ?? []); } catch { /* ignore */ }
      }
      if (brandKitId !== undefined) {
        updateData.brandKitId = typeof brandKitId === 'string' && brandKitId.trim() ? brandKitId.trim() : null;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const updated = await db.emailTemplate.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ...updated,
      variables: parseVariables(updated.variablesJson),
    });
  } catch (error) {
    console.error('Error updating email template:', error);
    return NextResponse.json(
      { error: 'Failed to update email template' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/email-templates/[id]
 *  - Cannot delete built-in templates (return 400 with a specific message).
 *  - Only delete custom templates owned by the current tenant.
 *  - Returns 200.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';
    const { id } = await params;

    const existing = await db.emailTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Email template not found' },
        { status: 404 }
      );
    }

    if (existing.isBuiltIn) {
      return NextResponse.json(
        {
          error:
            'Built-in templates cannot be deleted — you can edit them instead',
        },
        { status: 400 }
      );
    }

    // Only the owning tenant may delete their custom templates.
    if (existing.tenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Email template not found' },
        { status: 404 }
      );
    }

    await db.emailTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting email template:', error);
    return NextResponse.json(
      { error: 'Failed to delete email template' },
      { status: 500 }
    );
  }
}
