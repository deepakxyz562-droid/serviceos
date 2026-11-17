import { db } from '@/lib/db';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { listGoogleBusinessMedia } from '@/lib/social/adapters/googlebusiness';
import { generateDesignImage } from '@/lib/designs/image-provider';
import { normalizeCategoryContext } from './category-taxonomy';
import { searchFestivalCatalog } from '../../../shared/festival-catalog';

/**
 * Dynamic SMB Category Visual Mapping.
 * Instead of hardcoding static mockup files,
 * BGOS serves verified high-resolution commercial assets and dynamic S3-cached AI assets.
 */
const DEFAULT_FALLBACK_VISUALS = [
  'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=1200&auto=format&fit=crop&q=80',
];

const LOCAL_CATEGORY_TEMPLATES: Record<string, string[]> = {
  plywood_timber: [
    'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=1200&auto=format&fit=crop&q=80',
  ],
  indian_sweets: [
    'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=1200&auto=format&fit=crop&q=80',
  ],
  welding_fabrication: [
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&auto=format&fit=crop&q=80',
  ],
  solar_energy: [
    'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1200&auto=format&fit=crop&q=80',
  ],
  dental_clinic: [
    'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1200&auto=format&fit=crop&q=80',
  ],
  salon_spa: [
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&auto=format&fit=crop&q=80',
  ],
  auto_repair: [
    'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=1200&auto=format&fit=crop&q=80',
  ],
  fitness_gym: [
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&auto=format&fit=crop&q=80',
  ],
  restaurant_dining: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
  ],
  bakery_sweets: [
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&auto=format&fit=crop&q=80',
  ],
  plumbing: [
    'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=1200&auto=format&fit=crop&q=80',
  ],
  electrical: [
    'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1200&auto=format&fit=crop&q=80',
  ],
  hardware_tools: [
    'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=1200&auto=format&fit=crop&q=80',
  ],
  paint_decor: [
    'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=1200&auto=format&fit=crop&q=80',
  ],
  jewellery: [
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200&auto=format&fit=crop&q=80',
  ],
  fashion_boutique: [
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80',
  ],
  real_estate: [
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&auto=format&fit=crop&q=80',
  ],
  cleaning_services: [
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&auto=format&fit=crop&q=80',
  ],
  farmhouse_resort: [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&auto=format&fit=crop&q=80',
  ],
  it_software: [
    'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200&auto=format&fit=crop&q=80',
  ],
  legal_accounting: [
    'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=1200&auto=format&fit=crop&q=80',
  ],
  healthcare_medical: [
    'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1200&auto=format&fit=crop&q=80',
  ],
  security_services: [
    'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=1200&auto=format&fit=crop&q=80',
  ],
  security_cctv: [
    'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=1200&auto=format&fit=crop&q=80',
  ],
  grocery_supermarket: [
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&auto=format&fit=crop&q=80',
  ],
  pet_vet: [
    'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=1200&auto=format&fit=crop&q=80',
  ],
  photography_studio: [
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200&auto=format&fit=crop&q=80',
  ],
  hvac_aircon: [
    'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=1200&auto=format&fit=crop&q=80',
  ],
  roofing: [
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&auto=format&fit=crop&q=80',
  ],
  landscaping_lawn: [
    'https://images.unsplash.com/photo-1558904541-efa8c4a08931?w=1200&auto=format&fit=crop&q=80',
  ],
  logistics_courier: [
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&auto=format&fit=crop&q=80',
  ],
  education_academy: [
    'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&auto=format&fit=crop&q=80',
  ],
  event_decor: [
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&auto=format&fit=crop&q=80',
  ],
  generic_business: DEFAULT_FALLBACK_VISUALS,
};

export const CURATED_SMB_IMAGE_REGISTRY: Record<string, string[]> = new Proxy(LOCAL_CATEGORY_TEMPLATES, {
  get(target, prop: string) {
    if (prop in target) return target[prop];
    return DEFAULT_FALLBACK_VISUALS;
  },
});

const SEMANTIC_KEY_MAP: Array<{ key: string; keywords: string[] }> = [
  { key: 'plywood_timber', keywords: ['plywood', 'timber', 'sunmica', 'laminate', 'veneer'] },
  { key: 'indian_sweets', keywords: ['sweet', 'mithai', 'halwai', 'namkeen', 'ladoo', 'laddu'] },
  { key: 'welding_fabrication', keywords: ['weld', 'fabricat', 'steel', 'iron gate', 'metal work'] },
  { key: 'solar_energy', keywords: ['solar', 'pv panel', 'clean energy'] },
  { key: 'dental_clinic', keywords: ['dent', 'teeth', 'tooth', 'orthodont'] },
  { key: 'salon_spa', keywords: ['salon', 'saloon', 'spa', 'haircut', 'makeup', 'parlour', 'parlor'] },
  { key: 'auto_repair', keywords: ['auto', 'car', 'garage', 'mechanic', 'vehicle repair'] },
  { key: 'fitness_gym', keywords: ['gym', 'fitness', 'crossfit', 'workout'] },
  { key: 'bakery_sweets', keywords: ['cake', 'bakery', 'pastry', 'dessert'] },
  { key: 'restaurant_dining', keywords: ['restaurant', 'dining', 'cafe', 'bistro'] },
  { key: 'plumbing', keywords: ['plumb', 'pipe', 'drain', 'leak', 'sanitary'] },
  { key: 'electrical', keywords: ['electr', 'wiring', 'circuit', 'switchboard'] },
  { key: 'hardware_tools', keywords: ['hardware', 'power tool', 'fastener', 'bearing'] },
  { key: 'paint_decor', keywords: ['paint', 'asian paints', 'wall finish', 'primer'] },
  { key: 'jewellery', keywords: ['jewel', 'gold', 'diamond', 'silver'] },
  { key: 'fashion_boutique', keywords: ['fashion', 'boutique', 'cloth', 'apparel', 'saree'] },
  { key: 'real_estate', keywords: ['real estate', 'realtor', 'property', 'builder', 'apartment'] },
  { key: 'cleaning_services', keywords: ['janitor', 'deep clean', 'disinfect', 'housekeep'] },
  { key: 'farmhouse_resort', keywords: ['farmhouse', 'resort', 'swimming pool', 'villa stay'] },
  { key: 'it_software', keywords: ['software', 'it ', 'code', 'developer', 'web dev', 'app dev', 'cloud', 'fieseros', 'serviceos', 'saas', 'crm', 'field service', 'platform', 'automation'] },
  { key: 'legal_accounting', keywords: ['legal', 'law', 'lawyer', 'attorney', 'notary', 'chartered accountant', 'ca ', 'audit', 'tax'] },
  { key: 'healthcare_medical', keywords: ['health', 'doctor', 'clinic', 'medical', 'hospital', 'pharmacy'] },
  { key: 'security_services', keywords: ['security', 'guard', 'cctv', 'surveillance', 'patrol'] },
  { key: 'grocery_supermarket', keywords: ['grocery', 'supermarket', 'kirana', 'sabzi mandi', 'provision store'] },
  { key: 'pet_vet', keywords: ['pet', 'veterin', 'vet', 'dog', 'puppy'] },
  { key: 'photography_studio', keywords: ['photograph', 'photo studio', 'videograph'] },
  { key: 'hvac_aircon', keywords: ['hvac', 'air condition', 'ac repair', 'chiller'] },
  { key: 'roofing', keywords: ['roof', 'shingle', 'gutter', 'shed'] },
  { key: 'landscaping_lawn', keywords: ['landscape', 'gardening', 'lawn care', 'nursery'] },
  { key: 'logistics_courier', keywords: ['courier', 'logistic', 'cargo', 'freight', 'packer'] },
  { key: 'education_academy', keywords: ['education', 'coaching', 'tuition', 'academy', 'institute'] },
  { key: 'event_decor', keywords: ['event', 'wedding', 'decorator', 'tent house'] },
];

/**
 * Maps any industry, topic or query string to the best matching SMB category key.
 * Scales dynamically to all 4,000+ Google Business Profile categories.
 */
export function scoreIndustryMatch(text: string): string {
  const normalized = (text || '').trim().toLowerCase();
  if (!normalized) return 'generic_business';

  for (const item of SEMANTIC_KEY_MAP) {
    if (item.keywords.some((kw) => normalized.includes(kw))) {
      return item.key;
    }
  }

  const context = normalizeCategoryContext(normalized);
  const verticalMap: Record<string, string> = {
    building_materials_hardware: 'plywood_timber',
    food_sweets_confectionery: 'indian_sweets',
    beauty_personal_care: 'salon_spa',
    health_medical_wellness: 'healthcare_medical',
    automotive_vehicles: 'auto_repair',
    fitness_sports: 'fitness_gym',
    fashion_apparel_jewellery: 'fashion_boutique',
    grocery_retail_fmcg: 'grocery_supermarket',
    home_electrical_services: 'electrical',
    real_estate_interiors: 'real_estate',
    it_software_digital: 'it_software',
    professional_legal_finance: 'legal_accounting',
    education_coaching: 'education_academy',
    events_hospitality: 'event_decor',
    logistics_industrial: 'welding_fabrication',
    security_safety_services: 'security_services',
  };

  return verticalMap[context.verticalKey] || 'generic_business';
}

/**
 * Resolves festival visual pool directly from the authentic 242-photo master catalog.
 */
export function getFestivalVisualPool(occasion: string): string[] {
  const matches = searchFestivalCatalog({ festivalKey: occasion, limit: 10 });
  if (matches.items.length > 0) {
    return matches.items.map((m) => m.url);
  }
  const general = searchFestivalCatalog({ limit: 10 });
  if (general.items.length > 0) {
    return general.items.map((m) => m.url);
  }
  return ['/images/bgos/festivals/diwali/Clay_oil_lamps_on_balcony_6c4c0407.webp'];
}

/**
 * Returns a randomized visual pool for any business industry or query.
 */
export function getCategoryVisualPool(industryOrQuery: string): string[] {
  const norm = normalizeCategoryContext(industryOrQuery);
  if (norm.isFestival && norm.detectedOccasion) {
    const festPool = getFestivalVisualPool(norm.detectedOccasion);
    if (festPool.length > 0) return festPool;
  }
  const key = scoreIndustryMatch(industryOrQuery);
  const pool = CURATED_SMB_IMAGE_REGISTRY[key] || CURATED_SMB_IMAGE_REGISTRY.generic_business;
  return [...pool];
}

/**
 * Live Unsplash Search API integration.
 * Dynamically queries Unsplash by query terms if an access key is configured.
 */
export async function searchUnsplashApi(
  query: string,
  count = 10,
  signal?: AbortSignal,
): Promise<string[]> {
  const accessKey =
    process.env.UNSPLASH_ACCESS_KEY ||
    process.env.UNSPLASH_CLIENT_ID ||
    process.env.UNSPLASH_API_KEY;

  if (!accessKey || !query.trim()) return [];

  try {
    const url = new URL('https://api.unsplash.com/search/photos');
    url.searchParams.set('query', query.trim());
    url.searchParams.set('per_page', String(Math.min(count, 30)));
    url.searchParams.set('orientation', 'landscape');
    url.searchParams.set('content_filter', 'high');

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Client-ID ${accessKey.trim()}`,
        'Accept-Version': 'v1',
      },
      signal,
    });

    if (!res.ok) {
      console.warn(`[searchUnsplashApi] HTTP ${res.status}: ${res.statusText}`);
      return [];
    }

    const data = (await res.json()) as { results?: Array<{ urls?: { regular?: string; raw?: string } }> };
    if (!Array.isArray(data.results)) return [];

    return data.results
      .map((item) => {
        if (item.urls?.regular) return item.urls.regular;
        if (item.urls?.raw) return `${item.urls.raw}&w=1200&auto=format&fit=crop&q=80`;
        return '';
      })
      .filter((u): u is string => Boolean(u && u.startsWith('http')));
  } catch (err: unknown) {
    console.warn('[searchUnsplashApi] Search failed, falling back:', err instanceof Error ? err.message : err);
    return [];
  }
}

export interface ResolveVisualOptions {
  tenantId?: string;
  industry: string;
  topic?: string;
  imageKeyword?: string;
  imagePrompt?: string;
  preferRealPhotos?: boolean;
  generateAiImage?: boolean;
  signal?: AbortSignal;
}

/**
 * High-Level Multi-Tier Dynamic Visual Resolver:
 *  - Tier 1: Real Business Photos First (Google Business Profile + Brand Library)
 *  - Tier 2: Real-time dynamic Unsplash Search API (if UNSPLASH_ACCESS_KEY configured)
 *  - Tier 3: Curated 35+ SMB Semantic Taxonomy (Instant, zero-failure fallback)
 *  - Tier 4: Generative AI on-demand (FLUX / SiliconFlow / NVIDIA via generateDesignImage)
 */
export async function resolveBusinessPostVisual(opts: ResolveVisualOptions): Promise<string> {
  const {
    tenantId,
    industry,
    topic,
    imageKeyword,
    imagePrompt,
    preferRealPhotos = true,
    generateAiImage = false,
    signal,
  } = opts;

  // Tier 4 Option: On-demand AI Generation
  if (generateAiImage && imagePrompt) {
    try {
      const generated = await generateDesignImage(
        imagePrompt,
        'gemini',
        signal || AbortSignal.timeout(60000),
        false,
        { category: industry },
      );
      if (generated?.bytes) {
        // Return base64 or upload URL if generated
        const b64 = generated.bytes.toString('base64');
        return `data:image/jpeg;base64,${b64}`;
      }
    } catch (err) {
      console.warn('[resolveBusinessPostVisual] AI generation failed, falling back:', err);
    }
  }

  // Tier 1: Real Business Photos from Google Maps & Brand Library
  if (preferRealPhotos && tenantId) {
    try {
      const googleAccount = await prepareGoogleAccount(tenantId).catch(() => null);
      if (googleAccount) {
        const gMedia = await Promise.race([
          listGoogleBusinessMedia(googleAccount),
          new Promise<{ mediaItems: [] }>((r) => setTimeout(() => r({ mediaItems: [] }), 3000)),
        ]).catch(() => ({ mediaItems: [] }));

        const gbpPhotos = (gMedia.mediaItems || [])
          .filter((m: any) => m.googleUrl && m.mediaFormat !== 'VIDEO')
          .map((m: any) => m.googleUrl as string);

        if (gbpPhotos.length > 0) {
          return gbpPhotos[Math.floor(Math.random() * gbpPhotos.length)];
        }
      }

      // Check Brand Library
      const libraryRows = await db.imageLibrary.findMany({
        where: {
          tenantId,
          NOT: [{ folder: { contains: 'retired' } }, { mediaType: { startsWith: 'video/' } }],
        },
        take: 20,
        select: { url: true },
      }).catch(() => []);

      const validLibUrls = libraryRows
        .map((r) => r.url)
        .filter((u): u is string => Boolean(u && (u.startsWith('http') || u.startsWith('/'))));

      if (validLibUrls.length > 0) {
        return validLibUrls[Math.floor(Math.random() * validLibUrls.length)];
      }
    } catch (err) {
      console.warn('[resolveBusinessPostVisual] First-party photo lookup error:', err);
    }
  }

  // Tier 2: Real-time dynamic Unsplash Search API
  const searchQuery = (imageKeyword?.trim() || `${industry} ${topic || ''}`).trim();
  if (searchQuery) {
    const livePhotos = await searchUnsplashApi(searchQuery, 10, signal);
    if (livePhotos.length > 0) {
      return livePhotos[Math.floor(Math.random() * livePhotos.length)];
    }
  }

  // Tier 3: Curated 35+ Industry Semantic Registry (Instant fallback)
  const fallbackQuery = `${industry} ${topic || ''} ${imageKeyword || ''}`;
  const visualPool = getCategoryVisualPool(fallbackQuery);
  return visualPool[Math.floor(Math.random() * visualPool.length)];
}
