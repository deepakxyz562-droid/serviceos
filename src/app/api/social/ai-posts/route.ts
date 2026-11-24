import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { listGoogleBusinessMedia } from '@/lib/social/adapters/googlebusiness';
import { getCategoryVisualPool } from '@/lib/designs/dynamic-visual-resolver';
import {
  getCategoryImagesFromS3,
  ensureOnboardingCategoryPack,
  getCategoryStorageFolder,
} from '@/lib/designs/category-image-engine';
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

const S3_BUCKET = process.env.AWS_S3_BUCKET || 'serviceos-assets-prod';
const S3_REGION = process.env.AWS_REGION || 'ap-south-1';
const S3_BASE = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/bgos-business-images/category_library`;

function buildPresetS3Urls(slug: string): string[] {
  return Array.from({ length: 12 }, (_, i) => `${S3_BASE}/${slug}/${slug}-${String(i + 1).padStart(3, '0')}.webp`);
}

const CATEGORY_IMAGE_PRESETS: Record<string, string[]> = {
  film_studio: buildPresetS3Urls('film_production_studio'),
  market: buildPresetS3Urls('grocery_supermarket'),
  pool: buildPresetS3Urls('farmhouse_resort'),
  cake: buildPresetS3Urls('bakery_cafe'),
  hardware: buildPresetS3Urls('hardware_tools'),
  paint: buildPresetS3Urls('paint_decor'),
  software: buildPresetS3Urls('it_software'),
  fashion: buildPresetS3Urls('fashion_boutique'),
  salon: buildPresetS3Urls('salon_spa'),
  restaurant: buildPresetS3Urls('restaurant_dining'),
  generic: buildPresetS3Urls('general_business'),
};

function resolveCategoryKey(blob: string): string {
  const lower = blob.toLowerCase();
  // Film, Media & Creative Studios must NOT be classified as software/IT
  if (/(film|cinema|movie|studio|video production|production house|cinematography|audiovisual)/.test(lower)) {
    return 'film_studio';
  }
  // Software & Tech
  if (/(software|it company|developer|code|web development|app development|cloud|saas|crm|platform|digital marketing)/.test(lower) && !/(film|cinema|studio|parlour|salon|hotel)/.test(lower)) {
    return 'software';
  }
  if (/(market|grocery|supermarket|kirana|general store|provision|mart|vegetable|fruit|bazaar|mandi|departmental)/.test(lower)) {
    return 'market';
  }
  if (/(fashion|boutique|cloth|garment|apparel|saree|lehenga|textile|tailor)/.test(lower)) {
    return 'fashion';
  }
  if (/(salon|spa|beauty|parlour|parlor|haircut|makeup|facial|barber|grooming)/.test(lower)) {
    return 'salon';
  }
  if (/(pool|swimming|farmhouse|resort|villa|cottage|homestay|retreat|staycation|banquet|lawn)/.test(lower)) {
    return 'pool';
  }
  if (/(cake|bakery|pastry|dessert|mithai|sweet|cupcake|baker|patisserie|confection)/.test(lower)) {
    return 'cake';
  }
  if (/(paint|hardware|tool|plumbing|electrical supply|plywood|sanitary|pipe|machinery)/.test(lower)) {
    return 'hardware';
  }
  if (/(paint|color|wall finish|coating|texture|primer|asian paints|berger|nerolac|decor)/.test(lower)) {
    return 'paint';
  }
  if (/(restaurant|dining|cafe|bistro|diner|food|fast food|dhaba|kitchen)/.test(lower)) {
    return 'restaurant';
  }
  return 'generic';
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
  logoUrl?: string | null;
  seed?: number;
}): GeneratedPostItem[] {
  const { businessName, category, city, phone, website, photos, logoUrl, seed = 0 } = params;
  const catKey = resolveCategoryKey(`${businessName} ${category}`);
  const dynamicVisualPool = getCategoryVisualPool(`${businessName} ${category}`);
  const baseImages = photos.length > 0 ? [...photos, ...dynamicVisualPool] : (CATEGORY_IMAGE_PRESETS[catKey] || dynamicVisualPool);
  // Rotate images if seed is provided for fresh look on refresh
  const imgShift = seed ? Math.abs(seed) % baseImages.length : 0;
  const allImages = [...baseImages.slice(imgShift), ...baseImages.slice(0, imgShift)];

  const cityToken = city || 'your local area';
  const bizClean = cleanHash(businessName);
  const cityClean = cleanHash(city || 'Local');

  // Templates for 20 diverse SEO themes
  const postBlueprints = [
    {
      theme: 'Primary Local SEO Hero Service',
      badge: 'Standard Post' as const,
      postType: 'STANDARD' as const,
      ctaText: 'CALL' as const,
      titleFactory: () =>
        catKey === 'market'
          ? `Fresh Grocery Essentials & Daily Household Supplies in ${cityToken} at ${businessName}`
          : catKey === 'pool'
          ? `Private Pool Venues Near ${cityToken} for Stress-Free Family Time`
          : catKey === 'cake'
          ? `Custom Designer Birthday Cakes in ${cityToken} with Fresh Cream & Handcrafted Toppings`
          : catKey === 'hardware'
          ? `Heavy-Duty Power Tools & Construction Hardware Supplies in ${cityToken}`
          : catKey === 'paint'
          ? `Luxury Designer Wall Paints & All-Weather Exterior Finishes in ${cityToken}`
          : catKey === 'software'
          ? `Enterprise Web & Custom Mobile App Development Services in ${cityToken}`
          : `Premier ${category} & Professional Trusted Services in ${cityToken}`,
      introFactory: () =>
        catKey === 'market'
          ? `Stock up on fresh quality groceries, daily kitchen staples, and trusted packaged goods at ${businessName} in ${cityToken}. From farm-fresh produce to everyday FMCG essentials, we bring you unmatched variety at honest neighborhood prices.`
          : catKey === 'pool'
          ? `Looking for a peaceful escape from the city rush without driving too far? ${businessName} offers a private swimming pool and green farmhouse setting designed for relaxed, stress-free family time. If you've been searching for a private farmhouse with pool, our property gives you privacy, safety, and pristine space to unwind together.`
          : catKey === 'cake'
          ? `Planning a birthday, anniversary, or milestone celebration in ${cityToken}? ${businessName} specializes in custom designer cakes made fresh from scratch with rich layers, premium ingredients, and stunning edible artistry to make your special moments truly memorable.`
          : catKey === 'hardware'
          ? `Whether you are a professional contractor or taking on a DIY renovation in ${cityToken}, ${businessName} carries a comprehensive inventory of industrial power tools, genuine fasteners, electrical fittings, and durable plumbing supplies under one roof.`
          : catKey === 'paint'
          ? `Transform your home or commercial space with vibrant colors and durable finishes from ${businessName} in ${cityToken}. We supply premium interior emulsions, waterproof exterior coatings, and expert color consultation tailored for local climate.`
          : catKey === 'software'
          ? `Accelerate your business growth with scalable digital engineering from ${businessName} in ${cityToken}. From high-performing web platforms to cloud solutions and custom software, our dedicated engineering team delivers robust technology for modern enterprises.`
          : `Looking for dependable ${category} solutions in ${cityToken}? ${businessName} provides high-quality services with dedicated attention to detail, transparent pricing, and trusted customer care.`,
      bulletFactory: () =>
        catKey === 'market'
          ? [
              'Farm-fresh vegetables, seasonal fruits, and dairy products stocked every morning',
              'Complete range of packaged staples, pulses, spices, oils, and household essentials',
              'Best wholesale and retail pricing with unbeatable daily combo savings',
              '100% genuine products with clear expiry checks and quality hygiene standards',
              `Convenient neighborhood shopping in ${cityToken} with quick checkout and parking`,
              'All digital payments accepted: UPI, PhonePe, Google Pay, Cards, and Cash',
            ]
          : catKey === 'pool'
          ? [
              'Exclusive private use of the swimming pool so your family never has to share space with strangers',
              'Spacious green lawns perfect for kids to play and elders to relax in clean, fresh air',
              'Hygienic, well-maintained pool with regular water filtration checks for a safe dip every time',
              `Convenient drive from ${cityToken} and surrounding areas with hassle-free parking`,
              'Flexible booking slots for half-day, full-day, or overnight stays to fit your schedule',
              'Ideal setting for birthdays, family get-togethers, and intimate outdoor celebrations',
            ]
          : catKey === 'cake'
          ? [
              '100% fresh baking on order with premium Belgian cocoa, real fruits, and dairy-pure ingredients',
              'Custom fondant designs, photo prints, and elegant floral toppings crafted to your vision',
              'Wide flavor palette: Dutch Truffle, Red Velvet, Fresh Berry, Butterscotch, and Biscoff',
              'Eggless and dietary customization options available upon advance request',
              `Punctual chilled temperature-safe delivery across ${cityToken} right to your doorstep`,
              'Complimentary cake knife, sparkler candles, and personalized message card included',
            ]
          : catKey === 'hardware'
          ? [
              'Authorized supplier of genuine branded power tools, cordless drills, and grinders',
              'Comprehensive stock of high-tensile fasteners, bolts, screws, and architectural hardware',
              'Heavy-duty plumbing, PVC fittings, sanitary ware, and high-pressure valves',
              'Bulk wholesale pricing and flexible credit terms for licensed local contractors',
              `Fast on-site delivery to construction and project sites throughout ${cityToken}`,
              'Expert technical assistance to help you pick the exact tool or material specification',
            ]
          : catKey === 'paint'
          ? [
              'Computerized precision color tinting with thousands of custom designer shades',
              'Heavy-duty exterior waterproof coatings designed to resist intense monsoons and UV fading',
              'Low-VOC, odorless interior emulsions that ensure safe indoor air quality for your family',
              'Complimentary color consultation and digital room visualization previews',
              `Genuine manufacturer guarantee on all paints, primers, and wall textures`,
              `Prompt local delivery across ${cityToken} for residential and commercial projects`,
            ]
          : catKey === 'software'
          ? [
              'Full-stack modern web and mobile application engineering built on scalable cloud infrastructure',
              'Custom API integration, automated CRM pipelines, and secure payment processing',
              'Intuitive UI/UX design optimized for frictionless user engagement and high conversion rates',
              'Rigorous QA automated testing and enterprise-grade data security compliance',
              'Agile sprint delivery with transparent weekly progress updates and dedicated project managers',
              'Ongoing 24/7 technical maintenance and performance monitoring post-launch',
            ]
          : [
              `Experienced and verified professionals delivering top-quality ${category} in ${cityToken}`,
              'Transparent quotes with no hidden charges or last-minute surprises',
              'Modern equipment and industry-approved methodologies for dependable results',
              'Convenient scheduling with quick response times when you need us most',
              '100% client satisfaction commitment backed by positive customer reviews',
              `Dedicated local customer support based right here in ${cityToken}`,
            ],
      conclusionFactory: () =>
        catKey === 'market'
          ? `Visit ${businessName} in ${cityToken} today for all your daily grocery and household needs. Call or message our store desk for quick queries or bulk orders.`
          : catKey === 'pool'
          ? `If you are searching for a family swimming pool venue or peaceful green retreat near you, book your break at ${businessName} in ${cityToken}. Call our team today to verify slot availability and reserve your date.`
          : catKey === 'cake'
          ? `Celebrate your special milestones with a showstopping handcrafted cake from ${businessName}. Call us or drop a message to discuss your custom design and place your order today.`
          : catKey === 'hardware'
          ? `Stop by ${businessName} in ${cityToken} for heavy-duty tools and hardware supplies you can rely on. Call our desk now for inventory checks and instant bulk quotes.`
          : catKey === 'paint'
          ? `Give your walls a lasting, beautiful finish with ${businessName} in ${cityToken}. Contact our color experts today for a free shade guide and project estimate.`
          : catKey === 'software'
          ? `Ready to build or scale your digital product? Schedule a discovery consultation with ${businessName} in ${cityToken} and bring your vision to life.`
          : `Experience trusted ${category} services in ${cityToken} with ${businessName}. Contact our team today to discuss your requirements.`,
      tagFactory: () => [
        `#${bizClean}`,
        `#${cityClean}${catKey === 'market' ? 'Market' : catKey === 'pool' ? 'Farmhouse' : catKey === 'cake' ? 'Bakery' : catKey === 'hardware' ? 'Hardware' : catKey === 'paint' ? 'Paints' : 'Services'}`,
        `#${cityClean}Shopping`,
        `#DailyEssentials`,
        `#LocalStore`,
        `#GoogleVerified`,
      ],
    },
    {
      theme: 'Weekend Super Saver Offers',
      badge: 'Special Offer' as const,
      postType: 'OFFER' as const,
      ctaText: 'GET OFFER' as const,
      titleFactory: () =>
        catKey === 'market'
          ? `Weekend Super Saver: Massive Discounts on Daily Essentials at ${businessName}`
          : `Weekend Special: Exclusive Package at ${businessName} in ${cityToken}`,
      introFactory: () =>
        catKey === 'market'
          ? `Planning your weekly grocery run? Enjoy exclusive weekend discounts across pantry staples, snacks, personal care, and fresh produce at ${businessName} in ${cityToken}.`
          : `Make your upcoming weekend truly memorable with our limited-capacity exclusive package at ${businessName}. Reserve early to secure preferred timings and personalized service in ${cityToken}.`,
      bulletFactory: () =>
        catKey === 'market'
          ? [
              'Up to 20% off on selected grocery bundles and family bulk packs',
              'Special weekend discounts on fresh seasonal fruits and premium dry fruits',
              'Extra savings when you buy combos of cooking oils, rice, and pulses',
              'Loyalty rewards and surprise gift vouchers on minimum purchases',
              'Fast billing counters to ensure minimum waiting time for weekend shoppers',
            ]
          : [
              'Special weekend pricing for pre-booked groups and advance reservations',
              'Complimentary value-added amenities and priority slot allocation',
              'Dedicated staff on-site to ensure smooth, stress-free hospitality and assistance',
              'Clean, sanitized, and fully prepared facilities prior to your arrival',
              'Transparent package pricing with zero unexpected extra charges',
            ],
      conclusionFactory: () =>
        catKey === 'market'
          ? `Weekend deals are valid while stock lasts! Drop by ${businessName} in ${cityToken} or call us today to confirm offer items.`
          : `Weekend dates fill up quickly. Contact ${businessName} now to check open slots and lock in your weekend booking.`,
      tagFactory: () => [
        `#${bizClean}`,
        `#WeekendIn${cityClean}`,
        `#${cityClean}Deals`,
        `#SuperSaver`,
        `#ShopLocal`,
      ],
    },
    {
      theme: 'Safety, Hygiene & Quality Assurance',
      badge: 'Standard Post' as const,
      postType: 'STANDARD' as const,
      ctaText: 'CALL' as const,
      titleFactory: () =>
        catKey === 'market'
          ? `100% Quality & Freshness Guarantee at ${businessName} in ${cityToken}`
          : `Why Families & Clients in ${cityToken} Choose ${businessName} for Quality & Safety`,
      introFactory: () =>
        catKey === 'market'
          ? `Your family deserves pure, hygienic, and fresh essentials every single day. At ${businessName}, every item on our shelves passes thorough quality and freshness checks before you take it home.`
          : `When it comes to ${category}, quality, safety, and hygiene come first. Discover how ${businessName} maintains strict quality benchmarks so you can enjoy complete peace of mind.`,
      bulletFactory: () =>
        catKey === 'market'
          ? [
              'Directly sourced fresh vegetables and fruits delivered from trusted farms',
              'Authorized retailer of certified FSSAI brands and genuine packaged goods',
              'Clean, organized, and temperature-managed shelves for hygienic storage',
              'Transparent digital weighing scales and computerized accurate billing',
              'Friendly store associates ready to assist you in locating your favorite items',
            ]
          : [
              'Rigorous quality control and sanitation procedures implemented daily',
              'Certified materials, genuine equipment, and premium-grade supplies',
              'Trained and courteous team following standard operating safety guidelines',
              'Clean and inviting ambiance maintained round the clock',
              'Hundreds of genuine 5-star reviews from satisfied local clients',
            ],
      conclusionFactory: () =>
        catKey === 'market'
          ? `Choose purity and authentic quality for your home. Visit ${businessName} in ${cityToken} or reach out to our team today.`
          : `Choose uncompromising standards for your loved ones and projects. Call ${businessName} today to learn more or schedule your visit.`,
      tagFactory: () => [
        `#${bizClean}`,
        `#QualityFirst`,
        `#${cityClean}Market`,
        `#SafeAndFresh`,
        `#CustomerTrust`,
      ],
    },
    {
      theme: 'Festive Shopping & Bulk Specials',
      badge: 'Seasonal Event' as const,
      postType: 'EVENT' as const,
      ctaText: 'ORDER' as const,
      titleFactory: () =>
        catKey === 'market'
          ? `Festive Shopping Festival: Special Combos & Festive Gift Hampers at ${businessName}`
          : `Host Memorable Private Events & Celebrations at ${businessName}`,
      introFactory: () =>
        catKey === 'market'
          ? `Celebrate every festival with joy and savings! ${businessName} brings you custom festive gift packs, premium sweets, dry fruits, and festive essentials in ${cityToken}.`
          : `Looking for the perfect venue or service to host your next private celebration in ${cityToken}? ${businessName} offers custom event setups designed for joyful, intimate gatherings.`,
      bulletFactory: () =>
        catKey === 'market'
          ? [
              'Curated gift hampers with premium dry fruits, chocolates, and festive goodies',
              'Bulk corporate and family orders accepted with customized gift wrapping',
              'Special festival combo pricing on cooking oils, ghee, flour, and sugar',
              'Exclusive festive discount vouchers on purchases above eligible thresholds',
              'Advance booking and timely pickup available for busy festive weeks',
            ]
          : [
              'Dedicated spaces and customized arrangements for birthdays and anniversaries',
              'Ample seating and tailored ambiance with ambient lighting',
              'Catering support and flexible vendor coordination permitted',
              'Privacy assured with exclusive venue or service booking',
              'Affordable celebration packages tailored to group size',
            ],
      conclusionFactory: () =>
        catKey === 'market'
          ? `Make your festival truly festive! Visit ${businessName} in ${cityToken} or call us today to order your festive hampers.`
          : `Let us make your milestone unforgettable. Call ${businessName} in ${cityToken} to discuss your event dates and requirements.`,
      tagFactory: () => [
        `#${bizClean}`,
        `#${cityClean}Festivals`,
        `#FestiveShopping`,
        `#GiftHampers`,
        `#SpecialMoments`,
      ],
    },
    {
      theme: 'Customer Trust & Neighborhood Convenience',
      badge: 'Standard Post' as const,
      postType: 'STANDARD' as const,
      ctaText: 'CALL' as const,
      titleFactory: () =>
        catKey === 'market'
          ? `Why Neighborhood Shoppers in ${cityToken} Rely on ${businessName}`
          : `Expert ${category} Advice: What Every Customer in ${cityToken} Should Know`,
      introFactory: () =>
        catKey === 'market'
          ? `Serving hundreds of satisfied families every week, ${businessName} is proud to be your trusted neighborhood market in ${cityToken}. Experience hassle-free shopping with genuine warmth and reliability.`
          : `Navigating your choices for ${category} can be overwhelming. The experts at ${businessName} share top insights to help you make informed decisions and get the best value in ${cityToken}.`,
      bulletFactory: () =>
        catKey === 'market'
          ? [
              'Decades of trusted service with an outstanding reputation for fair pricing',
              'Prompt phone order assistance and curbside pickup for local residents',
              'Stock updated weekly with all popular regional and national brands',
              'Smooth exchange and replacement policy on unopened packaged goods',
              'Consistently rated 5 stars for customer friendliness and product freshness',
            ]
          : [
              'Key factors to check before hiring or purchasing services',
              'How to maintain quality and longevity for long-term savings',
              'Common mistakes to avoid and how to spot genuine quality',
              'Personalized consultation available directly from our experienced specialists',
            ],
      conclusionFactory: () =>
        catKey === 'market'
          ? `Experience the joy of friendly, honest neighborhood shopping. Stop by ${businessName} in ${cityToken} or call us today.`
          : `Have questions about your upcoming requirement? Reach out to ${businessName} for honest, expert advice with zero obligations.`,
      tagFactory: () => [
        `#${bizClean}`,
        `#${cityClean}Shoppers`,
        `#NeighborhoodMarket`,
        `#TrustedStore`,
        `#LocalExperts`,
      ],
    },
  ];

  const generatedPosts: GeneratedPostItem[] = [];
  const blueprintOffset = seed ? Math.abs(seed) % postBlueprints.length : 0;

  for (let i = 0; i < 20; i++) {
    const blueprintIdx = (i + blueprintOffset) % postBlueprints.length;
    const blueprint = postBlueprints[blueprintIdx];
    const image = allImages[i % allImages.length];
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

    // Fetch real GBP photos if connected
    let realPhotos: string[] = [];
    if (googleAccount) {
      try {
        const gbpMedia = await listGoogleBusinessMedia(googleAccount, { pageSize: 12 });
        realPhotos = (gbpMedia?.mediaItems || [])
          .map((m) => m.googleUrl || m.thumbnailUrl)
          .filter((u): u is string => typeof u === 'string' && u.length > 0);
      } catch {}
    }

    // Also fetch uploaded images from imageLibrary
    const libraryRows = await db.imageLibrary.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { url: true },
    }).catch(() => []);

    const libraryUrls = libraryRows.map((r) => r.url).filter(Boolean);

    // Retrieve verified Cloudflare AI S3 Category Library images (Instant reuse if already existing)
    let s3CategoryVisuals = await getCategoryImagesFromS3(category, 20);
    if (s3CategoryVisuals.length < 5) {
      s3CategoryVisuals = await ensureOnboardingCategoryPack({
        category,
        businessName,
        city,
        services,
        targetCount: 5,
      });
    }

    const combinedPhotos = [...realPhotos, ...libraryUrls, ...s3CategoryVisuals];

    const basePosts = generate20PostsForBusiness({
      businessName,
      category,
      city,
      phone,
      website,
      photos: combinedPhotos,
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
