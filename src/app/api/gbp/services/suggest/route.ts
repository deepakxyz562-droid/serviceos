import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { callAI } from '@/lib/ai-client';
import { db } from '@/lib/db';
import { safeParseJsonObject } from '@/lib/gbp/seo-context';
import { getGbpCategoryByNameOrAlias } from '@/lib/gbp/master-category-catalog';

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

async function resolveRelevantSearchTerms(
  tenantId: string,
  businessName: string,
  category: string,
): Promise<string[]> {
  try {
    const tenant = await Promise.race([
      db.tenant.findUnique({
        where: { id: tenantId },
        select: {
          name: true,
          industry: true,
          settingsJson: true,
          brandProfile: { select: { businessName: true, industry: true } },
        },
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 700)),
    ]);
    if (!tenant) return [];
    const bizName = (tenant.brandProfile?.businessName || tenant.name || '').toLowerCase();
    const catName = (tenant.brandProfile?.industry || tenant.industry || '').toLowerCase();
    const matchesContext =
      category === 'Local Business' ||
      (bizName && businessName.toLowerCase() === bizName) ||
      (catName && category.toLowerCase().includes(catName));
    if (!matchesContext) return [];

    const settings = safeParseJsonObject(tenant.settingsJson);
    const rawKeywords = Array.isArray(settings?.googleDiscovery?.keywords)
      ? settings.googleDiscovery.keywords
      : [];
    return rawKeywords
      .filter((k: any) => k && typeof k.keyword === 'string' && k.keyword.trim())
      .sort((a: any, b: any) => (Number(b.count) || 0) - (Number(a.count) || 0))
      .slice(0, 8)
      .map((k: any) => String(k.keyword).trim());
  } catch {
    return [];
  }
}

/**
 * POST & GET /api/gbp/services/suggest
 *
 * 100% Dynamic AI-Driven Products & Services Generator for ANY SMB.
 * Input: { category: string, businessName: string, query?: string }
 * Output: { services: string[], category: string, businessName: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const category = (body.category || '').trim() || 'Local Business';
    const businessName = (body.businessName || '').trim() || 'My Business';
    const query = (body.query || '').trim();
    const refresh = body.refresh === true;
    const exclude = Array.isArray(body.exclude)
      ? body.exclude.map((item: unknown) => String(item || '').trim()).filter(Boolean).slice(0, 40)
      : [];
    const searchTerms = query ? [] : await resolveRelevantSearchTerms(user.tenantId, businessName, category);

    return await generateDynamicServices({
      category,
      businessName,
      query,
      searchTerms,
      refresh,
      exclude,
    });
  } catch (error: unknown) {
    console.error('[/api/gbp/services/suggest] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate services' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = (searchParams.get('category') || '').trim() || 'Local Business';
    const businessName = (searchParams.get('businessName') || '').trim() || 'My Business';
    const query = (searchParams.get('query') || '').trim();
    const refresh = searchParams.get('refresh') === '1' || searchParams.get('refresh') === 'true';
    const searchTerms = query ? [] : await resolveRelevantSearchTerms(user.tenantId, businessName, category);

    return await generateDynamicServices({
      category,
      businessName,
      query,
      searchTerms,
      refresh,
      exclude: [],
    });
  } catch (error: unknown) {
    console.error('[/api/gbp/services/suggest] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate services' },
      { status: 500 }
    );
  }
}

async function generateDynamicServices({
  category,
  businessName,
  query,
  searchTerms = [],
  refresh = false,
  exclude = [],
}: {
  category: string;
  businessName: string;
  query: string;
  searchTerms?: string[];
  refresh?: boolean;
  exclude?: string[];
}) {
  const excludeLower = new Set(exclude.map((e) => e.toLowerCase()));

  // 1. Check Master Category Catalog for instant (<1ms) initial load (skip when user explicitly clicks Refresh AI Ideas)
  const masterCat = getGbpCategoryByNameOrAlias(category);
  if (!refresh && masterCat && masterCat.coreProducts.length > 0) {
    if (!query) {
      return NextResponse.json({
        services: masterCat.coreProducts,
        category: masterCat.displayName,
        businessName,
        source: 'master_catalog',
      });
    }
    // If user is searching within the category
    const qLower = query.toLowerCase();
    const matchedProducts = masterCat.coreProducts.filter((p) =>
      p.toLowerCase().includes(qLower)
    );
    if (matchedProducts.length > 0) {
      return NextResponse.json({
        services: matchedProducts,
        category: masterCat.displayName,
        businessName,
        source: 'master_catalog',
      });
    }
  }

  try {
    const searchHint = searchTerms.length > 0
      ? `\nTop Google Search Terms customers search for this business: ${searchTerms.join(', ')}\nPrioritize clean service offerings matching real customer search demand without stuffing city names into the service titles.`
      : '';
    const excludeHint = exclude.length > 0
      ? `\nDO NOT repeat any of these already-listed services: ${exclude.slice(0, 20).join(', ')}. Generate NEW complementary, specialty, or package service names.`
      : '';
    const aiPrompt = `You are a local business marketing and Google Business Profile catalog specialist.
Business Name: "${businessName}"
Google Category: "${category}"
${query ? `User is typing in service search: "${query}"` : refresh ? 'Generate 6 to 8 FRESH additional or specialized offerings for this business.' : 'Generate recommended offerings for this profile.'}${searchHint}${excludeHint}

Task:
Generate 6 to 8 realistic, authentic, and high-converting products and services that this specific business typically offers to local customers on Google Maps.
Rules:
1. Every service MUST be directly relevant to "${category}" and "${businessName}".
   - For a Software company / IT: Generate software offerings (e.g. "Custom Software Development", "Web Application Development", "Mobile App Development", "Cloud Solutions & DevOps", "SaaS Platform Development", "API Integration", "IT Consulting").
   - For a Grocery / Supermarket: Generate supermarket offerings (e.g. "Fresh Produce", "Daily Groceries", "Packaged Foods", "Dairy Staples", "Household Essentials").
   - For a Resort / Pool: Generate hospitality offerings (e.g. "Private Villa Stay", "Swimming Pool Access", "Lawn Event Booking", "Day Outing Packages").
2. NEVER include unrelated retail items like "In-Store Shopping" or "Home Delivery" unless it is specifically a physical retail store or delivery company.
3. ${query ? `Each item should match or be related to the search term "${query}".` : 'Provide 6 to 8 distinct offerings.'}
4. Return ONLY a valid JSON array of strings — no markdown formatting, no code fences, no commentary.
Example output format:
["Service 1", "Service 2", "Service 3", "Service 4", "Service 5", "Service 6"]`;

    const aiRes = await callAI({
      messages: [{ role: 'user', content: aiPrompt }],
      temperature: refresh ? 0.7 : 0.3,
    });

    const text = aiRes?.content || '';
    const services = extractJsonArray(text).filter((s) => !excludeLower.has(s.toLowerCase()));

    if (services.length > 0) {
      return NextResponse.json({
        services,
        category,
        businessName,
        source: refresh ? 'ai_refresh' : 'ai_dynamic',
      });
    }
  } catch (err) {
    console.warn('[gbp/services/suggest] AI call failed, generating contextual fallback:', err);
  }

  // Dynamic algorithmic fallback derived from the category title
  const cleanCategory = category.replace(/company|store|agency|services|shop/gi, '').trim() || 'Professional';
  const fallbackPool = [
    `${cleanCategory} Consultation`,
    `Custom ${cleanCategory} Solutions`,
    `Professional ${cleanCategory} Services`,
    `${cleanCategory} Maintenance & Support`,
    `${cleanCategory} Audit & Assessment`,
    `${cleanCategory} Package Planning`,
    `Express ${cleanCategory} Booking`,
    `Premium ${cleanCategory} Care`,
  ].filter((s) => !excludeLower.has(s.toLowerCase()));

  return NextResponse.json({
    services: fallbackPool.length > 0 ? fallbackPool : [`${cleanCategory} Specialty Service`],
    category,
    businessName,
    source: 'dynamic_fallback',
  });
}
