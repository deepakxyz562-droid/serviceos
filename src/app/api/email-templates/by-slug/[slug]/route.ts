import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

type Params = { params: Promise<{ slug: string }> };

/**
 * GET /api/email-templates/by-slug/[slug]
 * Look up a template by slug. Used by other parts of the system (e.g.
 * notification-orchestrator) to programmatically find a template like
 * "portal-invitation".
 *
 * Resolution order:
 *   1. Tenant-specific template with this slug (tenantId = current tenant).
 *   2. Global platform template with this slug (tenantId IS NULL).
 *   3. If neither exists, return 404.
 *
 * Returns the template with `variables` parsed from variablesJson.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';
    const { slug: rawSlug } = await params;

    if (!rawSlug) {
      return NextResponse.json(
        { error: 'slug is required' },
        { status: 400 }
      );
    }
    const slug = decodeURIComponent(rawSlug);

    // 1. Tenant-specific template
    let template = await db.emailTemplate.findFirst({
      where: { slug, tenantId },
    });

    // 2. Fallback to global platform template
    if (!template) {
      template = await db.emailTemplate.findFirst({
        where: { slug, tenantId: null },
      });
    }

    // 3. Not found
    if (!template) {
      return NextResponse.json(
        { error: `Template with slug "${slug}" not found` },
        { status: 404 }
      );
    }

    // Parse variablesJson for convenience.
    let variables: unknown[] = [];
    try {
      const parsed = template.variablesJson
        ? JSON.parse(template.variablesJson)
        : [];
      variables = Array.isArray(parsed) ? parsed : [];
    } catch {
      variables = [];
    }

    return NextResponse.json({ ...template, variables });
  } catch (error) {
    console.error('Error fetching template by slug:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template by slug' },
      { status: 500 }
    );
  }
}
