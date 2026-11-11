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
  const topicSuffix = topic?.trim() ? `, featuring ${topic.trim()}` : '';

  // 1. Hospitality / Pool / Farmhouse / Resort
  if (/(farmhouse|farm house|resort|villa|cottage|homestay|retreat|banquet|lawn|staycation|glamping|hotel|lodge|garden venue|poolside|pool)/i.test(profileBlob)) {
    return [
      {
        id: 'venue-pool-refresh',
        title: 'Private Poolside Oasis',
        icon: 'pool',
        prompt: `Crystal-clear luxury swimming pool with turquoise water ripples, premium poolside loungers, lush green palm backdrop, and bright natural morning sunlight at ${name}${loc}${topicSuffix}.`,
      },
      {
        id: 'venue-golden-hour',
        title: 'Golden-Hour Estate',
        icon: 'sparkles',
        prompt: `Photographed at golden hour: sprawling green lawns, private pavilion gazebo, warm ambient fairy lights, and serene evening skies at ${name}${loc}${topicSuffix}.`,
      },
      {
        id: 'venue-celebration-decor',
        title: 'Festive Celebration Setup',
        icon: 'party',
        prompt: `Welcoming outdoor family celebration setup at ${name}${loc} with glowing string lights, elegant open-air dining tables, and scenic nature views${topicSuffix}.`,
      },
      {
        id: 'venue-morning-brunch',
        title: 'Patio Brunch & Relax',
        icon: 'coffee',
        prompt: `Scenic outdoor patio table overlooking lush garden greenery at ${name}${loc}, artisanal breakfast service with fresh juice, coffee, and soft morning sunlight.`,
      },
    ];
  }

  // 2. Cake / Bakery / Desserts
  if (/(cake|bakery|pastry|dessert|mithai|sweet|cupcake|baker|patisserie|confection)/i.test(profileBlob)) {
    return [
      {
        id: 'cake-designer-showcase',
        title: 'Artisanal Designer Cake',
        icon: 'cake',
        prompt: `Spectacular multi-tiered designer celebration cake with delicate handcrafted buttercream frosting, edible florals, and golden accents at ${name}${loc}, marble pedestal, studio lighting${topicSuffix}.`,
      },
      {
        id: 'bakery-fresh-counter',
        title: 'Freshly Baked Treats',
        icon: 'bread',
        prompt: `Warm and inviting gourmet bakery counter at ${name}${loc} showcasing flaky golden croissants, fruit tarts, and artisanal bread loaves in soft morning light.`,
      },
      {
        id: 'cake-birthday-special',
        title: 'Custom Birthday Masterpiece',
        icon: 'gift',
        prompt: `Handmade custom themed birthday cake with colorful festive toppings, rich chocolate drip, and sparkling candles at ${name}${loc}, vibrant celebratory atmosphere.`,
      },
      {
        id: 'dessert-pastry-platter',
        title: 'Dessert & Pastry Platter',
        icon: 'sparkles',
        prompt: `Artfully arranged platter of decadent pastry slices, chocolate truffles, and macarons from ${name}${loc}, fine culinary photography with rich textures.`,
      },
    ];
  }

  // 3. Hardware / Power Tools / Building Materials
  if (/(hardware|tool|fastener|plumbing|electrical supply|plywood|sanitary|pipe|machinery)/i.test(profileBlob)) {
    return [
      {
        id: 'hardware-power-tools',
        title: 'Heavy-Duty Power Tools',
        icon: 'build',
        prompt: `Commercial product showcase of heavy-duty cordless power tools, drills, and angle grinders at ${name}${loc}, organized workshop setup with crisp industrial lighting${topicSuffix}.`,
      },
      {
        id: 'hardware-store-aisle',
        title: 'Storefront & Inventory',
        icon: 'store',
        prompt: `Spacious, immaculately organized hardware store interior at ${name}${loc}, showing rows of quality hand tools, architectural hardware, and brass fittings.`,
      },
      {
        id: 'hardware-craftsman-gear',
        title: 'Professional Craftsman Gear',
        icon: 'handyman',
        prompt: `Professional contractor toolkit with chrome-plated wrenches, precision calipers, and durable fasteners at ${name}${loc}, ultra-sharp commercial photography.`,
      },
      {
        id: 'hardware-construction-supply',
        title: 'Building & Plumbing Supplies',
        icon: 'hardware',
        prompt: `Premium sanitary, plumbing fixtures, and construction essentials arranged cleanly at ${name}${loc}, showcasing reliability and commercial durability.`,
      },
    ];
  }

  // 4. Paint Shop / Wall Finishes / Home Decor
  if (/(paint|color|wall finish|coating|texture|primer|asian paints|berger|nerolac|decor)/i.test(profileBlob)) {
    return [
      {
        id: 'paint-color-studio',
        title: 'Luxury Color Studio',
        icon: 'palette',
        prompt: `Vibrant paint studio display at ${name}${loc} with designer color swatch fan decks, premium paint cans, and contemporary textured wall samples${topicSuffix}.`,
      },
      {
        id: 'paint-accent-wall',
        title: 'Modern Accent Wall',
        icon: 'format-paint',
        prompt: `Stunning modern living room featuring rich velvety matte designer wall paint from ${name}${loc}, paired with warm interior lighting and stylish furniture.`,
      },
      {
        id: 'paint-palette-craft',
        title: 'Artisan Palette & Finishes',
        icon: 'brush',
        prompt: `Creative flat-lay composition of colorful paint swatches, wooden brushes with vibrant drips, and waterproof exterior coating textures from ${name}${loc}.`,
      },
      {
        id: 'paint-weatherproof-shield',
        title: 'All-Weather Exterior Coating',
        icon: 'shield',
        prompt: `Pristine modern home exterior featuring weather-proof, rain-resistant exterior paint from ${name}${loc}, bright crisp daylight with spotless finish.`,
      },
    ];
  }

  // 5. Software / Tech / IT Services
  if (/(software|it company|tech|developer|code|web development|app development|cloud|saas|digital marketing)/i.test(profileBlob)) {
    return [
      {
        id: 'tech-dev-workspace',
        title: 'Engineering Command Desk',
        icon: 'laptop',
        prompt: `Modern sleek software developer workspace at ${name}${loc} with dual 4K monitors displaying clean code and analytics, ergonomic desk, and subtle neon tech glow${topicSuffix}.`,
      },
      {
        id: 'tech-team-collaboration',
        title: 'Tech Team Brainstorming',
        icon: 'groups',
        prompt: `Innovative tech team collaborating around an interactive agile sprint whiteboard in a bright glass-walled studio at ${name}${loc}, dynamic startup energy.`,
      },
      {
        id: 'tech-cloud-platform',
        title: 'Cloud & AI Architecture',
        icon: 'cloud',
        prompt: `Futuristic minimalist desk with ultra-thin laptop showing 3D glowing cloud network connections and cyber-security dashboard at ${name}${loc}, crisp high-tech aesthetic.`,
      },
      {
        id: 'tech-mobile-solutions',
        title: 'Mobile App & UI Design',
        icon: 'smartphone',
        prompt: `High-resolution presentation of modern mobile app interface screens on sleek bezel-less devices at ${name}${loc}, clean graphic design aesthetic.`,
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
