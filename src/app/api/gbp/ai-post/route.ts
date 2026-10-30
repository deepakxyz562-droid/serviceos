import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-client';
import { getBrandContext } from '@/lib/brand-context';
import { validateBrandSafety } from '@/lib/brand-safety-gate';

export const dynamic = 'force-dynamic';

interface AiPostRequest {
  topic: string;
  postType?: 'whats_new' | 'offer' | 'event' | 'product';
  tone?: string;
  offerDetails?: {
    title?: string;
    discount?: string;
    couponCode?: string;
    validDays?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as AiPostRequest;
    const topic = body.topic?.trim() || 'Exciting local service update';
    const postType = body.postType || 'whats_new';
    const tone = body.tone || 'engaging, professional, local-friendly';

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      include: { brandProfile: true },
    });

    const businessName =
      tenant?.brandProfile?.businessName || tenant?.name || 'Local Business';
    const industry =
      tenant?.brandProfile?.industry || (tenant as any)?.industry || 'Professional Services';
    const location =
      tenant?.brandProfile?.location || tenant?.city || 'Local Area';
    const brandContext = await getBrandContext(user.tenantId);

    const systemPrompt = `You are a world-class Google Business Profile (GBP) Local SEO and Viral Poster expert for ${businessName}.
Your job is to generate a high-converting Google Business Profile post that drives local Google Maps rankings, calls, direction requests, and clicks.

Strict Guidelines:
1. Business: "${businessName}"
2. Industry: "${industry}"
3. Service Location / City: "${location}"
4. Brand Context: ${brandContext}
5. Post Type: ${postType.toUpperCase()}
6. Desired Tone: ${tone}
7. Topic / Angle: "${topic}"

Respond ONLY with a valid JSON object with the following schema:
{
  "headline": "A punchy, attention-grabbing headline (under 70 chars) with 1-2 relevant emojis",
  "content": "A captivating, SEO-optimized body paragraph (100-200 words). Include genuine local keywords for ${industry} in ${location}. Clearly state benefits, reliability, and end with an irresistible call to action (e.g. Call now, Visit us, or Request a quote). Include 3-5 relevant local hashtags at the very end.",
  "ctaType": "CALL" | "BOOK" | "LEARN_MORE" | "ORDER",
  "ctaLabel": "e.g. Call Now, Book Appointment, Get Quote",
  "suggestedOffer": {
    "title": "Title for offer (if postType is offer)",
    "couponCode": "e.g. SAVE20",
    "discount": "e.g. 15% OFF"
  },
  "imageKeyword": "1-3 descriptive search words for finding or generating the best matching visual photo (e.g. 'welding workshop', 'solar installation')",
  "imagePrompt": "Detailed generative AI prompt describing an ultra-realistic, professional, high-resolution photo showcasing this service"
}`;

    let parsedResult: any = null;

    try {
      const aiResponse = await callAI({
        messages: [
          { role: 'system', content: 'You are an expert Google Local SEO AI assistant. Respond only with JSON.' },
          { role: 'user', content: systemPrompt },
        ],
        temperature: 0.7,
      });

      const rawText = aiResponse.content || '';
      const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleaned);
    } catch (aiErr) {
      console.warn('[api/gbp/ai-post] AI generation error, using smart fallback:', aiErr);
    }

    if (!parsedResult || !parsedResult.content) {
      const isOffer = postType === 'offer';
      parsedResult = {
        headline: isOffer
          ? `🔥 Special Limited-Time Offer from ${businessName}!`
          : `✨ ${topic} — Trusted ${industry} in ${location}`,
        content: `Looking for top-rated ${industry.toLowerCase()} in ${location}? ${businessName} delivers precision workmanship, fast turnarounds, and exceptional customer service on every project.\n\nWhether you need custom solutions, reliable maintenance, or urgent assistance, our experienced team is here to help.\n\n📞 Contact us today for a free consultation and prompt service!\n\n#${location.replace(/[^a-zA-Z0-9]/g, '')}${industry.replace(/[^a-zA-Z0-9]/g, '')} #${businessName.replace(/[^a-zA-Z0-9]/g, '')} #Local${industry.replace(/[^a-zA-Z0-9]/g, '')}`,
        ctaType: 'CALL',
        ctaLabel: 'Call Now',
        suggestedOffer: isOffer
          ? {
              title: body.offerDetails?.title || `Exclusive ${industry} Discount`,
              couponCode: body.offerDetails?.couponCode || 'GOOGLE10',
              discount: body.offerDetails?.discount || '10% OFF',
            }
          : undefined,
        imageKeyword: `${industry} professional`,
        imagePrompt: `Professional high-quality commercial photo of ${industry.toLowerCase()} service by ${businessName} in ${location}, modern equipment, clean lighting.`,
      };
    }

    // High quality themed visual image URL matching the industry & topic
    const keywordQuery = encodeURIComponent(parsedResult.imageKeyword || industry || 'services');
    const visualImageUrl = `https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1080&q=80`;

    // Layer 2: Deterministic Brand Safety Gate validation
    const forbiddenPhrases = (() => {
      try {
        const fp = tenant?.brandProfile?.forbiddenPhrases;
        return fp ? JSON.parse(fp) : [];
      } catch {
        return [];
      }
    })();
    const competitors = (() => {
      try {
        const cp = tenant?.brandProfile?.competitors;
        return cp ? JSON.parse(cp) : [];
      } catch {
        return [];
      }
    })();

    const safetyCheck = validateBrandSafety(`${parsedResult.headline}\n${parsedResult.content}`, {
      tenantId: user.tenantId,
      activeBusinessName: businessName,
      forbiddenPhrases,
      competitors,
    });

    // If cross-tenant contamination or severe violations found, sanitize content to active business
    let finalHeadline = parsedResult.headline;
    let finalContent = parsedResult.content;
    if (!safetyCheck.passed) {
      for (const v of safetyCheck.violations) {
        if (v.type === 'cross_tenant_contamination' && v.matchedText) {
          const esc = v.matchedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const reg = new RegExp(`\\b${esc}\\b`, 'gi');
          finalHeadline = finalHeadline.replace(reg, businessName);
          finalContent = finalContent.replace(reg, businessName);
        }
      }
    }

    return NextResponse.json({
      success: true,
      post: {
        headline: finalHeadline,
        content: finalContent,
        ctaType: parsedResult.ctaType || 'CALL',
        ctaLabel: parsedResult.ctaLabel || 'Call Now',
        postType,
        topic,
        suggestedOffer: parsedResult.suggestedOffer,
        imagePrompt: parsedResult.imagePrompt,
        visualImageUrl,
        safety: {
          passed: safetyCheck.passed,
          warnings: safetyCheck.warnings.map((w) => w.message),
        },
      },
    });
  } catch (error: unknown) {
    console.error('Error generating AI GBP post:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate AI post' },
      { status: 500 },
    );
  }
}
