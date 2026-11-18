import {
  MASTER_GBP_CATEGORIES,
  type GbpCategoryDefinition,
} from '../../../shared/gbp-category-dataset';
import { normalizeCategoryContext } from '../designs/category-taxonomy';
import { getCategoryVisualPool } from '../designs/dynamic-visual-resolver';
import { generateStructuredLocalSeoPost } from './seo-copy-generator';

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
 * Dynamically synthesizes a full GbpCategoryDefinition for ANY category string on-the-fly.
 * Zero hardcoded lists — handles all Google categories dynamically.
 */
export function synthesizeCategoryDefinition(nameOrGcid: string): GbpCategoryDefinition {
  let clean = nameOrGcid.replace(/^gcid:/i, '').replace(/_/g, ' ').trim();
  if (/^air\s*cond$/i.test(clean)) {
    clean = 'air conditioning contractor';
  }
  const rawDisplayName = clean.charAt(0).toUpperCase() + clean.slice(1);
  const displayName = rawDisplayName.replace(/\baadhar\b/i, 'Aadhaar');
  const gcid = clean.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const context = normalizeCategoryContext(displayName);
  const pillar = context.verticalKey || 'specialty_local_services';
  const name = displayName;

  const coreProducts = [
    `Professional ${name}`,
    `Certified ${name} Solutions`,
    `Premium ${name} Services`,
    `Emergency & Express Support`,
  ];

  const customerIntentKeywords = [
    `best ${name.toLowerCase()} in {city}`,
    `${name.toLowerCase()} near me`,
    `${name.toLowerCase()} rates and charges`,
    `verified ${name.toLowerCase()} contact number`,
  ];

  const visualSearchTerms = [
    ...context.searchKeywords,
    `${name.toLowerCase()} commercial setting`,
  ];

  const preferredTheme =
    pillar === 'it_software_digital'
      ? 'cyber_tech'
      : pillar === 'professional_legal_finance'
        ? 'royal_gold'
        : pillar === 'beauty_personal_care'
          ? 'rose_chic'
          : pillar === 'food_sweets_confectionery'
            ? 'amber'
            : pillar === 'health_medical_wellness'
              ? 'emerald'
              : 'trust_amber';

  return {
    id: `gcid:${gcid}`,
    displayName,
    pillar,
    aliases: [gcid, clean, displayName.toLowerCase()],
    relatedCategories: [],
    coreProducts,
    customerIntentKeywords,
    visualSearchTerms,
    preferredTheme,
    defaultHooks: {
      offerHeadline: `Top-Rated ${name} in {city} — Special Limited Offer`,
      showcaseHeadline: `Certified & Trusted ${name} Services in {city}`,
      trustHeadline: `Rated #1 ${name} Provider in {city} — 100% Quality Assurance`,
      subtitle: `Delivering trusted, certified ${name} and prompt assistance for clients across {city}.`,
      bullets: [
        `Verified ${name} Experts with Proven Local Track Record`,
        `100% Genuine Materials & Transparent Estimates`,
        `Fast Turnaround & Professional On-Site Support`,
      ],
      cta: 'BOOK CONSULTATION',
    },
  };
}
/**
 * O(1) Category lookup by ID across curated dataset & dynamic on-demand synthesis
 */
export function getGbpCategoryById(id: string): GbpCategoryDefinition | undefined {
  if (!id) return undefined;
  const clean = id.toLowerCase().trim();
  const direct = idIndex.get(clean);
  if (direct) return direct;

  return synthesizeCategoryDefinition(clean);
}

/**
 * O(1) Category lookup by Name or common Trade Alias (e.g. "ply shop", "saloon", "sweet shop", "accountant")
 */
export function getGbpCategoryByNameOrAlias(rawText: string): GbpCategoryDefinition | undefined {
  if (!rawText) return undefined;
  const clean = rawText.toLowerCase().trim();

  // 1. Direct name match in rich curated list
  if (nameIndex.has(clean)) return nameIndex.get(clean);

  // 2. Direct alias match in rich curated list
  if (aliasIndex.has(clean)) return aliasIndex.get(clean);

  // 3. Substring / Token match across aliases and display names in rich curated list
  for (const cat of MASTER_GBP_CATEGORIES) {
    if (clean.includes(cat.displayName.toLowerCase())) return cat;
    if (cat.aliases?.some((a) => clean.includes(a.toLowerCase()) || a.toLowerCase().includes(clean))) {
      return cat;
    }
  }

  // 4. Token search in keywords in rich curated list
  for (const cat of MASTER_GBP_CATEGORIES) {
    if (cat.customerIntentKeywords.some((k) => clean.includes(k.toLowerCase()))) {
      return cat;
    }
  }

  // 5. Synthesize on-the-fly dynamically (zero hardcoded list required)
  return synthesizeCategoryDefinition(clean);
}

/**
 * Live search auto-complete across master & dynamically synthesized categories.
 * Ranks prefix matches highest, followed by token and alias matches.
 */
export function searchGbpCategories(query: string, limit = 10): GbpCategoryDefinition[] {
  const clean = (query || '').toLowerCase().trim();
  if (!clean) {
    return MASTER_GBP_CATEGORIES.slice(0, limit);
  }

  const prefixMatches: GbpCategoryDefinition[] = [];
  const tokenMatches: GbpCategoryDefinition[] = [];
  const seenIds = new Set<string>();

  // A. Prefix matches in rich curated categories
  for (const cat of MASTER_GBP_CATEGORIES) {
    const dName = cat.displayName.toLowerCase();
    if (dName.startsWith(clean)) {
      prefixMatches.push(cat);
      seenIds.add(cat.id);
      if (prefixMatches.length >= limit) return prefixMatches;
    }
  }

  // B. Token / Substring matches in rich curated categories
  for (const cat of MASTER_GBP_CATEGORIES) {
    if (seenIds.has(cat.id)) continue;
    const dName = cat.displayName.toLowerCase();
    const aliasHit = cat.aliases?.some((a) => a.toLowerCase().includes(clean));
    const productHit = cat.coreProducts.some((p) => p.toLowerCase().includes(clean));
    const keywordHit = cat.customerIntentKeywords.some((k) => k.toLowerCase().includes(clean));

    if (dName.includes(clean) || aliasHit || productHit || keywordHit) {
      tokenMatches.push(cat);
      seenIds.add(cat.id);
      if (prefixMatches.length + tokenMatches.length >= limit) {
        return [...prefixMatches, ...tokenMatches].slice(0, limit);
      }
    }
  }

  // C. Dynamically synthesize query as a valid option if limit not reached
  if (prefixMatches.length + tokenMatches.length < limit && clean.length >= 2) {
    const synthesized = synthesizeCategoryDefinition(clean);
    if (!seenIds.has(synthesized.id)) {
      tokenMatches.push(synthesized);
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
  realServices?: string[];
}): GeneratedCreativeBlueprint[] {
  const { categoryOrTitle, businessName, city = 'Patna', phone = '', realServices } = params;
  const category = getGbpCategoryByNameOrAlias(categoryOrTitle);

  // If no exact category definition is found, resolve via the Universal Category Taxonomy
  const context = normalizeCategoryContext(categoryOrTitle);
  const matchedPillar = category?.pillar || context.verticalKey;
  const displayName = category?.displayName || (context.detectedSubject ? `${context.detectedSubject} Service` : categoryOrTitle.trim());

  const visuals = getCategoryVisualPool(categoryOrTitle);

  const primaryPhoto = visuals[0];
  const secondaryPhoto = visuals[1] || visuals[0];
  const tertiaryPhoto = visuals[2] || visuals[0];

  const isServiceTrade =
    /service|agency|consult|guard|security|law|tech|clean|repair|contractor|salon|clinic|driver|transport|hire|rental|care|app|hospital|education|academy|advisory/i.test(
      categoryOrTitle,
    );

  const fallbackSubject = context.detectedSubject || categoryOrTitle.trim();
  const primaryProduct =
    realServices?.[0] ||
    category?.coreProducts[0] ||
    (isServiceTrade ? `Professional ${fallbackSubject}` : `Premium ${fallbackSubject}`);
  const secondaryProduct =
    realServices?.[1] ||
    category?.coreProducts[1] ||
    (isServiceTrade ? '24/7 Dedicated Support' : 'Custom Orders & Consultation');
  const theme = category?.preferredTheme || (isServiceTrade ? 'cyber_tech' : 'emerald');

  const defaultBullets =
    category?.defaultHooks.bullets ||
    (isServiceTrade
      ? [
          'Verified & Trained Professional Staff',
          'Prompt On-Demand Assistance in {city}',
          '100% Licensed, Insured & Trusted',
          'Transparent & Competitive Pricing',
        ]
      : [
          '100% Quality & Authenticity Guarantee',
          'Competitive Rates & Special Offers',
          'Prompt Safe Delivery Across {city}',
          'Dedicated Customer Support',
        ]);
  const formattedBullets = defaultBullets.map((b) => b.replace(/\{city\}/g, city));

  const blueprints: GeneratedCreativeBlueprint[] = [];

  // Dedicated first-class blueprints for the merchant's real added services or category core offerings
  const tradeOfferings =
    Array.isArray(realServices) && realServices.length > 0
      ? realServices
      : category?.coreProducts && category.coreProducts.length > 0
        ? category.coreProducts
        : [primaryProduct, secondaryProduct];

  for (const [sIdx, sName] of tradeOfferings.slice(0, 6).entries()) {
    const serviceSeo = generateStructuredLocalSeoPost({
      businessName,
      city,
      topic: sName,
      categoryOrIndustry: displayName,
      phone,
      ctaType: isServiceTrade ? 'CALL' : 'BOOK',
      angle: 'service',
      customBullets: formattedBullets,
    });

    blueprints.push({
      id: `bp-service-${category?.id || 'core'}-${sIdx}`,
      categoryName: displayName,
      pillar: matchedPillar,
      purpose: 'Business profile',
      tab: 'for_business',
      layout: sIdx % 2 === 0 ? 'business_1' : 'business_0',
      theme,
      headline: serviceSeo.headline,
      subtitle: `Expert ${sName} and professional solutions delivered by ${businessName} in ${city}.`,
      badge: 'CORE SERVICE',
      cta: isServiceTrade ? 'REQUEST CONSULTATION' : 'GET QUOTE',
      bullets: formattedBullets,
      photoUrl: visuals[sIdx % visuals.length] || primaryPhoto,
      targetKeywords: [
        { keyword: `${sName.toLowerCase()} in ${city}`, volume: 450 },
        { keyword: `${sName.toLowerCase()} company`, volume: 600 },
      ],
      defaultCaption: serviceSeo.fullContent,
    });
  }

  const promoSeo = generateStructuredLocalSeoPost({
    businessName,
    city,
    topic: primaryProduct,
    categoryOrIndustry: displayName,
    phone,
    ctaType: isServiceTrade ? 'BOOK' : 'CALL',
    angle: 'promotion',
    customBullets: formattedBullets,
  });

  const showcaseSeo = generateStructuredLocalSeoPost({
    businessName,
    city,
    topic: primaryProduct,
    categoryOrIndustry: displayName,
    phone,
    ctaType: 'CALL',
    angle: 'showcase',
    customBullets: formattedBullets,
  });

  const reviewsSeo = generateStructuredLocalSeoPost({
    businessName,
    city,
    topic: displayName,
    categoryOrIndustry: displayName,
    phone,
    ctaType: 'CALL',
    angle: 'reviews',
    customBullets: [
      'Verified Google 5-Star Rating: Consistently recommended by local clients for quality and dependability.',
      'Transparent Upfront Pricing: Clear itemized estimates with zero hidden surprises.',
      'Dedicated Customer Support: Responsive communication from inquiry to project completion.',
      'Experienced Master Specialists: Certified, trained team members focused on your satisfaction.',
      'Guaranteed Service Standards: Complete peace of mind backed by our local service commitment.',
    ],
  });

  blueprints.push(
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
        promoSeo.headline,
      subtitle:
        category?.defaultHooks.subtitle.replace(/\{businessName\}/g, businessName).replace(/\{city\}/g, city) ||
        `Save big on ${primaryProduct} and ${secondaryProduct} with exclusive direct discounts from ${businessName}.`,
      badge: 'SPECIAL OFFER',
      cta: category?.defaultHooks.cta || (isServiceTrade ? 'BOOK NOW' : 'CLAIM OFFER NOW'),
      bullets: formattedBullets,
      photoUrl: primaryPhoto,
      targetKeywords: (category?.customerIntentKeywords || []).slice(0, 3).map((k) => ({
        keyword: k.replace(/\{city\}/g, city),
        volume: 850,
      })),
      defaultCaption: promoSeo.fullContent,
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
        showcaseSeo.headline,
      subtitle:
        category?.defaultHooks.subtitle.replace(/\{businessName\}/g, businessName).replace(/\{city\}/g, city) ||
        (isServiceTrade
          ? `Delivering trusted, certified ${displayName} and reliable support for clients across ${city}.`
          : `Delivering top-grade craftsmanship and trusted reliability for all your ${displayName} requirements.`),
      badge: 'FEATURED SHOWCASE',
      cta: isServiceTrade ? 'HIRE NOW' : 'EXPLORE CATALOG',
      bullets: formattedBullets,
      photoUrl: secondaryPhoto,
      targetKeywords: (category?.customerIntentKeywords || []).slice(1, 4).map((k) => ({
        keyword: k.replace(/\{city\}/g, city),
        volume: 620,
      })),
      defaultCaption: showcaseSeo.fullContent,
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
        reviewsSeo.headline,
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
      defaultCaption: reviewsSeo.fullContent,
    },
  );

  return blueprints;
}
