import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { requireBgosEntitled } from '@/lib/bgos-entitlement';
import { db } from '@/lib/db';
import { isMissingTableError } from '@/lib/gbp/marketing-score';
import { resolveTenantLocale } from '@/lib/locale-timezone';

export const dynamic = 'force-dynamic';

const MAX_TRACKED_KEYWORDS = 20;

export interface TrackedKeywordRow {
  id: string;
  keyword: string;
  city: string | null;
  country: string;
  score: number | null;
  position: number | null;
  source: string;
  mapsRank?: number | null;
  organicRank?: number | null;
  aiOverviewCited?: boolean | null;
  lastCheckedAt?: string | null;
}

function readSettingsJson(raw: string | null | undefined): Record<string, any> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, any>) : {};
  } catch {
    return {};
  }
}

function buildStarterKeywordSuggestions(params: {
  industry?: string | null;
  city?: string | null;
  nativeKeywords?: Array<{ keyword: string; count?: number }>;
}): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (kw: string) => {
    const clean = kw.trim().toLowerCase();
    if (!clean || seen.has(clean)) return;
    if (clean === 'direct brand searches' || clean === 'maps navigation & directions') return;
    seen.add(clean);
    out.push(clean);
  };

  if (Array.isArray(params.nativeKeywords)) {
    for (const nk of params.nativeKeywords) {
      if (nk?.keyword) add(nk.keyword);
    }
  }

  const industry = (params.industry || '').trim();
  const city = (params.city || '').trim();
  if (industry) {
    if (city) {
      add(`best ${industry.toLowerCase()} in ${city.toLowerCase()}`);
      add(`${industry.toLowerCase()} near ${city.toLowerCase()}`);
      add(`affordable ${industry.toLowerCase()} ${city.toLowerCase()}`);
    } else {
      add(`best ${industry.toLowerCase()} near me`);
      add(`trusted ${industry.toLowerCase()} services`);
    }
  }

  return out.slice(0, 6);
}

/** GET /api/gbp/keyword-plan — ranked tracked keywords for the planner list. */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenant = await db.tenant
      .findUnique({
        where: { id: user.tenantId },
        select: {
          settingsJson: true,
          city: true,
          country: true,
          industry: true,
          name: true,
          brandProfile: { select: { industry: true, location: true } },
        },
      })
      .catch(() => null);

    const settings = readSettingsJson(tenant?.settingsJson);
    const resolvedLocale = resolveTenantLocale({
      tenantCountry: tenant?.country,
      settingsJson: settings,
    });
    const defaultCity = (tenant?.brandProfile?.location || tenant?.city || '').trim() || null;
    const defaultIndustry = (tenant?.brandProfile?.industry || tenant?.industry || '').trim() || null;

    let keywords: TrackedKeywordRow[] = [];
    const migrationRequired = false;
    try {
      const rows = await db.trackedKeyword.findMany({
        where: { tenantId: user.tenantId },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        take: MAX_TRACKED_KEYWORDS,
      });
      keywords = (rows as any[]).map((r) => ({
        id: r.id,
        keyword: r.keyword,
        city: r.city ?? null,
        country: r.country || resolvedLocale.countryName,
        score: r.score ?? null,
        position: r.position ?? null,
        source: r.source || 'manual',
        mapsRank: r.mapsRank ?? null,
        organicRank: r.organicRank ?? null,
        aiOverviewCited: r.aiOverviewCited ?? null,
        lastCheckedAt: r.lastCheckedAt ? new Date(r.lastCheckedAt).toISOString() : null,
      }));
    } catch (err: any) {
      if (!isMissingTableError(err)) {
        // Fallback retry selecting legacy columns only in case migration is pending
        try {
          const legacyRows = await db.trackedKeyword.findMany({
            where: { tenantId: user.tenantId },
            select: {
              id: true,
              keyword: true,
              city: true,
              country: true,
              score: true,
              position: true,
              source: true,
            },
            orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
            take: MAX_TRACKED_KEYWORDS,
          });
          keywords = legacyRows as unknown as TrackedKeywordRow[];
        } catch {}
      }
    }

    // Fallback to tenant settingsJson when table is unpopulated
    if (keywords.length === 0 && Array.isArray(settings.trackedKeywords) && settings.trackedKeywords.length > 0) {
      keywords = settings.trackedKeywords as TrackedKeywordRow[];
    }

    const suggestedStarterKeywords =
      keywords.length === 0
        ? buildStarterKeywordSuggestions({
            industry: defaultIndustry,
            city: defaultCity,
            nativeKeywords: settings.googleDiscovery?.keywords,
          })
        : [];

    const searchTerms = Array.isArray(settings.googleDiscovery?.keywords)
      ? settings.googleDiscovery.keywords
          .filter((k: any) => k?.keyword)
          .map((k: any) => ({
            keyword: String(k.keyword).trim(),
            count: Number(k.count) || 0,
            isThreshold: Boolean(k.isThreshold),
          }))
          .sort((a: any, b: any) => b.count - a.count)
      : [];

    const winnabilityCache =
      settings.keywordWinnabilityCache && typeof settings.keywordWinnabilityCache === 'object'
        ? settings.keywordWinnabilityCache
        : {};

    const enrichedKeywords = keywords.map((kw) => {
      const cached = winnabilityCache[kw.keyword.trim().toLowerCase()];
      return cached ? { ...kw, winnability: cached } : kw;
    });

    return NextResponse.json({
      keywords: enrichedKeywords,
      suggestedStarterKeywords,
      searchTerms,
      searchTermsUpdatedAt: settings.googleDiscovery?.updatedAt || null,
      winnabilityByKeyword: winnabilityCache,
      locale: {
        country: resolvedLocale.country,
        countryName: resolvedLocale.countryName,
        flag: resolvedLocale.flag,
      },
      defaultCity,
      defaultIndustry,
      migrationRequired,
    });
  } catch (error: unknown) {
    console.error('[keyword-plan] GET failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({
      keywords: [],
      suggestedStarterKeywords: [],
      migrationRequired: false,
    });
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
    const gate = await requireBgosEntitled(user);
    if (!gate.ok) return gate.response;

    const body = await request.json().catch(() => ({}));
    const keyword = String(body?.keyword || '').trim().toLowerCase();
    if (!keyword) {
      return NextResponse.json({ error: 'keyword is required' }, { status: 400 });
    }
    if (keyword.length > 160) {
      return NextResponse.json({ error: 'keyword too long (max 160 chars)' }, { status: 400 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        settingsJson: true,
        city: true,
        country: true,
        brandProfile: { select: { location: true } },
      },
    });
    const settings = readSettingsJson(tenant?.settingsJson);
    const resolvedLocale = resolveTenantLocale({
      tenantCountry: tenant?.country,
      settingsJson: settings,
    });

    const city = body.city
      ? String(body.city).trim().slice(0, 80)
      : (tenant?.brandProfile?.location || tenant?.city || '').trim().slice(0, 80) || null;
    const country = body.country
      ? String(body.country).trim().slice(0, 60)
      : resolvedLocale.countryName;
    const score = body.score != null && Number.isFinite(Number(body.score)) ? Number(body.score) : null;
    const newId = `kw-${Date.now()}`;

    let existingList: TrackedKeywordRow[] = Array.isArray(settings.trackedKeywords)
      ? (settings.trackedKeywords as TrackedKeywordRow[])
      : [];

    if (existingList.length === 0) {
      try {
        const dbRows = await db.trackedKeyword.findMany({
          where: { tenantId: user.tenantId },
          select: { id: true, keyword: true, city: true, country: true, score: true, position: true, source: true },
          take: MAX_TRACKED_KEYWORDS,
        });
        if (Array.isArray(dbRows) && dbRows.length > 0) {
          existingList = dbRows as unknown as TrackedKeywordRow[];
        }
      } catch {}
    }

    const foundIdx = existingList.findIndex((k) => k.keyword.toLowerCase() === keyword);
    let savedEntry: TrackedKeywordRow;
    if (foundIdx >= 0) {
      savedEntry = {
        ...existingList[foundIdx],
        city,
        country,
        score: score ?? existingList[foundIdx].score,
      };
      existingList[foundIdx] = savedEntry;
    } else {
      if (existingList.length >= MAX_TRACKED_KEYWORDS) {
        return NextResponse.json(
          { error: `Keyword list is full (max ${MAX_TRACKED_KEYWORDS}). Remove one first.` },
          { status: 409 },
        );
      }
      savedEntry = {
        id: newId,
        keyword,
        city,
        country,
        score,
        position: existingList.length + 1,
        source: body.source === 'ai' ? 'ai' : body.source === 'gbp_native' ? 'gbp_native' : 'manual',
      };
      existingList.push(savedEntry);
    }

    settings.trackedKeywords = existingList;
    await db.tenant
      .update({
        where: { id: user.tenantId },
        data: { settingsJson: JSON.stringify(settings) },
      })
      .catch(() => {});

    try {
      await db.trackedKeyword.upsert({
        where: { tenantId_keyword: { tenantId: user.tenantId, keyword } },
        create: {
          tenantId: user.tenantId,
          keyword,
          city,
          country,
          score,
          position: savedEntry.position ?? existingList.length,
          source: savedEntry.source,
        },
        update: { city, country, score },
      });
    } catch {}

    return NextResponse.json({ success: true, keyword, entry: savedEntry });
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
    const gate = await requireBgosEntitled(user);
    if (!gate.ok) return gate.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settingsJson: true },
    });
    const settings = readSettingsJson(tenant?.settingsJson);
    const existingList: TrackedKeywordRow[] = Array.isArray(settings.trackedKeywords)
      ? (settings.trackedKeywords as TrackedKeywordRow[])
      : [];

    settings.trackedKeywords = existingList.filter((k) => k.id !== id);

    await db.tenant
      .update({
        where: { id: user.tenantId },
        data: { settingsJson: JSON.stringify(settings) },
      })
      .catch(() => {});

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
