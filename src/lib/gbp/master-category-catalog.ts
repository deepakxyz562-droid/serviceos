import { normalizeCategoryContext } from '../designs/category-taxonomy';
import { getCategoryVisualPool } from '../designs/dynamic-visual-resolver';
import { generateStructuredLocalSeoPost } from './seo-copy-generator';

export interface GbpCategoryDefinition {
  id: string;
  displayName: string;
  pillar: string;
  aliases?: string[];
  relatedCategories: string[];
  coreProducts: string[];
  customerIntentKeywords: string[];
  visualSearchTerms: string[];
  preferredTheme: 'emerald' | 'amber' | 'rose_chic' | 'cyber_tech' | 'royal_gold' | 'luxe_dark' | 'trust_amber' | 'sand';
  defaultHooks: {
    offerHeadline: string;
    showcaseHeadline: string;
    trustHeadline: string;
    subtitle: string;
    bullets: string[];
    cta: string;
  };
}

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

interface CategoryAliasHint {
  displayName: string;
  pillar?: string;
  coreProducts?: string[];
  defaultHooks?: {
    offerHeadline: string;
    showcaseHeadline: string;
    trustHeadline: string;
    subtitle: string;
    bullets: string[];
    cta: string;
  };
}

/**
 * Concise local SMB trade aliases and short abbreviations.
 * Maps common vernacular search terms (e.g. "ply", "mithai", "saloon", "ca firm")
 * to standard trade taxonomy without needing 4,000 hardcoded records.
 */
const COMMON_TRADE_ALIASES: Record<string, CategoryAliasHint> = {
  ply: {
    displayName: 'Plywood supplier',
    pillar: 'building_materials_hardware',
    coreProducts: ['IS:710 Marine Grade Plywood', 'Commercial Calibrated Boards', 'Decorative Sunmica Laminates', 'Flush Doors'],
    defaultHooks: {
      offerHeadline: 'Premium Waterproof Marine Plywood — Factory Direct Rates',
      showcaseHeadline: 'Guaranteed 100% Termite & Borer Proof Calibrated Boards',
      trustHeadline: 'Leading Plywood & Architectural Surface Partner in {city}',
      subtitle: 'IS:710 Marine Grade certified boards with 25-year manufacturer guarantee and on-site delivery.',
      bullets: ['IS:710 Marine Grade Quality', '25-Year Termite & Fungus Guarantee', 'Factory Wholesale Pricing'],
      cta: 'GET WHOLESALE QUOTE',
    },
  },
  'ply shop': {
    displayName: 'Plywood supplier',
    pillar: 'building_materials_hardware',
    coreProducts: ['IS:710 Marine Grade Plywood', 'Commercial Calibrated Boards', 'Decorative Sunmica Laminates', 'Flush Doors'],
  },
  'plywood store': {
    displayName: 'Plywood supplier',
    pillar: 'building_materials_hardware',
  },
  'plywood supplier': {
    displayName: 'Plywood supplier',
    pillar: 'building_materials_hardware',
    coreProducts: ['IS:710 Marine Grade Plywood', 'Commercial Calibrated Boards', 'Decorative Sunmica Laminates', 'Flush Doors'],
    defaultHooks: {
      offerHeadline: 'Premium Waterproof Marine Plywood — Factory Direct Rates',
      showcaseHeadline: 'Guaranteed 100% Termite & Borer Proof Calibrated Boards',
      trustHeadline: 'Leading Plywood & Architectural Surface Partner in {city}',
      subtitle: 'IS:710 Marine Grade certified boards with 25-year manufacturer guarantee and on-site delivery.',
      bullets: ['IS:710 Marine Grade Quality', '25-Year Termite & Fungus Guarantee', 'Factory Wholesale Pricing'],
      cta: 'GET WHOLESALE QUOTE',
    },
  },
  sweet: {
    displayName: 'Indian sweets shop',
    pillar: 'food_sweets_confectionery',
    coreProducts: ['Pure Desi Ghee Kaju Katli', 'Motichoor Ladoos', 'Hot Crispy Jalebi', 'Dry Fruit Gift Boxes'],
    defaultHooks: {
      offerHeadline: '100% Pure Desi Ghee Sweets & Festive Gift Hampers',
      showcaseHeadline: 'Handcrafted Daily with Pure Ingredients & Royal Dry Fruits',
      trustHeadline: 'Generations of Authentic Sweet Taste & Purity in {city}',
      subtitle: 'Prepared fresh every morning using 100% pure desi ghee, premium saffron, and certified ingredients.',
      bullets: ['100% Pure Desi Ghee Preparation', 'Zero Artificial Preservatives', 'Customized Corporate & Wedding Boxes'],
      cta: 'ORDER FRESH SWEETS',
    },
  },
  'sweet shop': {
    displayName: 'Indian sweets shop',
    pillar: 'food_sweets_confectionery',
  },
  'mithai shop': {
    displayName: 'Indian sweets shop',
    pillar: 'food_sweets_confectionery',
  },
  'indian sweets shop': {
    displayName: 'Indian sweets shop',
    pillar: 'food_sweets_confectionery',
    coreProducts: ['Pure Desi Ghee Kaju Katli', 'Motichoor Ladoos', 'Hot Crispy Jalebi', 'Dry Fruit Gift Boxes'],
    defaultHooks: {
      offerHeadline: '100% Pure Desi Ghee Sweets & Festive Gift Hampers',
      showcaseHeadline: 'Handcrafted Daily with Pure Ingredients & Royal Dry Fruits',
      trustHeadline: 'Generations of Authentic Sweet Taste & Purity in {city}',
      subtitle: 'Prepared fresh every morning using 100% pure desi ghee, premium saffron, and certified ingredients.',
      bullets: ['100% Pure Desi Ghee Preparation', 'Zero Artificial Preservatives', 'Customized Corporate & Wedding Boxes'],
      cta: 'ORDER FRESH SWEETS',
    },
  },
  saloon: {
    displayName: 'Beauty salon',
    pillar: 'beauty_personal_care',
  },
  'gents saloon': {
    displayName: 'Barber shop',
    pillar: 'beauty_personal_care',
  },
  'ca firm': {
    displayName: 'Chartered accountant',
    pillar: 'professional_legal_finance',
  },
  accountant: {
    displayName: 'Accountant',
    pillar: 'professional_legal_finance',
  },
  solar: {
    displayName: 'Solar energy contractor',
    pillar: 'home_electrical_services',
  },
  cctv: {
    displayName: 'Security system supplier',
    pillar: 'it_software_digital',
  },
  'air cond': {
    displayName: 'Air conditioning contractor',
    pillar: 'home_electrical_services',
  },
  'air conditioning contractor': {
    displayName: 'Air conditioning contractor',
    pillar: 'home_electrical_services',
  },
  painter: {
    displayName: 'Painting contractor',
    pillar: 'home_improvement',
  },
  'painting contractor': {
    displayName: 'Painting contractor',
    pillar: 'home_improvement',
  },
  'texture paint': {
    displayName: 'Painting contractor',
    pillar: 'home_improvement',
  },
  'texture paint wala': {
    displayName: 'Painting contractor',
    pillar: 'home_improvement',
  },
  'wall painting': {
    displayName: 'Painting contractor',
    pillar: 'home_improvement',
  },
};

/**
 * Dynamically synthesizes a full GbpCategoryDefinition for ANY category string on-the-fly.
 * 100% dynamic architecture — no static 4,000 category database required.
 */
export function synthesizeCategoryDefinition(nameOrGcid: string): GbpCategoryDefinition {
  const clean = (nameOrGcid || '').replace(/^gcid:/i, '').replace(/_/g, ' ').trim().toLowerCase();

  const aliasHit = COMMON_TRADE_ALIASES[clean];
  const targetName = aliasHit?.displayName || clean;

  const rawDisplayName = targetName.charAt(0).toUpperCase() + targetName.slice(1);
  const displayName = rawDisplayName.replace(/\baadhar\b/i, 'Aadhaar');
  const gcid = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const context = normalizeCategoryContext(displayName);
  const pillar = aliasHit?.pillar || context.verticalKey || 'specialty_local_services';
  const name = displayName;

  const coreProducts = aliasHit?.coreProducts || [
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

  const preferredTheme: GbpCategoryDefinition['preferredTheme'] =
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

  const defaultHooks = aliasHit?.defaultHooks || {
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
  };

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
    defaultHooks,
  };
}

/**
 * Category lookup by ID via dynamic on-demand synthesis
 */
export function getGbpCategoryById(id: string): GbpCategoryDefinition | undefined {
  if (!id) return undefined;
  return synthesizeCategoryDefinition(id);
}

/**
 * Category lookup by Name or common Trade Alias via dynamic on-demand synthesis
 */
export function getGbpCategoryByNameOrAlias(rawText: string): GbpCategoryDefinition | undefined {
  if (!rawText) return undefined;
  return synthesizeCategoryDefinition(rawText);
}

/**
 * Category search and auto-complete across dynamic SMB trade taxonomy.
 */
export function searchGbpCategories(query: string, limit = 10): GbpCategoryDefinition[] {
  const clean = (query || '').toLowerCase().trim();
  if (!clean) {
    const defaultTrades = [
      'Retail & Local Services',
      'Restaurant & Cafe',
      'Health & Medical',
      'Beauty & Personal Care',
      'Home Improvement & Repairs',
      'Professional & Legal Services',
      'IT & Digital Services',
      'Automotive & Repairs',
    ];
    return defaultTrades.slice(0, limit).map((d) => synthesizeCategoryDefinition(d));
  }

  const results: GbpCategoryDefinition[] = [];
  const seenIds = new Set<string>();

  // 1. Direct or partial alias matches
  for (const [aliasKey, hint] of Object.entries(COMMON_TRADE_ALIASES)) {
    if (aliasKey.startsWith(clean) || aliasKey.includes(clean) || hint.displayName.toLowerCase().includes(clean)) {
      const def = synthesizeCategoryDefinition(hint.displayName);
      if (!seenIds.has(def.id)) {
        seenIds.add(def.id);
        results.push(def);
        if (results.length >= limit) return results;
      }
    }
  }

  // 2. Synthesize query directly
  const directDef = synthesizeCategoryDefinition(clean);
  if (!seenIds.has(directDef.id)) {
    seenIds.add(directDef.id);
    results.push(directDef);
  }

  return results.slice(0, limit);
}

/**
 * Synthesizes reusable creative blueprints directly from merchant trade context & real services.
 */
export function generateCategoryBlueprints(params: {
  categoryOrTitle: string;
  businessName: string;
  city?: string;
  phone?: string;
  realServices?: string[];
}): GeneratedCreativeBlueprint[] {
  const { categoryOrTitle, businessName, city = 'Patna', phone = '', realServices } = params;

  // Specific trade context check: if business name or services indicate painting/texture, resolve to Painting contractor
  const isTextureOrPaint =
    /\b(texture|paint|painting|wall art|wall decor|painter)\b/i.test(
      `${businessName} ${categoryOrTitle} ${(realServices || []).join(' ')}`
    );

  const resolvedTradeCategory = isTextureOrPaint ? 'Painting contractor' : categoryOrTitle;
  const category = getGbpCategoryByNameOrAlias(resolvedTradeCategory);
  const context = normalizeCategoryContext(resolvedTradeCategory);
  const matchedPillar = isTextureOrPaint ? 'home_improvement' : (category?.pillar || context.verticalKey || 'specialty_local_services');
  const displayName = isTextureOrPaint
    ? 'Texture Painting & Wall Finishes'
    : (category?.displayName || (context.detectedSubject ? `${context.detectedSubject} Service` : categoryOrTitle.trim()));

  const visuals = getCategoryVisualPool(categoryOrTitle);
  const distinctVisuals = Array.from(new Set(visuals.filter(Boolean)));
  let photoCursor = 0;
  const getNextUniquePhoto = (): string => {
    if (distinctVisuals.length === 0) return '';
    return distinctVisuals[photoCursor++ % distinctVisuals.length];
  };

  const isServiceTrade =
    /service|agency|consult|guard|security|law|tech|clean|repair|contractor|salon|clinic|driver|transport|hire|rental|care|app|hospital|education|academy|advisory|paint/i.test(
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
      photoUrl: getNextUniquePhoto(),
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
      photoUrl: getNextUniquePhoto(),
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
      photoUrl: getNextUniquePhoto(),
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
      photoUrl: getNextUniquePhoto(),
      targetKeywords: [
        { keyword: `best ${displayName.toLowerCase()} in ${city}`, volume: 1200 },
        { keyword: `top rated ${displayName.toLowerCase()}`, volume: 450 },
      ],
      defaultCaption: reviewsSeo.fullContent,
    },
  );

  return blueprints;
}
