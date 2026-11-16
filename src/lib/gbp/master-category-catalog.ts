import {
  MASTER_GBP_CATEGORIES,
  type GbpCategoryDefinition,
} from '../../../shared/gbp-category-dataset';
import {
  OFFICIAL_GBP_CATEGORIES,
  type OfficialGbpCategoryItem,
} from '../../../shared/gbp-official-taxonomy';
import { normalizeCategoryContext } from '../designs/category-taxonomy';
import { CURATED_SMB_IMAGE_REGISTRY, getCategoryVisualPool } from '../designs/dynamic-visual-resolver';

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

// Official 4,000+ GBP Categories indexed in memory
const officialIdIndex = new Map<string, OfficialGbpCategoryItem>();
const officialNameIndex = new Map<string, OfficialGbpCategoryItem>();

for (const off of OFFICIAL_GBP_CATEGORIES) {
  const gcidClean = off.gcid.toLowerCase().trim();
  const nameClean = off.displayName.toLowerCase().trim();
  officialIdIndex.set(gcidClean, off);
  officialIdIndex.set(`gcid:${gcidClean}`, off);
  officialIdIndex.set(gcidClean.replace(/_/g, ' '), off);
  officialNameIndex.set(nameClean, off);
}

/**
 * Synthesizes a full GbpCategoryDefinition from an official GBP category entry
 */
export function synthesizeOfficialCategoryDefinition(official: OfficialGbpCategoryItem): GbpCategoryDefinition {
  const context = normalizeCategoryContext(official.displayName);
  const pillar = context.verticalKey || 'specialty_local_services';
  const name = official.displayName;
  const isServiceTrade = /service|agency|consult|contractor|clinic|repair|cleaning|transport|installation|maintenance|academy|school|studio|centre|center|lawyer|accountant|doctor|plumber|electrician/i.test(name);

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
    `${name.toLowerCase()} workplace setting`,
  ];

  const preferredTheme = (
    pillar === 'it_software_digital' ? 'cyber_tech' :
    pillar === 'professional_legal_finance' ? 'royal_gold' :
    pillar === 'beauty_personal_care' ? 'rose_chic' :
    pillar === 'food_sweets_confectionery' ? 'amber' :
    pillar === 'health_medical_wellness' ? 'emerald' :
    'trust_amber'
  );

  return {
    id: `gcid:${official.gcid}`,
    displayName: official.displayName,
    pillar,
    aliases: [official.gcid, official.gcid.replace(/_/g, ' '), official.displayName.toLowerCase()],
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
        '100% Certified & Verified Professionals',
        'Transparent Upfront Pricing & Free Estimates',
        'Prompt On-Demand Assistance in {city}',
        'Complete Satisfaction Guaranteed',
      ],
      cta: isServiceTrade ? 'REQUEST CONSULTATION' : 'GET QUOTE',
    },
  };
}

/**
 * O(1) Category lookup by ID across curated dataset & 4,000+ official GBP categories
 */
export function getGbpCategoryById(id: string): GbpCategoryDefinition | undefined {
  if (!id) return undefined;
  const clean = id.toLowerCase().trim();
  const direct = idIndex.get(clean);
  if (direct) return direct;

  const official = officialIdIndex.get(clean);
  if (official) return synthesizeOfficialCategoryDefinition(official);
  return undefined;
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

  // 5. Official 4,000+ GBP Categories exact match
  const officialByName = officialNameIndex.get(clean);
  if (officialByName) return synthesizeOfficialCategoryDefinition(officialByName);

  const officialById = officialIdIndex.get(clean);
  if (officialById) return synthesizeOfficialCategoryDefinition(officialById);

  // 6. Official 4,000+ token / substring search
  for (const off of OFFICIAL_GBP_CATEGORIES) {
    const offName = off.displayName.toLowerCase();
    const offGcid = off.gcid.toLowerCase();
    if (clean.includes(offName) || offName.includes(clean) || clean.includes(offGcid) || offGcid.includes(clean)) {
      return synthesizeOfficialCategoryDefinition(off);
    }
  }

  return undefined;
}

/**
 * Live search auto-complete across all master & 4,000+ official GBP categories.
 * Ranks prefix matches highest, followed by token and alias matches.
 */
export function searchGbpCategories(query: string, limit = 10): GbpCategoryDefinition[] {
  const clean = (query || '').toLowerCase().trim();
  if (!clean) {
    const rich = MASTER_GBP_CATEGORIES.slice(0, limit);
    if (rich.length >= limit) return rich;
    const additional = OFFICIAL_GBP_CATEGORIES.slice(0, limit - rich.length).map(synthesizeOfficialCategoryDefinition);
    return [...rich, ...additional];
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

  // B. Prefix matches in official 4,000+ categories
  for (const off of OFFICIAL_GBP_CATEGORIES) {
    const idKey = `gcid:${off.gcid}`;
    if (seenIds.has(idKey)) continue;
    const dName = off.displayName.toLowerCase();
    const gcid = off.gcid.toLowerCase();
    if (dName.startsWith(clean) || gcid.startsWith(clean)) {
      prefixMatches.push(synthesizeOfficialCategoryDefinition(off));
      seenIds.add(idKey);
      if (prefixMatches.length >= limit) return prefixMatches;
    }
  }

  // C. Token / Substring matches in rich curated categories
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

  // D. Token / Substring matches in official 4,000+ categories
  for (const off of OFFICIAL_GBP_CATEGORIES) {
    const idKey = `gcid:${off.gcid}`;
    if (seenIds.has(idKey)) continue;
    const dName = off.displayName.toLowerCase();
    const gcid = off.gcid.toLowerCase();
    if (dName.includes(clean) || gcid.includes(clean)) {
      tokenMatches.push(synthesizeOfficialCategoryDefinition(off));
      seenIds.add(idKey);
      if (prefixMatches.length + tokenMatches.length >= limit) {
        break;
      }
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
    blueprints.push({
      id: `bp-service-${category?.id || 'core'}-${sIdx}`,
      categoryName: displayName,
      pillar: matchedPillar,
      purpose: 'Business profile',
      tab: 'for_business',
      layout: sIdx % 2 === 0 ? 'business_1' : 'business_0',
      theme,
      headline: sName,
      subtitle: `Expert ${sName} and professional solutions delivered by ${businessName} in ${city}.`,
      badge: 'CORE SERVICE',
      cta: isServiceTrade ? 'REQUEST CONSULTATION' : 'GET QUOTE',
      bullets: formattedBullets,
      photoUrl: visuals[sIdx % visuals.length] || primaryPhoto,
      targetKeywords: [
        { keyword: `${sName.toLowerCase()} in ${city}`, volume: 450 },
        { keyword: `${sName.toLowerCase()} company`, volume: 600 },
      ],
      defaultCaption: `${businessName} provides verified ${sName} in ${city}. Contact us today to get started.\n\n#${sName.toLowerCase().replace(/[^a-z0-9]/g, '')} #${city.toLowerCase()}`,
    });
  }

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
        `Special Offer on ${primaryProduct} in ${city}`,
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
      defaultCaption: `Exciting announcement from ${businessName}! Enjoy special discounted rates on ${primaryProduct}. Contact us at ${phone || 'our team'} or visit today.\n\n#${displayName.toLowerCase().replace(/[^a-z0-9]/g, '')} #specialoffer #${city.toLowerCase()}`,
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
        (isServiceTrade
          ? `Top-Rated ${primaryProduct} & Solutions in ${city}`
          : `Premium ${primaryProduct} & ${secondaryProduct} in ${city}`),
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
  );

  return blueprints;
}
