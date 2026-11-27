import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-client';

export const dynamic = 'force-dynamic';

/**
 * POST /api/gbp/service-areas/suggest
 * AI + geo-context generator returning up to 20 nearby localities, sectors,
 * neighborhoods & pincodes around the business for "20 Local Area Addon".
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      existingAreas?: string[];
    };

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        name: true,
        city: true,
        address: true,
        country: true,
        industry: true,
        serviceAreasJson: true,
        brandProfile: { select: { location: true, industry: true, serviceArea: true } },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const city =
      (tenant.city || '').trim() ||
      (tenant.brandProfile?.location || '').split(',')[0]?.trim() ||
      (tenant.address || '').split(',')[0]?.trim() ||
      'Local Metro';
    const country = (tenant.country || 'IN').toUpperCase();
    const category = tenant.brandProfile?.industry || tenant.industry || 'Local Services';
    const existing = Array.isArray(body.existingAreas) ? body.existingAreas : [];

    let suggestedAreas: string[] = [];
    try {
      const prompt = `List 20 real nearby neighborhoods, suburbs, commercial hubs, or service zones in and around "${city}" (${country}) where customers search for "${category}".
Rules:
1. Return strictly a JSON array of 20 short, clean place strings (e.g. ["${city}", "Indiranagar, ${city}", ...]).
2. Prioritize dense nearby localities within 15km.
3. No duplicates, no explanations.`;

      const aiRes = await callAI({
        messages: [
          { role: 'system', content: 'Return strictly a JSON string array of location names.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        usageContext: { tenantId: user.tenantId, feature: 'gbp_service_areas_suggest' },
      });
      const raw = typeof aiRes === 'string' ? aiRes : (aiRes as any)?.content || '[]';
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) {
          suggestedAreas = parsed
            .filter((s): s is string => typeof s === 'string' && s.trim().length > 1)
            .map((s) => s.trim());
        }
      }
    } catch (err) {
      console.warn('[gbp/service-areas/suggest] AI fallback:', err);
    }

    if (suggestedAreas.length === 0) {
      suggestedAreas = [
        city,
        `Central ${city}`,
        `North ${city}`,
        `South ${city}`,
        `East ${city}`,
        `West ${city}`,
        `${city} City Center`,
        `${city} Old Town`,
        `${city} Market Area`,
        `${city} Metro Corridor`,
      ];
    }

    const deduped = Array.from(
      new Set([...existing.map((a) => a.trim()).filter(Boolean), ...suggestedAreas]),
    ).slice(0, 20);

    return NextResponse.json({
      success: true,
      city,
      suggestedAreas: deduped,
    });
  } catch (error: unknown) {
    console.error('[gbp/service-areas/suggest] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to suggest local areas' },
      { status: 500 },
    );
  }
}
