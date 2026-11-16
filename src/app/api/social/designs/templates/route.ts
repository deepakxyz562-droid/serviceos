import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getProductAppUrl } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  BUSINESS_EDITIONS,
  BUSINESS_GROUPS,
  templateMatches,
  type Purpose,
} from '../../../../../../shared/business-template-collection';
import { composeBusinessEdition } from '../../../../../../shared/business-template-design';
import {
  scoreIndustryMatch,
  getCategoryVisualPool,
  CURATED_SMB_IMAGE_REGISTRY,
} from '@/lib/designs/dynamic-visual-resolver';
import { normalizeCategoryContext } from '@/lib/designs/category-taxonomy';
import { generateCategoryBlueprints, getGbpCategoryByNameOrAlias } from '@/lib/gbp/master-category-catalog';
import { POSTER_TEMPLATES, type PosterTemplate } from '../../../../../../shared/poster-templates';
import {
  getCuratedTemplatesForBusiness,
  TEMPLATE_BUCKETS,
  type CuratedTemplateItem,
} from '../../../../../../shared/curated-photo-templates';

const FESTIVAL_VISUAL_POOL: Record<string, string[]> = {
  diwali: [
    '/images/bgos/templates/diwali.webp',
    'https://images.unsplash.com/photo-1572798089532-487718bc9d26?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1634401609694-f6ac6dd8474b?w=1200&auto=format&fit=crop&q=80',
  ],
  holi: [
    '/images/bgos/templates/edition-holi.webp',
    'https://images.unsplash.com/photo-1503127241807-fdc42d3acb95?w=1200&auto=format&fit=crop&q=80',
  ],
  eid: [
    '/images/bgos/templates/edition-eid.webp',
    'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=1200&auto=format&fit=crop&q=80',
  ],
  christmas: [
    '/images/bgos/templates/edition-christmas.webp',
    'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=1200&auto=format&fit=crop&q=80',
  ],
  new_year: [
    '/images/bgos/templates/edition-new-year.webp',
    'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=1200&auto=format&fit=crop&q=80',
  ],
  independence_day: [
    '/images/bgos/templates/edition-independence-day.webp',
    'https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=1200&auto=format&fit=crop&q=80',
  ],
  republic_day: [
    '/images/bgos/templates/edition-republic-day.webp',
    'https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=1200&auto=format&fit=crop&q=80',
  ],
  rakhi: [
    '/images/bgos/templates/edition-rakhi.webp',
    '/images/bgos/templates/diwali.webp',
  ],
  navratri: [
    '/images/bgos/templates/edition-navratri.webp',
    'https://images.unsplash.com/photo-1572798089532-487718bc9d26?w=1200&auto=format&fit=crop&q=80',
  ],
  dussehra: [
    '/images/bgos/templates/edition-navratri.webp',
    '/images/bgos/templates/diwali.webp',
  ],
  chhath_puja: [
    '/images/bgos/templates/diwali.webp',
    'https://images.unsplash.com/photo-1572798089532-487718bc9d26?w=1200&auto=format&fit=crop&q=80',
  ],
  valentine: [
    '/images/bgos/templates/edition-valentine.webp',
    'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=1200&auto=format&fit=crop&q=80',
  ],
  mothers_day: [
    '/images/bgos/templates/edition-mothers-day.webp',
  ],
  fathers_day: [
    '/images/bgos/templates/edition-fathers-day.webp',
  ],
};

interface BusinessTemplateResponseItem {
  id: string;
  layout: string;
  name: string;
  headline: string;
  subtitle: string;
  badge: string;
  cta: string;
  tab: 'for_business' | 'promotions' | 'festivals' | 'reviews';
  purpose: Purpose;
  theme: string;
  aspectRatio: '1:1' | '4:5' | '9:16';
  photoUrl: string;
  bgPrompt?: string;
  occasionId?: string;
  design?: any;
  defaultBullets?: string[];
  targetKeywords?: Array<{ keyword: string; volume: number }>;
  estimatedViews?: number;
  defaultCaption?: string;
}

function mapPurposeToTab(purpose?: Purpose): 'for_business' | 'promotions' | 'festivals' | 'reviews' {
  if (purpose === 'Promotion') return 'promotions';
  if (purpose === 'Festival') return 'festivals';
  if (purpose === 'Trust-building') return 'reviews';
  return 'for_business';
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedTab = searchParams.get('tab') || 'all'; // 'for_business' | 'promotions' | 'festivals' | 'reviews' | 'all'
  const requestedAspect = searchParams.get('aspect'); // '1:1' | '4:5' | '9:16'
  const searchQuery = searchParams.get('q') || '';
  const limit = Math.min(300, Math.max(8, parseInt(searchParams.get('limit') || '150', 10)));
  const includeDesign = searchParams.get('includeDesign') !== '0';

  // 1. Fetch tenant business context
  const [tenant, brandProfile] = await Promise.all([
    db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true, industry: true, phone: true, address: true, city: true, settingsJson: true },
    }).catch(() => null),
    db.brandProfile.findUnique({
      where: { id: user.tenantId },
    }).catch(() => null),
  ]);

  let businessName = brandProfile?.businessName || tenant?.name || 'My Business';
  let industry = brandProfile?.industry || tenant?.industry || 'Retail & Local Services';
  let phone = tenant?.phone || '';
  let website = brandProfile?.website || '';
  let logoUrl = (brandProfile as any)?.logoUrl || '';
  let address = tenant?.address || '';
  let city = (tenant as any)?.city || brandProfile?.location || 'Patna';

  const baseUrl = getProductAppUrl(request, 'bgos');
  const toAbsoluteUrl = (path?: string | null): string => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  };

  if (logoUrl) logoUrl = toAbsoluteUrl(logoUrl);

  // Parse GBP / Brand Brain overrides from settingsJson if available
  if (tenant?.settingsJson) {
    try {
      const parsed = JSON.parse(tenant.settingsJson);
      if (parsed?.activeGbpTitle) businessName = parsed.activeGbpTitle;
      if (parsed?.activeGbpCategory && !/corporate|holding|community/i.test(parsed.activeGbpCategory)) {
        industry = parsed.activeGbpCategory;
      }
      if (parsed?.activeGbpPhone) phone = parsed.activeGbpPhone;
      if (parsed?.activeGbpAddress) address = parsed.activeGbpAddress;
      if (parsed?.activeGbpCity) city = parsed.activeGbpCity;
    } catch {}
  }

  // 2. Identify industry matcher & visual pool with Universal Category Taxonomy
  const searchContext = normalizeCategoryContext(searchQuery || `${industry} ${businessName}`);
  const effectiveCategoryText = searchQuery.trim()
    ? `${searchQuery} ${industry} ${businessName}`
    : `${industry} ${businessName}`;

  const matchedIndustryKey = scoreIndustryMatch(effectiveCategoryText);
  const visuals = getCategoryVisualPool(effectiveCategoryText);
  const fallbackUnsplashPhotos =
    CURATED_SMB_IMAGE_REGISTRY[matchedIndustryKey] || CURATED_SMB_IMAGE_REGISTRY.generic_business;

  // Find business group in BUSINESS_GROUPS with word boundaries
  const groupNames = Object.keys(BUSINESS_GROUPS) as (keyof typeof BUSINESS_GROUPS)[];
  let matchedGroup: string = groupNames[0];
  for (const group of groupNames) {
    const pattern = BUSINESS_GROUPS[group]
      .split('|')
      .map((w) => w.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .filter(Boolean)
      .join('|');
    const rx = new RegExp(`\\b(${pattern})\\b`, 'i');
    if (rx.test(effectiveCategoryText)) {
      matchedGroup = group;
      break;
    }
  }

  // 3. Trade products & conflict adaptation engine
  const gbpCat = getGbpCategoryByNameOrAlias(effectiveCategoryText);
  const tradeProducts =
    gbpCat?.coreProducts && gbpCat.coreProducts.length > 0 ? gbpCat.coreProducts : [industry];

  const isMerchantTrade = (word: string): boolean => {
    return new RegExp(`\\b(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'i').test(
      effectiveCategoryText,
    );
  };

  const conflictingTradesRegex =
    /\b(car wash|auto garage|bike repair|tyre shop|plumbing|plumber|electrician|ac repair|pest control|carpenter|plywood|timber|dentist|dental|teeth whitening|root canal|salon|haircut|hair spa|facial|manicure|sweet shop|mithai|halwai|software company|app development)\b/i;

  // 4. Adapt POSTER_TEMPLATES (270+ templates) with strict merchant trade relevance
  const allAdaptedPosterItems: BusinessTemplateResponseItem[] = POSTER_TEMPLATES.map((tpl, idx) => {
    const isFestival =
      tpl.category === 'festival' ||
      tpl.edition?.purpose === 'Festival' ||
      Boolean(tpl.occasionId) ||
      tpl.badge?.toLowerCase().includes('festival') ||
      /diwali|holi|eid|christmas|new year|independence|republic|rakhi|navratri|dussehra|chhath|valentine/i.test(
        tpl.headline || '',
      );

    let tab: 'for_business' | 'promotions' | 'festivals' | 'reviews' = 'for_business';
    let purpose: Purpose = 'Business profile';

    if (isFestival) {
      tab = 'festivals';
      purpose = 'Festival';
    } else if (tpl.category === 'sale_offer' || tpl.edition?.purpose === 'Promotion') {
      tab = 'promotions';
      purpose = 'Promotion';
    } else if (
      tpl.category === 'testimonial' ||
      tpl.category === 'quote' ||
      tpl.edition?.purpose === 'Trust-building'
    ) {
      tab = 'reviews';
      purpose = 'Trust-building';
    } else {
      tab = 'for_business';
      purpose = tpl.edition?.purpose || 'Business profile';
    }

    let headline = (tpl.headline || tpl.name)
      .replace(/\{businessName\}/g, businessName)
      .replace(/\{city\}/g, city);
    let subtitle = (tpl.subtitle || '')
      .replace(/\{businessName\}/g, businessName)
      .replace(/\{city\}/g, city);

    if (!isFestival) {
      const match = headline.match(conflictingTradesRegex);
      if (match && !isMerchantTrade(match[0])) {
        headline = tradeProducts[idx % tradeProducts.length];
      }
      const subMatch = subtitle.match(conflictingTradesRegex);
      if (subMatch && !isMerchantTrade(subMatch[0])) {
        subtitle = `Certified ${industry} services in ${city}`;
      }
    }

    let assignedPhoto = tpl.photo;
    if (isFestival) {
      if (tpl.photo && tpl.photo.startsWith('/images/bgos/templates/')) {
        assignedPhoto = tpl.photo;
      } else {
        const textToInspect = `${tpl.occasionId || ''} ${headline} ${tpl.name || ''}`.toLowerCase();
        let occasion = 'diwali';
        if (/holi|gulal/i.test(textToInspect)) occasion = 'holi';
        else if (/eid/i.test(textToInspect)) occasion = 'eid';
        else if (/christmas/i.test(textToInspect)) occasion = 'christmas';
        else if (/new year|nye/i.test(textToInspect)) occasion = 'new_year';
        else if (/independence/i.test(textToInspect)) occasion = 'independence_day';
        else if (/republic/i.test(textToInspect)) occasion = 'republic_day';
        else if (/rakhi/i.test(textToInspect)) occasion = 'rakhi';
        else if (/navratri|durga/i.test(textToInspect)) occasion = 'navratri';
        else if (/dussehra/i.test(textToInspect)) occasion = 'dussehra';
        else if (/chhath/i.test(textToInspect)) occasion = 'chhath_puja';
        else if (searchContext.isFestival && searchContext.detectedOccasion) {
          occasion = searchContext.detectedOccasion;
        }

        const festivalPhotos = FESTIVAL_VISUAL_POOL[occasion] || FESTIVAL_VISUAL_POOL.diwali;
        assignedPhoto = festivalPhotos[idx % festivalPhotos.length] || festivalPhotos[0];
      }
    } else {
      assignedPhoto =
        visuals[idx % visuals.length] ||
        fallbackUnsplashPhotos[idx % fallbackUnsplashPhotos.length] ||
        tpl.photo;
    }

    assignedPhoto = toAbsoluteUrl(assignedPhoto);

    let badge = tpl.badge || '';
    if (!badge || badge.length > 20) {
      if (tab === 'promotions') badge = 'SPECIAL OFFER';
      else if (tab === 'festivals') badge = 'FESTIVAL SPECIAL';
      else if (tab === 'reviews') badge = '5-STAR RATED';
      else badge = 'CORE SERVICE';
    }

    const aspect = (tpl.aspect as '1:1' | '4:5' | '9:16') || '4:5';

    let composedDesign: any = null;
    if (includeDesign) {
      try {
        composedDesign = composeBusinessEdition({
          layout: String(tpl.layout || 'business_0'),
          ratio: aspect as any,
          brand: businessName,
          headline,
          subtitle,
          badge,
          cta: tpl.cta || 'Contact Us',
          phone,
          website: website ? website.replace(/^https?:\/\//, '') : undefined,
          logoUrl: logoUrl || undefined,
          photo: assignedPhoto,
          theme: (tpl.theme as any) || 'sand',
        });
      } catch {}
    }

    return {
      id: tpl.id,
      layout: String(tpl.layout || 'business_0'),
      name: tpl.name || headline,
      headline,
      subtitle,
      badge,
      cta: tpl.cta || 'Learn More',
      tab,
      purpose,
      theme: (tpl.theme as any) || 'sand',
      aspectRatio: aspect,
      photoUrl: assignedPhoto,
      bgPrompt: tpl.bgPrompt || headline,
      occasionId: tpl.occasionId,
      design: composedDesign,
      targetKeywords: [
        { keyword: `${industry.toLowerCase()} company`, volume: 500 },
        { keyword: `${industry.toLowerCase()} in ${city}`, volume: 100 },
      ],
      estimatedViews: 45,
      defaultCaption: `${businessName} provides verified ${industry.toLowerCase()} in ${city}.\n\n#${industry.toLowerCase().replace(/[^a-z0-9]/g, '')} #${city.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
    };
  });

  // Filter aspect ratio if requested
  let filteredPosterItems = allAdaptedPosterItems;
  if (requestedAspect && ['1:1', '4:5', '9:16'].includes(requestedAspect)) {
    filteredPosterItems = filteredPosterItems.filter((tpl) => tpl.aspectRatio === requestedAspect);
  }

  // Filter search query if requested
  if (searchQuery.trim()) {
    const qTokens = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
    const matched = filteredPosterItems.filter((tpl) => {
      const text = `${tpl.headline} ${tpl.subtitle} ${tpl.name} ${tpl.badge}`.toLowerCase();
      return qTokens.some((tok) => text.includes(tok));
    });
    if (matched.length > 0) {
      filteredPosterItems = matched;
    }
  }

  // 3b. Synthesize First-Class Category Blueprints (Tailored specifically to the GBP trade)
  const categoryBlueprints = generateCategoryBlueprints({
    categoryOrTitle: effectiveCategoryText,
    businessName,
    city,
    phone,
  });

  const blueprintResponseItems: BusinessTemplateResponseItem[] = categoryBlueprints
    .filter((bp) => {
      if (requestedAspect && ['1:1', '4:5', '9:16'].includes(requestedAspect)) {
        if (bp.aspect !== requestedAspect) return false;
      }
      if (requestedTab === 'all') return true;
      return bp.tab === requestedTab;
    })
    .map((bp) => {
      const photoUrl = toAbsoluteUrl(bp.photoUrl);
      let composedDesign: any = null;
      if (includeDesign) {
        try {
          const fallbackLayout = String(BUSINESS_EDITIONS[0]?.layout || 'business_0');
          composedDesign = composeBusinessEdition({
            layout: fallbackLayout,
            ratio: '4:5',
            brand: businessName,
            headline: bp.headline,
            subtitle: bp.subtitle,
            badge: bp.badge,
            cta: bp.cta,
            phone,
            website: website ? website.replace(/^https?:\/\//, '') : undefined,
            logoUrl: logoUrl || undefined,
            photo: photoUrl,
            theme: bp.theme as any,
          });
        } catch {}
      }

      return {
        id: bp.id,
        layout: bp.layout,
        name: bp.headline,
        headline: bp.headline,
        subtitle: bp.subtitle,
        badge: bp.badge,
        cta: bp.cta,
        tab: bp.tab,
        purpose: bp.purpose,
        theme: bp.theme,
        aspectRatio: '4:5',
        photoUrl,
        bgPrompt: bp.headline,
        design: composedDesign,
        defaultBullets: bp.bullets,
        targetKeywords: bp.targetKeywords,
        estimatedViews: 90,
        defaultCaption: bp.defaultCaption,
      };
    });

  // 3c. Fetch curated trade references
  const curatedList = getCuratedTemplatesForBusiness({
    categoryOrTitle: effectiveCategoryText,
    limit: 25,
  });

  let filteredCuratedList = curatedList;
  if (searchQuery.trim()) {
    const qTokens = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
    const matchedCurated = curatedList.filter((tpl) => {
      const text = `${tpl.title} ${tpl.headlinePattern} ${tpl.subtitle || ''} ${tpl.categoryId} ${(tpl.targetKeywords || []).map((k) => k.keyword).join(' ')}`.toLowerCase();
      return qTokens.some((tok) => text.includes(tok));
    });
    if (matchedCurated.length > 0) {
      filteredCuratedList = matchedCurated;
    }
  }

  const curatedResponseItems: BusinessTemplateResponseItem[] = filteredCuratedList
    .filter((tpl) => {
      if (requestedAspect && ['1:1', '4:5', '9:16'].includes(requestedAspect)) {
        if (tpl.aspectRatio !== requestedAspect) return false;
      }
      if (requestedTab === 'all') return true;
      if (requestedTab === 'promotions') return tpl.bucketKey === 'special_offers';
      if (requestedTab === 'festivals') return tpl.bucketKey === 'festivals';
      if (requestedTab === 'reviews') return tpl.bucketKey === 'new_highlights';
      if (requestedTab === 'for_business') return tpl.bucketKey === 'services_products';
      return true;
    })
    .map((tpl) => {
      const formattedHeadline = tpl.headlinePattern
        .replace(/\{businessName\}/g, businessName)
        .replace(/\{city\}/g, city);
      const formattedCaption = tpl.defaultCaption
        .replace(/\{businessName\}/g, businessName)
        .replace(/\{city\}/g, city);

      const tab =
        tpl.bucketKey === 'special_offers'
          ? 'promotions'
          : tpl.bucketKey === 'festivals'
            ? 'festivals'
            : tpl.bucketKey === 'new_highlights'
              ? 'reviews'
              : 'for_business';

      const photoUrl = toAbsoluteUrl(tpl.referenceUrl);
      let composedCuratedDesign: any = null;
      if (includeDesign) {
        try {
          const fallbackLayout = String(BUSINESS_EDITIONS[0]?.layout || 'business_0');
          composedCuratedDesign = composeBusinessEdition({
            layout: fallbackLayout,
            ratio: (tpl.aspectRatio as any) || '4:5',
            brand: businessName,
            headline: formattedHeadline,
            subtitle: tpl.subtitle,
            badge:
              tpl.bucketKey === 'special_offers'
                ? 'Special Offer'
                : tpl.bucketKey === 'festivals'
                  ? 'Festival'
                  : 'Featured',
            cta: tpl.ctaText,
            phone,
            website: website ? website.replace(/^https?:\/\//, '') : undefined,
            logoUrl: logoUrl || undefined,
            photo: photoUrl,
            theme: 'emerald',
          });
        } catch {}
      }

      return {
        id: tpl.id,
        layout: 'curated_commercial',
        name: tpl.title,
        headline: formattedHeadline,
        subtitle: tpl.subtitle,
        badge:
          tpl.bucketKey === 'special_offers'
            ? 'Special Offer'
            : tpl.bucketKey === 'festivals'
              ? 'Festival'
              : 'Featured',
        cta: tpl.ctaText,
        tab,
        purpose: (tpl.bucketKey === 'special_offers'
          ? 'Promotion'
          : tpl.bucketKey === 'festivals'
            ? 'Festival'
            : 'Business profile') as Purpose,
        theme: 'emerald',
        aspectRatio: tpl.aspectRatio,
        photoUrl,
        bgPrompt: tpl.title,
        design: composedCuratedDesign,
        defaultBullets: tpl.defaultBullets,
        targetKeywords: tpl.targetKeywords,
        estimatedViews: tpl.estimatedViews,
        defaultCaption: formattedCaption,
      };
    });

  // Group all collections by tab with priority sorting for trade matches
  const isTradeMatch = (item: BusinessTemplateResponseItem): boolean => {
    return isMerchantTrade(item.name) || isMerchantTrade(item.headline);
  };

  const adaptedForBusiness = filteredPosterItems
    .filter((t) => t.tab === 'for_business')
    .sort((a, b) => Number(isTradeMatch(b)) - Number(isTradeMatch(a)));

  const forBusinessTemplates: BusinessTemplateResponseItem[] = [
    ...blueprintResponseItems.filter((bp) => bp.tab === 'for_business'),
    ...curatedResponseItems.filter((cr) => cr.tab === 'for_business'),
    ...adaptedForBusiness,
  ];

  const promotionsTemplates: BusinessTemplateResponseItem[] = [
    ...blueprintResponseItems.filter((bp) => bp.tab === 'promotions'),
    ...curatedResponseItems.filter((cr) => cr.tab === 'promotions'),
    ...filteredPosterItems.filter((t) => t.tab === 'promotions'),
  ];

  const festivalsTemplates: BusinessTemplateResponseItem[] = [
    ...blueprintResponseItems.filter((bp) => bp.tab === 'festivals'),
    ...curatedResponseItems.filter((cr) => cr.tab === 'festivals'),
    ...filteredPosterItems.filter((t) => t.tab === 'festivals'),
  ];

  const reviewsTemplates: BusinessTemplateResponseItem[] = [
    ...blueprintResponseItems.filter((bp) => bp.tab === 'reviews'),
    ...curatedResponseItems.filter((cr) => cr.tab === 'reviews'),
    ...filteredPosterItems.filter((t) => t.tab === 'reviews'),
  ];

  let selectedTemplates: BusinessTemplateResponseItem[] = [];

  if (requestedTab === 'for_business') {
    selectedTemplates = forBusinessTemplates.slice(0, limit);
  } else if (requestedTab === 'promotions') {
    selectedTemplates = promotionsTemplates.slice(0, limit);
  } else if (requestedTab === 'festivals') {
    selectedTemplates = festivalsTemplates.slice(0, limit);
  } else if (requestedTab === 'reviews') {
    selectedTemplates = reviewsTemplates.slice(0, limit);
  } else {
    // 'all': Balanced presentation across categories
    const perCategory = Math.max(10, Math.floor(limit / 4));
    selectedTemplates = [
      ...forBusinessTemplates.slice(0, perCategory),
      ...promotionsTemplates.slice(0, perCategory),
      ...festivalsTemplates.slice(0, perCategory),
      ...reviewsTemplates.slice(0, perCategory),
    ].slice(0, limit);
  }

  return NextResponse.json({
    businessContext: {
      name: businessName,
      industry,
      matchedGroup,
      matchedIndustryKey,
      phone,
      website,
      logoUrl,
      address,
      city,
    },
    counts: {
      total:
        forBusinessTemplates.length +
        promotionsTemplates.length +
        festivalsTemplates.length +
        reviewsTemplates.length,
      for_business: forBusinessTemplates.length,
      promotions: promotionsTemplates.length,
      festivals: festivalsTemplates.length,
      reviews: reviewsTemplates.length,
    },
    buckets: TEMPLATE_BUCKETS,
    templates: selectedTemplates,
  });
}
