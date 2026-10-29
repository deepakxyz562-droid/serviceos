import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { isMissingTableError } from '@/lib/gbp/marketing-score';

export const dynamic = 'force-dynamic';

const MAX_TRACKED_KEYWORDS = 20;

interface TrackedKeywordRow {
  id: string;
  keyword: string;
  city: string | null;
  country: string;
  score: number | null;
  position: number | null;
  source: string;
}

/** GET /api/gbp/keyword-plan — ranked tracked keywords for the planner list. */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let keywords: TrackedKeywordRow[] = [];
    let migrationRequired = false;
    try {
      const rows = await db.trackedKeyword.findMany({
        where: { tenantId: user.tenantId },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        take: MAX_TRACKED_KEYWORDS,
      });
      keywords = rows as unknown as TrackedKeywordRow[];
    } catch (err: any) {
      if (isMissingTableError(err)) {
        migrationRequired = true;
      } else {
        throw err;
      }
    }

    return NextResponse.json({ keywords, migrationRequired });
  } catch (error: unknown) {
    console.error('[keyword-plan] GET failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ keywords: [], migrationRequired: false });
  }
}

/**
 * POST /api/gbp/keyword-plan
 * Body: { keyword, city?, country?, score?, position? }
 * Upserts by (tenantId, keyword). Caps the list at 20 keywords.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const keyword = String(body?.keyword || '').trim().toLowerCase();
    if (!keyword) {
      return NextResponse.json({ error: 'keyword is required' }, { status: 400 });
    }
    if (keyword.length > 160) {
      return NextResponse.json({ error: 'keyword too long (max 160 chars)' }, { status: 400 });
    }

    try {
      const existingCount = await db.trackedKeyword.count({ where: { tenantId: user.tenantId } });
      const exists = await db.trackedKeyword.findFirst({
        where: { tenantId: user.tenantId, keyword },
        select: { id: true },
      });
      if (!exists && existingCount >= MAX_TRACKED_KEYWORDS) {
        return NextResponse.json({ error: `Keyword list is full (max ${MAX_TRACKED_KEYWORDS}). Remove one first.` }, { status: 409 });
      }

      const kw = await db.trackedKeyword.upsert({
        where: { tenantId_keyword: { tenantId: user.tenantId, keyword } },
        create: {
          tenantId: user.tenantId,
          keyword,
          city: body.city ? String(body.city).slice(0, 80) : null,
          country: body.country ? String(body.country).slice(0, 60) : 'India',
          score: body.score != null ? Number(body.score) : null,
          position: body.position != null ? Number(body.position) : null,
          source: body.source === 'ai' ? 'ai' : 'manual',
        },
        update: {
          city: body.city ? String(body.city).slice(0, 80) : undefined,
          country: body.country ? String(body.country).slice(0, 60) : undefined,
          score: body.score != null ? Number(body.score) : undefined,
          position: body.position != null ? Number(body.position) : undefined,
        },
      });

      return NextResponse.json({ success: true, keyword: kw });
    } catch (err: any) {
      if (isMissingTableError(err)) {
        return NextResponse.json(
          { error: 'MIGRATION_REQUIRED', message: 'TrackedKeyword table not created yet — apply the bgos_dhanda_redesign migration.' },
          { status: 503 },
        );
      }
      throw err;
    }
  } catch (error: unknown) {
    console.error('[keyword-plan] POST failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add keyword' },
      { status: 500 },
    );
  }
}

/** PATCH /api/gbp/keyword-plan — body: { id, position?, score? } */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || '');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const kw = await db.trackedKeyword.update({
      where: { id },
      data: {
        position: body.position != null ? Number(body.position) : undefined,
        score: body.score != null ? Number(body.score) : undefined,
      },
    });
    return NextResponse.json({ success: true, keyword: kw });
  } catch (error: unknown) {
    console.error('[keyword-plan] PATCH failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update keyword' }, { status: 500 });
  }
}

/** DELETE /api/gbp/keyword-plan?id=... */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    await db.trackedKeyword.deleteMany({ where: { id, tenantId: user.tenantId } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[keyword-plan] DELETE failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to remove keyword' }, { status: 500 });
  }
}
