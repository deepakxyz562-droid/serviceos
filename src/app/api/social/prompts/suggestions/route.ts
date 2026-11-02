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

interface CapabilityProfile {
  heroService: string;
  secondService: string;
  usps: string;
  currentOffers: string;
  baseline: PromptSuggestion[];
}

function resolveCapabilities(businessName: string, category: string, location: string, website: string, uspsOverride?: string, offerOverride?: string, customServices?: string[]): CapabilityProfile {
  const catLower = (category || '').toLowerCase();
  const nameLower = (businessName || '').toLowerCase();
  const hasCustom = Array.isArray(customServices) && customServices.length > 0;

  // 1. HVAC / Heating & Air Conditioning (only if industry/category explicitly mentions HVAC or heating)
  if (catLower.includes('hvac') || catLower.includes('heating') || catLower.includes('air conditioning') || catLower.includes('cooling') || catLower.includes('furnace')) {
    const heroService = hasCustom ? customServices[0] : 'Heating & AC Maintenance';
    const secondService = hasCustom && customServices[1] ? customServices[1] : 'Emergency System Diagnostics';
    const usps = uspsOverride || 'Certified technicians, rapid arrival, transparent upfront pricing';
    const currentOffers = offerOverride || 'Seasonal Tune-Up & Safety Inspection Special';

    const baseline: PromptSuggestion[] = [
      {
        id: 's_hero',
        category: 'service',
        chipLabel: `🔧 ${heroService} Focus`,
        icon: '🔧',
        title: `${heroService} Focus`,
        badge: 'HERO SERVICE',
        headline: `Reliable ${heroService}. Done Right.`,
        aspectRatio: '4:5',
        prompt: `Create a professional marketing graphic promoting our ${heroService} in ${location}. Highlight our USPs: ${usps}. Call to action: Book today at ${website}.`,
      },
      {
        id: 's_offer',
        category: 'offer',
        chipLabel: '🔥 Seasonal Special Offer',
        icon: '🔥',
        title: 'Seasonal Special Offer',
        badge: 'SPECIAL OFFER',
        headline: 'Save on Your Heating & AC',
        aspectRatio: '4:5',
        prompt: `Create a high-converting promotional post for our ${currentOffers} on ${heroService} and ${secondService}. Target local homeowners in ${location}. Visit ${website}.`,
      },
      {
        id: 's_review',
        category: 'review',
        chipLabel: '⭐ 5-Star Customer Proof',
        icon: '⭐',
        title: '5-Star Customer Proof',
        badge: 'CUSTOMER PROOF',
        headline: 'Loved by Local Homeowners',
        aspectRatio: '4:5',
        prompt: `Create a trust-building customer review post highlighting top-rated 5-star feedback, prompt arrival, and spotless workmanship from ${businessName}.`,
      },
      {
        id: 's_ai',
        category: 'ai_assistant',
        chipLabel: '🤖 Easy Online Booking',
        icon: '🤖',
        title: 'Easy Online Booking',
        badge: 'INSTANT BOOKING',
        headline: 'Fast Booking. No Waiting.',
        aspectRatio: '4:5',
        prompt: `Create a modern graphic promoting hassle-free online booking and fast dispatch for ${businessName} in ${location}. Schedule at ${website}.`,
      },
      {
        id: 's_urgency',
        category: 'urgency',
        chipLabel: '⚡ Emergency Weekend Service',
        icon: '⚡',
        title: 'Emergency Weekend Service',
        badge: 'LIMITED SLOTS',
        headline: 'Emergency Dispatch Available',
        aspectRatio: '4:5',
        prompt: `Create an urgency marketing post announcing priority HVAC dispatch in ${location}. Zero hidden fees and fast response at ${website}.`,
      },
    ];

    return { heroService, secondService, usps, currentOffers, baseline };
  }

  // 2. Plumbing (only if industry/category explicitly mentions plumbing or drains)
  if (catLower.includes('plumb') || catLower.includes('drain')) {
    const heroService = hasCustom ? customServices[0] : 'Emergency Plumbing & Leak Repair';
    const secondService = hasCustom && customServices[1] ? customServices[1] : 'Drain Cleaning & Diagnostics';
    const usps = uspsOverride || 'Licensed plumbers, prompt dispatch, clean & guaranteed work';
    const currentOffers = offerOverride || '10% Off Your First Plumbing Service';

    const baseline: PromptSuggestion[] = [
      {
        id: 's_hero',
        category: 'service',
        chipLabel: `🔧 ${heroService}`,
        icon: '🔧',
        title: heroService,
        badge: 'HERO SERVICE',
        headline: 'Fast, Spotless Plumbing Repairs',
        aspectRatio: '4:5',
        prompt: `Create a professional marketing graphic promoting ${heroService} in ${location}. Highlight: ${usps}. Book at ${website}.`,
      },
      {
        id: 's_offer',
        category: 'offer',
        chipLabel: '🔥 First-Time Client Discount',
        icon: '🔥',
        title: 'First-Time Client Discount',
        badge: 'SPECIAL OFFER',
        headline: 'Save on Plumbing Today',
        aspectRatio: '4:5',
        prompt: `Create a high-converting promotional post for ${currentOffers}. Target local homeowners in ${location}. End with visit ${website}.`,
      },
      {
        id: 's_review',
        category: 'review',
        chipLabel: '⭐ 5-Star Customer Proof',
        icon: '⭐',
        title: '5-Star Customer Proof',
        badge: 'TOP RATED',
        headline: 'Trusted by Your Neighbors',
        aspectRatio: '4:5',
        prompt: `Create a trust-building customer review post highlighting prompt arrival, clean workspaces, and 5-star ratings for ${businessName}.`,
      },
      {
        id: 's_ai',
        category: 'ai_assistant',
        chipLabel: '🤖 Book Plumber Online',
        icon: '🤖',
        title: 'Book Plumber Online',
        badge: 'INSTANT BOOKING',
        headline: 'Book in 60 Seconds',
        aspectRatio: '4:5',
        prompt: `Create a clean social graphic showing how easy it is to schedule a licensed plumber from ${businessName} online at ${website}.`,
      },
      {
        id: 's_urgency',
        category: 'urgency',
        chipLabel: '⚡ Same-Day Leak Triage',
        icon: '⚡',
        title: 'Same-Day Leak Triage',
        badge: 'FAST DISPATCH',
        headline: 'Emergency Plumber On Call',
        aspectRatio: '4:5',
        prompt: `Create an urgent announcement post for same-day plumbing dispatch in ${location}. Fast arrival, no surprise charges at ${website}.`,
      },
    ];

    return { heroService, secondService, usps, currentOffers, baseline };
  }

  // 3. Cleaning / Janitorial
  if (catLower.includes('clean') || catLower.includes('maid') || catLower.includes('janitorial')) {
    const heroService = hasCustom ? customServices[0] : 'Deep Cleaning & Sanitization';
    const secondService = hasCustom && customServices[1] ? customServices[1] : 'Move-In & Move-Out Cleaning';
    const usps = uspsOverride || 'Vetted professionals, eco-friendly supplies, 100% satisfaction guaranteed';
    const currentOffers = offerOverride || 'First-Time Client Deep Cleaning Special';

    const baseline: PromptSuggestion[] = [
      {
        id: 's_hero',
        category: 'service',
        chipLabel: `✨ ${heroService}`,
        icon: '✨',
        title: heroService,
        badge: 'HERO SERVICE',
        headline: 'Spotless Spaces. Zero Stress.',
        aspectRatio: '4:5',
        prompt: `Create an inviting marketing graphic promoting ${heroService} in ${location}. Highlight: ${usps}. Book at ${website}.`,
      },
      {
        id: 's_offer',
        category: 'offer',
        chipLabel: '🔥 Deep Clean Special Offer',
        icon: '🔥',
        title: 'Deep Clean Special Offer',
        badge: 'SPECIAL OFFER',
        headline: 'Fresh Home, Special Price',
        aspectRatio: '4:5',
        prompt: `Create a promotional post for ${currentOffers} in ${location}. Book your slot at ${website}.`,
      },
      {
        id: 's_review',
        category: 'review',
        chipLabel: '⭐ 5-Star Customer Proof',
        icon: '⭐',
        title: '5-Star Customer Proof',
        badge: 'CLIENT LOVE',
        headline: 'Rated 5 Stars by Clients',
        aspectRatio: '4:5',
        prompt: `Create a trust-building graphic highlighting spotless results and glowing reviews for ${businessName}.`,
      },
      {
        id: 's_ai',
        category: 'ai_assistant',
        chipLabel: '🤖 Schedule Online',
        icon: '🤖',
        title: 'Schedule Online',
        badge: 'EASY BOOKING',
        headline: 'Book Your Clean in Minutes',
        aspectRatio: '4:5',
        prompt: `Promote seamless online booking for cleaning appointments at ${website}.`,
      },
      {
        id: 's_urgency',
        category: 'urgency',
        chipLabel: '⚡ Weekend Slots Open',
        icon: '⚡',
        title: 'Weekend Slots Open',
        badge: 'LIMITED SLOTS',
        headline: 'Weekend Availability Open',
        aspectRatio: '4:5',
        prompt: `Create an urgency graphic announcing open cleaning slots in ${location} this weekend at ${website}.`,
      },
    ];

    return { heroService, secondService, usps, currentOffers, baseline };
  }

  // 4. Software / SaaS / AI Assistant / FieserOS
  if (nameLower.includes('fieser') || catLower.includes('software') || catLower.includes('saas') || catLower.includes('technology') || catLower.includes('app') || catLower.includes('it company')) {
    const heroService = hasCustom ? customServices[0] : 'AI Assistant & Workflow Automation';
    const secondService = hasCustom && customServices[1] ? customServices[1] : 'Smart Job Dispatch & Instant Quotes';
    const usps = uspsOverride || 'Turn one instruction into a connected workflow; save 15+ hours/week; zero missed leads';
    const currentOffers = offerOverride || 'Explore Fieseros AI Assistant Free — Streamline Your Field Service Operations';

    const baseline: PromptSuggestion[] = [
      {
        id: 's_ai',
        category: 'ai_assistant',
        chipLabel: '🤖 AI Workflow & Automation',
        icon: '🤖',
        title: 'AI Workflow & Automation',
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
        id: 's_dispatch',
        category: 'service',
        chipLabel: '⚡ Instant Job Dispatch',
        icon: '⚡',
        title: 'Instant Job Dispatch',
        badge: 'FAST DISPATCH',
        headline: 'Never Miss Another Job',
        aspectRatio: '4:5',
        prompt: `Create a high-impact SaaS promotional graphic for ${businessName}. Highlight how trade and service companies can assign technicians, schedule incoming leads, and dispatch jobs in under 30 seconds from mobile or web. Call to action: Explore ${website}.`,
      },
      {
        id: 's_quotes',
        category: 'service',
        chipLabel: '💼 30-Second Quotes & Invoicing',
        icon: '💼',
        title: '30-Second Quotes & Invoicing',
        badge: 'SMART QUOTES',
        headline: 'Get Paid 2x Faster',
        aspectRatio: '4:5',
        prompt: `Create a sleek marketing graphic showcasing automated quote-to-invoice workflows on ${businessName}. Highlight instant quotes, automated customer confirmation, and seamless payment collection at ${website}.`,
      },
      {
        id: 's_reviews',
        category: 'review',
        chipLabel: '⭐ 5-Star Review Growth',
        icon: '⭐',
        title: '5-Star Review Growth',
        badge: 'REPUTATION BOOST',
        headline: 'Automate 5-Star Reviews',
        aspectRatio: '4:5',
        prompt: `Create a trust and growth focused social post showing how ${businessName} automatically requests Google reviews after every completed job, boosting local rank and customer trust. Learn more at ${website}.`,
      },
      {
        id: 's_upgrade',
        category: 'offer',
        chipLabel: '🚀 Upgrade Your Operations',
        icon: '🚀',
        title: 'Upgrade Your Operations',
        badge: 'FREE DEMO',
        headline: 'Run Your Business on Autopilot',
        aspectRatio: '4:5',
        prompt: `Create a compelling call-to-action graphic inviting trade and service business owners to transform their daily admin with ${businessName}. Less paperwork, more revenue. Start today at ${website}.`,
      },
    ];

    return { heroService, secondService, usps, currentOffers, baseline };
  }

  // 4. Cleaning / Janitorial
  if (catLower.includes('clean') || catLower.includes('maid') || catLower.includes('janitorial')) {
    const heroService = hasCustom ? customServices[0] : 'Deep Cleaning & Sanitization';
    const secondService = hasCustom && customServices[1] ? customServices[1] : 'Move-In & Move-Out Cleaning';
    const usps = uspsOverride || 'Vetted professionals, eco-friendly supplies, 100% satisfaction guaranteed';
    const currentOffers = offerOverride || 'First-Time Client Deep Cleaning Special';

    const baseline: PromptSuggestion[] = [
      {
        id: 's_hero',
        category: 'service',
        chipLabel: `✨ ${heroService}`,
        icon: '✨',
        title: heroService,
        badge: 'HERO SERVICE',
        headline: 'Spotless Spaces. Zero Stress.',
        aspectRatio: '4:5',
        prompt: `Create an inviting marketing graphic promoting ${heroService} in ${location}. Highlight: ${usps}. Book at ${website}.`,
      },
      {
        id: 's_offer',
        category: 'offer',
        chipLabel: '🔥 Deep Clean Special Offer',
        icon: '🔥',
        title: 'Deep Clean Special Offer',
        badge: 'SPECIAL OFFER',
        headline: 'Fresh Home, Special Price',
        aspectRatio: '4:5',
        prompt: `Create a promotional post for ${currentOffers} in ${location}. Book your slot at ${website}.`,
      },
      {
        id: 's_review',
        category: 'review',
        chipLabel: '⭐ 5-Star Customer Proof',
        icon: '⭐',
        title: '5-Star Customer Proof',
        badge: 'CLIENT LOVE',
        headline: 'Rated 5 Stars by Clients',
        aspectRatio: '4:5',
        prompt: `Create a trust-building graphic highlighting spotless results and glowing reviews for ${businessName}.`,
      },
      {
        id: 's_ai',
        category: 'ai_assistant',
        chipLabel: '🤖 Schedule Online',
        icon: '🤖',
        title: 'Schedule Online',
        badge: 'EASY BOOKING',
        headline: 'Book Your Clean in Minutes',
        aspectRatio: '4:5',
        prompt: `Promote seamless online booking for cleaning appointments at ${website}.`,
      },
      {
        id: 's_urgency',
        category: 'urgency',
        chipLabel: '⚡ Weekend Slots Open',
        icon: '⚡',
        title: 'Weekend Slots Open',
        badge: 'LIMITED SLOTS',
        headline: 'Weekend Availability Open',
        aspectRatio: '4:5',
        prompt: `Create an urgency graphic announcing open cleaning slots in ${location} this weekend at ${website}.`,
      },
    ];

    return { heroService, secondService, usps, currentOffers, baseline };
  }

  // 5. General / Other Professional Services
  const heroService = hasCustom ? customServices[0] : 'Professional On-Demand Solutions';
  const secondService = hasCustom && customServices[1] ? customServices[1] : 'Scheduled Maintenance & Quality Care';
  const usps = uspsOverride || 'Experienced professionals, fast response, 100% satisfaction guaranteed';
  const currentOffers = offerOverride || 'Limited-time special offer for new clients';

  const baseline: PromptSuggestion[] = [
    {
      id: 's_hero',
      category: 'service',
      chipLabel: `🛠️ ${heroService}`,
      icon: '🛠️',
      title: heroService,
      badge: 'HERO SERVICE',
      headline: `Quality ${heroService}. Done Right.`,
      aspectRatio: '4:5',
      prompt: `Create a professional marketing graphic promoting our ${heroService} in ${location}. Highlight our USPs: ${usps}. Book today at ${website}.`,
    },
    {
      id: 's_offer',
      category: 'offer',
      chipLabel: '🔥 Limited-Time Special Offer',
      icon: '🔥',
      title: 'Limited-Time Special Offer',
      badge: 'SPECIAL OFFER',
      headline: 'Save on Your Next Service',
      aspectRatio: '4:5',
      prompt: `Create a promotional post for our ${currentOffers} on ${heroService} in ${location}. Visit ${website}.`,
    },
    {
      id: 's_review',
      category: 'review',
      chipLabel: '⭐ 5-Star Customer Proof',
      icon: '⭐',
      title: '5-Star Customer Proof',
      badge: 'TOP RATED',
      headline: 'Loved by Local Customers',
      aspectRatio: '4:5',
      prompt: `Create a customer review post highlighting top-rated 5-star feedback, punctual arrival, and spotless quality from ${businessName}.`,
    },
    {
      id: 's_ai',
      category: 'ai_assistant',
      chipLabel: '🤖 Easy Online Booking',
      icon: '🤖',
      title: 'Easy Online Booking',
      badge: 'INSTANT BOOKING',
      headline: 'Fast Booking. Zero Hassle.',
      aspectRatio: '4:5',
      prompt: `Create a modern graphic promoting hassle-free online booking for ${businessName}. Visit ${website}.`,
    },
    {
      id: 's_urgency',
      category: 'urgency',
      chipLabel: '⚡ Priority Slots Available',
      icon: '⚡',
      title: 'Priority Slots Available',
      badge: 'LIMITED SLOTS',
      headline: 'Priority Slots Open This Week',
      aspectRatio: '4:5',
      prompt: `Create an urgency marketing post announcing priority service availability in ${location}. Book at ${website}.`,
    },
  ];

  return { heroService, secondService, usps, currentOffers, baseline };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const profileId = url.searchParams.get('profileId');
    const businessNameOverride = url.searchParams.get('businessName');

    const [tenant, googleAccounts, reviews] = await Promise.all([
      db.tenant.findUnique({
        where: { id: user.tenantId },
        include: { brandProfile: true },
      }),
      db.socialAccount.findMany({
        where: {
          tenantId: user.tenantId,
          platform: 'googlebusiness',
          isActive: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      db.review.findMany({
        where: { tenantId: user.tenantId, rating: { gte: 4 } },
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: { author: true, text: true, rating: true },
      }),
    ]);

    // Match active Google Business Profile
    let activeGbp = googleAccounts[0];
    if (profileId) {
      const match = googleAccounts.find((a) => {
        if (a.id === profileId || a.accountId === profileId) return true;
        try {
          const meta = typeof a.metadata === 'string' ? JSON.parse(a.metadata) : a.metadata;
          return meta?.locationId === profileId;
        } catch {
          return false;
        }
      });
      if (match) activeGbp = match;
    }

    let gbpMeta: Record<string, any> = {};
    if (activeGbp?.metadata) {
      try {
        gbpMeta = typeof activeGbp.metadata === 'string' ? JSON.parse(activeGbp.metadata) : (activeGbp.metadata || {});
      } catch {}
    }

    // Resolve business identity prioritizing active Google Business Profile over stale default registration names
    const businessName =
      (businessNameOverride && businessNameOverride.trim()) ||
      gbpMeta.locationTitle ||
      activeGbp?.accountName ||
      tenant?.brandProfile?.businessName ||
      tenant?.name ||
      'Fieseros';

    const industry =
      gbpMeta.category ||
      tenant?.brandProfile?.industry ||
      tenant?.industry ||
      'Software company';

    const website =
      gbpMeta.website ||
      tenant?.brandProfile?.website ||
      tenant?.website ||
      'https://fieseros.com';

    const location =
      (gbpMeta.address ? gbpMeta.address.split(',').slice(-3).join(',').trim() : null) ||
      tenant?.brandProfile?.location ||
      tenant?.city ||
      'Local area';

    const services = parseJsonArray(tenant?.brandProfile?.services);
    const uspsOverride = tenant?.brandProfile?.usps || undefined;
    const offerOverride = tenant?.brandProfile?.currentOffers || undefined;

    const capabilities = resolveCapabilities(
      businessName,
      industry,
      location,
      website,
      uspsOverride,
      offerOverride,
      services
    );

    const refresh = url.searchParams.get('refresh') === '1';

    if (refresh) {
      try {
        const aiPrompt = `
Generate 5 distinct, high-converting social media marketing prompt suggestions for this business:
Business: ${businessName}
Industry: ${industry}
Location: ${location}
Website: ${website}
Services: ${services.length > 0 ? services.join(', ') : `${capabilities.heroService}, ${capabilities.secondService}`}
USPs: ${capabilities.usps}
Offer: ${capabilities.currentOffers}

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
        // Fall back gracefully to capabilities.baseline
      }
    }

    return NextResponse.json({
      businessName,
      industry,
      website,
      location,
      suggestions: capabilities.baseline.map((b) => normalizeSuggestion(b)),
    });
  } catch (err: unknown) {
    console.error('[/api/social/prompts/suggestions]', err);
    return NextResponse.json(
      { error: 'Failed to load prompt suggestions' },
      { status: 500 }
    );
  }
}
