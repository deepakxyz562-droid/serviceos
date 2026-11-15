import {
  MASTER_GBP_CATEGORIES,
  type GbpCategoryDefinition,
} from '../../../shared/gbp-category-dataset';
import { normalizeCategoryContext } from '../designs/category-taxonomy';
import { CURATED_SMB_IMAGE_REGISTRY } from '../designs/dynamic-visual-resolver';

export interface GeneratedCreativeBlueprint {
  id: string;
  categoryName: string;
  pillar: string;
  purpose: 'Promotion' | 'Business profile' | 'Trust-building' | 'Festival';
  tab: 'for_business' | 'promotions' | 'festivals' | 'reviews';
  layout: string;
  theme: string;
  headline: string;
  subtitle: string;
  badge: string;
  cta: string;
  bullets: string[];
  photoUrl: string;
  targetKeywords: Array<{ keyword: string; volume: number }>;
  defaultCaption: string;
}

// In-memory indexed lookup tables for sub-millisecond query speed
const idIndex = new Map<string, GbpCategoryDefinition>();
const nameIndex = new Map<string, GbpCategoryDefinition>();
const aliasIndex = new Map<string, GbpCategoryDefinition>();

for (const cat of MASTER_GBP_CATEGORIES) {
  idIndex.set(cat.id.toLowerCase(), cat);
  nameIndex.set(cat.displayName.toLowerCase(), cat);
  if (Array.isArray(cat.aliases)) {
    for (const a of cat.aliases) {
      aliasIndex.set(a.toLowerCase(), cat);
    }
  }
}

/**
 * O(1) Category lookup by ID
 */
export function getGbpCategoryById(id: string): GbpCategoryDefinition | undefined {
  if (!id) return undefined;
  return idIndex.get(id.toLowerCase().trim());
}

/**
 * O(1) Category lookup by Name or common Trade Alias (e.g. "ply shop", "saloon", "sweet shop")
 */
export function getGbpCategoryByNameOrAlias(rawText: string): GbpCategoryDefinition | undefined {
  if (!rawText) return undefined;
  const clean = rawText.toLowerCase().trim();

  // 1. Direct name match
  if (nameIndex.has(clean)) return nameIndex.get(clean);

  // 2. Direct alias match
  if (aliasIndex.has(clean)) return aliasIndex.get(clean);

  // 3. Substring / Token match across aliases and display names
  for (const cat of MASTER_GBP_CATEGORIES) {
    if (clean.includes(cat.displayName.toLowerCase())) return cat;
    if (cat.aliases?.some((a) => clean.includes(a.toLowerCase()) || a.toLowerCase().includes(clean))) {
      return cat;
    }
  }

  // 4. Token search in keywords
  for (const cat of MASTER_GBP_CATEGORIES) {
    if (cat.customerIntentKeywords.some((k) => clean.includes(k.toLowerCase()))) {
      return cat;
    }
  }

  return undefined;
}

/**
 * Live search auto-complete across all master GBP categories.
 * Ranks prefix matches highest, followed by token and alias matches.
 */
export function searchGbpCategories(query: string, limit = 10): GbpCategoryDefinition[] {
  const clean = (query || '').toLowerCase().trim();
  if (!clean) return MASTER_GBP_CATEGORIES.slice(0, limit);

  const prefixMatches: GbpCategoryDefinition[] = [];
  const tokenMatches: GbpCategoryDefinition[] = [];
  const seenIds = new Set<string>();

  for (const cat of MASTER_GBP_CATEGORIES) {
    const dName = cat.displayName.toLowerCase();
    if (dName.startsWith(clean)) {
      prefixMatches.push(cat);
      seenIds.add(cat.id);
      continue;
    }
  }

  for (const cat of MASTER_GBP_CATEGORIES) {
    if (seenIds.has(cat.id)) continue;
    const dName = cat.displayName.toLowerCase();
    const aliasHit = cat.aliases?.some((a) => a.toLowerCase().includes(clean));
    const productHit = cat.coreProducts.some((p) => p.toLowerCase().includes(clean));
    const keywordHit = cat.customerIntentKeywords.some((k) => k.toLowerCase().includes(clean));

    if (dName.includes(clean) || aliasHit || productHit || keywordHit) {
      tokenMatches.push(cat);
      seenIds.add(cat.id);
    }
  }

  return [...prefixMatches, ...tokenMatches].slice(0, limit);
}

/**
 * Synthesizes reusable creative blueprints directly from the category's first-class profile.
 */
export function generateCategoryBlueprints(params: {
  categoryOrTitle: string;
  businessName: string;
  city?: string;
  phone?: string;
}): GeneratedCreativeBlueprint[] {
  const { categoryOrTitle, businessName, city = 'Patna', phone = '' } = params;
  const category = getGbpCategoryByNameOrAlias(categoryOrTitle);

  // If no exact category definition is found, resolve via the Universal Category Taxonomy
  const context = normalizeCategoryContext(categoryOrTitle);
  const matchedPillar = category?.pillar || context.verticalKey;
  const displayName = category?.displayName || context.detectedSubject;

  const visuals =
    (category?.pillar && CURATED_SMB_IMAGE_REGISTRY[category.pillar]) ||
    (matchedPillar === 'building_materials_hardware' && CURATED_SMB_IMAGE_REGISTRY.plywood_timber) ||
    (matchedPillar === 'food_sweets_confectionery' && CURATED_SMB_IMAGE_REGISTRY.indian_sweets) ||
    (matchedPillar === 'beauty_personal_care' && CURATED_SMB_IMAGE_REGISTRY.salon_spa) ||
    CURATED_SMB_IMAGE_REGISTRY[matchedPillar] ||
    CURATED_SMB_IMAGE_REGISTRY.generic_business;

  const primaryPhoto = visuals[0];
  const secondaryPhoto = visuals[1] || visuals[0];
  const tertiaryPhoto = visuals[2] || visuals[0];

  const primaryProduct = category?.coreProducts[0] || 'Core Offerings';
  const secondaryProduct = category?.coreProducts[1] || 'Specialty Services';
  const theme = category?.preferredTheme || 'emerald';

  const defaultBullets = category?.defaultHooks.bullets || [
    'Guaranteed 100% Quality Assurance',
    'Factory Direct Wholesale Pricing',
    'Rapid On-Time Delivery in {city}',
  ];
  const formattedBullets = defaultBullets.map((b) => b.replace(/\{city\}/g, city));

  const blueprints: GeneratedCreativeBlueprint[] = [
    // 1. Promotional Blueprint
    {
      id: `bp-${category?.id || 'gen'}-promo`,
      categoryName: displayName,
      pillar: matchedPillar,
      purpose: 'Promotion',
      tab: 'promotions',
      layout: 'business_0',
      theme,
      headline:
        category?.defaultHooks.offerHeadline.replace(/\{city\}/g, city) ||
        `Flat 20% OFF on ${primaryProduct} — Limited Period Offer`,
      subtitle:
        category?.defaultHooks.subtitle.replace(/\{businessName\}/g, businessName).replace(/\{city\}/g, city) ||
        `Save big on ${primaryProduct} and ${secondaryProduct} with exclusive direct discounts from ${businessName}.`,
      badge: 'SPECIAL OFFER',
      cta: category?.defaultHooks.cta || 'CLAIM OFFER NOW',
      bullets: formattedBullets,
      photoUrl: primaryPhoto,
      targetKeywords: (category?.customerIntentKeywords || []).slice(0, 3).map((k) => ({
        keyword: k.replace(/\{city\}/g, city),
        volume: 850,
      })),
      defaultCaption: `Exciting announcement from ${businessName}! Enjoy special discounted rates on ${primaryProduct}. Contact us at ${phone || 'our store'} or visit today.\n\n#${displayName.toLowerCase().replace(/[^a-z0-9]/g, '')} #specialoffer #${city.toLowerCase()}`,
    },

    // 2. Core Showcase Blueprint
    {
      id: `bp-${category?.id || 'gen'}-showcase`,
      categoryName: displayName,
      pillar: matchedPillar,
      purpose: 'Business profile',
      tab: 'for_business',
      layout: 'business_1',
      theme,
      headline:
        category?.defaultHooks.showcaseHeadline.replace(/\{city\}/g, city) ||
        `Premium ${primaryProduct} & ${secondaryProduct} in ${city}`,
      subtitle:
        category?.defaultHooks.subtitle.replace(/\{businessName\}/g, businessName).replace(/\{city\}/g, city) ||
        `Delivering top-grade craftsmanship and trusted reliability for all your ${displayName} requirements.`,
      badge: 'FEATURED SHOWCASE',
      cta: 'EXPLORE CATALOG',
      bullets: formattedBullets,
      photoUrl: secondaryPhoto,
      targetKeywords: (category?.customerIntentKeywords || []).slice(1, 4).map((k) => ({
        keyword: k.replace(/\{city\}/g, city),
        volume: 620,
      })),
      defaultCaption: `Looking for top-tier ${displayName} in ${city}? Look no further than ${businessName}. We specialize in ${primaryProduct} crafted to the highest quality.\n\n#${displayName.toLowerCase().replace(/[^a-z0-9]/g, '')} #localbusiness #${city.toLowerCase()}`,
    },

    // 3. Social Proof / 5-Star Reviews Blueprint
    {
      id: `bp-${category?.id || 'gen'}-reviews`,
      categoryName: displayName,
      pillar: matchedPillar,
      purpose: 'Trust-building',
      tab: 'reviews',
      layout: 'business_2',
      theme: 'royal_gold',
      headline:
        category?.defaultHooks.trustHeadline.replace(/\{city\}/g, city) ||
        `Rated #1 ${displayName} in ${city} — 5-Star Trusted`,
      subtitle: `Thank you to our valued clients and community in ${city} for making ${businessName} your most trusted ${displayName} partner.`,
      badge: '5-STAR RATED',
      cta: 'READ REVIEWS',
      bullets: [
        'Verified Google 5-Star Rating',
        'Transparent Upfront Pricing',
        'Dedicated After-Sales Support',
      ],
      photoUrl: tertiaryPhoto,
      targetKeywords: [
        { keyword: `best ${displayName.toLowerCase()} in ${city}`, volume: 1200 },
        { keyword: `top rated ${displayName.toLowerCase()}`, volume: 450 },
      ],
      defaultCaption: `Proud to be recognized as one of ${city}’s highest-rated ${displayName} providers. Thank you for trusting ${businessName}!\n\n#googlebusiness #5starreviews #${city.toLowerCase()}`,
    },
  ];

  return blueprints;
}
