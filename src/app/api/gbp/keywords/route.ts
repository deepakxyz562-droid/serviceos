import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { callAI } from '@/lib/ai-client';
import { decryptToken } from '@/lib/social/crypto';
import { refreshExpiredToken } from '@/lib/social/token-refresh';
import { updateGoogleBusinessProfile } from '@/lib/social/adapters/googlebusiness';
import type { SocialAccountData } from '@/lib/social/types';

/**
 * PUT /api/gbp/keywords
 * Apply an SEO description: always persists to the workspace BrandProfile, and
 * when pushToGoogle=true AND a Google Business Profile is connected, writes the
 * description to the LIVE Google location (Business Information API, profile.description).
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const description: string | undefined =
      typeof body.description === 'string' && body.description.trim()
        ? body.description.trim().slice(0, 750)
        : undefined;

    if (!description) {
      return NextResponse.json({ error: 'description is required' }, { status: 400 });
    }

    // 1) Always persist to the workspace brand profile
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      include: { brandProfile: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }
    if (tenant.brandProfile) {
      await db.brandProfile.update({
        where: { tenantId: user.tenantId },
        data: { aiGeneratedSummary: description },
      });
    } else {
      await db.brandProfile.create({
        data: {
          tenantId: user.tenantId,
          businessName: tenant.name,
          industry: tenant.brandProfile?.industry || 'Local Services',
          location: tenant.brandProfile?.location || '',
          aiGeneratedSummary: description,
        },
      });
    }

    // 2) Push to the live Google profile when requested + connected
    let pushedToGoogle = false;
    let googleError: string | null = null;
    if (body.pushToGoogle === true) {
      const account = await db.socialAccount.findFirst({
        where: { tenantId: user.tenantId, platform: 'googlebusiness', isActive: true },
      });
      if (account) {
        try {
          const accountData: SocialAccountData = {
            id: account.id,
            platform: 'googlebusiness',
            accountId: account.accountId,
            accountName: account.accountName,
            accessToken: decryptToken(account.accessToken),
            refreshToken: account.refreshToken ? decryptToken(account.refreshToken) : undefined,
            tokenExpiry: account.tokenExpiry || undefined,
            metadata:
              typeof account.metadata === 'string'
                ? JSON.parse(account.metadata || '{}')
                : (account.metadata as Record<string, unknown>) || {},
          };
          const refreshed = await refreshExpiredToken(accountData);
          await updateGoogleBusinessProfile(refreshed, { description });
          pushedToGoogle = true;
        } catch (err: unknown) {
          googleError = err instanceof Error ? err.message : 'Google profile update failed';
          console.warn('[gbp/keywords] Google push failed:', googleError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      pushedToGoogle,
      ...(googleError ? { googleError } : {}),
      message: pushedToGoogle
        ? 'SEO description applied to your live Google Business Profile.'
        : 'SEO description saved to your BGOS brand profile.',
    });
  } catch (error: unknown) {
    console.error('Error applying GBP SEO description:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to apply SEO description' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/gbp/keywords
 * Generate high-intent localized SEO keywords and an SEO-rich Google Business Profile
 * description (max 750 characters) crafted to rank in Google Maps Local 3-Pack.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      include: {
        brandProfile: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const businessName = body.businessName || tenant.brandProfile?.businessName || tenant.name;
    const industry = body.industry || tenant.brandProfile?.industry || (tenant as any).businessType || 'Local Services';
    const location = body.location || tenant.brandProfile?.location || tenant.brandProfile?.serviceArea || (tenant as any).city || 'Local Area';
    const services = body.services || tenant.brandProfile?.services || 'Expert installation, repair, and maintenance';

    const aiPrompt = `You are a world-class Google Business Profile (GBP) Local SEO Specialist.
Your client is:
- Business Name: ${businessName}
- Industry/Category: ${industry}
- Location / Service Area: ${location}
- Core Services: ${typeof services === 'string' ? services : JSON.stringify(services)}

Task:
1. Generate 12 high-converting local SEO search keywords that prospective customers type into Google Search & Maps when they are ready to book. Include "near me" modifiers, emergency modifiers, and geo-targeted phrases.
2. Generate an SEO-rich GBP Description strictly between 450 and 700 characters (Google GBP limit is 750). The description MUST:
   - Begin with the primary value proposition and location.
   - Mention top services naturally with localized keywords.
   - Highlight reliability, upfront pricing, and customer satisfaction guarantees.
   - End with a strong call-to-action to book or call today.

Return ONLY a valid JSON object with the following structure (no markdown formatting, no code blocks):
{
  "keywords": [
    { "keyword": "...", "intent": "High Intent" | "Emergency" | "Near Me" | "Commercial", "searchVolume": "High" | "Medium" }
  ],
  "seoDescription": "...",
  "characterCount": 0,
  "suggestedCategories": ["...", "..."],
  "headline": "..."
}`;

    const aiResponse = await callAI([
      { role: 'system', content: 'You are an expert Google Local SEO AI assistant. Respond only with JSON.' },
      { role: 'user', content: aiPrompt },
    ]);

    let parsedResult: any = null;
    const rawText = typeof aiResponse === 'string' ? aiResponse : (aiResponse as any)?.text || '';

    try {
      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleaned);
    } catch {
      // Fallback structured response if AI returns non-JSON text
      parsedResult = {
        keywords: [
          { keyword: `${industry} in ${location}`, intent: 'High Intent', searchVolume: 'High' },
          { keyword: `best ${industry} near me`, intent: 'Near Me', searchVolume: 'High' },
          { keyword: `emergency ${industry} ${location}`, intent: 'Emergency', searchVolume: 'Medium' },
          { keyword: `affordable ${industry} services`, intent: 'High Intent', searchVolume: 'High' },
          { keyword: `same day ${industry} in ${location}`, intent: 'High Intent', searchVolume: 'Medium' },
        ],
        seoDescription: `${businessName} is ${location}'s trusted provider for professional ${industry}. We specialize in quality craftsmanship, rapid response times, and dependable solutions for residential and commercial clients. Our licensed team delivers upfront pricing, warranty-backed work, and 5-star customer service. Whether you need urgent repairs or scheduled maintenance, book online today or call for an instant quote!`,
        characterCount: 420,
        suggestedCategories: [industry, `${industry} Contractor`, 'Service Provider'],
        headline: `Top-Rated ${industry} in ${location}`,
      };
    }

    if (parsedResult.seoDescription) {
      parsedResult.characterCount = parsedResult.seoDescription.length;
    }

    // Optionally apply directly to BrandProfile if requested
    if (body.applyToProfile && parsedResult.seoDescription) {
      if (tenant.brandProfile) {
        await db.brandProfile.update({
          where: { tenantId: user.tenantId },
          data: {
            aiGeneratedSummary: parsedResult.seoDescription,
            location: location,
          },
        });
      } else {
        await db.brandProfile.create({
          data: {
            tenantId: user.tenantId,
            businessName,
            industry,
            location,
            aiGeneratedSummary: parsedResult.seoDescription,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      ...parsedResult,
    });
  } catch (error: unknown) {
    console.error('Error generating GBP keywords and SEO content:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate keywords' },
      { status: 500 },
    );
  }
}
