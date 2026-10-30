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

const DEFAULT_KEYWORDS: TrackedKeywordRow[] = [
  { id: 'kw-1', keyword: 'software development company in Patna', city: 'Patna', country: 'India', score: 100, position: 1, source: 'ai' },
  { id: 'kw-2', keyword: 'software company in Patna', city: 'Patna', country: 'India', score: 100, position: 2, source: 'ai' },
  { id: 'kw-3', keyword: 'best crm software for small businesses', city: 'Patna', country: 'India', score: 500, position: 3, source: 'ai' },
  { id: 'kw-4', keyword: 'sales software for small business', city: 'Patna', country: 'India', score: 500, position: 4, source: 'ai' },
  { id: 'kw-5', keyword: 'business software solutions Patna', city: 'Patna', country: 'India', score: 100, position: 5, source: 'ai' },
  { id: 'kw-6', keyword: 'software development company', city: 'Patna', country: 'India', score: 500, position: 6, source: 'ai' },
];

function readSettingsJson(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
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
        migrationRequired = false;
      }
    }

    // If database table is empty or unpopulated, use tenant settingsJson or defaults
    if (keywords.length === 0) {
      const tenant = await db.tenant.findUnique({
        where: { id: user.tenantId },
        select: { settingsJson: true },
      });
      const settings = readSettingsJson(tenant?.settingsJson);
      if (Array.isArray(settings.trackedKeywords) && settings.trackedKeywords.length > 0) {
        keywords = settings.trackedKeywords as TrackedKeywordRow[];
      } else {
        keywords = DEFAULT_KEYWORDS;
      }
    }

    return NextResponse.json({ keywords, migrationRequired });
  } catch (error: unknown) {
    console.error('[keyword-plan] GET failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ keywords: DEFAULT_KEYWORDS, migrationRequired: false });
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

    const city = body.city ? String(body.city).slice(0, 80) : 'Patna';
    const country = body.country ? String(body.country).slice(0, 60) : 'India';
    const score = body.score != null ? Number(body.score) : 500;
    const newId = `kw-${Date.now()}`;

    // Update settingsJson fallback list
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settingsJson: true },
    });
    const settings = readSettingsJson(tenant?.settingsJson);
    const existingList: TrackedKeywordRow[] = Array.isArray(settings.trackedKeywords)
      ? (settings.trackedKeywords as TrackedKeywordRow[])
      : [...DEFAULT_KEYWORDS];

    const foundIdx = existingList.findIndex((k) => k.keyword.toLowerCase() === keyword);
    if (foundIdx >= 0) {
      existingList[foundIdx] = {
        ...existingList[foundIdx],
        city,
        country,
        score,
      };
    } else {
      if (existingList.length >= MAX_TRACKED_KEYWORDS) {
        return NextResponse.json({ error: `Keyword list is full (max ${MAX_TRACKED_KEYWORDS}). Remove one first.` }, { status: 409 });
      }
      existingList.push({
        id: newId,
        keyword,
        city,
        country,
        score,
        position: existingList.length + 1,
        source: body.source === 'ai' ? 'ai' : 'manual',
      });
    }

    settings.trackedKeywords = existingList;
    await db.tenant.update({
      where: { id: user.tenantId },
      data: { settingsJson: JSON.stringify(settings) },
    }).catch(() => {});

    // Try saving to DB table if available
    try {
      await db.trackedKeyword.upsert({
        where: { tenantId_keyword: { tenantId: user.tenantId, keyword } },
        create: {
          tenantId: user.tenantId,
          keyword,
          city,
          country,
          score,
          position: existingList.length,
          source: body.source === 'ai' ? 'ai' : 'manual',
        },
        update: { city, country, score },
      });
    } catch {}

    return NextResponse.json({ success: true, keyword });
  } catch (error: unknown) {
    console.error('[keyword-plan] POST failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save keyword' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/gbp/keyword-plan?id=...
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 });
    }

    // Remove from settingsJson
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settingsJson: true },
    });
    const settings = readSettingsJson(tenant?.settingsJson);
    const existingList: TrackedKeywordRow[] = Array.isArray(settings.trackedKeywords)
      ? (settings.trackedKeywords as TrackedKeywordRow[])
      : [...DEFAULT_KEYWORDS];

    const filtered = existingList.filter((k) => k.id !== id);
    settings.trackedKeywords = filtered;

    await db.tenant.update({
      where: { id: user.tenantId },
      data: { settingsJson: JSON.stringify(settings) },
    }).catch(() => {});

    try {
      await db.trackedKeyword.deleteMany({
        where: { tenantId: user.tenantId, id },
      });
    } catch {}

    return NextResponse.json({ success: true, deleted: id });
  } catch (error: unknown) {
    console.error('[keyword-plan] DELETE failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete keyword' },
      { status: 500 },
    );
  }
}
