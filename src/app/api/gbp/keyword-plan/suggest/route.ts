import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface Suggestion {
  keyword: string;
  score: number; // monthly search volume band (100 / 500 / 1000…)
  city: string | null;
}

const FALLBACK_SUFFIXES = [
  'near me',
  'best {city}',
  'top {city}',
  'affordable {city}',
  'services in {city}',
  'company in {city}',
];

/**
 * POST /api/gbp/keyword-plan/suggest
 * Body: { city?, industry?, businessName? }
 * Returns 6 AI-suggested local SEO keywords with volume bands.
 * Suggestions are NOT persisted — the user adds them via POST /api/gbp/keyword-plan.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const city = String(body?.city || '').trim();
    const industry = String(body?.industry || '').trim();

    if (!city && !industry) {
      return NextResponse.json({ error: 'city or industry is required' }, { status: 400 });
    }

    // 1) Try AI generation through the shared AI client (falls back internally).
    try {
      const { callAI } = await import('@/lib/ai-client');
      const aiPrompt = `You are an Indian local-SEO keyword planner. Generate exactly 6 long-tail keywords a customer in ${city || 'the local city'} would type on Google when looking for a ${industry || 'local service'} business.
Rules:
- Include the city name in at least 4 keywords
- Mix of high and low competition
- lowercase, no quotes, no numbering
Respond with ONLY a JSON array like: [{"keyword":"...","score":500},{"keyword":"...","score":100}]
score is the approximate monthly search volume (use 100, 250, 500, or 1000).`;

      const aiResponse: any = await callAI([
        { role: 'system', content: 'You are an expert Indian local SEO keyword planner. Respond only with JSON.' },
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
          return NextResponse.json({ suggestions, source: 'ai' });
        }
      }
    } catch {
      // fall through to deterministic suggestions
    }

    // 2) Deterministic fallback (no AI available).
    const base = (industry || 'services').toLowerCase();
    const cityPart = city || 'near me';
    const suggestions: Suggestion[] = FALLBACK_SUFFIXES.map((tpl, i) => ({
      keyword: (tpl.includes('{city}') ? tpl.replace('{city}', cityPart) : `${base} ${tpl}`)
        .replace('{city}', cityPart)
        .toLowerCase(),
      score: [500, 100, 500, 100, 250, 100][i] || 100,
      city: city || null,
    })).slice(0, 6);

    return NextResponse.json({ suggestions, source: 'fallback' });
  } catch (error: unknown) {
    console.error('[keyword-plan/suggest] failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate keyword suggestions' },
      { status: 500 },
    );
  }
}
