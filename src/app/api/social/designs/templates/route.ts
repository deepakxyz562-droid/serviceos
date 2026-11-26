import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getProductAppUrl } from '@/lib/auth';
import { db } from '@/lib/db';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { listGoogleBusinessMedia } from '@/lib/social/adapters/googlebusiness';

export const dynamic = 'force-dynamic';
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
} from '@/lib/designs/dynamic-visual-resolver';
import {
  getCategoryStorageFolder,
  getCategoryImagesFromS3,
  ensureOnboardingCategoryPack,
} from '@/lib/designs/category-image-engine';
import {
  getMultiSourceCategoryVisuals,
  getFestivalVisuals,
  getCreativeSourceLabel,
  type MultiSourceCreativeVisual,
} from '@/lib/designs/multi-source-creative-engine';
import { getSeasonalOccasions } from '@/lib/designs/visual-query-builder';
import { normalizeCategoryContext } from '@/lib/designs/category-taxonomy';
import { generateCategoryBlueprints, getGbpCategoryByNameOrAlias } from '@/lib/gbp/master-category-catalog';
import { generateStructuredLocalSeoPost } from '@/lib/gbp/seo-copy-generator';
import { POSTER_TEMPLATES, type PosterTemplate } from '../../../../../../shared/poster-templates';
import {
  getCuratedTemplatesForBusiness,
  TEMPLATE_BUCKETS,
  type CuratedTemplateItem,
} from '../../../../../../shared/curated-photo-templates';
import {
  searchFestivalCatalog,
  getFestivalGroupsWithCounts,
} from '../../../../../../shared/festival-catalog';

function getFestivalFallbackPhoto(occasion: string, idx: number): string {
  const matches = searchFestivalCatalog({ festivalKey: occasion, limit: 10 });
  if (matches.items.length > 0) {
    return matches.items[idx % matches.items.length].url;
  }
  const general = searchFestivalCatalog({ limit: 10 });
  if (general.items.length > 0) {
    return general.items[idx % general.items.length].url;
  }
  return '/images/bgos/festivals/diwali/Clay_oil_lamps_on_balcony_6c4c0407.webp';
}

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
  photoSource?: string;
  photoCredit?: string;
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

  // 1. Fetch tenant business context, connected GBP account, and real added services
  const [tenant, brandProfile, gbpAccount, merchantServices] = await Promise.all([
    db.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        name: true,
        industry: true,
        phone: true,
        address: true,
        city: true,
        description: true,
        tagline: true,
        settingsJson: true,
        signupMode: true,
        planStatus: true,
        plan: true,
        workspaces: {
          select: {
            industry: true,
            name: true,
            productType: true,
          },
        },
      },
    }).catch(() => null),
    (db.brandProfile?.findUnique({
      where: { tenantId: user.tenantId },
      select: {
        businessName: true,
        industry: true,
        website: true,
        location: true,
        services: true,
        products: true,
      },
    }) ?? Promise.resolve(null)).catch(() => null),
    (db.socialAccount?.findFirst({
      where: { tenantId: user.tenantId, platform: 'googlebusiness', isActive: true },
    }) ?? Promise.resolve(null)).catch(() => null),
    (db.service?.findMany({
      where: { tenantId: user.tenantId },
      select: { name: true, description: true, longDescription: true, category: true, basePrice: true, isActive: true },
      orderBy: { updatedAt: 'desc' },
      take: 60,
    }) ?? Promise.resolve([])).catch(() => []),
  ]);

  const isFieserosAccount =
    tenant?.signupMode === 'crm_trial' ||
    tenant?.signupMode === 'crm' ||
    tenant?.signupMode === 'free' ||
    (tenant?.workspaces || []).some((w: any) => w.productType === 'crm') ||
    /\b(fieseros|serviceos|crm|field service)\b/i.test(`${tenant?.name || ''} ${tenant?.industry || ''}`);

  // Collect ALL services added by the merchant (Service table + BrandProfile.services + settingsJson)
  const realServiceNames: string[] = [];
  const rawServiceTokens: string[] = [];

  for (const s of merchantServices || []) {
    if (s.name?.trim()) {
      if (!realServiceNames.includes(s.name.trim())) realServiceNames.push(s.name.trim());
      rawServiceTokens.push(s.name.trim());
    }
    if (s.category && s.category !== 'general') {
      rawServiceTokens.push(s.category.trim());
    }
    if (s.description?.trim()) {
      rawServiceTokens.push(s.description.trim());
    }
    if (s.longDescription?.trim()) {
      rawServiceTokens.push(s.longDescription.trim());
    }
  }

  if (brandProfile?.services) {
    try {
      const parsed = JSON.parse(brandProfile.services);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === 'string' && item.trim()) {
            if (!realServiceNames.includes(item.trim())) realServiceNames.push(item.trim());
            rawServiceTokens.push(item.trim());
          }
        }
      }
    } catch {}
  }

  const workspaceIndustry = (tenant?.workspaces || []).find((w: any) => w.industry?.trim())?.industry?.trim() || '';

  let businessName = brandProfile?.businessName || tenant?.name || 'My Business';
  let industry = brandProfile?.industry || tenant?.industry || workspaceIndustry || '';

  const paramBusinessName = searchParams.get('businessName')?.trim();
  const paramIndustry = searchParams.get('industry')?.trim();
  if (paramBusinessName && (!businessName || businessName === 'My Business')) {
    businessName = paramBusinessName;
  }
  if (paramIndustry && (!industry || /corporate|holding|community|services|^other$/i.test(industry))) {
    industry = paramIndustry;
  }
  let phone = tenant?.phone || '';
  let website = brandProfile?.website || '';
  let logoUrl = (brandProfile as any)?.logoUrl || '';
  let address = tenant?.address || '';
  let city = (tenant as any)?.city || brandProfile?.location || 'Patna';

  // Derive the origin from the incoming request (x-forwarded-host aware) so
  // preview/proxy gateways never receive mismatched absolute image URLs.
  const resolveRequestOrigin = (): string => {
    const proto =
      request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
      request.nextUrl?.protocol?.replace(/:$/, '') ||
      'https';
    const host =
      request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
      request.headers.get('host')?.split(',')[0]?.trim();
    if (host) return `${proto}://${host}`;
    const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
    return envUrl ? envUrl.replace(/\/$/, '') : '';
  };
  const baseUrl = resolveRequestOrigin() || getProductAppUrl(request, 'bgos');
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

  // Parse connected Google Business Profile account if present
  if (gbpAccount) {
    try {
      const gbpMeta =
        typeof gbpAccount.metadata === 'string'
          ? JSON.parse(gbpAccount.metadata)
          : (gbpAccount.metadata as any);
      const gbpCategory =
        (typeof gbpMeta?.primaryCategory === 'string' ? gbpMeta.primaryCategory : gbpMeta?.primaryCategory?.displayName) ||
        gbpMeta?.raw?.categories?.primaryCategory?.displayName ||
        gbpMeta?.categories?.primaryCategory?.displayName ||
        gbpMeta?.location?.primaryCategory?.displayName ||
        (typeof gbpMeta?.category === 'string' ? gbpMeta.category : gbpMeta?.category?.displayName) ||
        gbpMeta?.categoryName;
      const gbpTitle = gbpMeta?.locationTitle || gbpMeta?.name || gbpAccount.accountName;
      if (gbpTitle && (businessName === 'My Business' || !businessName)) {
        businessName = gbpTitle;
      }
      if (
        gbpCategory &&
        (!industry ||
          /corporate|holding|community|retail & local services|services|^other$/i.test(industry))
      ) {
        industry = gbpCategory;
      }
      if (gbpMeta?.phone && !phone) phone = gbpMeta.phone;
      if (gbpMeta?.address && !address) address = gbpMeta.address;
      if (gbpMeta?.city && (!city || city === 'Patna')) city = gbpMeta.city;
    } catch {}
  }

  // If industry is unset or a generic fallback placeholder, dynamically derive the merchant's trade
  // from their real added services, workspace industry, or business title via the Universal Category Taxonomy
  if (!industry || /corporate|holding|community|retail & local services|services|^other$/i.test(industry)) {
    if (rawServiceTokens.length > 0) {
      const derived = normalizeCategoryContext(rawServiceTokens.join(' '));
      if (derived.verticalLabel && derived.verticalKey !== 'specialty_local_services') {
        industry = derived.verticalLabel;
      } else if (derived.detectedSubject && derived.detectedSubject !== 'Local Business') {
        industry = `${derived.detectedSubject} Services`;
      }
    }
    if (!industry || /corporate|holding|community|retail & local services|services|^other$/i.test(industry)) {
      if (businessName && businessName !== 'My Business') {
        const derivedFromTitle = normalizeCategoryContext(businessName);
        if (derivedFromTitle.verticalLabel && derivedFromTitle.verticalKey !== 'specialty_local_services') {
          industry = derivedFromTitle.verticalLabel;
        } else if (derivedFromTitle.detectedSubject && derivedFromTitle.detectedSubject !== 'Local Business') {
          industry = `${derivedFromTitle.detectedSubject} Services`;
        }
      }
    }
    if (!industry || /corporate|holding|community|retail & local services|services|^other$/i.test(industry)) {
      industry = isFieserosAccount ? 'Field Services & Operations' : 'Professional Services';
    }
  }

  // Universal Non-Food Trade Isolation:
  // Non-food businesses MUST NEVER receive grocery, fruit, vegetable, produce, or supermarket photos!
  const isExplicitFoodOrGrocery = /\b(grocery|supermarket|kirana|fruit|vegetable|produce|sabzi|mandi|bazaar|provisions store|fmcg)\b/i.test(
    `${industry} ${businessName} ${rawServiceTokens.join(' ')}`
  );

  // 2. Identify industry matcher & visual pool with Universal Category Taxonomy
  const servicesContext = realServiceNames.slice(0, 5).join(' ');
  const searchContext = normalizeCategoryContext(
    searchQuery || `${servicesContext} ${industry} ${businessName}`,
  );
  const effectiveCategoryText = searchQuery.trim()
    ? `${searchQuery} ${servicesContext} ${industry} ${businessName}`
    : `${servicesContext} ${industry} ${businessName}`.trim();

  const matchedIndustryKey = scoreIndustryMatch(effectiveCategoryText);

  // ── Tier 1: the merchant's own photos (brand library + recent post media + live GBP photos) ──
  const [libraryRows, postRows, googleMediaItems] = await Promise.all([
    (db.imageLibrary?.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, name: true, url: true, folder: true, mediaType: true },
    }) ?? Promise.resolve([])).catch(
      () =>
        [] as Array<{
          id: string;
          name: string | null;
          url: string;
          folder: string | null;
          mediaType: string | null;
        }>,
    ),
    (db.socialPost?.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: { id: true, mediaUrls: true },
    }) ?? Promise.resolve([])).catch(
      () => [] as Array<{ id: string; mediaUrls: string | null }>,
    ),
    (async () => {
      try {
        const gAccount = await prepareGoogleAccount(user.tenantId);
        if (gAccount) {
          const res = await listGoogleBusinessMedia(gAccount);
          return res.mediaItems || [];
        }
      } catch {
        // Fallback gracefully if GBP is not connected or media API fails
      }
      return [];
    })(),
  ]);

  const parseMediaList = (raw: unknown): string[] => {
    if (Array.isArray(raw)) return raw.filter((u): u is string => typeof u === 'string' && Boolean(u.trim()));
    if (typeof raw !== 'string' || !raw.trim()) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((u): u is string => typeof u === 'string' && Boolean(u.trim()))
        : [];
    } catch {
      return /^https?:\/\//i.test(raw) || raw.startsWith('/') ? [raw] : [];
    }
  };

  const isMerchantTech =
    matchedIndustryKey === 'it_software' ||
    /\b(fieseros|serviceos|bgos|bos|saas|crm|software|it company|technologies)\b/i.test(`${businessName} ${industry}`);

  const userPhotos: Array<{ url: string; title?: string }> = [];
  const seenUserPhotoUrls = new Set<string>();
  const invalidTechPhotoIds: string[] = [];

  // Incorporate authentic Google Business Profile photos (highest commercial priority)
  for (const gItem of googleMediaItems) {
    const gUrl = gItem?.googleUrl || gItem?.thumbnailUrl;
    const mediaFormat = (gItem as { mediaFormat?: string })?.mediaFormat;
    if (
      gUrl &&
      typeof gUrl === 'string' &&
      gUrl.trim() &&
      mediaFormat !== 'VIDEO' &&
      !/\.(mp4|mov|webm|m4v|3gp|mkv|avi)(\?|$)/i.test(gUrl)
    ) {
      if (!seenUserPhotoUrls.has(gUrl)) {
        seenUserPhotoUrls.add(gUrl);
        userPhotos.push({ url: gUrl, title: 'Google Business Profile Photo' });
      }
    }
  }

  for (const row of libraryRows) {
    const url = typeof row?.url === 'string' ? row.url.trim() : '';
    if (!url || /\.(mp4|mov|webm|m4v|3gp|mkv|avi)(\?|$)/i.test(url)) continue;

    // Filter out legacy produce/vegetable/fruit photos for non-food / tech merchants
    if (isMerchantTech || !isExplicitFoodOrGrocery) {
      const rowName = (row.name || '').toLowerCase();
      const rowFolder = (row.folder || '').toLowerCase();
      const isGroceryOrProduce =
        /grocery|supermarket|vegetable|fruit|produce|mandi|retail-local-services|bazaar/.test(
          `${rowName} ${rowFolder} ${url.toLowerCase()}`
        ) || url.includes('1542838132-92c53300491e') || url.includes('1533900298318-6b8da08a523e');
      if (isGroceryOrProduce) {
        if (row.id) invalidTechPhotoIds.push(row.id);
        continue;
      }
    }

    if (!seenUserPhotoUrls.has(url)) {
      seenUserPhotoUrls.add(url);
      userPhotos.push({ url, title: row.name || 'Brand Library Photo' });
    }
  }

  // Prune invalid legacy AI photos from database asynchronously if any found
  if (invalidTechPhotoIds.length > 0 && db.imageLibrary?.deleteMany) {
    void db.imageLibrary.deleteMany({
      where: { id: { in: invalidTechPhotoIds }, tenantId: user.tenantId },
    }).catch(() => null);
  }

  for (const post of postRows) {
    for (const u of parseMediaList(post?.mediaUrls)) {
      if (!/^https?:\/\//i.test(u) && !u.startsWith('/')) continue;
      if ((isMerchantTech || !isExplicitFoodOrGrocery) && (u.includes('1542838132-92c53300491e') || u.includes('1533900298318-6b8da08a523e') || /grocery|vegetable|fruit|produce/.test(u.toLowerCase()))) {
        continue;
      }
      if (!seenUserPhotoUrls.has(u)) {
        seenUserPhotoUrls.add(u);
        userPhotos.push({ url: u, title: 'Your Social Post' });
      }
    }
  }

  // ── Seasonal occasions driving dynamic festival visuals ──
  const seasonalOccasions = getSeasonalOccasions();
  if (searchContext.isFestival && searchContext.detectedOccasion) {
    seasonalOccasions.unshift({ id: searchContext.detectedOccasion, label: searchContext.detectedOccasion });
  }
  // Pre-scan template text so the Festivals tab always shows live imagery
  // (even outside seasonal windows) — top occasions present in the collection.
  const occasionFrequency = new Map<string, number>();
  for (const tpl of POSTER_TEMPLATES) {
    const text = `${tpl.occasionId || ''} ${tpl.headline || ''} ${tpl.name || ''}`.toLowerCase();
    if (!text.trim()) continue;
    let occasion = '';
    if (/diwali|deepavali/.test(text)) occasion = 'diwali';
    else if (/holi|gulal/.test(text)) occasion = 'holi';
    else if (/christmas|xmas/.test(text)) occasion = 'christmas';
    else if (/new year|nye/.test(text)) occasion = 'new_year';
    else if (/eid|mubarak/.test(text)) occasion = 'eid';
    else if (/navratri|durga|garba/.test(text)) occasion = 'navratri';
    else if (/dussehra|vijayadashami/.test(text)) occasion = 'dussehra';
    else if (/rakhi|raksha/.test(text)) occasion = 'rakhi';
    else if (/chhath/.test(text)) occasion = 'chhath_puja';
    else if (/independence|tiranga/.test(text)) occasion = 'independence_day';
    else if (/republic/.test(text)) occasion = 'republic_day';
    else if (/valentine|rose day/.test(text)) occasion = 'valentine';
    if (occasion) occasionFrequency.set(occasion, (occasionFrequency.get(occasion) || 0) + 1);
  }
  const templateOccasions = [...occasionFrequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([id]) => ({ id, label: id.replace(/_/g, ' ') }));
  // Seasonal occasions take priority slots; template occasions fill the rest.
  const uniqueOccasions = [
    ...new Map([...seasonalOccasions, ...templateOccasions].map((o) => [o.id, o])).values(),
  ].slice(0, 5);

  const [multiSourceVisuals, ...festivalVisualResults] = await Promise.all([
    getMultiSourceCategoryVisuals({
      industryText: effectiveCategoryText,
      requestedCount: POSTER_TEMPLATES.length + 40,
      userPhotos,
      tenantSeed: user.tenantId,
    }),
    ...uniqueOccasions.map((occasion) =>
      getFestivalVisuals(occasion.id, 30, user.tenantId).catch(() => [] as MultiSourceCreativeVisual[]),
    ),
  ]);
  const festivalVisualsByOccasion = new Map<string, MultiSourceCreativeVisual[]>();
  uniqueOccasions.forEach((occasion, i) => {
    const occasionVisuals = festivalVisualResults[i];
    if (Array.isArray(occasionVisuals) && occasionVisuals.length > 0) {
      festivalVisualsByOccasion.set(occasion.id, occasionVisuals);
    }
  });
  const festivalCursor = new Map<string, number>();

  // Reuse visuals resolved in multiSourceVisuals (no duplicate synchronous S3 crawl or blocking pack build)
  const categoryFolder = getCategoryStorageFolder(effectiveCategoryText);
  const s3CategoryVisuals = multiSourceVisuals.map((v) => v.url).filter(Boolean);
  const isTest = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';
  if (s3CategoryVisuals.length < 10 && !isTest) {
    void ensureOnboardingCategoryPack({
      category: effectiveCategoryText,
      businessName,
      city,
      services: realServiceNames,
      targetCount: 25,
    }).catch((err) => console.warn('[templates/route] Background category pack error:', err));
  }
  const visuals = s3CategoryVisuals.length > 0 ? s3CategoryVisuals : getCategoryVisualPool(effectiveCategoryText);

  // Pool of truly distinct photos (never repeat a photo across multiple cards)
  const distinctVisualPool = Array.from(
    new Set([
      ...(userPhotos || []).map((p) => p.url),
      ...s3CategoryVisuals,
      ...visuals,
    ].filter((u): u is string => typeof u === 'string' && u.trim().length > 0))
  );
  const usedTemplatePhotos = new Set<string>();

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
  const isTextureOrPaintBusiness =
    /\b(texture|paint|painting|wall art|wall decor|painter)\b/i.test(
      `${businessName} ${effectiveCategoryText} ${rawServiceTokens.join(' ')}`
    );

  const gbpCat = isTextureOrPaintBusiness
    ? getGbpCategoryByNameOrAlias('Painting contractor') || getGbpCategoryByNameOrAlias(effectiveCategoryText)
    : getGbpCategoryByNameOrAlias(effectiveCategoryText);

  const baseTradeProducts =
    gbpCat?.coreProducts && gbpCat.coreProducts.length > 0 ? gbpCat.coreProducts : [industry];
  const tradeProducts =
    realServiceNames.length > 0
      ? Array.from(new Set([...realServiceNames, ...baseTradeProducts]))
      : baseTradeProducts;

  const isMerchantTrade = (word: string): boolean => {
    return new RegExp(`\\b(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'i').test(
      effectiveCategoryText,
    );
  };

  const conflictingTradesRegex =
    /\b(car wash|auto garage|bike repair|tyre shop|plumbing|plumber|electrician|ac repair|pest control|carpenter|plywood|timber|dentist|dental|teeth whitening|root canal|salon|haircut|hair spa|facial|manicure|sweet shop|mithai|halwai|software company|app development)\b/i;

  // Incompatible trade conflict elimination:
  // Non-food / service businesses must NEVER see grocery, supermarket, cafe, bakery, restaurant, dining or sweets templates
  // Festivals (Diwali, Eid, Harvest, New Year, etc.) are universal celebrations and must never be stripped as food conflicts
  const isConflictingTemplateForNonFood = (tpl: PosterTemplate): boolean => {
    if (isExplicitFoodOrGrocery) return false;
    const isFest =
      tpl.category === 'festival' ||
      tpl.edition?.purpose === 'Festival' ||
      Boolean(tpl.occasionId) ||
      tpl.badge?.toLowerCase().includes('festival') ||
      /diwali|deepavali|holi|eid|christmas|new year|independence|republic|rakhi|navratri|dussehra|chhath|valentine|harvest|festiv/i.test(
        `${tpl.id} ${tpl.name} ${tpl.headline || ''}`,
      );
    if (isFest) return false;
    const text = `${tpl.id} ${tpl.name} ${tpl.headline || ''} ${(tpl.industries || []).join(' ')} ${tpl.bgPrompt || ''}`.toLowerCase();
    return /grocery|supermarket|vegetable|fruit|produce|mandi|bazaar|cafe|bakery|restaurant|food|dining|sweets|mithai|crops|harvest|pumpkins|bistro|cake|dish/.test(text);
  };

  const tradeRelevantPosterTemplates = POSTER_TEMPLATES.filter((tpl) => !isConflictingTemplateForNonFood(tpl));

  function curateTabTemplates(
    items: BusinessTemplateResponseItem[],
    maxCount: number
  ): BusinessTemplateResponseItem[] {
    const curated: BusinessTemplateResponseItem[] = [];
    const seenIds = new Set<string>();

    for (const item of items) {
      if (curated.length >= maxCount) break;
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        curated.push(item);
      }
    }

    return curated;
  }

  // 3b. Synthesize First-Class Category Blueprints (Tailored specifically to the GBP trade & real services)
  const categoryBlueprints = generateCategoryBlueprints({
    categoryOrTitle: effectiveCategoryText,
    businessName,
    city,
    phone,
    realServices: realServiceNames,
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
      let cleanPhoto = bp.photoUrl;
      if (cleanPhoto && !usedTemplatePhotos.has(cleanPhoto)) {
        usedTemplatePhotos.add(cleanPhoto);
      } else {
        const nextUnused = distinctVisualPool.find((u) => !usedTemplatePhotos.has(u));
        if (nextUnused) {
          cleanPhoto = nextUnused;
          usedTemplatePhotos.add(nextUnused);
        } else {
          cleanPhoto = '';
        }
      }
      const photoUrl = cleanPhoto ? toAbsoluteUrl(cleanPhoto) : '';
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

      const matchingMsVisual = multiSourceVisuals.find((v) => v.url === cleanPhoto);

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
        photoSource: cleanPhoto ? (matchingMsVisual ? getCreativeSourceLabel(matchingMsVisual.source) : 'Curated') : 'none',
        photoCredit: cleanPhoto ? (matchingMsVisual?.credit || 'Verified Photo') : undefined,
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

      let photoUrl = '';
      let photoSource: string = 'none';
      let photoCredit: string | undefined;

      if (tab === 'festivals') {
        const festText = `${tpl.title} ${tpl.headlinePattern} ${tpl.categoryId}`.toLowerCase();
        let festOccasion = '';
        if (/diwali|deepavali/.test(festText)) festOccasion = 'diwali';
        else if (/holi|gulal/.test(festText)) festOccasion = 'holi';
        else if (/christmas|xmas/.test(festText)) festOccasion = 'christmas';
        else if (/new year|nye/.test(festText)) festOccasion = 'new_year';
        else if (/eid|mubarak/.test(festText)) festOccasion = 'eid';
        else if (/navratri|durga/.test(festText)) festOccasion = 'navratri';
        else if (/rakhi|raksha/.test(festText)) festOccasion = 'rakhi';
        else if (/valentine/.test(festText)) festOccasion = 'valentine';
        else if (/independence|republic/.test(festText)) festOccasion = 'independence_day';
        const curatedFestivalPool = festOccasion
          ? festivalVisualsByOccasion.get(festOccasion)
          : undefined;
        if (curatedFestivalPool && curatedFestivalPool.length > 0) {
          const festivalCounter = (festivalCursor.get(festOccasion) || 0) + 1;
          festivalCursor.set(festOccasion, festivalCounter);
          const festivalItem = curatedFestivalPool[(festivalCounter - 1) % curatedFestivalPool.length];
          if (festivalItem?.url) {
            photoUrl = toAbsoluteUrl(festivalItem.url);
            photoSource = getCreativeSourceLabel(festivalItem.source);
            photoCredit = festivalItem.credit;
          }
        }
      } else {
        const unusedCurated = distinctVisualPool.find((u) => !usedTemplatePhotos.has(u));
        if (unusedCurated) {
          photoUrl = toAbsoluteUrl(unusedCurated);
          usedTemplatePhotos.add(unusedCurated);
          photoSource = 'Curated Library';
          photoCredit = 'Verified Photo';
        }
      }

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
        photoSource,
        photoCredit,
        bgPrompt: tpl.title,
        design: composedCuratedDesign,
        defaultBullets: tpl.defaultBullets,
        targetKeywords: tpl.targetKeywords,
        estimatedViews: tpl.estimatedViews,
        defaultCaption: formattedCaption,
      };
    });

  // 3d. Adapt POSTER_TEMPLATES with strict merchant trade relevance & S3 category photography
  const TEXTURE_WALL_HEADLINES = [
    'Marble & Stone Texture Wall Painting',
    'Royal Luxury Velvet & Metallic Accents',
    'Designer Stencil & Geometric Wall Art',
    'Living Room Feature Accent Walls',
    'Flawless Surface Smoothing & Repainting',
    'Exterior Weatherproof Texture Coating',
    'Premium Italian Marble Wall Finishes',
    'Artisan Textured Wall Craftsmanship',
    'Modern 3D Textured Wall Concepts',
    'Durable Washable Luxury Wall Textures',
    'Transform Your Interiors with Wall Textures',
    '5-Star Rated Texture Painting in {city}',
    'Custom Texture Finishes for Homes & Offices',
    'Bespoke Wall Art & Metallic Finishes',
    'Commercial & Residential Painting Experts',
    'Book Your Free Texture Wall Consultation',
  ];

  const TEXTURE_WALL_SUBTITLES = [
    'Elevate your living spaces with bespoke luxury textures crafted by certified specialists in {city}.',
    'Guaranteed Italian marble and velvet finishes using premium washable, long-lasting materials.',
    'Dust-free, professional application completed on schedule with zero hassle for your home.',
    'High-end designer accent walls that add timeless elegance, depth, and character to any room.',
    'Superior weatherproof exterior protection with rich architectural textures that withstand all climates.',
    'Full color shade consultation and on-site wall sample demonstration before you begin.',
    'Guwahati & regional specialists trusted by 500+ happy homeowners and interior architects.',
    'Flawless craftsmanship, seamless edges, and complete post-painting cleanup guaranteed.',
  ];

  const DIVERSE_TRADE_BADGES = [
    'CORE SERVICE',
    'POPULAR CHOICE',
    'PREMIUM FINISH',
    'TOP RATED',
    'TRENDING DESIGN',
    'FEATURED CRAFT',
    'VERIFIED EXPERT',
    'SPECIAL OFFER',
  ];

  const getDiverseTradeCopy = (index: number, tabKey: string) => {
    if (isTextureOrPaintBusiness) {
      const h = TEXTURE_WALL_HEADLINES[index % TEXTURE_WALL_HEADLINES.length].replace(/\{city\}/g, city);
      const s = TEXTURE_WALL_SUBTITLES[index % TEXTURE_WALL_SUBTITLES.length].replace(/\{city\}/g, city);
      let b = DIVERSE_TRADE_BADGES[index % DIVERSE_TRADE_BADGES.length];
      if (tabKey === 'promotions') b = 'SPECIAL OFFER';
      else if (tabKey === 'festivals') b = 'FESTIVAL SPECIAL';
      else if (tabKey === 'reviews') b = '5-STAR RATED';
      return { headline: h, subtitle: s, badge: b };
    }

    const product = tradeProducts[index % tradeProducts.length] || industry;
    const headlinePatterns = [
      product,
      `Premium ${product} in ${city}`,
      `Expert ${product} Solutions`,
      `Top-Rated ${product} Specialist`,
      `Quality ${product} You Can Rely On`,
      `Transform Your Space with ${product}`,
      `Professional ${product} Services`,
      `Dependable ${product} for Homes & Offices`,
    ];
    const subtitlePatterns = [
      `Certified ${industry} excellence and guaranteed craftsmanship across ${city}.`,
      `Trusted by local clients for on-time delivery, transparent pricing, and lasting results.`,
      `Experience superior quality ${product.toLowerCase()} tailored to your exact requirements.`,
      `Book your consultation today with the leading ${industry.toLowerCase()} experts in ${city}.`,
      `Premium materials, experienced professionals, and 100% satisfaction guaranteed.`,
      `Highly rated across ${city} for dependable service, honesty, and immaculate execution.`,
    ];
    let b = DIVERSE_TRADE_BADGES[index % DIVERSE_TRADE_BADGES.length];
    if (tabKey === 'promotions') b = 'SPECIAL OFFER';
    else if (tabKey === 'festivals') b = 'FESTIVAL SPECIAL';
    else if (tabKey === 'reviews') b = '5-STAR RATED';

    return {
      headline: headlinePatterns[index % headlinePatterns.length],
      subtitle: subtitlePatterns[index % subtitlePatterns.length],
      badge: b,
    };
  };

  const allAdaptedPosterItems: BusinessTemplateResponseItem[] = tradeRelevantPosterTemplates.map((tpl, idx) => {
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

    // Dynamically detect if template badge or industry belongs to an incompatible trade
    const isConflictingBadge = Boolean(
      tpl.badge &&
      !/^(featured|showcase|core service|special offer|5-star rated|top rated|limited offer|verified|exclusive)$/i.test(tpl.badge.trim()) &&
      normalizeCategoryContext(tpl.badge).verticalKey !== searchContext.verticalKey
    );

    const isConflictingIndustry = Boolean(
      tpl.industries && tpl.industries.length > 0 &&
      !tpl.industries.some((i) => /^(any|universal|none|all)$/i.test(i.trim())) &&
      !tpl.industries.some((i) => normalizeCategoryContext(i).verticalKey === searchContext.verticalKey)
    );

    let badge = tpl.badge || '';

    if (!isFestival) {
      const match = headline.match(conflictingTradesRegex);
      if ((match && !isMerchantTrade(match[0])) || isConflictingBadge || isConflictingIndustry) {
        const copy = getDiverseTradeCopy(idx, tab);
        headline = copy.headline;
        subtitle = copy.subtitle;
        badge = copy.badge;
      }
    }

    if (isConflictingBadge || isConflictingIndustry || !badge || badge.length > 20) {
      if (tab === 'promotions') badge = 'SPECIAL OFFER';
      else if (tab === 'festivals') badge = 'FESTIVAL SPECIAL';
      else if (tab === 'reviews') badge = '5-STAR RATED';
      else if (!badge || badge.length > 20) {
        badge = DIVERSE_TRADE_BADGES[idx % DIVERSE_TRADE_BADGES.length];
      }
    }

    let assignedPhoto = '';
    let photoSourceKey: string = 'none';
    let photoCredit: string | undefined;

    if (isFestival) {
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

      const dynamicFestival = festivalVisualsByOccasion.get(occasion);
      if (dynamicFestival && dynamicFestival.length > 0) {
        const festivalCounter = (festivalCursor.get(occasion) || 0) + 1;
        festivalCursor.set(occasion, festivalCounter);
        const festivalItem = dynamicFestival[(festivalCounter - 1) % dynamicFestival.length];
        assignedPhoto = festivalItem?.url || '';
        photoSourceKey = festivalItem?.source || 'curated';
        photoCredit = festivalItem?.credit;
      } else if (tpl.photo && (tpl.photo.startsWith('/images/bgos/festivals/') || tpl.photo.startsWith('https://'))) {
        assignedPhoto = tpl.photo;
        photoSourceKey = 'curated';
      } else {
        assignedPhoto = getFestivalFallbackPhoto(occasion, idx);
        photoSourceKey = 'curated';
      }
    } else {
      const unusedPhoto = distinctVisualPool.find((u) => !usedTemplatePhotos.has(u));
      if (unusedPhoto) {
        assignedPhoto = unusedPhoto;
        usedTemplatePhotos.add(unusedPhoto);
        photoSourceKey = 'curated';
        photoCredit = 'Verified Photo';
      }
    }

    assignedPhoto = assignedPhoto ? toAbsoluteUrl(assignedPhoto) : '';

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
      photoSource: getCreativeSourceLabel(photoSourceKey),
      photoCredit,
      bgPrompt: tpl.bgPrompt || headline,
      occasionId: tpl.occasionId,
      design: composedDesign,
      targetKeywords: [
        { keyword: `${industry.toLowerCase()} company`, volume: 500 },
        { keyword: `${industry.toLowerCase()} in ${city}`, volume: 100 },
      ],
      estimatedViews: 45,
      defaultCaption: generateStructuredLocalSeoPost({
        businessName,
        city,
        topic: headline || industry,
        categoryOrIndustry: industry,
        phone,
        ctaType: 'CALL',
        angle: purpose === 'Promotion' ? 'promotion' : purpose === 'Trust-building' ? 'reviews' : 'service',
      }).fullContent,
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

  // Group and curate collections by tab with priority sorting for trade matches
  const isTradeMatch = (item: BusinessTemplateResponseItem): boolean => {
    return isMerchantTrade(item.name) || isMerchantTrade(item.headline);
  };

  const adaptedForBusiness = filteredPosterItems
    .filter((t) => t.tab === 'for_business')
    .sort((a, b) => Number(isTradeMatch(b)) - Number(isTradeMatch(a)));

  const forBusinessTemplates: BusinessTemplateResponseItem[] = curateTabTemplates(
    [
      ...blueprintResponseItems.filter((bp) => bp.tab === 'for_business'),
      ...curatedResponseItems.filter((cr) => cr.tab === 'for_business'),
      ...adaptedForBusiness,
    ],
    16
  );

  const promotionsTemplates: BusinessTemplateResponseItem[] = curateTabTemplates(
    [
      ...blueprintResponseItems.filter((bp) => bp.tab === 'promotions'),
      ...curatedResponseItems.filter((cr) => cr.tab === 'promotions'),
      ...filteredPosterItems.filter((t) => t.tab === 'promotions'),
    ],
    12
  );

  const requestedFestival = searchParams.get('festival') || 'all';

  // In festivals tab, dynamically search and map from the 242 authentic festival images catalog
  const festivalSearchResults = searchFestivalCatalog({
    query: searchQuery,
    festivalKey: requestedFestival !== 'all' ? requestedFestival : undefined,
    limit: 120,
  });

  const festivalAspect = (requestedAspect && ['1:1', '4:5', '9:16'].includes(requestedAspect))
    ? (requestedAspect as '1:1' | '4:5' | '9:16')
    : '4:5';

  const catalogFestivalTemplates: BusinessTemplateResponseItem[] = festivalSearchResults.items.map((item) => ({
    id: `fest-catalog-${item.id}`,
    layout: 'business_0',
    name: `${item.festivalLabel} • ${item.title}`,
    headline: `Happy ${item.festivalLabel}\nFrom ${businessName}`,
    subtitle: `${item.title} — Wishing you prosperity and success in ${city}`,
    badge: 'FESTIVAL SPECIAL',
    cta: `HAPPY ${item.festivalLabel.toUpperCase()}`,
    tab: 'festivals',
    purpose: 'Festival',
    theme: 'gold',
    aspectRatio: festivalAspect,
    photoUrl: item.url,
    photoSource: 'Curated Festival Library',
    occasionId: item.festivalKey,
    defaultBullets: [
      `Special ${item.festivalLabel} Greetings`,
      `Exclusive Seasonal Deals in ${city}`,
      `Trusted ${industry} Services`,
    ],
    defaultCaption: `Wishing you a joyous and blessed ${item.festivalLabel}! May this festive season bring immense prosperity, health, and happiness to you and your loved ones.\n\nWarm regards,\nTeam ${businessName}, ${city}.\n\n#${item.festivalKey} #festivalvibes #festivegreeting #${city.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
  }));

  const rawFestivalsTemplates: BusinessTemplateResponseItem[] = [
    ...blueprintResponseItems.filter((bp) => bp.tab === 'festivals'),
    ...curatedResponseItems.filter((cr) => cr.tab === 'festivals'),
    ...filteredPosterItems.filter((t) => t.tab === 'festivals'),
    ...catalogFestivalTemplates,
  ];

  let festivalsTemplates = rawFestivalsTemplates;
  if (requestedAspect && ['1:1', '4:5', '9:16'].includes(requestedAspect)) {
    festivalsTemplates = festivalsTemplates.filter((t) => t.aspectRatio === requestedAspect);
  }
  if (requestedFestival !== 'all') {
    festivalsTemplates = festivalsTemplates.filter(
      (t) => t.occasionId === requestedFestival || t.id.includes(requestedFestival) || t.headline.toLowerCase().includes(requestedFestival)
    );
  }
  if (searchQuery.trim()) {
    const qTokens = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
    festivalsTemplates = festivalsTemplates.filter((t) => {
      const text = `${t.name} ${t.headline} ${t.subtitle || ''} ${t.occasionId || ''}`.toLowerCase();
      return qTokens.every((token) => text.includes(token));
    });
  }

  const reviewsTemplates: BusinessTemplateResponseItem[] = curateTabTemplates(
    [
      ...blueprintResponseItems.filter((bp) => bp.tab === 'reviews'),
      ...curatedResponseItems.filter((cr) => cr.tab === 'reviews'),
      ...filteredPosterItems.filter((t) => t.tab === 'reviews'),
    ],
    8
  );

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
    const perCategory = Math.max(8, Math.floor(limit / 4));
    selectedTemplates = [
      ...forBusinessTemplates.slice(0, perCategory),
      ...promotionsTemplates.slice(0, perCategory),
      ...festivalsTemplates.slice(0, perCategory),
      ...reviewsTemplates.slice(0, perCategory),
    ].slice(0, limit);
  }

  // Strict Zero-Duplicate Enforcement across non-festival cards:
  // Non-festival cards must never reuse an identical photo across the feed.
  // If distinct authentic photos are exhausted, cards render clean graphic layouts.
  const seenNonFestivalPhotos = new Set<string>();
  for (const tpl of selectedTemplates) {
    if (tpl.tab === 'festivals') continue;
    if (tpl.photoUrl) {
      if (seenNonFestivalPhotos.has(tpl.photoUrl)) {
        tpl.photoUrl = '';
        tpl.photoSource = 'none';
        tpl.photoCredit = undefined;
      } else {
        seenNonFestivalPhotos.add(tpl.photoUrl);
      }
    }
  }

  // Calculate current AI image generation quota
  const isPaidSubscriber =
    tenant?.planStatus === 'active' &&
    Boolean(tenant?.plan) &&
    tenant.plan !== 'free';
  const isTrial = !isPaidSubscriber;

  let aiUsedCount = 0;
  if (isTrial) {
    aiUsedCount = await (db.imageLibrary?.count?.({
      where: { tenantId: user.tenantId, folder: 'bgos_ai_photos' },
    }) ?? Promise.resolve(0)).catch(() => 0);
  } else {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    aiUsedCount = await (db.imageLibrary?.count?.({
      where: {
        tenantId: user.tenantId,
        folder: 'bgos_ai_photos',
        createdAt: { gte: startOfDay },
      },
    }) ?? Promise.resolve(0)).catch(() => 0);
  }

  const aiQuota = {
    used: aiUsedCount,
    limit: 5,
    remaining: Math.max(0, 5 - aiUsedCount),
    tier: isTrial ? ('trial' as const) : ('active' as const),
    limitReached: aiUsedCount >= 5,
  };

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
      quota: aiQuota,
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
    festivalGroups: getFestivalGroupsWithCounts(),
    templates: selectedTemplates,
  });
}
