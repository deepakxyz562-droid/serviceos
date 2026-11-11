import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { resolveTenantLocale } from '@/lib/locale-timezone';
import { fetchGoogleAutocompleteSuggestions } from '@/lib/gbp/keyword-planner-free';
import { safeParseJsonObject } from '@/lib/gbp/seo-context';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface Suggestion {
  keyword: string;
  score: number;
  city: string | null;
  sourceTag?: 'gbp_search' | 'google_suggest' | 'ai' | 'local';
  demandSignal?: string;
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

    const parsedSettings = safeParseJsonObject(tenant?.settingsJson);
    const nativeTerms: Array<{ keyword: string; count: number }> = Array.isArray(
      parsedSettings.googleDiscovery?.keywords,
    )
      ? parsedSettings.googleDiscovery.keywords
          .filter((k: any) => k?.keyword)
          .map((k: any) => ({ keyword: String(k.keyword).trim(), count: Number(k.count) || 0 }))
          .sort((a: any, b: any) => b.count - a.count)
      : [];

    const autocompleteSeeds = [
      city && industry ? `${industry} in ${city}` : industry || city,
      city && industry ? `best ${industry} ${city}` : '',
      industry ? `${industry} near ` : '',
    ].filter(Boolean);
    const autocompleteList = await fetchGoogleAutocompleteSuggestions(
      autocompleteSeeds,
      locale.country.toLowerCase(),
    );

    const mergeAndRank = (aiItems: Suggestion[]): Suggestion[] => {
      const merged: Suggestion[] = [];
      const seen = new Set<string>();
      const pushUnique = (item: Suggestion) => {
        const clean = item.keyword.trim().toLowerCase();
        if (!clean || seen.has(clean)) return;
        seen.add(clean);
        merged.push({ ...item, keyword: clean.slice(0, 160) });
      };

      // Prioritize real GBP customer search queries first
      for (const n of nativeTerms.slice(0, 3)) {
        pushUnique({
          keyword: n.keyword,
          score: Math.max(250, n.count * 10),
          city: city || null,
          sourceTag: 'gbp_search',
          demandSignal: n.count > 0 ? `${n.count} Google searches` : 'GBP Search Term',
        });
      }
      // Next add real Google Autocomplete queries
      for (const auto of autocompleteList.slice(0, 4)) {
        pushUnique({
          keyword: auto,
          score: 400,
          city: city || null,
          sourceTag: 'google_suggest',
          demandSignal: 'Google Suggest match',
        });
      }
      for (const aiItem of aiItems) {
        pushUnique({
          ...aiItem,
          sourceTag: aiItem.sourceTag || 'ai',
          demandSignal: aiItem.demandSignal || 'Buyer-intent query',
        });
      }
      return merged.slice(0, 10);
    };

    // 1) Try AI generation through the shared AI client (falls back internally).
    try {
      const { callAI } = await import('@/lib/ai-client');
      const aiPrompt = `You are a ${locale.countryName} local-SEO keyword planner. Generate 6 high-intent customer search keywords a buyer in ${city || 'their local area'}, ${locale.countryName} would type on Google when looking for a ${industry || 'local service'} business.
Rules:
- ${city ? `Include "${city}" in at least 4 keywords` : 'Use local discovery modifiers like near me, trusted, affordable, reviews'}
- Focus on long-tail winnable local keywords (not overly broad single words)
- lowercase, no quotes, no numbering
${nativeTerms.length > 0 ? `- Build around these real customer search terms: ${nativeTerms.slice(0, 5).map((n) => n.keyword).join(', ')}` : ''}
Respond with ONLY a JSON array like: [{"keyword":"...","score":500},{"keyword":"...","score":100}]`;

      const aiResponse: any = await callAI([
        { role: 'system', content: `You are an expert local SEO keyword planner for ${locale.countryName}. Respond only with JSON.` },
        { role: 'user', content: aiPrompt },
      ]);
      const rawText = typeof aiResponse === 'string' ? aiResponse : aiResponse?.content || aiResponse?.text || '';
      const match = String(rawText || '').match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const aiSuggestions: Suggestion[] = (Array.isArray(parsed) ? parsed : [])
          .filter((s: any) => s?.keyword)
          .slice(0, 6)
          .map((s: any) => ({
            keyword: String(s.keyword).toLowerCase().slice(0, 160),
            score: Number(s.score) || 100,
            city: city || null,
            sourceTag: 'ai' as const,
          }));
        if (aiSuggestions.length > 0) {
          return NextResponse.json({
            suggestions: mergeAndRank(aiSuggestions),
            source: autocompleteList.length > 0 ? 'google_suggest_and_ai' : 'ai',
            country: locale.countryName,
          });
        }
      }
    } catch {
      // fall through to deterministic suggestions
    }

    // 2) Deterministic fallback (no AI available) enriched with Autocomplete + Search Terms
    const base = (industry || 'services').toLowerCase();
    const cityPart = city || 'near me';
    const fallbackSuggestions: Suggestion[] = FALLBACK_SUFFIXES.map((tpl, i) => ({
      keyword: (tpl.includes('{city}') ? `${base} ${tpl.replace('{city}', cityPart)}` : `${base} ${tpl}`)
        .replace('{city}', cityPart)
        .toLowerCase(),
      score: [500, 100, 500, 100, 250, 100][i] || 100,
      city: city || null,
      sourceTag: 'local' as const,
    }));

    return NextResponse.json({
      suggestions: mergeAndRank(fallbackSuggestions),
      source: autocompleteList.length > 0 ? 'google_suggest' : 'fallback',
      country: locale.countryName,
    });
  } catch (error: unknown) {
    console.error('[keyword-plan/suggest] failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate keyword suggestions' },
      { status: 500 },
    );
  }
}
