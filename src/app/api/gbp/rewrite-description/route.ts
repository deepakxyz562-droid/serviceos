import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-client';
import { getBrandContext } from '@/lib/brand-context';
import { validateBrandSafety } from '@/lib/brand-safety-gate';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      currentDescription?: string;
      selectedVariation?: string;
      applyToGoogle?: boolean;
    };

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      include: { brandProfile: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const businessName =
      tenant.brandProfile?.businessName || tenant.name || 'Local Business';
    const industry =
      tenant.brandProfile?.industry || (tenant as any)?.industry || 'Services';
    const city =
      tenant.brandProfile?.location || tenant.city || 'Local Area';
    const brandContext = await getBrandContext(user.tenantId);

    // If the caller wants to apply a chosen variation directly:
    if (body.selectedVariation && typeof body.selectedVariation === 'string') {
      const sanitized = body.selectedVariation.trim().slice(0, 750);
      const safety = validateBrandSafety(sanitized, {
        tenantId: user.tenantId,
        activeBusinessName: businessName,
      });

      if (!safety.passed) {
        return NextResponse.json(
          { error: `Brand safety violation: ${safety.violations.map((v) => v.message).join(' ')}` },
          { status: 422 },
        );
      }

      await Promise.all([
        db.tenant.update({
          where: { id: user.tenantId },
          data: { description: sanitized },
        }),
        tenant.brandProfile
          ? db.brandProfile.update({
              where: { tenantId: user.tenantId },
              data: { aiGeneratedSummary: sanitized },
            })
          : null,
      ]);

      return NextResponse.json({
        success: true,
        message: 'Business description updated successfully.',
        description: sanitized,
      });
    }

    // Otherwise, generate 3 high-converting variations using callAI
    const existingDesc =
      body.currentDescription?.trim() || tenant.description || '';

    const systemPrompt = `You are a premier Google Business Profile (GBP) Local SEO copywriter.
Your task is to write 3 distinct, high-ranking business descriptions for Google Maps for "${businessName}".

Strict Google Business Profile Rules:
1. Max length: between 350 and 680 characters (Google strictly cuts off at 750 characters).
2. NEVER include URLs, phone numbers, HTML tags, or hashtags (Google rejects them in descriptions).
3. Weave in the business location ("${city}"), core services, and trust factors naturally.
4. Active Business: "${businessName}" (${industry}).
5. Brand Context: ${brandContext}
${existingDesc ? `6. Existing Description for reference: "${existingDesc}"` : ''}

Respond ONLY with a valid JSON object in this exact schema:
{
  "variations": [
    {
      "id": "local_seo",
      "title": "Local SEO & High Visibility",
      "description": "Rich in natural search keywords for Google Maps ranking...",
      "charCount": 480
    },
    {
      "id": "customer_engaging",
      "title": "Customer-Focused & Welcoming",
      "description": "Story-driven, warm, and highlighting customer satisfaction...",
      "charCount": 460
    },
    {
      "id": "concise_professional",
      "title": "Concise & Professional",
      "description": "Direct, authoritative, highlighting services and expertise...",
      "charCount": 420
    }
  ]
}`;

    let variations: Array<{ id: string; title: string; description: string; charCount: number }> = [];

    try {
      const aiResponse = await callAI({
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Generate 3 optimized Google Business Profile descriptions for ${businessName} in ${city}.`,
          },
        ],
        temperature: 0.6,
      });

      const raw = aiResponse.content || '';
      const clean = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed.variations)) {
        variations = parsed.variations.map((v: any) => ({
          id: String(v.id || 'seo'),
          title: String(v.title || 'Optimized Description'),
          description: String(v.description || '').slice(0, 750),
          charCount: String(v.description || '').length,
        }));
      }
    } catch (err) {
      console.warn('[gbp/rewrite-description] AI call failed, using deterministic fallbacks:', err);
    }

    // Deterministic fallback variations if AI provider has downtime
    if (variations.length === 0) {
      const fallback1 = `${businessName} is your trusted ${industry.toLowerCase()} specialist in ${city}. We are dedicated to providing prompt, professional, and reliable services tailored to your exact needs. Backed by skilled technicians and a strong commitment to quality craftsmanship, we take pride in delivering dependable results that exceed customer expectations. Visit our profile or call us today to discuss your project!`;
      const fallback2 = `Welcome to ${businessName}, the leading ${industry.toLowerCase()} provider proudly serving ${city} and surrounding areas. Our mission is to deliver top-notch service with complete transparency and customer satisfaction. From routine maintenance to custom solutions, our experienced team ensures your project is completed with care, precision, and efficiency. Get in touch with us today!`;
      const fallback3 = `Need trusted ${industry.toLowerCase()} in ${city}? ${businessName} provides high-quality solutions, fast response times, and exceptional service. We combine proven expertise with dedicated client care to solve your service needs quickly and effectively. Contact our team today for dependable assistance!`;

      variations = [
        {
          id: 'local_seo',
          title: 'Local SEO & High Visibility',
          description: fallback1.slice(0, 750),
          charCount: fallback1.length,
        },
        {
          id: 'customer_engaging',
          title: 'Customer-Focused & Welcoming',
          description: fallback2.slice(0, 750),
          charCount: fallback2.length,
        },
        {
          id: 'concise_professional',
          title: 'Concise & Professional',
          description: fallback3.slice(0, 750),
          charCount: fallback3.length,
        },
      ];
    }

    return NextResponse.json({
      success: true,
      currentDescription: existingDesc,
      variations,
    });
  } catch (error: unknown) {
    console.error('[gbp/rewrite-description] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to rewrite description' },
      { status: 500 },
    );
  }
}
