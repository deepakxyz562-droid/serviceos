import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { listGoogleBusinessMedia } from '@/lib/social/adapters/googlebusiness';

export interface BusinessAiContext {
  name: string;
  category: string;
  location: string;
  products: string[];
  services: string[];
  website: string;
}

export interface PreviousBusinessPhoto {
  id: string;
  url: string;
  title?: string;
  source: 'library' | 'post' | 'google';
}

export interface BusinessImageIdea {
  id: string;
  title: string;
  icon: string;
  prompt: string;
}

const VIDEO_EXT_RE = /\.(mp4|mov|webm|m4v|3gp|mkv|avi)(\?|$)/i;

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

function buildIdeasForBusiness(
  business: BusinessAiContext,
  topic?: string,
): BusinessImageIdea[] {
  const name = business.name || 'our business';
  const category = business.category || 'local business';
  const loc = business.location ? ` in ${business.location}` : '';
  const allOfferings = [...business.products, ...business.services].filter(Boolean);
  const topOffering = allOfferings[0] || category;
  const secondOffering = allOfferings[1] || allOfferings[0] || category;

  const profileBlob = `${name} ${category} ${allOfferings.join(' ')} ${topic || ''}`.toLowerCase();
  const isHospitalityVenue =
    /(farmhouse|farm house|resort|villa|cottage|homestay|retreat|banquet|lawn|staycation|glamping|hotel|lodge|garden venue|poolside)/i.test(
      profileBlob,
    );

  if (isHospitalityVenue) {
    const topicSuffix = topic?.trim() ? `, featuring ${topic.trim()}` : '';
    return [
      {
        id: 'venue-golden-hour',
        title: 'Golden-Hour Exterior',
        icon: 'sparkles',
        prompt: `Keep the real property and architecture of ${name}${loc} from the reference photo, photographed at golden hour with warm fairy lights, lush manicured green lawn, clear evening sky, and inviting luxury getaway atmosphere${topicSuffix}.`,
      },
      {
        id: 'venue-poolside-lounge',
        title: 'Pool & Garden Lounge',
        icon: 'sun',
        prompt: `Transform the setting of ${name} using the reference photo with crystal-clear water reflections, cozy resort loungers, fresh floral accents, lush palms, and sun-dappled morning relaxation vibes${topicSuffix}.`,
      },
      {
        id: 'venue-celebration-decor',
        title: 'Festive Event Decor',
        icon: 'party',
        prompt: `Preserve the authentic property structure from the reference photo and stage a welcoming evening celebration setup at ${name} with marigold or warm white floral arches, glowing string lights, and outdoor seating${topicSuffix}.`,
      },
      {
        id: 'venue-morning-brunch',
        title: 'Patio Brunch Setup',
        icon: 'coffee',
        prompt: `Scenic outdoor patio table at ${name}${loc} overlooking the property greenery from the reference photo, dressed with artisanal breakfast coffee service, fresh fruit, linen tableware, and soft natural sunlight.`,
      },
    ];
  }

  const topicLead = topic?.trim()
    ? `Focused on "${topic.trim()}": `
    : '';

  return [
    {
      id: 'biz-hero-showcase',
      title: 'Signature Showcase',
      icon: 'sparkles',
      prompt: `${topicLead}Photorealistic commercial hero photo for ${name}${loc} highlighting ${topOffering} (${category}), styled cleanly in natural daylight using the authentic environment/product from the reference photo.`,
    },
    {
      id: 'biz-workspace-action',
      title: 'Team & Service Action',
      icon: 'briefcase',
      prompt: `${topicLead}Authentic behind-the-scenes customer service photo at ${name}${loc}, showing clean modern equipment and expert attention to ${secondOffering}, bright trustworthy atmosphere.`,
    },
    {
      id: 'biz-golden-upgrade',
      title: 'Warm Golden Ambience',
      icon: 'sun',
      prompt: `${topicLead}Preserve the core subject and setting from the reference photo for ${name}, enhanced with warm studio-grade lighting, spotless presentation, and welcoming depth of field.`,
    },
    {
      id: 'biz-seasonal-promo',
      title: 'Seasonal Promo Look',
      icon: 'gift',
      prompt: `${topicLead}Festive promotional lifestyle scene tailored for ${name} (${category}${loc}), showcasing ${topOffering} with subtle warm celebratory accents and crisp clean framing.`,
    },
  ];
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
        select: { name: true, industry: true, address: true, settingsJson: true, country: true },
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

  let brandBrainProducts: string[] = [];
  if (tenant?.settingsJson) {
    try {
      const parsedSettings = JSON.parse(tenant.settingsJson);
      const items = parsedSettings?.brandBrain?.sellingItems;
      if (Array.isArray(items)) {
        brandBrainProducts = items
          .map((it: any) => (typeof it?.name === 'string' ? it.name.trim() : ''))
          .filter(Boolean);
      }
    } catch {}
  }

  const business: BusinessAiContext = {
    name: brandProfile?.businessName || tenant?.name || 'Your Business',
    category: brandProfile?.industry || tenant?.industry || 'Local Business',
    location: brandProfile?.location || tenant?.address || '',
    products: Array.from(
      new Set([...parseStringArray(brandProfile?.products), ...brandBrainProducts]),
    ).slice(0, 12),
    services: parseStringArray(brandProfile?.services).slice(0, 12),
    website: brandProfile?.website || '',
  };

  const seenUrls = new Set<string>();
  const previousPhotos: PreviousBusinessPhoto[] = [];

  const pushPhoto = (item: PreviousBusinessPhoto) => {
    const norm = normalizeUrl(item.url, origin);
    if (!isUsablePhotoUrl(norm) || seenUrls.has(norm)) return;
    seenUrls.add(norm);
    previousPhotos.push({ ...item, url: norm });
  };

  for (const row of libraryRows || []) {
    if (typeof row?.folder === 'string' && row.folder.includes('retired')) continue;
    if (typeof row?.mediaType === 'string' && row.mediaType.startsWith('video/')) continue;
    if (typeof row?.url === 'string') {
      pushPhoto({
        id: row.id,
        url: row.url,
        title: row.name || undefined,
        source: 'library',
      });
    }
  }

  for (const post of postRows || []) {
    const urls = parseMediaUrls(post?.mediaUrls);
    let title: string | undefined;
    try {
      const offer = post?.gbpOfferData ? JSON.parse(post.gbpOfferData) : null;
      if (offer?.mediaFormat === 'VIDEO') continue;
      if (typeof offer?.title === 'string') title = offer.title;
    } catch {}
    for (const u of urls) {
      pushPhoto({
        id: `post-${post.id}`,
        url: u,
        title,
        source: 'post',
      });
    }
  }

  const includeGoogle = request.nextUrl.searchParams.get('includeGoogle') !== '0';
  if (includeGoogle && googleAccount) {
    try {
      const gMedia = await Promise.race([
        listGoogleBusinessMedia(googleAccount),
        new Promise<{ mediaItems: [] }>((resolve) =>
          setTimeout(() => resolve({ mediaItems: [] }), 3000),
        ),
      ]);
      for (const [idx, m] of (gMedia.mediaItems || []).slice(0, 12).entries()) {
        if (m.googleUrl) {
          pushPhoto({
            id: m.name || `google-${idx}`,
            url: m.googleUrl,
            title: m.category ? `GBP · ${m.category}` : 'Google Business Photo',
            source: 'google',
          });
        }
      }
    } catch {}
  }

  return {
    business,
    previousPhotos: previousPhotos.slice(0, 24),
    ideas: buildIdeasForBusiness(business, topic),
  };
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const topic = request.nextUrl.searchParams.get('topic') || undefined;
  const payload = await gatherContextAndPhotos(request, user.tenantId, topic);
  return NextResponse.json(payload);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const topic = typeof body.topic === 'string' ? body.topic.trim() : undefined;
  const payload = await gatherContextAndPhotos(request, user.tenantId, topic);
  return NextResponse.json(payload);
}
