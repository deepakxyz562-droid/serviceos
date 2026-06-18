import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, generateSlug } from '@/lib/auth';

/**
 * GET /api/email-templates
 * List templates visible to the current tenant — BOTH global platform
 * templates (tenantId IS NULL) AND the current tenant's templates.
 *
 * Query params:
 *   - category: 'transactional' | 'marketing' | 'system'
 *   - slug: exact slug match (e.g. "portal-invitation")
 *
 * Order: isBuiltIn desc, then category asc, then name asc.
 * Returns the array directly (not wrapped).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const slug = searchParams.get('slug');

    const where: Record<string, unknown> = {
      OR: [{ tenantId: null }, { tenantId }],
    };
    if (category && ['transactional', 'marketing', 'system'].includes(category)) {
      where.category = category;
    }
    if (slug && typeof slug === 'string' && slug.trim()) {
      where.slug = slug.trim();
    }

    const templates = await db.emailTemplate.findMany({
      where,
      orderBy: [
        { isBuiltIn: 'desc' },
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    // Surface `variablesJson` as a parsed `variables` array for client
    // convenience.
    const data = templates.map((t) => {
      let variables: unknown[] = [];
      try {
        variables = t.variablesJson ? (JSON.parse(t.variablesJson) as unknown[]) : [];
      } catch {
        variables = [];
      }
      return { ...t, variables };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching email templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email templates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/email-templates
 * Create a custom (non-built-in) template for the current tenant.
 * Body:
 *   { name, slug?, category, description?, subject, htmlBody, textBody?,
 *     variablesJson?, isDefault? }
 *  - Auto-generates slug from name (kebab-case) if not provided.
 *  - isBuiltIn is always false for user-created templates.
 *  - tenantId is set to the current user's tenant.
 *  - Returns 409 if a template with the same slug already exists for this tenant.
 *  - Returns 201 with the created template.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

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
    } = body as Record<string, unknown>;

    // Validate required fields
    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (typeof subject !== 'string' || !subject.trim()) {
      return NextResponse.json({ error: 'subject is required' }, { status: 400 });
    }
    if (typeof htmlBody !== 'string' || !htmlBody.trim()) {
      return NextResponse.json({ error: 'htmlBody is required' }, { status: 400 });
    }
    const validCategories = ['transactional', 'marketing', 'system'];
    const finalCategory =
      typeof category === 'string' && validCategories.includes(category)
        ? category
        : 'transactional';

    // Generate slug from name if not provided.
    const finalSlug =
      typeof slug === 'string' && slug.trim()
        ? generateSlug(slug.trim())
        : generateSlug(name.trim());

    if (!finalSlug) {
      return NextResponse.json(
        { error: 'Could not generate a valid slug from the provided name' },
        { status: 400 }
      );
    }

    // Check for existing template with the same slug for this tenant.
    const existing = await db.emailTemplate.findFirst({
      where: { slug: finalSlug, tenantId },
    });
    if (existing) {
      return NextResponse.json(
        {
          error: `A template with slug "${finalSlug}" already exists for this tenant`,
        },
        { status: 409 }
      );
    }

    // Normalize variablesJson (accept array or string).
    let variablesJsonString = '[]';
    if (variablesJson !== undefined && variablesJson !== null) {
      if (typeof variablesJson === 'string') {
        try {
          JSON.parse(variablesJson);
          variablesJsonString = variablesJson;
        } catch {
          return NextResponse.json(
            { error: 'variablesJson must be valid JSON' },
            { status: 400 }
          );
        }
      } else if (Array.isArray(variablesJson)) {
        variablesJsonString = JSON.stringify(variablesJson);
      } else if (typeof variablesJson === 'object') {
        return NextResponse.json(
          { error: 'variablesJson must be an array of { key, label, required, example } objects' },
          { status: 400 }
        );
      }
    }

    const created = await db.emailTemplate.create({
      data: {
        name: name.trim(),
        slug: finalSlug,
        category: finalCategory,
        description:
          typeof description === 'string' && description.trim()
            ? description.trim()
            : null,
        subject: subject.trim(),
        htmlBody,
        textBody:
          typeof textBody === 'string' && textBody.trim() ? textBody.trim() : null,
        variablesJson: variablesJsonString,
        isBuiltIn: false,
        isDefault: Boolean(isDefault),
        tenantId,
        workspaceId: user.workspaceId || null,
      },
    });

    return NextResponse.json(
      {
        ...created,
        variables:
          (() => {
            try {
              return JSON.parse(created.variablesJson) as unknown[];
            } catch {
              return [];
            }
          })(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating email template:', error);
    return NextResponse.json(
      { error: 'Failed to create email template' },
      { status: 500 }
    );
  }
}
