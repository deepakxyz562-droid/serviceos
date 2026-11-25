import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { ensureOnboardingCategoryPack } from '@/lib/designs/category-image-engine';
import { resolveTenantVisuals } from '@/lib/designs/ai-visual-engine';
import { callAI } from '@/lib/ai-client';

export const dynamic = 'force-dynamic';

interface GeneratedPostItem {
  id: string;
  badge: 'Standard Post' | 'Special Offer' | 'Seasonal Event';
  postType: 'STANDARD' | 'OFFER' | 'EVENT';
  title: string;
  intro: string;
  bullets: string[];
  conclusion: string;
  hashtags: string[];
  ctaText: 'CALL' | 'BOOK ONLINE' | 'GET OFFER' | 'ORDER' | 'LEARN MORE';
  phone: string;
  website: string;
  imageUrl: string;
  content: string;
  logoUrl?: string;
  businessName?: string;
}

function cleanHash(str: string): string {
  return str.replace(/[^a-zA-Z0-9]/g, '');
}

function generate20PostsForBusiness(params: {
  businessName: string;
  category: string;
  city: string;
  phone: string;
  website: string;
  photos: string[];
  services?: string[];
  logoUrl?: string | null;
  seed?: number;
}): GeneratedPostItem[] {
  const { businessName, category, city, phone, website, photos, services = [], logoUrl, seed = 0 } = params;
  const fallbackLogo = logoUrl && /^(https?:\/\/|\/)/i.test(logoUrl) ? logoUrl : '';
  const baseImages = photos.length > 0 ? photos : fallbackLogo ? [fallbackLogo] : [];
  // Rotate images if seed is provided for fresh look on refresh
  const imgShift = seed && baseImages.length > 0 ? Math.abs(seed) % baseImages.length : 0;
  const allImages =
    baseImages.length > 0
      ? [...baseImages.slice(imgShift), ...baseImages.slice(0, imgShift)]
      : [];

  const cityToken = city || 'your local area';
  const bizClean = cleanHash(businessName);
  const catClean = cleanHash(category || 'Services');
  const cityClean = cleanHash(city || 'Local');
  const primaryService = services[0] || category;

  // Dynamic, business-agnostic blueprints customized from real GBP category & services
  const postBlueprints = [
    {
      theme: 'Primary Local SEO Hero Service',
      badge: 'Standard Post' as const,
      postType: 'STANDARD' as const,
      ctaText: 'CALL' as const,
      titleFactory: () => `Premier ${category} & ${primaryService} in ${cityToken} | ${businessName}`,
      introFactory: () =>
        `Looking for dependable ${category} solutions in ${cityToken}? ${businessName} delivers ${services.slice(0, 3).join(', ') || category} with dedicated attention to detail, transparent pricing, and trusted local care.`,
      bulletFactory: () => [
        `Experienced professionals delivering top-quality ${primaryService} in ${cityToken}`,
        'Transparent quotes with clear scope and zero hidden surprises',
        'Modern workflow and industry-approved standards for dependable results',
        'Prompt scheduling and responsive client communication',
        `Dedicated local team serving customers across ${cityToken}`,
      ],
      conclusionFactory: () =>
        `Experience trusted ${category} in ${cityToken} with ${businessName}. Contact our team today to discuss your requirements.`,
      tagFactory: () => [
        `#${bizClean}`,
        `#${cityClean}${catClean}`,
        `#${catClean}`,
        `#LocalExperts`,
        `#GoogleVerified`,
      ],
    },
    {
      theme: 'Weekend & Seasonal Spotlight',
      badge: 'Special Offer' as const,
      postType: 'OFFER' as const,
      ctaText: 'GET OFFER' as const,
      titleFactory: () => `Featured ${primaryService} Consultation & Service Window at ${businessName}`,
      introFactory: () =>
        `Planning ahead in ${cityToken}? Book your ${primaryService} consultation with ${businessName} for priority scheduling and tailored recommendations.`,
      bulletFactory: () => [
        `Priority booking slots available for ${category} requirements`,
        'Tailored assessment matched to your exact needs and timeline',
        'Dedicated specialists supporting you from kickoff to completion',
        'Verified local standards and clear milestone tracking',
      ],
      conclusionFactory: () =>
        `Connect with ${businessName} in ${cityToken} today to reserve your preferred slot and learn more about our ${category} offerings.`,
      tagFactory: () => [
        `#${bizClean}`,
        `#${cityClean}`,
        `#${catClean}`,
        `#LocalBusiness`,
        `#BookNow`,
      ],
    },
    {
      theme: 'Quality & Trust Assurance',
      badge: 'Standard Post' as const,
      postType: 'STANDARD' as const,
      ctaText: 'CALL' as const,
      titleFactory: () => `Why Clients in ${cityToken} Trust ${businessName} for ${category}`,
      introFactory: () =>
        `When choosing a ${category} provider in ${cityToken}, reliability and consistent standards matter. Discover how ${businessName} upholds quality on every engagement.`,
      bulletFactory: () => [
        `Verified local track record across ${services.slice(0, 2).join(' and ') || category}`,
        'Standardized quality checklists and transparent communication',
        'Skilled specialists following documented safety & quality practices',
        `Accessible support team right here in ${cityToken}`,
      ],
      conclusionFactory: () =>
        `Choose uncompromising standards for your next project. Reach out to ${businessName} in ${cityToken} to get started.`,
      tagFactory: () => [
        `#${bizClean}`,
        `#QualityFirst`,
        `#${cityClean}${catClean}`,
        `#CustomerTrust`,
      ],
    },
    {
      theme: 'Seasonal Showcase & Highlights',
      badge: 'Seasonal Event' as const,
      postType: 'EVENT' as const,
      ctaText: 'LEARN MORE' as const,
      titleFactory: () => `${category} Seasonal Highlight & Showcase with ${businessName}`,
      introFactory: () =>
        `Updating your plans this season in ${cityToken}? ${businessName} helps local clients get the most out of our core ${category} capabilities.`,
      bulletFactory: () => [
        `Focused solutions covering ${services.slice(0, 3).join(', ') || category}`,
        'Smooth onboarding and clear deliverables',
        'Responsive support for both new and returning local clients',
        'Convenient digital inquiry & fast callback response',
      ],
      conclusionFactory: () =>
        `Let ${businessName} support your upcoming goals in ${cityToken}. Message or call us today for details.`,
      tagFactory: () => [
        `#${bizClean}`,
        `#${cityClean}`,
        `#${catClean}Showcase`,
        `#LocalSupport`,
      ],
    },
    {
      theme: 'Expert Advice & Local Insights',
      badge: 'Standard Post' as const,
      postType: 'STANDARD' as const,
      ctaText: 'CALL' as const,
      titleFactory: () => `Expert ${category} Insights for ${cityToken} Clients | ${businessName}`,
      introFactory: () =>
        `Making the right decision for ${primaryService} doesn't have to be complicated. Here is how our specialists at ${businessName} help ${cityToken} clients plan effectively.`,
      bulletFactory: () => [
        `Key considerations before choosing ${primaryService}`,
        'How proactive planning saves time and avoids costly rework',
        'Direct guidance from our experienced specialists',
      ],
      conclusionFactory: () =>
        `Have questions about ${category}? Reach out to ${businessName} in ${cityToken} for clear, practical guidance.`,
      tagFactory: () => [
        `#${bizClean}`,
        `#${cityClean}`,
        `#${catClean}Tips`,
        `#TrustedLocal`,
      ],
    },
  ];

  const generatedPosts: GeneratedPostItem[] = [];
  const blueprintOffset = seed ? Math.abs(seed) % postBlueprints.length : 0;

  for (let i = 0; i < 20; i++) {
    const blueprintIdx = (i + blueprintOffset) % postBlueprints.length;
    const blueprint = postBlueprints[blueprintIdx];
    const image = allImages.length > 0 ? allImages[i % allImages.length] : '';
    const title = i < postBlueprints.length ? blueprint.titleFactory() : `${blueprint.titleFactory()} — Feature Edition #${i + 1}`;
    const intro = blueprint.introFactory();
    const bullets = blueprint.bulletFactory();
    const conclusion = blueprint.conclusionFactory();
    const hashtags = blueprint.tagFactory();
    const ctaText = blueprint.ctaText;

    const formattedBullets = bullets.map((b) => `✓ ${b}`).join('\n');
    const tagsString = hashtags.join(' ');
    const fullContent = `${title}\n\n${intro}\n\n${formattedBullets}\n\n${conclusion}\n\nCTA: ${ctaText}\nPhone: ${phone}\n\n${tagsString}`;

    generatedPosts.push({
      id: `ai_post_${i + 1}`,
      badge: blueprint.badge,
      postType: blueprint.postType,
      title,
      intro,
      bullets,
      conclusion,
      hashtags,
      ctaText,
      phone,
      website,
      imageUrl: image,
      content: fullContent,
      logoUrl: logoUrl || undefined,
      businessName,
    });
  }

  return generatedPosts;
}

function parseServicesList(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((s) => (typeof s === 'string' ? s : String((s as any)?.name || ''))).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parseServicesList(parsed);
    } catch {}
    return raw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

async function generateFreshAiOverlayPosts(params: {
  tenantId: string;
  businessName: string;
  category: string;
  city: string;
  phone: string;
  website: string;
  services: string[];
  logoUrl?: string | null;
  images: string[];
  seed: number;
}): Promise<GeneratedPostItem[] | null> {
  try {
    const svcText = params.services.length > 0 ? params.services.slice(0, 6).join(', ') : params.category;
    const prompt = `Generate 6 concise, high-converting Google Business Profile posts for "${params.businessName}" (${params.category}) in ${params.city}.
Core offerings: ${svcText}. Contact phone: ${params.phone}. Seed variation: ${params.seed}.
Mix post types across STANDARD, OFFER, and EVENT.
Return STRICT JSON: {"posts":[{"postType":"STANDARD|OFFER|EVENT","title":"<=65 chars catchy headline","intro":"2 concise sentences mentioning ${params.city} and specific offerings","bullets":["3 short value points"],"ctaText":"CALL|BOOK ONLINE|GET OFFER|LEARN MORE","hashtags":["#LocalTag1","#LocalTag2","#LocalTag3"]}]}`;

    const aiRes = await callAI({
      messages: [
        { role: 'system', content: 'You are a local Google Business Profile marketing copywriter. Return valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.85,
      maxTokens: 1600,
      json: true,
      timeoutMs: 6500,
      usageContext: { tenantId: params.tenantId, feature: 'ai_posts_refresh' },
    });

    const rawText = (aiRes?.content || '').trim();
    if (!rawText) return null;
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleaned) as { posts?: Array<Record<string, any>> };
    const list = Array.isArray(parsed?.posts) ? parsed.posts : [];
    if (list.length === 0) return null;

    const bizClean = cleanHash(params.businessName || 'LocalBiz');
    const cityClean = cleanHash(params.city || 'Local');

    return list.slice(0, 8).map((item, idx): GeneratedPostItem => {
      const rawType = String(item.postType || 'STANDARD').toUpperCase();
      const postType: 'STANDARD' | 'OFFER' | 'EVENT' =
        rawType === 'OFFER' || rawType === 'EVENT' ? rawType : 'STANDARD';
      const badge: 'Standard Post' | 'Special Offer' | 'Seasonal Event' =
        postType === 'OFFER' ? 'Special Offer' : postType === 'EVENT' ? 'Seasonal Event' : 'Standard Post';
      const title = String(item.title || `${params.businessName} in ${params.city}`).trim().slice(0, 110);
      const intro = String(item.intro || `Trusted ${params.category} serving ${params.city}.`).trim();
      const bullets = Array.isArray(item.bullets) && item.bullets.length > 0
        ? item.bullets.map((b: unknown) => String(b || '').trim()).filter(Boolean).slice(0, 4)
        : [`Trusted local specialists in ${params.city}`, `Quick response via ${params.phone}`];
      const rawCta = String(item.ctaText || 'CALL').toUpperCase();
      const ctaText: GeneratedPostItem['ctaText'] =
        rawCta === 'BOOK ONLINE' || rawCta === 'GET OFFER' || rawCta === 'ORDER' || rawCta === 'LEARN MORE'
          ? rawCta
          : 'CALL';
      const hashtags = Array.isArray(item.hashtags) && item.hashtags.length > 0
        ? item.hashtags.map((h: unknown) => (String(h).startsWith('#') ? String(h) : `#${String(h)}`)).slice(0, 5)
        : [`#${bizClean}`, `#${cityClean}`, '#LocalExperts'];
      const conclusion = `Call ${params.businessName} at ${params.phone} or visit us in ${params.city} today.`;
      const formattedBullets = bullets.map((b) => `✓ ${b}`).join('\n');
      const fullContent = `${title}\n\n${intro}\n\n${formattedBullets}\n\n${conclusion}\n\nCTA: ${ctaText}\nPhone: ${params.phone}\n\n${hashtags.join(' ')}`;

      return {
        id: `ai_live_${params.seed}_${idx + 1}`,
        badge,
        postType,
        title,
        intro,
        bullets,
        conclusion,
        hashtags,
        ctaText,
        phone: params.phone,
        website: params.website,
        imageUrl: params.images[idx % params.images.length],
        content: fullContent,
        logoUrl: params.logoUrl || undefined,
        businessName: params.businessName,
      };
    });
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const seedParam = request.nextUrl.searchParams.get('seed');
    const refreshParam = request.nextUrl.searchParams.get('refresh');
    const parsedSeed = seedParam ? parseInt(seedParam, 10) : NaN;
    const seed = Number.isFinite(parsedSeed) && parsedSeed > 0
      ? parsedSeed
      : refreshParam
        ? Math.floor(1 + Math.random() * 999999)
        : 0;

    const [brandProfile, tenant, googleAccount, brandKit, serviceRows] = await Promise.all([
      db.brandProfile.findUnique({ where: { tenantId: user.tenantId } }).catch(() => null),
      db.tenant.findUnique({
        where: { id: user.tenantId },
        select: { name: true, industry: true, city: true, phone: true, website: true, logo: true },
      }).catch(() => null),
      prepareGoogleAccount(user.tenantId).catch(() => null),
      db.brandKit.findUnique({ where: { tenantId: user.tenantId } }).catch(() => null),
      typeof (db as any).service?.findMany === 'function'
        ? (db as any).service.findMany({
            where: { tenantId: user.tenantId },
            select: { name: true },
            take: 10,
          }).catch(() => [])
        : Promise.resolve([]),
    ]);

    const resolvedLogoUrl =
      (brandProfile as any)?.logoUrl ||
      (brandProfile as any)?.brandDetails?.logoUrl ||
      brandKit?.logoUrl ||
      tenant?.logo ||
      null;

    const businessName =
      brandProfile?.businessName || tenant?.name || 'Local Business';
    const category =
      brandProfile?.industry || tenant?.industry || 'Services';
    const city =
      brandProfile?.location || tenant?.city || 'Delhi';
    const phone = tenant?.phone || '+91 98765 43210';
    const website =
      brandProfile?.website || tenant?.website || 'https://google.com';
    const services = Array.from(
      new Set([
        ...parseServicesList((brandProfile as any)?.services),
        ...((Array.isArray(serviceRows) ? serviceRows : []).map((s: any) => String(s?.name || '').trim()).filter(Boolean)),
      ]),
    );

    // Resolve authentic visuals via shared AI Visual Engine: GBP Photos First -> Uploaded -> Cached AI -> Dynamic S3
    const resolvedVisuals = await resolveTenantVisuals({
      tenantId: user.tenantId,
      industry: category,
      businessName,
      city,
      limit: 24,
      forceRefreshGbp: Boolean(refreshParam),
    });
    const ownedVisuals = resolvedVisuals.filter((v) => v.source !== 'stock_library');
    const s3StockVisuals = resolvedVisuals.filter((v) => v.source === 'stock_library');
    if (s3StockVisuals.length < 5 && ownedVisuals.length === 0) {
      // Non-blocking warm-up so UI never stalls
      void ensureOnboardingCategoryPack({
        category,
        businessName,
        city,
        services,
        targetCount: 5,
      }).catch(() => {});
    }
    const combinedPhotos = (ownedVisuals.length > 0 ? ownedVisuals : resolvedVisuals).map((v) => v.url);

    const basePosts = generate20PostsForBusiness({
      businessName,
      category,
      city,
      phone,
      website,
      photos: combinedPhotos,
      services,
      logoUrl: resolvedLogoUrl,
      seed,
    });

    let posts = basePosts;
    let aiPowered = false;
    if (refreshParam) {
      const liveAiPosts = await generateFreshAiOverlayPosts({
        tenantId: user.tenantId,
        businessName,
        category,
        city,
        phone,
        website,
        services,
        logoUrl: resolvedLogoUrl,
        images: basePosts.map((p) => p.imageUrl),
        seed,
      });
      if (liveAiPosts && liveAiPosts.length > 0) {
        aiPowered = true;
        posts = [...liveAiPosts, ...basePosts.slice(0, Math.max(0, 20 - liveAiPosts.length))];
      }
    }

    return NextResponse.json({
      success: true,
      seed,
      aiPowered,
      business: {
        name: businessName,
        category,
        city,
        phone,
        website,
        logoUrl: resolvedLogoUrl,
        primaryColor: brandKit?.primaryColor || '#009F50',
        accentColor: brandKit?.accentColor || (brandKit as any)?.secondaryColor || '#0F172A',
        services,
      },
      count: posts.length,
      posts,
    });
  } catch (error: unknown) {
    console.error('[api/social/ai-posts] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate posts' },
      { status: 500 }
    );
  }
}
