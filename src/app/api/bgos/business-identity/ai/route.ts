import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { callAI } from '@/lib/ai-client';
import { db } from '@/lib/db';
import { safeParseJsonObject } from '@/lib/gbp/seo-context';
import { applyTenantRateLimit, rateLimitResponse, tenantAiLimiter } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/bgos/business-identity/ai
 * Auto-generate crisp Tagline & Headline tailored to the tenant's business context.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const rl = await applyTenantRateLimit(tenantAiLimiter, user.tenantId, 'identity-ai', 60_000, 30);
    if (!rl.success) {
      return rateLimitResponse(rl.resetAtMs);
    }

    const body = (await request.json().catch(() => ({}))) as {
      field?: 'tagline' | 'headline' | 'description' | 'both' | 'all';
      businessName?: string;
      description?: string;
      currentTagline?: string;
      currentHeadline?: string;
      currentDescription?: string;
    };

    const tenant = await db.tenant
      .findUnique({
        where: { id: user.tenantId },
        select: {
          name: true,
          industry: true,
          city: true,
          description: true,
          settingsJson: true,
          brandProfile: { select: { businessName: true, industry: true, location: true } },
        },
      })
      .catch(() => null);

    const settings = safeParseJsonObject(tenant?.settingsJson);
    const bizName =
      (body.businessName || '').trim() ||
      (typeof settings.activeGbpTitle === 'string' && settings.activeGbpTitle.trim()) ||
      tenant?.brandProfile?.businessName ||
      tenant?.name ||
      'Our Business';
    const category =
      (typeof settings.activeGbpCategory === 'string' && settings.activeGbpTitle ? settings.activeGbpCategory : '') ||
      tenant?.brandProfile?.industry ||
      tenant?.industry ||
      'Local Service';
    const city =
      (typeof settings.activeGbpCity === 'string' && settings.activeGbpCity.trim()) ||
      tenant?.city ||
      tenant?.brandProfile?.location ||
      '';
    const services: string[] = Array.isArray(settings.activeGbpServices)
      ? settings.activeGbpServices.slice(0, 6)
      : Array.isArray(settings.services)
        ? settings.services.slice(0, 6)
        : [];
    const aboutText = (body.currentDescription || body.description || tenant?.description || '').trim().slice(0, 400);

    const fallbackTagline = city
      ? `Trusted ${category} in ${city} — Quality You Can Count On`.slice(0, 75)
      : `Trusted ${category} Specialists Committed to Excellence`.slice(0, 75);
    const fallbackHeadline = services.length > 0
      ? `Book ${services[0]} or Chat With ${bizName} Today`.slice(0, 90)
      : `Book Fast, Reliable ${category} With ${bizName}`.slice(0, 90);
    const fallbackDescription = `${bizName} is ${city ? `a trusted ${category.toLowerCase()} in ${city}` : `your trusted ${category.toLowerCase()} specialist`}${
      services.length > 0 ? ` offering ${services.slice(0, 3).join(', ')}` : ''
    }. Explore our services, read verified reviews, and book or message our team directly online for fast, reliable assistance.`.slice(0, 420);

    try {
      const prompt = `Write conversion-focused Business Page copy for a local business:
Business Name: "${bizName}"
Category: "${category}"
${city ? `City: "${city}"` : ''}
${services.length ? `Top Services: ${services.join(', ')}` : ''}
${aboutText ? `Current About / Context: ${aboutText}` : ''}
${body.currentTagline ? `Current Tagline (generate a fresh improved alternative): ${body.currentTagline}` : ''}
${body.currentHeadline ? `Current Headline (generate a fresh improved alternative): ${body.currentHeadline}` : ''}
${body.currentDescription ? `Current Description (generate a fresh improved alternative): ${body.currentDescription}` : ''}

Return ONLY valid JSON:
{
  "tagline": "short memorable slogan under 70 characters",
  "headline": "clear customer-facing hero headline under 85 characters",
  "description": "engaging 2-3 sentence business overview under 380 characters mentioning city and core offerings naturally"
}`;

      const aiRes = await callAI({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        json: true,
      });

      const raw = (aiRes?.content || '').trim();
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const tagline = typeof parsed?.tagline === 'string' && parsed.tagline.trim() ? parsed.tagline.trim().slice(0, 100) : fallbackTagline;
        const headline = typeof parsed?.headline === 'string' && parsed.headline.trim() ? parsed.headline.trim().slice(0, 120) : fallbackHeadline;
        const description = typeof parsed?.description === 'string' && parsed.description.trim() ? parsed.description.trim().slice(0, 500) : fallbackDescription;
        return NextResponse.json({ tagline, headline, description, source: 'ai' });
      }
    } catch (aiErr) {
      console.warn('[business-identity/ai] fallback used:', aiErr instanceof Error ? aiErr.message : aiErr);
    }

    return NextResponse.json({
      tagline: fallbackTagline,
      headline: fallbackHeadline,
      description: fallbackDescription,
      source: 'template',
    });
  } catch (err) {
    console.error('[POST /api/bgos/business-identity/ai] error:', err);
    return NextResponse.json({ error: 'Could not generate business identity copy' }, { status: 500 });
  }
}
