import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
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
import { generateCategoryBlueprints } from '@/lib/gbp/master-category-catalog';
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
  const limit = Math.min(60, Math.max(4, parseInt(searchParams.get('limit') || '32', 10)));
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

  // 3. Filter templates from BUSINESS_EDITIONS with strict category isolation
  const hasActiveSearch = Boolean(searchQuery.trim());
  let candidates = BUSINESS_EDITIONS;

  if (hasActiveSearch) {
    candidates = candidates.filter((tpl) => templateMatches(tpl, searchQuery));
    if (candidates.length === 0) {
      // If exact query matches no edition, strictly fallback to merchant's trade group & universal festivals
      candidates = BUSINESS_EDITIONS.filter(
        (tpl) => tpl.edition?.group === matchedGroup || tpl.edition?.purpose === 'Festival',
      );
    }
  } else {
    // Default feed browsing: strictly isolate to the merchant's business category group + universal festivals
    candidates = BUSINESS_EDITIONS.filter(
      (tpl) => tpl.edition?.group === matchedGroup || tpl.edition?.purpose === 'Festival',
    );
  }

  if (requestedAspect && ['1:1', '4:5', '9:16'].includes(requestedAspect)) {
    candidates = candidates.filter((tpl) => tpl.aspect === requestedAspect);
  }

  // Group into tabs: strictly guarantee that business profile, promotions, and reviews only belong to matchedGroup
  const forBusinessList = candidates.filter(
    (t) =>
      (hasActiveSearch || t.edition?.group === matchedGroup) &&
      (t.edition?.purpose === 'Business profile' ||
        t.edition?.purpose === 'Engagement' ||
        t.edition?.purpose === 'Conversion'),
  );
  const promotionsList = candidates.filter(
    (t) => (hasActiveSearch || t.edition?.group === matchedGroup) && t.edition?.purpose === 'Promotion',
  );
  const festivalsList = candidates.filter((t) => t.edition?.purpose === 'Festival' || Boolean(t.occasionId));
  const reviewsList = candidates.filter(
    (t) => (hasActiveSearch || t.edition?.group === matchedGroup) && t.edition?.purpose === 'Trust-building',
  );

  let selectedTemplates: typeof BUSINESS_EDITIONS = [];

  if (requestedTab === 'for_business') {
    selectedTemplates = forBusinessList.slice(0, limit);
  } else if (requestedTab === 'promotions') {
    selectedTemplates = promotionsList.slice(0, limit);
  } else if (requestedTab === 'festivals') {
    selectedTemplates = festivalsList.slice(0, limit);
  } else if (requestedTab === 'reviews') {
    selectedTemplates = reviewsList.slice(0, limit);
  } else {
    // 'all': Provide balanced representation
    const perCategory = Math.max(2, Math.floor(limit / 4));
    selectedTemplates = [
      ...forBusinessList.slice(0, perCategory),
      ...promotionsList.slice(0, perCategory),
      ...festivalsList.slice(0, perCategory),
      ...reviewsList.slice(0, perCategory),
    ];
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
      if (requestedTab === 'all') return true;
      return bp.tab === requestedTab;
    })
    .map((bp) => {
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
            photo: bp.photoUrl,
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
        photoUrl: bp.photoUrl,
        bgPrompt: bp.headline,
        design: composedDesign,
        defaultBullets: bp.bullets,
        targetKeywords: bp.targetKeywords,
        estimatedViews: 90,
        defaultCaption: bp.defaultCaption,
      };
    });

  // 3c. Fetch curated trade references (Pinterest / Meta Ad Library benchmarks)
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
            photo: tpl.referenceUrl,
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
        photoUrl: tpl.referenceUrl,
        bgPrompt: tpl.title,
        design: composedCuratedDesign,
        defaultBullets: tpl.defaultBullets,
        targetKeywords: tpl.targetKeywords,
        estimatedViews: tpl.estimatedViews,
        defaultCaption: formattedCaption,
      };
    });

  // 4. Map & compose templates with merchant's branding
  const items: BusinessTemplateResponseItem[] = selectedTemplates.map((template, idx) => {
    const isFestival =
      template.edition?.purpose === 'Festival' ||
      Boolean(template.occasionId) ||
      template.badge?.toLowerCase().includes('festival') ||
      /diwali|holi|eid|christmas|new year|independence|republic|rakhi|navratri|dussehra|chhath|valentine/i.test(template.headline || '');

    let assignedPhoto = template.photo;
    if (isFestival) {
      if (template.photo && template.photo.startsWith('/images/bgos/templates/')) {
        // Keep verified authentic local festival asset
        assignedPhoto = template.photo;
      } else {
        const textToInspect = `${template.occasionId || ''} ${template.headline || ''} ${template.name || ''}`.toLowerCase();
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
        template.photo;
    }

    const tab = mapPurposeToTab(template.edition?.purpose);

    let composedDesign: any = null;
    if (includeDesign) {
      try {
        composedDesign = composeBusinessEdition({
          layout: template.layout,
          ratio: template.aspect as any,
          brand: businessName,
          headline: template.headline,
          subtitle: template.subtitle,
          badge: template.badge,
          cta: template.cta,
          phone,
          website: website ? website.replace(/^https?:\/\//, '') : undefined,
          logoUrl: logoUrl || undefined,
          photo: assignedPhoto,
          theme: template.theme,
        });
      } catch (err) {
        // Fallback without breaking feed
      }
    }

    return {
      id: template.id,
      layout: template.layout,
      name: template.name,
      headline: template.headline,
      subtitle: template.subtitle,
      badge: template.badge || '',
      cta: template.cta || 'Learn More',
      tab,
      purpose: template.edition?.purpose || 'Business profile',
      theme: template.theme || 'sand',
      aspectRatio: (template.aspect as '1:1' | '4:5' | '9:16') || '4:5',
      photoUrl: assignedPhoto,
      bgPrompt: template.bgPrompt,
      occasionId: template.occasionId,
      design: composedDesign,
      targetKeywords: [
        { keyword: `${industry.toLowerCase()} company`, volume: 500 },
        { keyword: `${industry.toLowerCase()} in ${city}`, volume: 100 },
      ],
      estimatedViews: 30,
      defaultCaption: `${businessName} provides professional ${industry.toLowerCase()} in ${city}.\n\n#${industry.toLowerCase().replace(/[^a-z0-9]/g, '')} #${city.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
    };
  });

  const combinedTemplates = [
    ...blueprintResponseItems,
    ...curatedResponseItems,
    ...items,
  ].slice(0, limit);

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
      total: candidates.length + curatedList.length,
      for_business: forBusinessList.length,
      promotions: promotionsList.length,
      festivals: festivalsList.length,
      reviews: reviewsList.length,
    },
    buckets: TEMPLATE_BUCKETS,
    templates: combinedTemplates,
  });
}
