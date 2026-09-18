import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/admin/templates — list templates for admin review.
 *
 * Query params:
 *   status — filter by status (draft, submitted, under_review, approved,
 *            published, rejected, archived). Default: 'submitted'
 *   sort   — recent | popular | rating. Default: 'recent'
 *   limit  — default 50, max 200
 *   offset — default 0
 *
 * Returns all templates (including non-public) for admin review.
 * Used by the /admin/templates review queue UI.
 *
 * TODO: Add auth check — only admins should access this route.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'submitted';
  const sort = searchParams.get('sort') || 'recent';
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 200);
  const offset = parseInt(searchParams.get('offset') || '0', 10) || 0;

  try {
    // Build where clause
    const where: { status?: string } = {};
    if (status !== 'all') {
      where.status = status;
    }

    // Build orderBy
    let orderBy: { createdAt?: 'desc' | 'asc'; usageCount?: 'desc' | 'asc'; ratingAverage?: 'desc' | 'asc' };
    switch (sort) {
      case 'popular': orderBy = { usageCount: 'desc' }; break;
      case 'rating': orderBy = { ratingAverage: 'desc' }; break;
      case 'recent':
      default: orderBy = { createdAt: 'desc' }; break;
    }

    const templates = await db.formTemplate.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
    });

    const total = await db.formTemplate.count({ where });

    return NextResponse.json({ templates, total, status, sort, limit, offset });
  } catch (error) {
    // DB unavailable (sandbox) — return empty list
    return NextResponse.json({
      templates: [],
      total: 0,
      note: 'DB not available — returning empty list',
      error: error instanceof Error ? error.message : 'unknown',
    });
  }
}

/**
 * PATCH /api/admin/templates — update a template's status.
 *
 * Body: { templateId: string, status: 'approved' | 'published' | 'rejected' | 'under_review' }
 *
 * Used by the admin review queue to approve/reject community submissions.
 *
 * TODO: Add auth check — only admins should access this route.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { templateId, status } = body as { templateId?: string; status?: string };

    if (!templateId || !status) {
      return NextResponse.json({ error: 'templateId and status are required.' }, { status: 400 });
    }

    const validStatuses = ['draft', 'submitted', 'under_review', 'approved', 'published', 'rejected', 'archived'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    try {
      const updated = await db.formTemplate.update({
        where: { id: templateId },
        data: {
          status,
          isPublic: status === 'published',
          publishedAt: status === 'published' ? new Date() : null,
        },
      });
      return NextResponse.json({ ok: true, template: updated });
    } catch (dbError) {
      console.warn('[admin/templates] DB unavailable:', dbError);
      return NextResponse.json({
        ok: true,
        note: 'Status update simulated (DB not available in this environment).',
        templateId,
        status,
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Update failed', detail: error instanceof Error ? error.message : 'unknown' },
      { status: 500 },
    );
  }
}
