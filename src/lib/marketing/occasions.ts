import { callAI } from '@/lib/ai-client';
import { generateDesignImage } from '@/lib/designs/image-provider';
import { saveDesignAsset } from '@/lib/designs/assets';

export interface MarketingOccasion {
  id: string;
  title: string;
  tagline: string;
  seasonOrDate: string;
  category: 'festival' | 'seasonal' | 'recurring' | 'holiday';
  targetAudience: 'past_customers' | 'inactive_60_days' | 'all_leads';
  suggestedDiscount: string;
  defaultPrompt: string;
  suggestedCta: string;
  relevantIndustries?: string[];
}

export const ANNUAL_OCCASIONS: MarketingOccasion[] = [
  {
    id: 'diwali-festive-prep',
    title: 'Diwali Festive Glow & Home Prep',
    tagline: 'Get your home, salon, and vehicle festive-ready before the rush!',
    seasonOrDate: 'October / November',
    category: 'festival',
    targetAudience: 'past_customers',
    suggestedDiscount: '20% OFF or Free Inspection',
    defaultPrompt: 'Festive Diwali special advertisement banner, warm golden diya lights, elegant modern celebration, sparkling clean setting, professional quality photography, 4k detail.',
    suggestedCta: 'Book Festive Slot on WhatsApp',
  },
  {
    id: 'new-year-fresh-start',
    title: 'New Year Fresh Start Special',
    tagline: 'Start the new year right with priority service and early bird discounts.',
    seasonOrDate: 'December / January',
    category: 'holiday',
    targetAudience: 'all_leads',
    suggestedDiscount: 'New Year 15% OFF Package',
    defaultPrompt: 'New year celebratory flyer, elegant gold and midnight blue aesthetic, confetti, fresh clean workspace, premium commercial photography, sharp contrast.',
    suggestedCta: 'Claim New Year Offer',
  },
  {
    id: 'summer-cooling-ac-care',
    title: 'Summer Peak AC & Cooling Prep',
    tagline: 'Beat the scorching heat! Complete AC cleaning, gas top-up, and filter care.',
    seasonOrDate: 'March – June',
    category: 'seasonal',
    targetAudience: 'inactive_60_days',
    suggestedDiscount: 'AC Tune-up Package at 25% OFF',
    defaultPrompt: 'Clean modern air conditioner blowing cool frosty air in a bright contemporary living room, refreshing cool mist, architectural photography, crisp lighting.',
    suggestedCta: 'Book AC Checkup on WhatsApp',
    relevantIndustries: ['HVAC', 'Appliance repair', 'Electrician', 'Home services'],
  },
  {
    id: 'monsoon-waterproofing-roof',
    title: 'Pre-Monsoon Leak & Waterproofing Shield',
    tagline: 'Stop dampness, wall seepage, and roof leaks before heavy rains arrive.',
    seasonOrDate: 'May – July',
    category: 'seasonal',
    targetAudience: 'past_customers',
    suggestedDiscount: 'Complimentary Roof & Leak Diagnostic',
    defaultPrompt: 'Modern waterproof residential building exterior with rain protection, spotless rooftop, professional construction quality, soft overcast daylight.',
    suggestedCta: 'Get Free Leak Diagnostic',
    relevantIndustries: ['Plumbing', 'Roofing', 'Waterproofing', 'Construction', 'Painting'],
  },
  {
    id: 'winter-heating-geyser-safety',
    title: 'Winter Geyser & Heating Comfort Service',
    tagline: 'Enjoy instant hot water and reliable warmth all winter long.',
    seasonOrDate: 'October – January',
    category: 'seasonal',
    targetAudience: 'past_customers',
    suggestedDiscount: 'Winter Safety Check + 15% Savings',
    defaultPrompt: 'Cozy modern home interior with warm radiant heating and luxury bathroom fixtures, steam, warm ambient lighting, elegant lifestyle photography.',
    suggestedCta: 'Schedule Winter Service',
    relevantIndustries: ['Heating', 'Plumbing', 'HVAC', 'Electrical'],
  },
  {
    id: 'weekend-glow-salon-pamper',
    title: 'Weekend Rejuvenation & Pamper Deal',
    tagline: 'Unwind and look your best with our top-rated weekend packages.',
    seasonOrDate: 'Recurring Every Weekend',
    category: 'recurring',
    targetAudience: 'past_customers',
    suggestedDiscount: 'Weekend Spa/Grooming Combo',
    defaultPrompt: 'Luxury wellness spa and salon setting, warm towels, soft botanical ambiance, serene aesthetic, high-end magazine editorial photography.',
    suggestedCta: 'Reserve Weekend Slot',
    relevantIndustries: ['Salon', 'Spa', 'Dentist', 'Clinic', 'Wellness', 'Physiotherapy'],
  },
  {
    id: 'we-miss-you-re-engagement',
    title: 'We Miss You! Priority Return Perks',
    tagline: 'It has been a while! Come back for priority booking and a special return discount.',
    seasonOrDate: 'Year-Round Automated Retention',
    category: 'recurring',
    targetAudience: 'inactive_60_days',
    suggestedDiscount: 'Exclusive Return Customer ₹500 / $25 Credit',
    defaultPrompt: 'Welcoming modern local storefront with smiling friendly technicians or staff, warm morning sunshine, pristine work standards, candid commercial photography.',
    suggestedCta: 'Claim Return Credit on WhatsApp',
  },
];

export function getUpcomingOccasions(currentDate = new Date()): MarketingOccasion[] {
  const currentMonth = currentDate.getMonth() + 1; // 1-12

  // Return sorted with the most seasonally urgent occasions first
  return [...ANNUAL_OCCASIONS].sort((a, b) => {
    if (currentMonth >= 3 && currentMonth <= 6 && a.id.includes('summer')) return -1;
    if (currentMonth >= 5 && currentMonth <= 8 && a.id.includes('monsoon')) return -1;
    if (currentMonth >= 9 && currentMonth <= 11 && a.id.includes('diwali')) return -1;
    if ((currentMonth === 12 || currentMonth === 1) && a.id.includes('new-year')) return -1;
    return 0;
  });
}

export async function generateOccasionCampaignDraft(params: {
  tenantId: string;
  occasionId: string;
  businessName: string;
  industry: string;
  city: string;
  actorId?: string;
  generateImage?: boolean;
}): Promise<{
  occasion: MarketingOccasion;
  campaignTitle: string;
  whatsappMessage: string;
  emailSubject: string;
  emailHtml: string;
  posterPrompt: string;
  posterUrl?: string | null;
  targetAudience: string;
}> {
  const occasion = ANNUAL_OCCASIONS.find((o) => o.id === params.occasionId) || ANNUAL_OCCASIONS[0];

  const prompt = `You are an elite WhatsApp and direct-response marketing copywriter.
Create a high-converting promotional campaign for:
Business: "${params.businessName}" (${params.industry} in ${params.city})
Occasion Theme: "${occasion.title}" - ${occasion.tagline}
Offer / Angle: ${occasion.suggestedDiscount}
Call to Action: "${occasion.suggestedCta}"

Requirements:
1. WhatsApp Message: 2-3 short, punchy paragraphs with friendly emojis. Include a greeting like "Hi {FirstName}!", state the seasonal occasion, mention the exclusive offer, and ask a direct low-friction question (e.g. "Would you like us to reserve a priority slot for you this week?").
2. Email Subject: Catchy, curiosity-inducing subject line under 60 characters.
3. Poster Prompt: A clean, commercial advertising photography prompt for Cloudflare Flux-1 graphic generation.

Output strictly valid JSON with keys:
{
  "campaignTitle": string,
  "whatsappMessage": string,
  "emailSubject": string,
  "emailHtml": string,
  "posterPrompt": string
}`;

  let draftResult: any = {};
  try {
    const aiRes = await callAI({
      messages: [
        { role: 'system', content: 'You output strictly valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      usageContext: {
        tenantId: params.tenantId,
        feature: 'marketing_occasion_generator',
      },
    });

    const raw = typeof aiRes === 'string' ? aiRes : (aiRes as any)?.content || (aiRes as any)?.text || '{}';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      draftResult = JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    console.warn('[occasions] AI generation fallback:', err);
  }

  const campaignTitle = draftResult.campaignTitle || `${occasion.title} - Special Offer`;
  const whatsappMessage =
    draftResult.whatsappMessage ||
    `Hi {FirstName}! 👋\n\nStill planning your next visit to ${params.businessName}? With ${occasion.title} coming up, we're giving our top clients an exclusive ${occasion.suggestedDiscount}.\n\nReply directly to this chat and our AI assistant will reserve your preferred time slot instantly! 🌟`;

  const emailSubject = draftResult.emailSubject || `${occasion.title}: Special Offer from ${params.businessName}`;
  const posterPrompt = draftResult.posterPrompt || occasion.defaultPrompt;

  let posterUrl: string | null = null;
  if (params.generateImage) {
    try {
      const generated = await generateDesignImage(
        posterPrompt,
        'cloudflare',
        AbortSignal.timeout(60000),
        true,
      );
      if (generated?.bytes) {
        const saved = await saveDesignAsset(generated.bytes, params.tenantId, params.actorId || 'system');
        if (saved?.url) {
          posterUrl = saved.url;
        }
      }
    } catch (imgErr) {
      console.warn('[occasions] Poster image generation fallback:', imgErr);
    }
  }

  return {
    occasion,
    campaignTitle,
    whatsappMessage,
    emailSubject,
    emailHtml: draftResult.emailHtml || `<p>${whatsappMessage.replace(/\n/g, '<br/>')}</p>`,
    posterPrompt,
    posterUrl,
    targetAudience: occasion.targetAudience,
  };
}
