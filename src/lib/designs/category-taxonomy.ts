/**
 * Universal Category Taxonomy & Semantic Normalizer
 * Scales to all 4,000+ Google Business Profile (GBP) categories.
 * 
 * Maps any raw merchant category, business name, or search query into:
 *  1. One of the 16 Universal Trade Verticals
 *  2. Specific trade subject (e.g. "plywood", "mithai", "bridal salon", "solar inverter")
 *  3. Detected festival or seasonal occasion (e.g. "diwali", "holi", "eid")
 */

export interface NormalizedTradeContext {
  verticalKey: string;
  verticalLabel: string;
  detectedSubject: string;
  detectedOccasion?: string;
  isFestival: boolean;
  searchKeywords: string[];
}

export interface UniversalVerticalConfig {
  key: string;
  label: string;
  keywords: string[];
  visualSearchTerms: string[];
  defaultOfferCopy: {
    headline: string;
    subtitle: string;
    bullets: string[];
    cta: string;
  };
}

export const UNIVERSAL_VERTICALS: Record<string, UniversalVerticalConfig> = {
  building_materials_hardware: {
    key: 'building_materials_hardware',
    label: 'Building Materials, Hardware & Timber',
    keywords: [
      'plywood', 'ply', 'timber', 'hardware', 'laminate', 'sunmica', 'veneer', 'wood',
      'shuttering', 'mdf', 'blockboard', 'flush door', 'teak', 'hardwood', 'woodwork',
      'glass', 'mirror', 'glazing', 'sanitaryware', 'pipes', 'fittings', 'tools', 'fastener',
      'cement', 'steel', 'tiles', 'marble', 'granite', 'paint', 'paints', 'asian paints',
      'building material', 'contractor', 'carpentry', 'wood shop'
    ],
    visualSearchTerms: ['plywood sheets timber', 'modern wood workshop carpentry', 'architectural interior wood'],
    defaultOfferCopy: {
      headline: 'Premium Marine Plywood & Architectural Hardware',
      subtitle: '100% borer-proof, termite-resistant calibrated boards at direct wholesale pricing.',
      bullets: ['IS:710 Marine Grade Quality', 'Factory Direct Wholesale Rates', 'Immediate Site Delivery'],
      cta: 'GET WHOLESALE QUOTE',
    },
  },

  food_sweets_confectionery: {
    key: 'food_sweets_confectionery',
    label: 'Sweets, Bakery & Food',
    keywords: [
      'sweet', 'sweets', 'mithai', 'halwai', 'ladoo', 'laddu', 'jalebi', 'gulab jamun',
      'kaju katli', 'rasgulla', 'barfi', 'peda', 'namkeen', 'confection', 'bakery', 'cake',
      'pastry', 'snack', 'restaurant', 'cafe', 'bistro', 'diner', 'dhaba', 'cloud kitchen',
      'caterer', 'catering', 'dairy', 'milk', 'paneer', 'ice cream', 'dessert'
    ],
    visualSearchTerms: ['indian traditional sweets mithai', 'gulab jamun festive dessert', 'gourmet sweets box'],
    defaultOfferCopy: {
      headline: '100% Pure Desi Ghee Sweets & Festive Hampers',
      subtitle: 'Crafted fresh every morning with pure ingredients, royal dry fruits, and unmatched taste.',
      bullets: ['100% Pure Desi Ghee', 'Custom Festive Gift Hampers', 'Bulk Wedding & Party Orders'],
      cta: 'ORDER FRESH SWEETS',
    },
  },

  beauty_personal_care: {
    key: 'beauty_personal_care',
    label: 'Beauty, Salon & Personal Care',
    keywords: [
      'salon', 'saloon', 'spa', 'beauty', 'parlour', 'parlor', 'haircut', 'hair style',
      'hair dress', 'makeup', 'facial', 'barber', 'grooming', 'mehendi', 'makeover',
      'bridal', 'skin clinic', 'cosmetics', 'nail art', 'tattoo', 'waxing', 'keratin'
    ],
    visualSearchTerms: ['luxury hair salon styling', 'barber chair grooming', 'bridal makeover beauty artist'],
    defaultOfferCopy: {
      headline: 'Luxury Hair Styling & Bridal Makeover Packages',
      subtitle: 'Transform your look with certified celebrity stylists and premium international products.',
      bullets: ['HD Airbrush Makeup', 'Keratin & Deep Conditioning', 'Exclusive Bridal Studio'],
      cta: 'BOOK APPOINTMENT',
    },
  },

  health_medical_wellness: {
    key: 'health_medical_wellness',
    label: 'Healthcare, Clinics & Wellness',
    keywords: [
      'dentist', 'dental', 'teeth', 'tooth', 'doctor', 'clinic', 'medical', 'hospital',
      'health', 'pharmacy', 'chemist', 'physiotherapy', 'orthopedic', 'eye clinic',
      'optical', 'spectacles', 'pathology', 'lab', 'ayurvedic', 'homeopathy', 'dermatolog'
    ],
    visualSearchTerms: ['modern dental clinic smiling patient', 'healthcare consultation doctor', 'medical pharmacy'],
    defaultOfferCopy: {
      headline: 'Trusted Family Healthcare & Expert Medical Consultation',
      subtitle: 'Advanced clinical care, certified diagnostics, and gentle treatment for all age groups.',
      bullets: ['Certified Senior Specialists', 'Zero Waiting Time on Pre-Booking', '100% Hygienic Sanitized Care'],
      cta: 'SCHEDULE CONSULTATION',
    },
  },

  automotive_vehicles: {
    key: 'automotive_vehicles',
    label: 'Automobile, Repair & Services',
    keywords: [
      'auto', 'car', 'garage', 'mechanic', 'vehicle', 'detailing', 'tire', 'tyre',
      'service station', 'wheel', 'motor', 'bike', 'motorcycle', 'scooter', 'ev repair',
      'denting', 'painting car', 'car wash', 'battery'
    ],
    visualSearchTerms: ['car detailing workshop garage', 'mechanic inspection vehicle', 'car maintenance'],
    defaultOfferCopy: {
      headline: 'Complete Car Service & Diagnostics — Multi-Point Inspection',
      subtitle: 'Genuine OEM spare parts, synthetic oil change, and computer diagnostics with warranty.',
      bullets: ['OEM Genuine Parts Only', 'Free 40-Point Safety Checkup', 'Express Same-Day Delivery'],
      cta: 'BOOK SERVICE SLOT',
    },
  },

  fitness_sports: {
    key: 'fitness_sports',
    label: 'Fitness, Gym & Sports',
    keywords: [
      'gym', 'fitness', 'crossfit', 'workout', 'bodybuild', 'trainer', 'aerobic',
      'zumba', 'physique', 'yoga', 'pilates', 'swimming pool', 'sports academy', 'martial art'
    ],
    visualSearchTerms: ['fitness gym workout weights', 'modern athletic training', 'gym dumbbell fitness'],
    defaultOfferCopy: {
      headline: 'Transform Your Body — Annual Gym Membership Offer',
      subtitle: 'Top-tier imported equipment, certified personal trainers, and tailored nutrition plans.',
      bullets: ['Certified Personal Training', 'Free Diet & Nutrition Chart', 'Steam, Sauna & Locker Included'],
      cta: 'START FREE TRIAL',
    },
  },

  fashion_apparel_jewellery: {
    key: 'fashion_apparel_jewellery',
    label: 'Fashion, Clothing & Jewellery',
    keywords: [
      'fashion', 'boutique', 'clothing', 'cloth', 'garment', 'apparel', 'saree', 'lehenga',
      'dress', 'textile', 'tailor', 'suit', 'menswear', 'womenswear', 'jewellery', 'jewelry',
      'gold', 'diamond', 'silver', 'ornament', 'solitaire', 'necklace', 'bangle'
    ],
    visualSearchTerms: ['fashion boutique apparel', 'luxury gold jewellery festive', 'designer saree textile'],
    defaultOfferCopy: {
      headline: 'Exclusive Designer Ethnic & Festive Collections',
      subtitle: 'Handpicked fabrics, royal embroideries, and hallmark certified pure gold jewellery.',
      bullets: ['100% BIS Hallmarked Jewellery', 'Custom Tailoring & Styling', 'New Festive Season Arrival'],
      cta: 'EXPLORE COLLECTION',
    },
  },

  grocery_retail_fmcg: {
    key: 'grocery_retail_fmcg',
    label: 'Grocery, Supermarket & Retail',
    keywords: [
      'grocery', 'supermarket', 'market', 'bazaar', 'mandi', 'kirana', 'general store',
      'provision', 'mart', 'vegetable', 'fruit', 'retail', 'hypermarket', 'departmental',
      'dry fruit', 'fmcg', 'stationery', 'gift shop'
    ],
    visualSearchTerms: ['supermarket fresh grocery display', 'organic fruits retail store', 'provision store'],
    defaultOfferCopy: {
      headline: 'Daily Essentials & Fresh Groceries at Wholesale Rates',
      subtitle: 'Best quality grains, farm-fresh vegetables, and branded household goods delivered home.',
      bullets: ['Unbeatable Daily Discounts', 'Free Home Delivery Available', '100% Quality Checked'],
      cta: 'SHOP DAILY DEALS',
    },
  },

  home_electrical_services: {
    key: 'home_electrical_services',
    label: 'Electrical, Plumbing & Home Services',
    keywords: [
      'electr', 'wiring', 'circuit', 'lighting', 'switchboard', 'inverter', 'solar',
      'plumb', 'pipe', 'drain', 'leak', 'sanitary', 'faucet', 'hvac', 'ac repair',
      'air condition', 'appliance repair', 'washing machine', 'refrigerator', 'pest control',
      'cleaning service', 'ro water', 'water purifier'
    ],
    visualSearchTerms: ['electrician repair maintenance', 'solar panel installation roof', 'plumbing pipe tools'],
    defaultOfferCopy: {
      headline: 'Professional Home Repair & Installation Within 60 Mins',
      subtitle: 'Verified background-checked technicians, upfront flat-rate pricing, and service guarantee.',
      bullets: ['60-Minute Rapid Doorstep Visit', '30-Day Post-Service Warranty', 'Upfront Flat Pricing'],
      cta: 'CALL TECHNICIAN NOW',
    },
  },

  real_estate_interiors: {
    key: 'real_estate_interiors',
    label: 'Real Estate, Interiors & Architecture',
    keywords: [
      'real estate', 'realtor', 'property', 'builder', 'apartment', 'flat', 'housing',
      'villa', 'plot', 'interior designer', 'architect', 'modular kitchen', 'decor',
      'false ceiling', 'wall decor', 'renovation', 'home improvement'
    ],
    visualSearchTerms: ['modern luxury interior design living room', 'architecture real estate building', 'modular kitchen'],
    defaultOfferCopy: {
      headline: 'Custom Modular Interiors & Turnkey Home Renovation',
      subtitle: 'Turn your house into your dream home with 3D visualization, warranty, and timely delivery.',
      bullets: ['Free 3D Design Walkthrough', '10-Year Material Warranty', '45-Day Promised Handover'],
      cta: 'BOOK FREE 3D CONSULTATION',
    },
  },

  it_software_digital: {
    key: 'it_software_digital',
    label: 'IT, Software & Digital Services',
    keywords: [
      'software', 'it ', 'tech', 'developer', 'code', 'web dev', 'app dev', 'cloud',
      'saas', 'digital marketing', 'seo', 'computer', 'laptop repair', 'network',
      'cctv', 'surveillance', 'biometric', 'fieseros', 'serviceos', 'information technology',
      'it service', 'it services'
    ],
    visualSearchTerms: ['modern technology software workspace', 'cloud digital analytics laptop', 'programming code screen'],
    defaultOfferCopy: {
      headline: 'Accelerate Your Business with Scalable Digital & Cloud Solutions',
      subtitle: 'Custom web development, mobile apps, and automated workflows engineered for ROI.',
      bullets: ['Custom Architecture & Code', '99.9% Uptime SLA Guarantee', 'Dedicated 24/7 Support'],
      cta: 'SCHEDULE STRATEGY CALL',
    },
  },

  professional_legal_finance: {
    key: 'professional_legal_finance',
    label: 'Finance, Legal & Accounting',
    keywords: [
      'legal', 'law', 'lawyer', 'advocate', 'attorney', 'notary', 'chartered accountant',
      'ca ', 'audit', 'tax', 'gst', 'income tax', 'accounting', 'bookkeeping',
      'insurance', 'loan', 'finance', 'consultant'
    ],
    visualSearchTerms: ['professional business meeting desk', 'financial accounting documents', 'legal consultation office'],
    defaultOfferCopy: {
      headline: 'Expert GST, Income Tax & Corporate Advisory Services',
      subtitle: 'Maximize tax savings, ensure 100% compliance, and protect your enterprise with certified CAs.',
      bullets: ['Zero Penalty Compliance Filing', 'Strategic Tax Saving Audits', 'Confidential Expert Advisory'],
      cta: 'TALK TO AN EXPERT',
    },
  },

  education_coaching: {
    key: 'education_coaching',
    label: 'Education, Coaching & Classes',
    keywords: [
      'education', 'coaching', 'tuition', 'academy', 'school', 'training', 'institute',
      'learning', 'iit', 'neet', 'upsc', 'spoken english', 'computer classes', 'music class',
      'dance academy', 'preschool', 'daycare'
    ],
    visualSearchTerms: ['student education classroom library', 'modern learning study coaching', 'graduation study books'],
    defaultOfferCopy: {
      headline: 'Admissions Open — Expert Coaching with Proven Top Results',
      subtitle: 'Structured curriculum, small batch sizes, daily doubt clearance, and comprehensive mock tests.',
      bullets: ['Top Faculty with 10+ Years Experience', 'Weekly Mock Test Series', 'Scholarship Test Discounts'],
      cta: 'ENROLL FOR FREE DEMO',
    },
  },

  events_hospitality: {
    key: 'events_hospitality',
    label: 'Events, Catering & Hospitality',
    keywords: [
      'event', 'wedding', 'decorator', 'stage decor', 'caterer', 'tent house', 'party',
      'banquet', 'lawn', 'photographer', 'photo studio', 'videograph', 'resort',
      'farmhouse', 'hotel', 'homestay'
    ],
    visualSearchTerms: ['wedding floral stage decoration event', 'banquet hall luxury lighting', 'event party celebration'],
    defaultOfferCopy: {
      headline: 'Make Your Special Day Unforgettable — Grand Event Planning',
      subtitle: 'Exquisite floral stage decor, gourmet live catering, and flawless ceremony execution.',
      bullets: ['Theme Stage & Lighting Setup', 'Multi-Cuisine Gourmet Catering', 'Dedicated Event Coordinator'],
      cta: 'CHECK BANQUET DATES',
    },
  },

  logistics_industrial: {
    key: 'logistics_industrial',
    label: 'Logistics, Industrial & Fabrication',
    keywords: [
      'courier', 'logistic', 'transport', 'cargo', 'freight', 'delivery', 'mover', 'packer',
      'weld', 'fabricat', 'iron', 'steel', 'metal work', 'blacksmith', 'grating',
      'shutter', 'gate', 'machine', 'manufacturing'
    ],
    visualSearchTerms: ['welding steel fabrication workshop', 'logistics warehouse transport', 'industrial machinery'],
    defaultOfferCopy: {
      headline: 'Heavy-Duty Metal Fabrication & Safe Logistics Solutions',
      subtitle: 'Precision engineering, certified welders, and on-schedule doorstep logistics across India.',
      bullets: ['High Tensile Certified Steel', 'On-Time Project Delivery', 'Custom Engineering Specs'],
      cta: 'REQUEST INDUSTRIAL QUOTE',
    },
  },

  security_safety_services: {
    key: 'security_safety_services',
    label: 'Security & Safety Services',
    keywords: [
      'security', 'security service', 'security guard', 'sos', 'emergency security',
      'patrol', 'bodyguard', 'bouncer', 'surveillance', 'guard agency', 'protection',
      'cctv installation', 'alarm system', 'safety services', 'facility security'
    ],
    visualSearchTerms: [
      'professional security guard uniform officer',
      'security operations surveillance control room',
      'emergency patrol vehicle security team',
      'access control biometric security gate'
    ],
    defaultOfferCopy: {
      headline: '24/7 Professional Security & Emergency SOS Protection in {city}',
      subtitle: 'Trained, verified security personnel and rapid-response safety solutions for commercial and residential premises.',
      bullets: [
        'Verified & Trained Security Personnel',
        '24/7 Rapid SOS Emergency Response',
        'Government PSARA Licensed & Insured'
      ],
      cta: 'HIRE SECURITY GUARDS',
    },
  },

  specialty_local_services: {
    key: 'specialty_local_services',
    label: 'Specialty Local Trades & Services',
    keywords: [
      'astrolog', 'horoscope', 'vastu', 'kundali', 'pet', 'veterin', 'vet', 'dog',
      'cat', 'laundry', 'dry clean', 'printing', 'framing', 'tailoring', 'security guard',
      'billiards', 'aquarium', 'nursery', 'plants', 'gardening'
    ],
    visualSearchTerms: ['local business storefront service', 'astrology horoscope spiritual', 'pet veterinary care clinic'],
    defaultOfferCopy: {
      headline: 'Trusted Local Specialists — Personalized Care & Quick Service',
      subtitle: 'Generations of trusted experience delivering personalized, transparent solutions for your family.',
      bullets: ['100% Satisfaction Guaranteed', 'Personalized One-on-One Attention', 'Transparent Honest Pricing'],
      cta: 'CONTACT US TODAY',
    },
  },
};

export const FESTIVAL_OCCASIONS = [
  'diwali',
  'holi',
  'eid',
  'christmas',
  'new_year',
  'independence_day',
  'republic_day',
  'rakhi',
  'navratri',
  'dussehra',
  'chhath_puja',
  'valentine',
  'mothers_day',
  'fathers_day',
];

/**
 * Maps ANY input text (GBP category, business name, search query)
 * into a rich, structured trade context.
 */
export function normalizeCategoryContext(rawText: string): NormalizedTradeContext {
  const text = (rawText || '').trim().toLowerCase();

  // 1. Detect if an Indian/Universal festival is mentioned
  let detectedOccasion: string | undefined;
  if (/diwali|deepavali|dipawali/i.test(text)) detectedOccasion = 'diwali';
  else if (/holi|dhulandi|dhuleti|gulal/i.test(text)) detectedOccasion = 'holi';
  else if (/eid|ramzan|ramadan/i.test(text)) detectedOccasion = 'eid';
  else if (/christmas|xmas/i.test(text)) detectedOccasion = 'christmas';
  else if (/new year|nye|2027|2026/i.test(text)) detectedOccasion = 'new_year';
  else if (/independence day|15 august/i.test(text)) detectedOccasion = 'independence_day';
  else if (/republic day|26 january/i.test(text)) detectedOccasion = 'republic_day';
  else if (/rakhi|raksha bandhan/i.test(text)) detectedOccasion = 'rakhi';
  else if (/navratri|durga puja/i.test(text)) detectedOccasion = 'navratri';
  else if (/dussehra|vijayadashami/i.test(text)) detectedOccasion = 'dussehra';
  else if (/chhath|chhath puja/i.test(text)) detectedOccasion = 'chhath_puja';
  else if (/valentine/i.test(text)) detectedOccasion = 'valentine';

  // 2. Score text against all 16 Universal Verticals
  let bestVerticalKey = 'specialty_local_services';
  let bestScore = -1;

  for (const [key, config] of Object.entries(UNIVERSAL_VERTICALS)) {
    let score = 0;
    for (const kw of config.keywords) {
      if (text.includes(kw)) {
        // Boost multi-word or exact keyword matches
        score += kw.length > 4 ? 3 : 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestVerticalKey = key;
    }
  }

  // 3. Extract primary trade subject (e.g. "Plywood", "Mithai", "Salon", "Dentist")
  let detectedSubject = 'Local Business';
  const cleanTokens = text.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const stopWords = new Set(['in', 'near', 'me', 'best', 'top', 'service', 'shop', 'store', 'centre', 'center', 'the', 'and', 'for', 'at']);

  for (const tok of cleanTokens) {
    if (!stopWords.has(tok) && tok.length > 2) {
      detectedSubject = tok.charAt(0).toUpperCase() + tok.slice(1);
      break;
    }
  }

  const verticalConfig = UNIVERSAL_VERTICALS[bestVerticalKey] || UNIVERSAL_VERTICALS.specialty_local_services;

  return {
    verticalKey: bestVerticalKey,
    verticalLabel: verticalConfig.label,
    detectedSubject,
    detectedOccasion,
    isFestival: Boolean(detectedOccasion),
    searchKeywords: verticalConfig.visualSearchTerms,
  };
}
