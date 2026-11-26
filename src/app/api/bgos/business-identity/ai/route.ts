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
      field?: 'tagline' | 'headline' | 'both';
      businessName?: string;
      description?: string;
      currentTagline?: string;
      currentHeadline?: string;
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
    const aboutText = (body.description || tenant?.description || '').trim().slice(0, 300);

    const fallbackTagline = city
      ? `Trusted ${category} in ${city} — Quality You Can Count On`.slice(0, 75)
      : `Trusted ${category} Specialists Committed to Excellence`.slice(0, 75);
    const fallbackHeadline = services.length > 0
      ? `Book ${services[0]} or Chat With ${bizName} Today`.slice(0, 90)
      : `Book Fast, Reliable ${category} With ${bizName}`.slice(0, 90);

    try {
      const prompt = `Write conversion-focused Business Page copy for a local business:
Business Name: "${bizName}"
Category: "${category}"
${city ? `City: "${city}"` : ''}
${services.length ? `Top Services: ${services.join(', ')}` : ''}
${aboutText ? `About: ${aboutText}` : ''}
${body.currentTagline ? `Current Tagline (generate a fresh improved alternative): ${body.currentTagline}` : ''}
${body.currentHeadline ? `Current Headline (generate a fresh improved alternative): ${body.currentHeadline}` : ''}

Return ONLY valid JSON:
{
  "tagline": "short memorable slogan under 70 characters",
  "headline": "clear customer-facing hero headline under 85 characters"
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
        return NextResponse.json({ tagline, headline, source: 'ai' });
      }
    } catch (aiErr) {
      console.warn('[business-identity/ai] fallback used:', aiErr instanceof Error ? aiErr.message : aiErr);
    }

    return NextResponse.json({
      tagline: fallbackTagline,
      headline: fallbackHeadline,
      source: 'template',
    });
  } catch (err) {
    console.error('[POST /api/bgos/business-identity/ai] error:', err);
    return NextResponse.json({ error: 'Could not generate business identity copy' }, { status: 500 });
  }
}
