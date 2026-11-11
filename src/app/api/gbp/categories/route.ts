import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { callAI } from '@/lib/ai-client';

export const dynamic = 'force-dynamic';

function extractJsonArray(text: string): string[] {
  let clean = text.trim();
  const match = clean.match(/\[[\s\S]*\]/);
  if (match) {
    clean = match[0];
  }
  try {
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {}
  return [];
}

/**
 * GET /api/gbp/categories
 *
 * 100% Dynamic Google Business Profile Category Search & Auto-Generation.
 * - When `query` is provided: Searches official Google categories via MyBusiness API (Tier 1)
 *   or dynamically generates official Google categories via AI (Tier 2).
 * - When `businessName` is provided without query: Synthesizes the top 5-6 recommended
 *   categories tailored to that specific business.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('query') || '').trim();
    const businessName = (searchParams.get('businessName') || '').trim();

    // ── Scenario A: User is typing a category query (Live search autocomplete) ──
    if (query.length > 0) {
      // Tier 1: Try official Google MyBusiness Categories API
      try {
        const googleAccount = await prepareGoogleAccount(user.tenantId).catch(() => null);
        if (googleAccount?.accessToken) {
          const googleUrl = new URL('https://mybusinessbusinessinformation.googleapis.com/v1/categories');
          googleUrl.searchParams.set('regionCode', 'IN');
          googleUrl.searchParams.set('languageCode', 'en');
          googleUrl.searchParams.set('filter', `displayName=${query}`);
          googleUrl.searchParams.set('readMask', 'displayName,categoryId');

          const res = await fetch(googleUrl.toString(), {
            headers: { Authorization: `Bearer ${googleAccount.accessToken}` },
            signal: AbortSignal.timeout(3500),
          });

          if (res.ok) {
            const data = (await res.json()) as any;
            const categories = Array.isArray(data.categories)
              ? data.categories.map((c: any) => c.displayName).filter(Boolean)
              : [];
            if (categories.length > 0) {
              return NextResponse.json({
                categories,
                source: 'google_api',
                query,
              });
            }
          }
        }
      } catch (err) {
        // Fall through to AI Tier 2
      }

      // Tier 2: Real-time AI Semantic Synthesis for Google Categories
      try {
        const aiPrompt = `You are the Google Business Profile Category Engine.
Given search query: "${query}"
Return a JSON array of 6 to 10 official, real Google Business Profile primary categories that match or relate to this query.
Rules:
1. Return ONLY exact official Google Business Profile category titles (e.g. "Software company", "Computer software store", "Website designer", "Supermarket", "Bakery", "Resort hotel", etc.).
2. Rank the most relevant and commonly searched categories first.
3. Return ONLY a valid JSON array of strings — no markdown formatting, no backticks, no prose.
Example output format:
["Category 1", "Category 2", "Category 3"]`;

        const aiRes = await callAI({
          messages: [{ role: 'user', content: aiPrompt }],
          temperature: 0.2,
        });

        const text = aiRes?.content || '';
        const categories = extractJsonArray(text);
        if (categories.length > 0) {
          return NextResponse.json({
            categories,
            source: 'ai_dynamic',
            query,
          });
        }
      } catch (aiErr) {
        console.warn('[gbp/categories] AI synthesis failed:', aiErr);
      }

      // Tier 3: Dynamic algorithmic fallback for the query
      const capitalizedQuery = query.charAt(0).toUpperCase() + query.slice(1);
      return NextResponse.json({
        categories: [
          capitalizedQuery,
          `${capitalizedQuery} Services`,
          `${capitalizedQuery} Company`,
          `${capitalizedQuery} Store`,
        ],
        source: 'dynamic_fallback',
        query,
      });
    }

    // ── Scenario B: No query, but businessName provided (Contextual Category Recommendation) ──
    if (businessName.length > 0) {
      try {
        const aiPrompt = `You are a Google Business Profile category specialist.
Given the business name: "${businessName}"
Infer the industry and return a JSON array of the 5 most appropriate, official Google Business Profile primary categories for this business.
Rules:
1. Return ONLY exact official Google Business Profile category titles (e.g. for "fieseros": ["Software company", "Information technology services", "Website designer", "Computer support and services", "Web hosting company"]).
2. Do NOT suggest unrelated categories like bakery or grocery for a tech business, or tech categories for a grocery market.
3. Return ONLY a valid JSON array of strings — no markdown, no prose.`;

        const aiRes = await callAI({
          messages: [{ role: 'user', content: aiPrompt }],
          temperature: 0.2,
        });

        const text = aiRes?.content || '';
        const categories = extractJsonArray(text);
        if (categories.length > 0) {
          return NextResponse.json({
            categories,
            source: 'ai_inferred',
            businessName,
          });
        }
      } catch (err) {
        console.warn('[gbp/categories] Business name inference failed:', err);
      }
    }

    // Default dynamic standard categories if empty query and empty name
    return NextResponse.json({
      categories: [
        'Local Business',
        'Service Establishment',
        'Store',
        'Consultant',
      ],
      source: 'default',
    });
  } catch (error: unknown) {
    console.error('[/api/gbp/categories] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search categories' },
      { status: 500 }
    );
  }
}
