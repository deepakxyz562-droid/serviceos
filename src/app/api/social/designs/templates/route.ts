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

export interface BusinessTemplateResponseItem {
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
      select: { name: true, industry: true, phone: true, settingsJson: true },
    }).catch(() => null),
    db.brandProfile.findUnique({
      where: { id: user.tenantId },
    }).catch(() => null),
  ]);

  let businessName = brandProfile?.businessName || tenant?.name || 'My Business';
  let industry = brandProfile?.industry || tenant?.industry || 'Retail & Local Services';
  let phone = tenant?.phone || '';
  let website = brandProfile?.website || '';
  let logoUrl = brandProfile?.logoUrl || '';

  // Parse GBP / Brand Brain overrides from settingsJson if available
  if (tenant?.settingsJson) {
    try {
      const parsed = JSON.parse(tenant.settingsJson);
      if (parsed?.activeGbpTitle) businessName = parsed.activeGbpTitle;
      if (parsed?.activeGbpCategory && !/corporate|holding|community/i.test(parsed.activeGbpCategory)) {
        industry = parsed.activeGbpCategory;
      }
      if (parsed?.activeGbpPhone) phone = parsed.activeGbpPhone;
    } catch {}
  }

  // 2. Identify industry matcher & visual pool
  const matchedIndustryKey = scoreIndustryMatch(`${industry} ${businessName}`);
  const visuals = getCategoryVisualPool(matchedIndustryKey);
  const fallbackUnsplashPhotos = CURATED_SMB_IMAGE_REGISTRY[matchedIndustryKey] || CURATED_SMB_IMAGE_REGISTRY.generic_business;

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
    if (rx.test(`${industry} ${businessName}`)) {
      matchedGroup = group;
      break;
    }
  }

  // 3. Filter templates from BUSINESS_EDITIONS
  let candidates = BUSINESS_EDITIONS;

  if (searchQuery.trim()) {
    candidates = candidates.filter((tpl) => templateMatches(tpl, searchQuery));
  }

  if (requestedAspect && ['1:1', '4:5', '9:16'].includes(requestedAspect)) {
    candidates = candidates.filter((tpl) => tpl.aspect === requestedAspect);
  }

  // Group into tabs
  const forBusinessList = candidates.filter(
    (t) =>
      t.edition?.purpose === 'Business profile' ||
      t.edition?.purpose === 'Engagement' ||
      t.edition?.purpose === 'Conversion' ||
      t.edition?.group === matchedGroup,
  );
  const promotionsList = candidates.filter((t) => t.edition?.purpose === 'Promotion');
  const festivalsList = candidates.filter((t) => t.edition?.purpose === 'Festival');
  const reviewsList = candidates.filter((t) => t.edition?.purpose === 'Trust-building');

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

  // 4. Map & compose templates with merchant's branding
  const items: BusinessTemplateResponseItem[] = selectedTemplates.map((template, idx) => {
    const assignedPhoto =
      visuals[idx % visuals.length] ||
      fallbackUnsplashPhotos[idx % fallbackUnsplashPhotos.length] ||
      template.photo;

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
    };
  });

  return NextResponse.json({
    businessContext: {
      name: businessName,
      industry,
      matchedGroup,
      matchedIndustryKey,
      phone,
      website,
      logoUrl,
    },
    counts: {
      total: candidates.length,
      for_business: forBusinessList.length,
      promotions: promotionsList.length,
      festivals: festivalsList.length,
      reviews: reviewsList.length,
    },
    templates: items,
  });
}
