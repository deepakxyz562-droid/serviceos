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

const S3_BUCKET = process.env.AWS_S3_BUCKET || 'serviceos-assets-prod';
const S3_REGION = process.env.AWS_REGION || 'ap-south-1';
const S3_BASE = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/bgos-business-images/category_library`;

function buildS3CategoryUrls(folder: string, count = 50): string[] {
  return Array.from({ length: count }, (_, i) =>
    `${S3_BASE}/${folder}/${folder}-${String(i + 1).padStart(3, '0')}.webp`
  );
}

const LOCAL_CATEGORY_TEMPLATES: Record<string, string[]> = {
  plywood_timber: buildS3CategoryUrls('plywood_timber'),
  indian_sweets: buildS3CategoryUrls('indian_sweets'),
  welding_fabrication: buildS3CategoryUrls('welding_fabrication'),
  solar_energy: buildS3CategoryUrls('solar_energy'),
  dental_clinic: buildS3CategoryUrls('dental_clinic'),
  salon_spa: buildS3CategoryUrls('salon_spa'),
  auto_repair: buildS3CategoryUrls('auto_repair'),
  fitness_gym: buildS3CategoryUrls('fitness_gym'),
  restaurant_dining: buildS3CategoryUrls('restaurant_dining'),
  bakery_cafe: buildS3CategoryUrls('bakery_cafe'),
  plumbing: buildS3CategoryUrls('plumbing'),
  electrical: buildS3CategoryUrls('electrical'),
  hardware_tools: buildS3CategoryUrls('hardware_tools'),
  paint_decor: buildS3CategoryUrls('paint_decor'),
  jewellery: buildS3CategoryUrls('jewellery'),
  fashion_boutique: buildS3CategoryUrls('fashion_boutique'),
  real_estate: buildS3CategoryUrls('real_estate'),
  cleaning_services: buildS3CategoryUrls('cleaning_services'),
  farmhouse_resort: buildS3CategoryUrls('farmhouse_resort'),
  it_software: buildS3CategoryUrls('it_software'),
  legal_accounting: buildS3CategoryUrls('legal_accounting'),
  healthcare_medical: buildS3CategoryUrls('healthcare_medical'),
  security_services: buildS3CategoryUrls('security_services'),
  security_cctv: buildS3CategoryUrls('security_cctv'),
  grocery_supermarket: buildS3CategoryUrls('grocery_supermarket'),
  pet_vet: buildS3CategoryUrls('pet_vet'),
  photography_studio: buildS3CategoryUrls('photography_studio'),
  hvac_aircon: buildS3CategoryUrls('hvac_aircon'),
  roofing: buildS3CategoryUrls('roofing'),
  landscaping_lawn: buildS3CategoryUrls('landscaping_lawn'),
  logistics_courier: buildS3CategoryUrls('logistics_courier'),
  education_academy: buildS3CategoryUrls('education_academy'),
  event_decor: buildS3CategoryUrls('event_decor'),
  generic_business: buildS3CategoryUrls('it_software'),
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
  return [...pool];
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
