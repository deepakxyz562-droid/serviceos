import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-client';

export const dynamic = 'force-dynamic';

export interface PromptSuggestion {
  id: string;
  category: 'service' | 'offer' | 'review' | 'ai_assistant' | 'urgency';
  chipLabel: string;
  badge: string;
  prompt: string;
  headline: string;
  aspectRatio: '4:5' | '1:1';
  icon: string;
  title: string;
}

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((x): x is string => typeof x === 'string')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
    return [];
  } catch {
    return [];
  }
}

function normalizeSuggestion(s: Partial<PromptSuggestion> & { id: string; prompt: string }): PromptSuggestion {
  const chipLabel = (s.chipLabel || s.headline || '💡 Marketing Idea').trim();
  // Extract emoji if present at the start of chipLabel
  const emojiMatch = chipLabel.match(/^([\p{Emoji_Presentation}\p{Extended_Pictographic}]+|\S+)\s*(.*)$/u);
  const icon = s.icon || (emojiMatch ? emojiMatch[1] : '💡');
  const title = s.title || (emojiMatch && emojiMatch[2] ? emojiMatch[2] : chipLabel.replace(/^💡\s*/, ''));
  return {
    id: s.id,
    category: (s.category as PromptSuggestion['category']) || 'service',
    chipLabel: s.chipLabel || `${icon} ${title}`,
    icon: icon || '💡',
    title: title || chipLabel,
    badge: s.badge || 'RECOMMENDED',
    prompt: s.prompt,
    headline: s.headline || title,
    aspectRatio: s.aspectRatio === '1:1' ? '1:1' : '4:5',
  };
}

export async function GET(request: NextRequest) {
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

    const reviews = await db.review.findMany({
      where: { tenantId: user.tenantId, rating: { gte: 4 } },
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: { author: true, text: true, rating: true },
    });

    const businessName =
      tenant?.brandProfile?.businessName || tenant?.name || 'Fieseros';
    const industry =
      tenant?.brandProfile?.industry || tenant?.industry || 'Field Services & Trade';
    const location =
      tenant?.brandProfile?.location || tenant?.city || 'Local area';
    const website =
      tenant?.brandProfile?.website || tenant?.website || 'https://fieseros.com';
    const services = parseJsonArray(tenant?.brandProfile?.services);
    const usps = tenant?.brandProfile?.usps || 'Fast response, certified professionals, transparent pricing';
    const currentOffers = tenant?.brandProfile?.currentOffers || 'Limited-time special offer';

    const topReview = reviews.find((r) => r.text && r.text.trim().length > 15);
    const heroService = services[0] || 'Boiler Repair & Heating';
    const secondService = services[1] || 'Emergency Plumbing & Diagnostics';

    // Baseline deterministic contextual suggestions (guaranteed zero latency fallback)
    const baselineSuggestions: PromptSuggestion[] = [
      {
        id: 's_hero',
        category: 'service',
        chipLabel: `🔧 ${heroService} Focus`,
        badge: 'HERO SERVICE',
        headline: `Reliable ${heroService}. Done Right.`,
        aspectRatio: '4:5',
        prompt: `Create a professional marketing graphic promoting our ${heroService} service in ${location}. Highlight our USPs: ${usps}. Call to action: Book today at ${website}.`,
      },
      {
        id: 's_offer',
        category: 'offer',
        chipLabel: '🔥 Seasonal Special Offer',
        badge: 'SPECIAL OFFER',
        headline: 'Save on Your Next Service',
        aspectRatio: '4:5',
        prompt: `Create a high-converting promotional post for our ${currentOffers} on ${heroService} and ${secondService}. Target local homeowners in ${location}. End with visit ${website}.`,
      },
      {
        id: 's_review',
        category: 'review',
        chipLabel: topReview?.author ? `⭐ ${topReview.author}'s 5-Star Review` : '⭐ 5-Star Customer Proof',
        badge: 'CUSTOMER PROOF',
        headline: 'Loved by Local Customers',
        aspectRatio: '4:5',
        prompt: topReview?.text
          ? `Create a trust-building social proof graphic highlighting this 5-star customer review: "${topReview.text.slice(0, 120)}..." by ${topReview.author || 'a happy customer'}. Reinforce our reputation for quality in ${location}.`
          : `Create a trust-building customer review post highlighting top-rated 5-star feedback, prompt arrival, and spotless workmanship from ${businessName}.`,
      },
      {
        id: 's_ai',
        category: 'ai_assistant',
        chipLabel: '🤖 AI Assistant & Easy Booking',
        badge: 'AI WORKFLOW',
        headline: 'Less admin. More jobs.',
        aspectRatio: '4:5',
        prompt: `Create a professional social media marketing post promoting the Fieseros AI Assistant.
Brand: ${businessName} | Website: ${website}
Audience: Owners of plumbing, HVAC, electrical, cleaning, landscaping, and other field service businesses.
Objective: Encourage business owners to visit the website and explore the AI Assistant.
CORE MESSAGE: “Turn one instruction into a connected workflow.”
Illustrative command: “Schedule a boiler repair for Sarah tomorrow, assign Mike, create a £350 quote, and prepare her confirmation.”
Design: SaaS promotional graphic in portrait 1080x1350 with AI chat panel, proposed workflow cards (Customer -> Job -> Quote -> Confirmation), CTA Explore Fieseros, footer fieseros.com.`,
      },
      {
        id: 's_urgency',
        category: 'urgency',
        chipLabel: '⚡ Weekend Priority Slots',
        badge: 'LIMITED SLOTS',
        headline: 'Priority Slots Open This Weekend',
        aspectRatio: '4:5',
        prompt: `Create an urgency marketing post announcing priority service availability in ${location} this weekend. Fast dispatch, zero hidden fees, and hassle-free booking at ${website}.`,
      },
    ];

    // Try AI generation for even more creative tailored prompts if requested or available
    const url = new URL(request.url);
    const refresh = url.searchParams.get('refresh') === '1';

    if (refresh) {
      try {
        const aiPrompt = `
Generate 5 distinct, high-converting social media marketing prompt suggestions for this business:
Business: ${businessName}
Industry: ${industry}
Location: ${location}
Website: ${website}
Services: ${services.join(', ') || heroService}
USPs: ${usps}
Offer: ${currentOffers}

Return a STRICT JSON array of 5 objects with keys:
id (string), category ("service" | "offer" | "review" | "ai_assistant" | "urgency"), chipLabel (short title with emoji, under 28 chars), badge (short uppercase tag), prompt (detailed 1-3 sentence instruction), headline (catchy 3-6 word graphic headline), aspectRatio ("4:5").
`;
        const aiRes = await callAI({
          messages: [{ role: 'user', content: aiPrompt }],
          temperature: 0.7,
        });
        const clean = aiRes.content.replace(/```json/gi, '').replace(/```/gi, '').trim();
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed) && parsed.length >= 3) {
          return NextResponse.json({
            businessName,
            industry,
            website,
            location,
            suggestions: parsed.slice(0, 5).map((p: any) => normalizeSuggestion(p)),
          });
        }
      } catch {
        // Fall back gracefully to baseline suggestions
      }
    }

    return NextResponse.json({
      businessName,
      industry,
      website,
      location,
      suggestions: baselineSuggestions.map((b) => normalizeSuggestion(b)),
    });
  } catch (err: unknown) {
    console.error('[/api/social/prompts/suggestions]', err);
    return NextResponse.json(
      { error: 'Failed to load prompt suggestions' },
      { status: 500 }
    );
  }
}
