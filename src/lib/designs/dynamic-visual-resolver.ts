import { db } from '@/lib/db';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { listGoogleBusinessMedia } from '@/lib/social/adapters/googlebusiness';
import { generateDesignImage } from '@/lib/designs/image-provider';
import { normalizeCategoryContext } from './category-taxonomy';
import { searchFestivalCatalog } from '../../../shared/festival-catalog';
import { getCategoryStorageFolder } from './category-image-engine';

/**
 * Dynamic SMB Category Visual Mapping.
 * Instead of hardcoding external Unsplash photos,
 * ServiceOS / BGOS serves verified AWS S3 category library assets generated via Cloudflare Workers AI FLUX.
 */

function buildCategoryVisualUrls(folder: string, verifiedList: string[], count = 30): string[] {
  const list = verifiedList.length > 0 ? verifiedList : ['/images/industry/industry.webp'];
  return Array.from(new Set(list.filter(Boolean)));
}

const LOCAL_CATEGORY_TEMPLATES: Record<string, string[]> = {
  plywood_timber: buildCategoryVisualUrls('plywood_timber', ['/images/bgos/templates/property.webp', '/images/industry/industry.webp']),
  indian_sweets: buildCategoryVisualUrls('indian_sweets', ['/images/bgos/templates/cafe.webp', '/images/industry/food.webp', '/images/bgos/templates/restaurant.webp']),
  welding_fabrication: buildCategoryVisualUrls('welding_fabrication', ['/images/industry/industry.webp', '/images/industry/auto.webp']),
  solar_energy: buildCategoryVisualUrls('solar_energy', ['/images/industry/electrical.webp', '/images/industry/roofing.webp']),
  dental_clinic: buildCategoryVisualUrls('dental_clinic', ['/images/bgos/templates/dental.webp', '/images/bgos/templates/physio.webp']),
  salon_spa: buildCategoryVisualUrls('salon_spa', ['/images/bgos/templates/salon.webp', '/images/industry/salon.webp']),
  auto_repair: buildCategoryVisualUrls('auto_repair', ['/images/bgos/templates/automotive.webp', '/images/industry/auto.webp']),
  fitness_gym: buildCategoryVisualUrls('fitness_gym', ['/images/bgos/templates/fitness.webp']),
  restaurant_dining: buildCategoryVisualUrls('restaurant_dining', ['/images/bgos/templates/restaurant.webp', '/images/industry/food.webp', '/images/bgos/templates/cafe.webp']),
  bakery_cafe: buildCategoryVisualUrls('bakery_cafe', ['/images/bgos/templates/cafe.webp', '/images/industry/food.webp']),
  plumbing: buildCategoryVisualUrls('plumbing', ['/images/bgos/templates/plumbing.webp', '/images/industry/plumbing.webp']),
  electrical: buildCategoryVisualUrls('electrical', ['/images/industry/electrical.webp']),
  hardware_tools: buildCategoryVisualUrls('hardware_tools', ['/images/industry/industry.webp', '/images/industry/electrical.webp']),
  paint_decor: buildCategoryVisualUrls('paint_decor', ['/images/industry/painting.webp']),
  jewellery: buildCategoryVisualUrls('jewellery', ['/images/bgos/templates/fashion.webp']),
  fashion_boutique: buildCategoryVisualUrls('fashion_boutique', ['/images/bgos/templates/fashion.webp']),
  real_estate: buildCategoryVisualUrls('real_estate', ['/images/bgos/templates/property.webp']),
  cleaning_services: buildCategoryVisualUrls('cleaning_services', ['/images/industry/cleaning.webp']),
  farmhouse_resort: buildCategoryVisualUrls('farmhouse_resort', ['/images/bgos/templates/property.webp', '/images/bgos/templates/restaurant.webp']),
  it_software: buildCategoryVisualUrls('it_software', ['/images/industry/industry.webp', '/images/bgos/templates/coaching.webp']),
  legal_accounting: buildCategoryVisualUrls('legal_accounting', ['/images/bgos/templates/coaching.webp', '/images/industry/industry.webp']),
  healthcare_medical: buildCategoryVisualUrls('healthcare_medical', ['/images/bgos/templates/physio.webp', '/images/bgos/templates/dental.webp']),
  security_services: buildCategoryVisualUrls('security_services', [
    '/images/industry/security.webp',
    '/images/bgos/templates/security.webp',
    '/images/industry/security-cctv.webp',
  ]),
  security_cctv: buildCategoryVisualUrls('security_cctv', [
    '/images/industry/security-cctv.webp',
    '/images/industry/security.webp',
  ]),
  grocery_supermarket: buildCategoryVisualUrls('grocery_supermarket', ['/images/industry/food.webp', '/images/bgos/templates/cafe.webp']),
  pet_vet: buildCategoryVisualUrls('pet_vet', ['/images/industry/pet.webp']),
  photography_studio: buildCategoryVisualUrls('photography_studio', ['/images/industry/photography.webp']),
  hvac_aircon: buildCategoryVisualUrls('hvac_aircon', ['/images/industry/hvac.webp']),
  roofing: buildCategoryVisualUrls('roofing', ['/images/industry/roofing.webp']),
  landscaping_lawn: buildCategoryVisualUrls('landscaping_lawn', ['/images/industry/landscaping.webp']),
  logistics_courier: buildCategoryVisualUrls('logistics_courier', ['/images/industry/moving.webp']),
  education_academy: buildCategoryVisualUrls('education_academy', ['/images/bgos/templates/coaching.webp', '/images/industry/tutoring.webp']),
  event_decor: buildCategoryVisualUrls('event_decor', ['/images/bgos/templates/diwali.webp', '/images/bgos/templates/restaurant.webp']),
  generic_business: buildCategoryVisualUrls('generic_business', ['/images/industry/industry.webp', '/images/bgos/templates/coaching.webp']),
};

export const CURATED_SMB_IMAGE_REGISTRY: Record<string, string[]> = new Proxy(LOCAL_CATEGORY_TEMPLATES, {
  get(target, prop: string) {
    if (prop in target) return target[prop];
    return target.it_software;
  },
});

const SEMANTIC_KEY_MAP: Array<{ key: string; keywords: string[] }> = [
  { key: 'it_software', keywords: ['software', 'it ', 'code', 'developer', 'web dev', 'app dev', 'cloud', 'fieseros', 'serviceos', 'saas', 'crm', 'field service', 'platform', 'automation', 'digital marketing'] },
  { key: 'plywood_timber', keywords: ['plywood', 'timber', 'sunmica', 'laminate', 'veneer'] },
  { key: 'indian_sweets', keywords: ['sweet', 'mithai', 'halwai', 'namkeen', 'ladoo', 'laddu'] },
  { key: 'welding_fabrication', keywords: ['weld', 'fabricat', 'steel', 'iron gate', 'metal work'] },
  { key: 'solar_energy', keywords: ['solar', 'pv panel', 'clean energy'] },
  { key: 'dental_clinic', keywords: ['dent', 'teeth', 'tooth', 'orthodont'] },
  { key: 'salon_spa', keywords: ['salon', 'saloon', 'spa', 'haircut', 'makeup', 'parlour', 'parlor'] },
  { key: 'auto_repair', keywords: ['auto', 'car', 'garage', 'mechanic', 'vehicle repair'] },
  { key: 'fitness_gym', keywords: ['gym', 'fitness', 'crossfit', 'workout'] },
  { key: 'bakery_cafe', keywords: ['cake', 'bakery', 'pastry', 'dessert', 'cafe', 'bistro'] },
  { key: 'restaurant_dining', keywords: ['restaurant', 'dining', 'bistro', 'diner'] },
  { key: 'plumbing', keywords: ['plumb', 'pipe', 'drain', 'leak', 'sanitary'] },
  { key: 'electrical', keywords: ['electr', 'wiring', 'circuit', 'switchboard'] },
  { key: 'hardware_tools', keywords: ['hardware', 'power tool', 'fastener', 'bearing'] },
  { key: 'paint_decor', keywords: ['paint', 'asian paints', 'wall finish', 'primer'] },
  { key: 'jewellery', keywords: ['jewel', 'gold', 'diamond', 'silver'] },
  { key: 'fashion_boutique', keywords: ['fashion', 'boutique', 'cloth', 'apparel', 'saree'] },
  { key: 'real_estate', keywords: ['real estate', 'realtor', 'property', 'builder', 'apartment'] },
  { key: 'cleaning_services', keywords: ['janitor', 'deep clean', 'disinfect', 'housekeep'] },
  { key: 'farmhouse_resort', keywords: ['farmhouse', 'resort', 'swimming pool', 'villa stay'] },
  { key: 'legal_accounting', keywords: ['legal', 'law', 'lawyer', 'attorney', 'notary', 'chartered accountant', 'ca ', 'audit', 'tax'] },
  { key: 'healthcare_medical', keywords: ['health', 'doctor', 'clinic', 'medical', 'hospital', 'pharmacy'] },
  { key: 'security_services', keywords: ['security', 'guard', 'gunman', 'gunmen', 'bouncer', 'bodyguard', 'pso', 'sos', 'cctv', 'surveillance', 'patrol', 'shieldhire'] },
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
 */
export function scoreIndustryMatch(text: string): string {
  const normalized = (text || '').trim().toLowerCase();
  if (!normalized) return 'it_software';

  for (const item of SEMANTIC_KEY_MAP) {
    if (item.keywords.some((kw) => {
      const cleanKw = kw.trim();
      if (cleanKw.length <= 4) {
        return new RegExp(`\\b${cleanKw}\\b`, 'i').test(normalized);
      }
      return normalized.includes(cleanKw);
    })) {
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
    generic_business: 'generic_business',
  };

  const resolved = verticalMap[context.verticalKey] || 'generic_business';
  const isExplicitFoodOrGrocery = /\b(grocery|supermarket|kirana|fruit|vegetable|produce|sabzi|mandi|provisions store|fmcg)\b/i.test(normalized);
  if (!isExplicitFoodOrGrocery && (resolved === 'grocery_supermarket' || resolved === 'indian_sweets')) {
    return 'generic_business';
  }

  return resolved;
}

/**
 * Returns dynamic S3 Category Library images for an industry query.
 * 100% Unsplash-free.
 */
export function getCategoryVisualPool(industryOrQuery: string): string[] {
  const norm = normalizeCategoryContext(industryOrQuery);
  if (norm.isFestival && norm.detectedOccasion) {
    const festPool = getFestivalVisualPool(norm.detectedOccasion);
    if (festPool.length > 0) return festPool;
  }
  const key = scoreIndustryMatch(industryOrQuery);
  const pool = CURATED_SMB_IMAGE_REGISTRY[key] || CURATED_SMB_IMAGE_REGISTRY.it_software;
  return Array.from(new Set(pool || []));
}

export function getFestivalVisualPool(occasionId: string): string[] {
  const catalogResults = searchFestivalCatalog({
    festivalKey: occasionId,
    limit: 20,
  });
  return catalogResults.items.map((i) => i.url);
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
 * Resolves a trade-appropriate commercial visual without external Unsplash dependencies.
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

  // Tier 2: S3 Category Library Visual Pool
  const fallbackQuery = `${industry} ${topic || ''} ${imageKeyword || ''}`;
  const visualPool = getCategoryVisualPool(fallbackQuery);
  return visualPool[Math.floor(Math.random() * visualPool.length)];
}
