import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { callAI, extractJson } from '@/lib/ai-client';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { listGoogleBusinessMedia } from '@/lib/social/adapters/googlebusiness';
import { extractTenantGeoAndSeoContext, type TenantSeoContext } from '@/lib/designs/seo-metadata';

export interface BusinessAiContext {
  name: string;
  category: string;
  location: string;
  city?: string;
  products: string[];
  services: string[];
  website: string;
  topSearchTerms?: string[];
  trackedKeywords?: string[];
  missingCategories?: string[];
  geoCoordinates?: { lat: number; lng: number } | null;
}

export interface PreviousBusinessPhoto {
  id: string;
  url: string;
  title?: string;
  category?: string;
  source: 'library' | 'post' | 'google';
}

export interface BusinessImageIdea {
  id: string;
  title: string;
  icon: string;
  prompt: string;
  category?: 'ADDITIONAL' | 'EXTERIOR' | 'INTERIOR' | 'PRODUCT' | 'AT_WORK' | 'TEAMS';
  targetKeyword?: string;
  reason?: string;
}

const VIDEO_EXT_RE = /\.(mp4|mov|webm|m4v|3gp|mkv|avi)(\?|$)/i;
const CORE_GBP_MEDIA_CATEGORIES = ['EXTERIOR', 'INTERIOR', 'PRODUCT', 'AT_WORK', 'TEAMS'] as const;

function parseStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .filter((x): x is string => typeof x === 'string')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((x): x is string => typeof x === 'string')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  } catch {}
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseMediaUrls(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((u): u is string => typeof u === 'string' && u.trim().length > 0).map((u) => u.trim());
  }
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((u): u is string => typeof u === 'string' && u.trim().length > 0).map((u) => u.trim());
    }
    if (typeof parsed === 'string' && parsed.trim()) return [parsed.trim()];
  } catch {
    if (raw.startsWith('http') || raw.startsWith('/')) return [raw.trim()];
  }
  return [];
}

function resolveOrigin(request: NextRequest): string | null {
  const proto =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
    request.nextUrl?.protocol?.replace(/:$/, '') ||
    'https';
  const host =
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    request.headers.get('host')?.split(',')[0]?.trim();
  if (host) return `${proto}://${host}`;
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  return envUrl ? envUrl.replace(/\/$/, '') : null;
}

function normalizeUrl(rawUrl: string, origin: string | null): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/') && origin) return `${origin}${trimmed}`;
  return trimmed;
}

function isUsablePhotoUrl(url: string): boolean {
  if (!url || VIDEO_EXT_RE.test(url)) return false;
  if (url.startsWith('data:') || url.startsWith('blob:')) return false;
  return /^https?:\/\//i.test(url) || url.startsWith('/uploads/');
}

function buildDeterministicIdeas(
  business: BusinessAiContext,
  seoCtx: TenantSeoContext,
  options: { topic?: string; hasPreviousPhotos: boolean },
): BusinessImageIdea[] {
  const name = business.name || 'our business';
  const category = business.category || 'local business';
  const loc = business.city || business.location;
  const locPhrase = loc ? ` in ${loc}` : '';
  const offerings = Array.from(new Set([...business.products, ...business.services].filter(Boolean)));
  const topOffering = offerings[0] || category;
  const secondOffering = offerings[1] || offerings[0] || category;
  const topKw = seoCtx.topKeywords[0] || topOffering;
  const secondKw = seoCtx.topKeywords[1] || secondOffering;
  const refPrefix = options.hasPreviousPhotos
    ? 'Keep the authentic real-world property look from our selected reference photo: '
    : '';
  const profileBlob = `${name} ${category} ${offerings.join(' ')} ${options.topic || ''}`.toLowerCase();

  const ideas: BusinessImageIdea[] = [];

  if (options.topic && options.topic.trim()) {
    const cleanTopic = options.topic.trim();
    ideas.push({
      id: 'topic-custom',
      title: cleanTopic.slice(0, 36),
      icon: '✨',
      category: 'ADDITIONAL',
      targetKeyword: topKw,
      reason: 'Custom topic blend',
      prompt: `${refPrefix}High-resolution authentic commercial photograph of ${name}${locPhrase} showcasing ${cleanTopic} (${topOffering}), bright inviting lighting, natural realistic composition, no text or watermarks.`,
    });
  }

  if (/(farmhouse|resort|villa|pool|lawn|staycation|banquet|cottage|hotel)/i.test(profileBlob)) {
    ideas.push(
      {
        id: 'hospitality-pool',
        title: topKw !== topOffering ? `Rank for "${topKw.slice(0, 26)}"` : 'Crystal Pool & Courtyard',
        icon: '🏊',
        category: 'EXTERIOR',
        targetKeyword: topKw,
        reason: seoCtx.searchTerms[0] ? `GBP Search Term (${seoCtx.searchTerms[0].impressions} searches)` : 'Exterior hero shot',
        prompt: `${refPrefix}Golden-hour luxury photography of ${name}${locPhrase} featuring ${topOffering}, turquoise swimming pool reflections, manicured lawn, warm architectural glow, natural editorial realism, no text.`,
      },
      {
        id: 'hospitality-celebration',
        title: 'Evening Celebration Setup',
        icon: '✨',
        category: 'INTERIOR',
        targetKeyword: secondKw,
        reason: 'Drives group & event bookings',
        prompt: `${refPrefix}Warm atmospheric evening view of ${name}${locPhrase} styled for private celebrations and weekend retreats with fairy lights, seating lounge, and welcoming ambiance, photorealistic commercial photography, no text.`,
      },
      {
        id: 'hospitality-guest-space',
        title: 'Daytime Guest Lounge',
        icon: '🌿',
        category: 'PRODUCT',
        targetKeyword: topOffering,
        reason: 'Highlights core amenity',
        prompt: `${refPrefix}Bright morning photography showcasing ${secondOffering} at ${name}${locPhrase}, shaded outdoor veranda, lush greenery, crisp depth of field, authentic real-world look, no text.`,
      },
    );
  } else if (/(market|grocery|supermarket|mart|kirana|provisions)/i.test(profileBlob)) {
    ideas.push(
      {
        id: 'retail-aisle',
        title: topKw !== topOffering ? `Rank for "${topKw.slice(0, 24)}"` : 'Fresh Stocked Aisles',
        icon: '🛒',
        category: 'INTERIOR',
        targetKeyword: topKw,
        reason: 'Builds buyer trust before visiting',
        prompt: `${refPrefix}Bright, spotless retail interior at ${name}${locPhrase} with neatly stocked shelves of ${topOffering} and crisp fresh produce aisles, authentic commercial storefront photography, no text.`,
      },
      {
        id: 'retail-storefront',
        title: 'Clean Storefront Welcome',
        icon: '🏪',
        category: 'EXTERIOR',
        targetKeyword: `${category}${loc ? ` ${loc}` : ''}`,
        reason: 'Helps customers spot your entrance',
        prompt: `${refPrefix}Crisp daytime exterior view of ${name}${locPhrase}, welcoming entrance and clean display shelves featuring ${secondOffering}, natural sunlight, sharp commercial clarity, no watermarks.`,
      },
    );
  } else if (/(bakery|cake|pastry|sweet|mithai|restaurant|cafe|food)/i.test(profileBlob)) {
    ideas.push(
      {
        id: 'culinary-hero',
        title: `Signature ${topOffering.slice(0, 22)}`,
        icon: '🍰',
        category: 'PRODUCT',
        targetKeyword: topKw,
        reason: 'Highest-converting food showcase',
        prompt: `${refPrefix}Editorial macro culinary photography of signature ${topOffering} freshly prepared at ${name}${locPhrase}, appetizing textures, warm artisan presentation, shallow depth of field, no text.`,
      },
      {
        id: 'culinary-interior',
        title: 'Cozy Customer Ambience',
        icon: '☕',
        category: 'INTERIOR',
        targetKeyword: secondKw,
        reason: 'Attracts dine-in visits',
        prompt: `${refPrefix}Welcoming interior view of ${name}${locPhrase} with clean display counters and warm ambient pendant lighting showcasing fresh craftsmanship, crisp commercial photo, no text.`,
      },
    );
  } else {
    ideas.push(
      {
        id: 'service-hero',
        title: topKw ? `Rank for "${topKw.slice(0, 24)}"` : `Showcase ${topOffering.slice(0, 22)}`,
        icon: '📸',
        category: 'PRODUCT',
        targetKeyword: topKw,
        reason: seoCtx.searchTerms[0] ? 'Top Google Search Term' : 'Core offering focus',
        prompt: `${refPrefix}Photorealistic commercial showcase of ${name}${locPhrase} highlighting ${topOffering} (${category}), spotless professional environment, natural daylight, authentic local look, no text or watermarks.`,
      },
      {
        id: 'service-exterior',
        title: `Storefront${loc ? ` in ${loc.split(',')[0]}` : ' View'}`,
        icon: '📍',
        category: 'EXTERIOR',
        targetKeyword: `${category}${loc ? ` ${loc.split(',')[0]}` : ''}`,
        reason: 'Boosts Maps walk-in confidence',
        prompt: `${refPrefix}Welcoming clean exterior and customer reception showcase of ${name}${locPhrase} (${category}), sharp commercial photography with warm natural light, no distorted signs or watermarks.`,
      },
    );
  }

  // Always fill missing GBP photo categories so local SEO gallery stays balanced
  const missing = business.missingCategories || [];
  if (missing.includes('AT_WORK') || ideas.length < 4) {
    ideas.push({
      id: 'gbp-at-work',
      title: 'Team & Service in Action',
      icon: '🛠️',
      category: 'AT_WORK',
      targetKeyword: secondKw,
      reason: missing.includes('AT_WORK') ? 'Missing GBP At-Work photo' : 'Builds service credibility',
      prompt: `${refPrefix}Authentic behind-the-scenes commercial photo of certified professionals at ${name}${locPhrase} delivering ${secondOffering} cleanly and carefully, natural lighting, crisp DSLR quality, no text.`,
    });
  }

  if (missing.includes('TEAMS') || ideas.length < 4) {
    ideas.push({
      id: 'gbp-team',
      title: 'Friendly Local Team',
      icon: '🤝',
      category: 'TEAMS',
      targetKeyword: name,
      reason: missing.includes('TEAMS') ? 'Missing GBP Team photo' : 'Human trust signal',
      prompt: `${refPrefix}Warm, authentic portrait-style commercial shot of the welcoming staff team inside ${name}${locPhrase} ready to assist customers, spotless space, natural friendly smiles, no overlaid text.`,
    });
  }

  return ideas.slice(0, 5);
}

async function generateSeoAwareIdeas(
  business: BusinessAiContext,
  seoCtx: TenantSeoContext,
  options: { topic?: string; hasPreviousPhotos: boolean },
): Promise<{ ideas: BusinessImageIdea[]; aiPowered: boolean }> {
  const fallback = buildDeterministicIdeas(business, seoCtx, options);
  const hasRealSeoSignal =
    Boolean(options.topic) ||
    seoCtx.searchTerms.length > 0 ||
    seoCtx.trackedKeywords.length > 0 ||
    business.products.length > 0 ||
    business.services.length > 0;

  if (!hasRealSeoSignal) {
    return { ideas: fallback, aiPowered: false };
  }

  try {
    const res = await callAI({
      json: true,
      timeoutMs: 4_500,
      temperature: 0.45,
      messages: [
        {
          role: 'system',
          content:
            'You are a Google Business Profile local SEO photographer & visual strategist. Generate 4 high-converting visual photo ideas for a local business to shoot/generate for Google Maps. Rules: Keep prompts purely visual (NO text/logos/watermarks in image). If reference photos exist, ideas[0].prompt MUST start with "Using our reference photo, ". If a custom topic is given, ideas[0].prompt MUST include that exact topic phrase. Return strict JSON array of objects: [{"title":"3-5 words","icon":"emoji","category":"EXTERIOR|INTERIOR|PRODUCT|AT_WORK|TEAMS","targetKeyword":"keyword","reason":"short 4-7 word SEO reason","prompt":"detailed 25-40 word photorealistic visual prompt"}].',
        },
        {
          role: 'user',
          content: JSON.stringify({
            businessName: business.name,
            category: business.category,
            city: business.city || business.location,
            products: business.products.slice(0, 6),
            services: business.services.slice(0, 6),
            topSearchTerms: seoCtx.searchTerms.slice(0, 6),
            trackedKeywords: seoCtx.trackedKeywords.slice(0, 6).map((k) => k.keyword),
            missingGbpCategories: business.missingCategories || [],
            hasReferencePhotos: options.hasPreviousPhotos,
            requestedTopic: options.topic || null,
          }),
        },
      ],
    });

    const parsed = extractJson<any>(res.content || '');
    const list = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.ideas)
        ? parsed.ideas
        : null;

    if (Array.isArray(list) && list.length >= 2) {
      const validCats = new Set(['ADDITIONAL', 'EXTERIOR', 'INTERIOR', 'PRODUCT', 'AT_WORK', 'TEAMS']);
      const cleaned: BusinessImageIdea[] = list
        .slice(0, 5)
        .map((row: any, idx: number) => {
          const catRaw = String(row?.category || 'ADDITIONAL').toUpperCase();
          let prompt = String(row?.prompt || '').trim();
          if (idx === 0 && options.hasPreviousPhotos && !/reference photo/i.test(prompt)) {
            prompt = `Using our reference photo, ${prompt}`;
          }
          if (idx === 0 && options.topic && !prompt.toLowerCase().includes(options.topic.toLowerCase())) {
            prompt = `${options.topic} — ${prompt}`;
          }
          return {
            id: `ai-idea-${idx + 1}`,
            title: String(row?.title || `Idea ${idx + 1}`).trim().slice(0, 42),
            icon: String(row?.icon || '✨').trim().slice(0, 4),
            category: (validCats.has(catRaw) ? catRaw : 'ADDITIONAL') as BusinessImageIdea['category'],
            targetKeyword: typeof row?.targetKeyword === 'string' ? row.targetKeyword.trim() : undefined,
            reason: typeof row?.reason === 'string' ? row.reason.trim().slice(0, 60) : undefined,
            prompt,
          };
        })
        .filter((item) => item.prompt.length >= 20);

      if (cleaned.length >= 2) {
        return { ideas: cleaned, aiPowered: true };
      }
    }
  } catch {
    // Graceful fallback below
  }

  return { ideas: fallback, aiPowered: false };
}

async function gatherContextAndPhotos(
  request: NextRequest,
  tenantId: string,
  topic?: string,
) {
  const origin = resolveOrigin(request);

  const [brandProfile, tenant, libraryRows, postRows, googleAccount] = await Promise.all([
    db.brandProfile.findUnique({ where: { tenantId } }).catch(() => null),
    db.tenant
      .findUnique({
        where: { id: tenantId },
        select: {
          name: true,
          industry: true,
          address: true,
          city: true,
          state: true,
          latitude: true,
          longitude: true,
          settingsJson: true,
          country: true,
        },
      })
      .catch(() => null),
    db.imageLibrary
      .findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 40,
        select: { id: true, name: true, url: true, folder: true, mediaType: true },
      })
      .catch(() => []),
    db.socialPost
      .findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 40,
        select: { id: true, mediaUrls: true, gbpOfferData: true },
      })
      .catch(() => []),
    prepareGoogleAccount(tenantId).catch(() => null),
  ]);

  let parsedSettings: Record<string, any> = {};
  if (tenant?.settingsJson) {
    try {
      parsedSettings = JSON.parse(tenant.settingsJson);
    } catch {}
  }

  let gbpMeta: Record<string, any> = {};
  if (googleAccount?.metadata) {
    try {
      gbpMeta =
        typeof googleAccount.metadata === 'string'
          ? JSON.parse(googleAccount.metadata)
          : googleAccount.metadata;
    } catch {}
  }

  const seoCtx = await extractTenantGeoAndSeoContext(tenantId, { gbpMeta });

  // Detect owner's personal name to avoid displaying person name instead of business name
  const ownerUser =
    typeof (db as any).user?.findFirst === 'function'
      ? await (db as any).user.findFirst({ where: { tenantId }, select: { name: true } }).catch(() => null)
      : null;
  const ownerNameLower = (ownerUser?.name || '').toLowerCase().trim();

  const isPersonalOrGeneric = (candidate?: string | null): boolean => {
    if (!candidate) return true;
    const lower = candidate.toLowerCase().trim();
    if (
      lower === 'your business' ||
      lower === 'my business' ||
      lower === 'business profile' ||
      lower.includes('workspace')
    ) {
      return true;
    }
    if (ownerNameLower && (lower === ownerNameLower || lower === `${ownerNameLower}'s business`)) {
      return true;
    }
    return false;
  };

  const activeGbpTitle = (parsedSettings.activeGbpTitle || gbpMeta.locationTitle || '').trim();
  const googleAccountName = (googleAccount?.accountName || '').trim();
  const blueprintName = (parsedSettings.blueprint?.businessName || parsedSettings.locationName || '').trim();
  const brandProfileName = (brandProfile?.businessName || '').trim();
  const tenantName = (tenant?.name || '').trim();

  let resolvedBusinessName = '';
  if (activeGbpTitle && !isPersonalOrGeneric(activeGbpTitle)) {
    resolvedBusinessName = activeGbpTitle;
  } else if (googleAccountName && !isPersonalOrGeneric(googleAccountName)) {
    resolvedBusinessName = googleAccountName;
  } else if (brandProfileName && !isPersonalOrGeneric(brandProfileName)) {
    resolvedBusinessName = brandProfileName;
  } else if (blueprintName && !isPersonalOrGeneric(blueprintName)) {
    resolvedBusinessName = blueprintName;
  } else if (tenantName && !isPersonalOrGeneric(tenantName)) {
    resolvedBusinessName = tenantName;
  } else {
    resolvedBusinessName =
      activeGbpTitle || googleAccountName || brandProfileName || blueprintName || tenantName || 'Your Business';
  }

  let resolvedCategory = (parsedSettings.activeGbpCategory || '').trim();
  if (!resolvedCategory) {
    const rawBpCat = (brandProfile?.industry || tenant?.industry || '').trim();
    if (
      /it company|software|tech/i.test(rawBpCat) &&
      /(market|grocery|supermarket|mart|store|kirana|bazaar|farm|pool|resort|clinic|salon|jewel|paint|hardware)/i.test(
        resolvedBusinessName,
      )
    ) {
      if (/(market|grocery|supermarket|mart|store|kirana|bazaar)/i.test(resolvedBusinessName)) {
        resolvedCategory = 'Grocery & Supermarket';
      } else if (/(pool|swimming|farmhouse|resort|villa|cottage|homestay)/i.test(resolvedBusinessName)) {
        resolvedCategory = 'Farmhouse & Resort';
      } else if (/(hardware|tool|sanitary|pipe)/i.test(resolvedBusinessName)) {
        resolvedCategory = 'Hardware & Tools';
      } else if (/(paint|color|decor)/i.test(resolvedBusinessName)) {
        resolvedCategory = 'Paint & Home Decor';
      } else {
        resolvedCategory = 'Retail & Local Services';
      }
    } else if (rawBpCat) {
      resolvedCategory = rawBpCat;
    } else if (gbpMeta.category && !/community centre|corporate/i.test(gbpMeta.category)) {
      resolvedCategory = gbpMeta.category;
    } else if (/(market|grocery|supermarket|mart|store|kirana|bazaar)/i.test(resolvedBusinessName)) {
      resolvedCategory = 'Grocery & Supermarket';
    } else {
      resolvedCategory = gbpMeta.category || 'Retail & Local Services';
    }
  }

  const seenUrls = new Set<string>();
  const previousPhotos: PreviousBusinessPhoto[] = [];
  const coveredGbpCategories = new Set<string>();

  const pushPhoto = (item: PreviousBusinessPhoto) => {
    const norm = normalizeUrl(item.url, origin);
    if (!isUsablePhotoUrl(norm) || seenUrls.has(norm)) return;
    seenUrls.add(norm);
    if (item.category) coveredGbpCategories.add(item.category.toUpperCase());
    previousPhotos.push({ ...item, url: norm });
  };

  // 1. Prioritize authentic Google Business Profile photos
  const includeGoogle = request.nextUrl.searchParams.get('includeGoogle') !== '0';
  if (includeGoogle && googleAccount) {
    try {
      const gMedia = await Promise.race([
        listGoogleBusinessMedia(googleAccount),
        new Promise<{ mediaItems: [] }>((resolve) =>
          setTimeout(() => resolve({ mediaItems: [] }), 4000),
        ),
      ]);
      for (const [idx, m] of (gMedia.mediaItems || []).slice(0, 24).entries()) {
        if (m.googleUrl) {
          pushPhoto({
            id: m.name || `google-${idx}`,
            url: m.googleUrl,
            title: m.category ? `Google Business · ${m.category}` : 'Google Business Photo',
            category: m.category,
            source: 'google',
          });
        }
      }
    } catch (err) {
      console.warn('[ai-image-ideas] Google Business Media fetch fallback:', err);
    }
  }

  // 2. Add published and scheduled social post photos
  for (const post of postRows || []) {
    const urls = parseMediaUrls(post?.mediaUrls);
    let title: string | undefined;
    let cat: string | undefined;
    try {
      const offer = post?.gbpOfferData ? JSON.parse(post.gbpOfferData) : null;
      if (offer?.mediaFormat === 'VIDEO') continue;
      if (typeof offer?.title === 'string') title = offer.title;
      if (typeof offer?.category === 'string') cat = offer.category;
    } catch {}
    for (const u of urls) {
      pushPhoto({
        id: `post-${post.id}`,
        url: u,
        title: title || 'Social Post Media',
        category: cat,
        source: 'post',
      });
    }
  }

  // 3. Add brand image library rows
  for (const row of libraryRows || []) {
    if (typeof row?.folder === 'string' && row.folder.includes('retired')) continue;
    if (typeof row?.mediaType === 'string' && row.mediaType.startsWith('video/')) continue;
    if (typeof row?.url === 'string') {
      pushPhoto({
        id: row.id,
        url: row.url,
        title: row.name || 'Brand Library Photo',
        source: 'library',
      });
    }
  }

  const missingCategories = CORE_GBP_MEDIA_CATEGORIES.filter((c) => !coveredGbpCategories.has(c));

  const business: BusinessAiContext = {
    name: resolvedBusinessName,
    category: resolvedCategory,
    location: brandProfile?.location || tenant?.address || gbpMeta.address || seoCtx.city || '',
    city: seoCtx.city || brandProfile?.location || '',
    products: Array.from(new Set([...parseStringArray(brandProfile?.products), ...seoCtx.products])).slice(0, 12),
    services: Array.from(new Set([...parseStringArray(brandProfile?.services), ...seoCtx.services])).slice(0, 12),
    website:
      brandProfile?.website && !brandProfile.website.includes('fieseros.com')
        ? brandProfile.website
        : gbpMeta.website && !gbpMeta.website.includes('fieseros.com')
          ? gbpMeta.website
          : '',
    topSearchTerms: seoCtx.searchTerms.slice(0, 6).map((s) => s.keyword),
    trackedKeywords: seoCtx.trackedKeywords.slice(0, 6).map((t) => t.keyword),
    missingCategories: Array.from(missingCategories),
    geoCoordinates:
      seoCtx.latitude !== null && seoCtx.longitude !== null
        ? { lat: seoCtx.latitude, lng: seoCtx.longitude }
        : null,
  };

  const { ideas, aiPowered } = await generateSeoAwareIdeas(business, seoCtx, {
    topic,
    hasPreviousPhotos: previousPhotos.length > 0,
  });

  return {
    business,
    previousPhotos: previousPhotos.slice(0, 48),
    ideas,
    aiPowered,
  };
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const topic = request.nextUrl.searchParams.get('topic') || undefined;
    const payload = await gatherContextAndPhotos(request, user.tenantId, topic);
    return NextResponse.json(payload);
  } catch (err) {
    console.error('[/api/social/ai-image-ideas GET] error:', err);
    return NextResponse.json(
      { error: 'Could not load AI image ideas right now.' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const topic = typeof body.topic === 'string' ? body.topic.trim() : undefined;
    const payload = await gatherContextAndPhotos(request, user.tenantId, topic);
    return NextResponse.json(payload);
  } catch (err) {
    console.error('[/api/social/ai-image-ideas POST] error:', err);
    return NextResponse.json(
      { error: 'Could not generate AI image ideas right now.' },
      { status: 500 },
    );
  }
}
