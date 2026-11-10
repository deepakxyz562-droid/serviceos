import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { resolveTenantLocale } from '@/lib/locale-timezone';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface Suggestion {
  keyword: string;
  score: number;
  city: string | null;
}

const FALLBACK_SUFFIXES = [
  'near me',
  'best {city}',
  'top {city}',
  'affordable {city}',
  'services in {city}',
  'specialists in {city}',
];

/**
 * POST /api/gbp/keyword-plan/suggest
 * Body: { city?, industry?, businessName?, country? }
 * Returns 6 AI-suggested local SEO keywords tailored to the tenant's country & city.
 * Suggestions are NOT persisted — the user adds them via POST /api/gbp/keyword-plan.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const tenant = await db.tenant
      .findUnique({
        where: { id: user.tenantId },
        select: {
          city: true,
          country: true,
          industry: true,
          settingsJson: true,
          brandProfile: { select: { industry: true, location: true } },
        },
      })
      .catch(() => null);

    const locale = resolveTenantLocale({
      tenantCountry: tenant?.country,
      settingsJson: tenant?.settingsJson,
      overrideCountry: typeof body?.country === 'string' ? body.country : null,
    });

    const city = String(body?.city || tenant?.brandProfile?.location || tenant?.city || '').trim();
    const industry = String(body?.industry || tenant?.brandProfile?.industry || tenant?.industry || '').trim();

    if (!city && !industry) {
      return NextResponse.json({ error: 'city or industry is required' }, { status: 400 });
    }

    // 1) Try AI generation through the shared AI client (falls back internally).
    try {
      const { callAI } = await import('@/lib/ai-client');
      const aiPrompt = `You are a ${locale.countryName} local-SEO keyword planner. Generate exactly 6 high-intent customer search keywords a buyer in ${city || 'their local area'}, ${locale.countryName} would type on Google or ask an AI assistant when looking for a ${industry || 'local service'} business.
Rules:
- ${city ? `Include "${city}" in at least 4 keywords` : 'Use local discovery modifiers like near me, trusted, affordable, reviews'}
- Mix of high and low competition buyer-intent terms
- lowercase, no quotes, no numbering
Respond with ONLY a JSON array like: [{"keyword":"...","score":500},{"keyword":"...","score":100}]
score is an approximate monthly interest band (use 100, 250, 500, or 1000).`;

      const aiResponse: any = await callAI([
        { role: 'system', content: `You are an expert local SEO keyword planner for ${locale.countryName}. Respond only with JSON.` },
        { role: 'user', content: aiPrompt },
      ]);
      const rawText = typeof aiResponse === 'string' ? aiResponse : aiResponse?.content || aiResponse?.text || '';
      const match = String(rawText || '').match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const suggestions: Suggestion[] = (Array.isArray(parsed) ? parsed : [])
          .filter((s: any) => s?.keyword)
          .slice(0, 6)
          .map((s: any) => ({
            keyword: String(s.keyword).toLowerCase().slice(0, 160),
            score: Number(s.score) || 100,
            city: city || null,
          }));
        if (suggestions.length > 0) {
          return NextResponse.json({ suggestions, source: 'ai', country: locale.countryName });
        }
      }
    } catch {
      // fall through to deterministic suggestions
    }

    // 2) Deterministic fallback (no AI available).
    const base = (industry || 'services').toLowerCase();
    const cityPart = city || 'near me';
    const suggestions: Suggestion[] = FALLBACK_SUFFIXES.map((tpl, i) => ({
      keyword: (tpl.includes('{city}') ? `${base} ${tpl.replace('{city}', cityPart)}` : `${base} ${tpl}`)
        .replace('{city}', cityPart)
        .toLowerCase(),
      score: [500, 100, 500, 100, 250, 100][i] || 100,
      city: city || null,
    })).slice(0, 6);

    return NextResponse.json({ suggestions, source: 'fallback', country: locale.countryName });
  } catch (error: unknown) {
    console.error('[keyword-plan/suggest] failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate keyword suggestions' },
      { status: 500 },
    );
  }
}
