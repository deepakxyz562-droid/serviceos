import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { callAI } from '@/lib/ai-client';

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
