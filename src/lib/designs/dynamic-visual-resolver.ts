import { db } from '@/lib/db';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { listGoogleBusinessMedia } from '@/lib/social/adapters/googlebusiness';
import { generateDesignImage } from '@/lib/designs/image-provider';
import { normalizeCategoryContext } from './category-taxonomy';

/**
 * Dynamic SMB Category Visual Mapping.
 * Instead of hardcoding hundreds of external Unsplash links in source code,
 * BGOS serves verified local WebP template assets and dynamic S3-cached AI assets.
 */
const DEFAULT_FALLBACK_VISUALS = [
  '/images/bgos/templates/it_software.webp',
  '/images/bgos/templates/restaurant.webp',
  '/images/bgos/templates/dental.webp',
  '/images/bgos/templates/salon.webp',
  '/images/bgos/templates/property.webp',
  '/images/bgos/templates/automotive.webp',
  '/images/bgos/templates/fitness.webp',
  '/images/bgos/templates/plumbing.webp',
  '/images/bgos/templates/coaching.webp',
  '/images/bgos/templates/security_cctv.webp',
];

const LOCAL_CATEGORY_TEMPLATES: Record<string, string[]> = {
  plywood_timber: ['/images/bgos/templates/property.webp', '/images/bgos/templates/plumbing.webp'],
  indian_sweets: ['/images/bgos/templates/cafe.webp', '/images/bgos/templates/restaurant.webp'],
  welding_fabrication: ['/images/bgos/templates/automotive.webp', '/images/bgos/templates/plumbing.webp'],
  solar_energy: ['/images/bgos/templates/plumbing.webp', '/images/bgos/templates/it_software.webp'],
  dental_clinic: ['/images/bgos/templates/dental.webp', '/images/bgos/templates/physio.webp'],
  salon_spa: ['/images/bgos/templates/salon.webp'],
  auto_repair: ['/images/bgos/templates/automotive.webp'],
  fitness_gym: ['/images/bgos/templates/fitness.webp'],
  restaurant_dining: ['/images/bgos/templates/restaurant.webp', '/images/bgos/templates/cafe.webp'],
  bakery_sweets: ['/images/bgos/templates/cafe.webp', '/images/bgos/templates/restaurant.webp'],
  plumbing: ['/images/bgos/templates/plumbing.webp'],
  electrical: ['/images/bgos/templates/plumbing.webp', '/images/bgos/templates/security_cctv.webp'],
  hardware_tools: ['/images/bgos/templates/plumbing.webp'],
  paint_decor: ['/images/bgos/templates/property.webp'],
  jewellery: ['/images/bgos/templates/fashion.webp'],
  fashion_boutique: ['/images/bgos/templates/fashion.webp'],
  real_estate: ['/images/bgos/templates/property.webp'],
  cleaning_services: ['/images/bgos/templates/plumbing.webp'],
  farmhouse_resort: ['/images/bgos/templates/property.webp'],
  it_software: ['/images/bgos/templates/it_software.webp'],
  legal_accounting: ['/images/bgos/templates/edition-professional-services.webp'],
  healthcare_medical: ['/images/bgos/templates/dental.webp', '/images/bgos/templates/physio.webp'],
  security_services: ['/images/bgos/templates/security_cctv.webp'],
  security_cctv: ['/images/bgos/templates/security_cctv.webp'],
  grocery_supermarket: ['/images/bgos/templates/cafe.webp'],
  pet_vet: ['/images/bgos/templates/physio.webp'],
  photography_studio: ['/images/bgos/templates/edition-events-lifestyle.webp'],
  hvac_aircon: ['/images/bgos/templates/plumbing.webp'],
  roofing: ['/images/bgos/templates/property.webp'],
  landscaping_lawn: ['/images/bgos/templates/property.webp'],
  logistics_courier: ['/images/bgos/templates/automotive.webp'],
  education_academy: ['/images/bgos/templates/coaching.webp'],
  event_decor: ['/images/bgos/templates/edition-events-lifestyle.webp'],
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
  { key: 'it_software', keywords: ['software', 'it ', 'code', 'developer', 'web dev', 'app dev', 'cloud', 'fieseros', 'serviceos'] },
  { key: 'legal_accounting', keywords: ['legal', 'law', 'lawyer', 'attorney', 'notary', 'chartered accountant', 'ca ', 'audit', 'tax'] },
  { key: 'healthcare_medical', keywords: ['health', 'doctor', 'clinic', 'medical', 'hospital', 'pharmacy'] },
  { key: 'security_services', keywords: ['security', 'guard', 'cctv', 'surveillance', 'patrol'] },
  { key: 'grocery_supermarket', keywords: ['grocery', 'supermarket', 'kirana', 'provision'] },
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

const FESTIVAL_ASSET_MAP: Record<string, string[]> = {
  diwali: ['/images/bgos/templates/diwali.webp'],
  holi: ['/images/bgos/templates/edition-holi.webp'],
  eid: ['/images/bgos/templates/edition-eid.webp'],
  christmas: ['/images/bgos/templates/edition-christmas.webp'],
  new_year: ['/images/bgos/templates/edition-new-year.webp'],
  independence_day: ['/images/bgos/templates/edition-independence-day.webp'],
  republic_day: ['/images/bgos/templates/edition-republic-day.webp'],
  rakhi: ['/images/bgos/templates/edition-rakhi.webp'],
  navratri: ['/images/bgos/templates/edition-navratri.webp'],
  dussehra: ['/images/bgos/templates/edition-navratri.webp'],
  chhath_puja: ['/images/bgos/templates/diwali.webp'],
  valentine: ['/images/bgos/templates/edition-valentine.webp'],
  mothers_day: ['/images/bgos/templates/edition-mothers-day.webp'],
  fathers_day: ['/images/bgos/templates/edition-fathers-day.webp'],
};

/**
 * Returns a randomized visual pool for any business industry or query.
 */
export function getCategoryVisualPool(industryOrQuery: string): string[] {
  const norm = normalizeCategoryContext(industryOrQuery);
  if (norm.isFestival && norm.detectedOccasion && FESTIVAL_ASSET_MAP[norm.detectedOccasion]) {
    return [...FESTIVAL_ASSET_MAP[norm.detectedOccasion]];
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
