import type { PosterTemplate } from './poster-templates';
import {
  validateDesign,
  type DesignLayer,
  type MarketingDesign,
  type PosterTemplateLayout,
} from './marketing-design';
import type { StudioPosterInput } from './poster-composition';
import { KIT_HIGH_RES_PHOTOS, KIT_SVG_EMBLEMS } from './template-graphic-assets';

export interface KitPosterDefinition {
  id: string;
  name: string;
  kitSource: string;
  category: PosterTemplate['category'];
  layout: PosterTemplateLayout;
  badge: string;
  headline: string;
  subtitle: string;
  bullets?: string[];
  couponCode?: string;
  cta: string;
  photo: string;
  graphicEmblem?: string;
  graphicDivider?: string;
  bgPrompt: string;
  ink: string;
  paper: string;
  accent: string;
  accentBg?: string;
  fontFamily: 'sans' | 'editorial' | 'display';
  industries: string[];
  occasionId?: string;
}

export const LAYERED_KIT_DEFINITIONS: KitPosterDefinition[] = [
  // ─── KITS 2 & 3: REAL ESTATE, CONSTRUCTION & INTERIORS ─────────────────────
  {
    id: 'kit-primehome-realty',
    name: 'PrimeHome • Real Estate & Properties',
    kitSource: 'kit_2',
    category: 'service_spotlight',
    layout: 'kit_primehome',
    badge: 'BUY • SELL • RENT',
    headline: 'Find the Right\nProperty for You',
    subtitle: 'Verified residential & commercial spaces curated for smart investment.',
    bullets: ['Residential Apartments', 'Commercial Offices', 'Plots & Land', 'Legal & Documentation Assistance'],
    cta: 'Book Consultation →',
    photo: KIT_HIGH_RES_PHOTOS.primeHomeVilla,
    graphicEmblem: KIT_SVG_EMBLEMS.buildingBadge,
    bgPrompt: 'Luxury modern architectural villa exterior with warm evening lights, glass facade, pristine pool, commercial real estate photography, no text.',
    ink: '#0C2F56',
    paper: '#F8FAFC',
    accent: '#0B396B',
    accentBg: '#E0EDFA',
    fontFamily: 'sans',
    industries: ['real estate', 'property', 'broker', 'realtor', 'housing'],
  },
  {
    id: 'kit-buildright-construction',
    name: 'BuildRight • Builders & Renovation',
    kitSource: 'kit_2',
    category: 'service_spotlight',
    layout: 'kit_buildright',
    badge: 'TURNKEY SOLUTIONS',
    headline: 'Build Your\nDream Space',
    subtitle: 'From foundation to finishing, built with uncompromised engineering excellence.',
    bullets: ['New Construction', 'Home Renovation', 'Project Management', 'On-Time Guaranteed Delivery'],
    cta: 'Get a Free Quote →',
    photo: KIT_HIGH_RES_PHOTOS.buildRightStructure,
    graphicEmblem: KIT_SVG_EMBLEMS.buildingBadge,
    bgPrompt: 'Architectural blueprint and modern luxury building under construction, clean morning sunlight, engineering commercial photography, no text.',
    ink: '#1E293B',
    paper: '#FFFFFF',
    accent: '#D9531E',
    accentBg: '#FFEDE5',
    fontFamily: 'sans',
    industries: ['construction', 'builder', 'renovation', 'contractor', 'civil'],
  },
  {
    id: 'kit-spacestyle-interiors',
    name: 'SpaceStyle • Interior Design',
    kitSource: 'kit_3',
    category: 'service_spotlight',
    layout: 'kit_spacestyle',
    badge: 'HOMES & OFFICES',
    headline: 'Beautiful Interiors\nfor Every Space',
    subtitle: 'Transforming everyday spaces into functional works of art with 3D visualization.',
    bullets: ['Space Planning', 'Modular Kitchens & Wardrobes', 'Lighting Design', 'Complete Turnkey Execution'],
    cta: 'Book Design Session →',
    photo: KIT_HIGH_RES_PHOTOS.spaceStyleLiving,
    graphicEmblem: KIT_SVG_EMBLEMS.buildingBadge,
    bgPrompt: 'Minimalist Scandinavian luxury living room with warm wood accents, linen sofa and curated plants, architectural interior photography, no text.',
    ink: '#0E3158',
    paper: '#FAFAFA',
    accent: '#0E4A7A',
    accentBg: '#EBF4FB',
    fontFamily: 'editorial',
    industries: ['interior design', 'interiors', 'decor', 'furniture', 'architecture'],
  },
  {
    id: 'kit-rentwise-apartment',
    name: 'RentWise • Rental Living',
    kitSource: 'kit_2',
    category: 'service_spotlight',
    layout: 'kit_rentwise',
    badge: 'ZERO BROKERAGE',
    headline: 'Find the Right\nProperty to Rent',
    subtitle: 'Browse 100% verified flats, furnished studios and executive family homes.',
    bullets: ['Zero Brokerage Fees', '100% Verified Owners', 'Move-In Ready Inspections', 'Instant Rental Agreement'],
    cta: 'Explore Rentals Now →',
    photo: KIT_HIGH_RES_PHOTOS.rentWiseApartment,
    graphicEmblem: KIT_SVG_EMBLEMS.buildingBadge,
    bgPrompt: 'Bright modern apartment interior with sunny balcony view over city skyline, clean contemporary living space, no text.',
    ink: '#064E3B',
    paper: '#F0FDF4',
    accent: '#059669',
    accentBg: '#D1FAE5',
    fontFamily: 'sans',
    industries: ['rent', 'rental', 'apartment', 'real estate', 'property'],
  },

  // ─── KIT 4: LUXURY GRAND CATERING & EVENTS ──────────────────────────────────
  {
    id: 'kit-royal-feast-catering',
    name: 'Royal Feast • Luxury Catering',
    kitSource: 'kit_4',
    category: 'service_spotlight',
    layout: 'kit_royal_feast',
    badge: 'GOLD STANDARD HOSPITALITY',
    headline: 'Catering for\nEvery Occasion',
    subtitle: 'Exquisite culinary artistry crafted for weddings, grand galas and private celebrations.',
    bullets: ['Wedding Banquets', 'Corporate Dinners', 'Cocktail Galas', 'Artisanal Live Counters'],
    cta: 'Reserve Tasting Date →',
    photo: KIT_HIGH_RES_PHOTOS.royalFeastBanquet,
    graphicEmblem: KIT_SVG_EMBLEMS.chefHatGold,
    graphicDivider: KIT_SVG_EMBLEMS.goldFlourishDivider,
    bgPrompt: 'Opulent wedding banquet banquet table with gold cutlery, crystal glassware and warm candlelight, luxury gastronomy photography, no text.',
    ink: '#FFFFFF',
    paper: '#1B030B',
    accent: '#DFB743',
    accentBg: '#2B0614',
    fontFamily: 'editorial',
    industries: ['catering', 'caterer', 'wedding', 'restaurant', 'banquet', 'food', 'hospitality'],
  },

  // ─── KIT 5: FESTIVE GREETINGS SUITE 1.0 ─────────────────────────────────────
  {
    id: 'kit-festive-diwali-gold',
    name: 'Diwali • Festival of Lights',
    kitSource: 'kit_5',
    category: 'festival',
    layout: 'kit_festive_diwali',
    badge: 'DEEPAVALI WISHES',
    headline: 'Happy Diwali\n& Prosperous New Year',
    subtitle: 'May the festival of lights illuminate your path with joy, good health and abundance.',
    bullets: ['Joy • Harmony • Prosperity'],
    cta: 'Celebrate with Us 🪔',
    photo: 'https://images.unsplash.com/photo-1605647540924-852290f6b0d5?auto=format&fit=crop&w=1200&q=85',
    graphicEmblem: KIT_SVG_EMBLEMS.glowingDiyaFlame,
    bgPrompt: 'Traditional clay diyas glowing with golden flames, marigold flowers, deep maroon and amber bokeh background, festive photography, no text.',
    ink: '#FFF3D6',
    paper: '#280A18',
    accent: '#F59E0B',
    accentBg: '#451025',
    fontFamily: 'editorial',
    industries: ['any'],
    occasionId: 'diwali',
  },
  {
    id: 'kit-festive-eid-mubarak',
    name: 'Eid Mubarak • Peace & Blessings',
    kitSource: 'kit_5',
    category: 'festival',
    layout: 'kit_festive_eid',
    badge: 'EID GREETINGS',
    headline: 'Eid Mubarak\nto You & Your Family',
    subtitle: 'May this auspicious occasion bring peace, divine blessings and joyful celebrations.',
    bullets: ['Peace • Gratitude • Family'],
    cta: 'Warmest Wishes 🌙',
    photo: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=1200&q=85',
    graphicEmblem: KIT_SVG_EMBLEMS.crescentMoonStar,
    bgPrompt: 'Golden crescent moon with hanging ornate Arabic lanterns, deep emerald teal sky with glowing starlight, festive photography, no text.',
    ink: '#FFFFFF',
    paper: '#03261D',
    accent: '#EAB308',
    accentBg: '#083D2F',
    fontFamily: 'editorial',
    industries: ['any'],
    occasionId: 'eid',
  },
  {
    id: 'kit-festive-christmas-cheer',
    name: 'Christmas • Festive Joy',
    kitSource: 'kit_5',
    category: 'festival',
    layout: 'kit_festive_christmas',
    badge: 'HOLIDAY SEASON',
    headline: 'Merry Christmas\n& Joyful Holidays',
    subtitle: 'Wishing you a season filled with warmth, laughter and cherished moments with loved ones.',
    bullets: ['Warmth • Joy • Generosity'],
    cta: 'Season Greetings 🎄',
    photo: 'https://images.unsplash.com/photo-1543258103-a62bdc069871?auto=format&fit=crop&w=1200&q=85',
    graphicEmblem: KIT_SVG_EMBLEMS.crescentMoonStar,
    bgPrompt: 'Warm glowing Christmas tree with red and gold baubles, cozy fireplace bokeh in background, holiday photography, no text.',
    ink: '#FFFFFF',
    paper: '#142416',
    accent: '#EF4444',
    accentBg: '#213B24',
    fontFamily: 'editorial',
    industries: ['any'],
    occasionId: 'christmas',
  },

  // ─── KIT 6: COMPLETE AUTOMOTIVE SERVICES ────────────────────────────────────
  {
    id: 'kit-cleanride-carwash',
    name: 'CleanRide • Car Wash & Detailing',
    kitSource: 'kit_6',
    category: 'service_spotlight',
    layout: 'kit_auto_carwash',
    badge: 'CERAMIC & DETAILING PROS',
    headline: 'Professional\nCar Wash & Detailing',
    subtitle: 'Keep your vehicle looking showroom-fresh with scratch-free foam washing and high-gloss polish.',
    bullets: ['Snow Foam Exterior Wash', 'Deep Interior Steam Cleaning', 'Machine Polish & Waxing', '9H Ceramic Coating'],
    cta: 'Book Your Wash Now',
    photo: KIT_HIGH_RES_PHOTOS.cleanRideSnowFoam,
    graphicEmblem: KIT_SVG_EMBLEMS.autoCareShield,
    bgPrompt: 'Sleek luxury sports car receiving snow foam wash in modern detailing studio, dynamic water drops, automotive commercial photography, no text.',
    ink: '#FFFFFF',
    paper: '#0A192F',
    accent: '#00D2D3',
    accentBg: '#112D4E',
    fontFamily: 'sans',
    industries: ['car wash', 'detailing', 'auto', 'car service', 'automotive'],
  },
  {
    id: 'kit-autocare-garage',
    name: 'AutoCare • Garage & Multi-Brand Service',
    kitSource: 'kit_6',
    category: 'appointment',
    layout: 'kit_auto_garage',
    badge: 'CERTIFIED MECHANICS',
    headline: 'Complete Car Care\nUnder One Roof',
    subtitle: 'Precision diagnostics, OEM parts, and certified technician service for all car brands.',
    bullets: ['Full Engine Diagnostics', 'Brake & Clutch Repair', 'AC Gas Refill & Cooling', 'Suspension Overhaul'],
    cta: 'Schedule Car Service',
    photo: KIT_HIGH_RES_PHOTOS.autoCareWorkshop,
    graphicEmblem: KIT_SVG_EMBLEMS.autoCareShield,
    bgPrompt: 'Clean modern auto repair workshop with car on hydraulic lift, mechanic tools neatly organized, automotive photography, no text.',
    ink: '#FFFFFF',
    paper: '#111827',
    accent: '#EF4444',
    accentBg: '#1F2937',
    fontFamily: 'sans',
    industries: ['garage', 'mechanic', 'auto repair', 'car service'],
  },
  {
    id: 'kit-bikefix-service',
    name: 'BikeFix • Two-Wheeler Care',
    kitSource: 'kit_6',
    category: 'appointment',
    layout: 'kit_auto_bike',
    badge: 'EXPRESS BIKE SERVICE',
    headline: 'Keep Your Ride\nSmooth & Reliable',
    subtitle: 'Specialized maintenance for motorcycles and scooters by certified technicians.',
    bullets: ['Engine Oil Change', 'Brake & Chain Tuning', 'Electrical & Battery Check', 'Pick & Drop Service'],
    cta: 'Book Bike Service →',
    photo: KIT_HIGH_RES_PHOTOS.bikeFixService,
    graphicEmblem: KIT_SVG_EMBLEMS.autoCareShield,
    bgPrompt: 'Modern motorcycle workshop with sleek cafe racer motorbike on stand, tools and diagnostic laptop, automotive photography, no text.',
    ink: '#FFFFFF',
    paper: '#172554',
    accent: '#38BDF8',
    accentBg: '#1E3A8A',
    fontFamily: 'sans',
    industries: ['bike', 'motorcycle', 'scooter', 'mechanic', 'auto'],
  },

  // ─── KIT 7: CIVIC & COMMUNITY CAMPAIGNS ────────────────────────────────────
  {
    id: 'kit-civic-progress-trust',
    name: 'Civic • Progress & Public Trust',
    kitSource: 'kit_7',
    category: 'quote',
    layout: 'kit_civic_progress',
    badge: 'LEADERSHIP & INTEGRITY',
    headline: 'Working for Progress,\nBuilt on Trust',
    subtitle: 'Dedicated to community welfare, modern healthcare, youth employment, and clean infrastructure.',
    bullets: ['Clean Drinking Water', 'Quality Healthcare for All', 'Youth Skill Development', 'Transparent Governance'],
    cta: 'Join the Movement →',
    photo: KIT_HIGH_RES_PHOTOS.civicLeadership,
    graphicEmblem: KIT_SVG_EMBLEMS.buildingBadge,
    bgPrompt: 'Diverse energetic community crowd cheering, bright sunny morning in city square, inspiring civic photography, no text.',
    ink: '#FFFFFF',
    paper: '#0B2545',
    accent: '#F59E0B',
    accentBg: '#134074',
    fontFamily: 'display',
    industries: ['civic', 'ngo', 'community', 'politics', 'foundation'],
  },
  {
    id: 'kit-civic-farmer-support',
    name: 'Kisan • Agricultural Prosperity',
    kitSource: 'kit_7',
    category: 'quote',
    layout: 'kit_civic_farmer',
    badge: 'PROSPERITY FOR ALL',
    headline: 'Empowering Farmers,\nNourishing the Nation',
    subtitle: 'Championing fair crop prices, modern irrigation, cold storage facilities, and solar power support.',
    bullets: ['Solar Tube-Well Subsidies', 'Modern Cold Storage', 'Crop Insurance Protection', 'Direct Market Access'],
    cta: 'Support Our Farmers →',
    photo: KIT_HIGH_RES_PHOTOS.civicFarmerProsperity,
    graphicEmblem: KIT_SVG_EMBLEMS.sacredGaneshaLotus,
    bgPrompt: 'Golden lush green agricultural field at sunrise with fresh dew and morning mist, farmer standing proudly, no text.',
    ink: '#FFFFFF',
    paper: '#14361E',
    accent: '#84CC16',
    accentBg: '#1E522E',
    fontFamily: 'display',
    industries: ['farming', 'agriculture', 'rural', 'community'],
  },

  // ─── KIT 8 & 11: COMMERCIAL VERTICALS (HEALTH, SALON, DINING, ACADEMY) ──────
  {
    id: 'kit-vertical-healthcare-plus',
    name: 'HealthCare Plus • Modern Clinic',
    kitSource: 'kit_8',
    category: 'appointment',
    layout: 'kit_vertical_healthcare',
    badge: 'TRUSTED MEDICAL CARE',
    headline: 'Care, Cure\n& Compassion',
    subtitle: 'Expert medical consultations, painless dental care, and advanced on-site diagnostics.',
    bullets: ['Experienced Specialists', 'Digital Diagnostics Lab', 'Zero Wait Appointments', 'Affordable Health Checkups'],
    cta: 'Book Doctor Visit →',
    photo: KIT_HIGH_RES_PHOTOS.healthcareClinic,
    graphicEmblem: KIT_SVG_EMBLEMS.medicalCrossEmblem,
    bgPrompt: 'Modern bright medical clinic lobby with friendly doctor in white coat holding clipboard, welcoming healthcare photography, no text.',
    ink: '#0F172A',
    paper: '#F0FDF4',
    accent: '#059669',
    accentBg: '#DCFCE7',
    fontFamily: 'sans',
    industries: ['clinic', 'doctor', 'hospital', 'dentist', 'healthcare', 'medical'],
  },
  {
    id: 'kit-vertical-luxe-salon',
    name: 'Aura • Luxury Salon & Aesthetics',
    kitSource: 'kit_11',
    category: 'appointment',
    layout: 'kit_vertical_salon',
    badge: 'PREMIUM BEAUTY LOUNGE',
    headline: 'Elegance • Radiance\n& Artistry',
    subtitle: 'Experience bespoke hair styling, revitalizing dermal facials, and pampering spa rituals.',
    bullets: ['Signature Hair Styling', 'Hydra Facial & Skin Glow', 'Bridal & Party Makeovers', 'Relaxing Head & Foot Spa'],
    cta: 'Book Your Appointment →',
    photo: KIT_HIGH_RES_PHOTOS.luxeSalonAesthetics,
    graphicEmblem: KIT_SVG_EMBLEMS.salonSparkleEmblem,
    bgPrompt: 'Chic modern beauty salon with rose gold mirrors and warm aesthetic lighting, luxury wellness photography, no text.',
    ink: '#4A0E2E',
    paper: '#FFF5F7',
    accent: '#DB2777',
    accentBg: '#FCE7F3',
    fontFamily: 'editorial',
    industries: ['salon', 'spa', 'beauty', 'hair', 'makeup', 'parlour'],
  },
  {
    id: 'kit-vertical-gourmet-bistro',
    name: 'Savor • Artisanal Kitchen & Cafe',
    kitSource: 'kit_11',
    category: 'service_spotlight',
    layout: 'kit_vertical_dining',
    badge: 'CHEF RECOMMENDED',
    headline: 'Flavors Crafted\nwith Passion',
    subtitle: 'Authentic recipes made with farm-fresh organic ingredients, artisanal breads, and signature brew.',
    bullets: ['Farm-to-Table Freshness', 'Artisanal Woodfired Pizza', 'Single-Origin Coffee Bar', 'Dine-In & Curbside Pickup'],
    cta: 'Explore Our Menu →',
    photo: KIT_HIGH_RES_PHOTOS.gourmetDiningKitchen,
    graphicEmblem: KIT_SVG_EMBLEMS.gourmetDiningCloche,
    bgPrompt: 'Warm cozy bistro restaurant interior with ambient fairy lights and wood tables, appetizing culinary photography, no text.',
    ink: '#FFFFFF',
    paper: '#1F1610',
    accent: '#F59E0B',
    accentBg: '#38281C',
    fontFamily: 'editorial',
    industries: ['restaurant', 'cafe', 'bistro', 'food', 'bakery', 'coffee'],
  },
  {
    id: 'kit-vertical-academy-coaching',
    name: 'Apex Academy • Coaching & Tutoring',
    kitSource: 'kit_8',
    category: 'appointment',
    layout: 'kit_vertical_education',
    badge: 'TOP RANK PREPARATION',
    headline: 'Empowering\nTomorrow’s Minds',
    subtitle: 'Comprehensive coaching, expert mentors, and personalized learning plans for competitive exams.',
    bullets: ['Expert Faculty Mentorship', 'Comprehensive Study Modules', 'Weekly Mock Test Series', 'Small Batch Attention'],
    cta: 'Enroll in Free Demo →',
    photo: KIT_HIGH_RES_PHOTOS.academyEducation,
    graphicEmblem: KIT_SVG_EMBLEMS.buildingBadge,
    bgPrompt: 'Bright modern classroom with engaged students and interactive digital smartboard, inspiring education photography, no text.',
    ink: '#0F172A',
    paper: '#F8FAFC',
    accent: '#2563EB',
    accentBg: '#DBEAFE',
    fontFamily: 'sans',
    industries: ['education', 'coaching', 'tuition', 'school', 'academy', 'classes'],
  },

  // ─── KIT 9: EXTENDED FESTIVE SUITE 2.0 ─────────────────────────────────────
  {
    id: 'kit-festive-ganesh-chaturthi',
    name: 'Ganesh Chaturthi • Divine Blessings',
    kitSource: 'kit_9',
    category: 'festival',
    layout: 'kit_festive_ganesh',
    badge: 'SHREE GANESHA WISHES',
    headline: 'Happy Ganesh\nChaturthi',
    subtitle: 'May Lord Ganesha remove all obstacles and bless your home with health, wisdom and prosperity.',
    bullets: ['Wisdom • Good Fortune • Auspicious Beginnings'],
    cta: 'Jai Ganesha 🌺',
    photo: 'https://images.unsplash.com/photo-1567653418876-5bb0e566e1c2?auto=format&fit=crop&w=1200&q=85',
    graphicEmblem: KIT_SVG_EMBLEMS.sacredGaneshaLotus,
    bgPrompt: 'Beautiful eco-friendly Lord Ganesha idol adorned with fresh marigold garland and modak offerings, soft temple bokeh, no text.',
    ink: '#FFFFFF',
    paper: '#3B0718',
    accent: '#F59E0B',
    accentBg: '#590D22',
    fontFamily: 'editorial',
    industries: ['any'],
    occasionId: 'ganesh_chaturthi',
  },
  {
    id: 'kit-festive-navratri-garba',
    name: 'Navratri • Nine Auspicious Nights',
    kitSource: 'kit_9',
    category: 'festival',
    layout: 'kit_festive_navratri',
    badge: 'DANDIYA & CELEBRATION',
    headline: 'Joyous Navratri\n& Garba Nights',
    subtitle: 'May Maa Durga shower her divine grace, strength and protection on you and your family.',
    bullets: ['Grace • Devotion • Celebration'],
    cta: 'Shubh Navratri 💃',
    photo: 'https://images.unsplash.com/photo-1570784332176-fdd73da66f03?auto=format&fit=crop&w=1200&q=85',
    graphicEmblem: KIT_SVG_EMBLEMS.sacredGaneshaLotus,
    bgPrompt: 'Festive dandiya sticks with vibrant silk mirrorwork fabric, celebratory golden bokeh lights, festive photography, no text.',
    ink: '#FFFFFF',
    paper: '#1E0E3D',
    accent: '#EC4899',
    accentBg: '#311762',
    fontFamily: 'display',
    industries: ['any'],
    occasionId: 'navratri',
  },

  // ─── KIT 10: HIGH-IMPACT FLASH SALES & OFFERS ──────────────────────────────
  {
    id: 'kit-sale-grand-festive-50',
    name: 'Grand Festive Sale • Flat 50% Off',
    kitSource: 'kit_10',
    category: 'sale_offer',
    layout: 'kit_sale_festive50',
    badge: 'LIMITED TIME SALE',
    headline: 'GRAND FESTIVE SALE\nFLAT 50% OFF',
    subtitle: 'Massive festive discounts across all premium collections and seasonal arrivals.',
    bullets: ['Free Gift with Every Order', 'Instant Same-Day Dispatch', 'Zero-Cost EMI Available'],
    couponCode: 'FESTIVE50',
    cta: 'Shop Deals Now →',
    photo: KIT_HIGH_RES_PHOTOS.festiveSaleBoutique,
    graphicEmblem: KIT_SVG_EMBLEMS.lightningDropBolt,
    bgPrompt: 'Festive shopping bags and golden ribbons in bright modern boutique showroom, vibrant commercial retail photography, no text.',
    ink: '#FFFFFF',
    paper: '#1E1B4B',
    accent: '#F43F5E',
    accentBg: '#312E81',
    fontFamily: 'display',
    industries: ['retail', 'shopping', 'fashion', 'store', 'boutique'],
  },
  {
    id: 'kit-sale-mega-flash-70',
    name: 'Mega Flash Sale • Up to 70% Off',
    kitSource: 'kit_10',
    category: 'sale_offer',
    layout: 'kit_sale_flash70',
    badge: '⚡ 24-HOUR DROP',
    headline: 'MEGA FLASH SALE\nUP TO 70% OFF',
    subtitle: 'Limited release doorbusters. Once stocks run out, the prices go back up.',
    bullets: ['Extra 10% on Prepaid Orders', 'Worldwide Express Dispatch', 'Price Match Guaranteed'],
    couponCode: 'FLASHNOW',
    cta: 'Grab The Deal Now ⚡',
    photo: KIT_HIGH_RES_PHOTOS.flashDropBags,
    graphicEmblem: KIT_SVG_EMBLEMS.lightningDropBolt,
    bgPrompt: 'High-energy futuristic shopping bags with neon light reflections and discount tag, dynamic commercial photography, no text.',
    ink: '#FFFFFF',
    paper: '#0F172A',
    accent: '#38BDF8',
    accentBg: '#1E293B',
    fontFamily: 'display',
    industries: ['retail', 'electronics', 'fashion', 'deals'],
  },
  {
    id: 'kit-sale-bogo-bonanza',
    name: 'BOGO • Buy 1 Get 1 Free',
    kitSource: 'kit_10',
    category: 'sale_offer',
    layout: 'kit_sale_bogo',
    badge: 'WEEKEND SPECIAL',
    headline: 'BUY 1 GET 1\nFREE BONANZA',
    subtitle: 'Mix and match anything in store. Buy one of your favorite picks and get the second free!',
    bullets: ['Mix & Match Any Category', 'No Minimum Spend Required', 'First 50 Walk-ins Get Extra 10%'],
    couponCode: 'BOGOMAGIC',
    cta: 'Claim BOGO Offer 🛍️',
    photo: KIT_HIGH_RES_PHOTOS.bogoShopper,
    graphicEmblem: KIT_SVG_EMBLEMS.celebrationGiftBox,
    bgPrompt: 'Excited shopper carrying chic branded shopping bags with colorful confetti falling, cheerful commercial flatlay, no text.',
    ink: '#1E293B',
    paper: '#FFFBEB',
    accent: '#D97706',
    accentBg: '#FEF3C7',
    fontFamily: 'sans',
    industries: ['retail', 'fashion', 'shoes', 'apparel', 'store'],
  },
];

/** Convert the Kit Poster Definitions into standard PosterTemplates */
export const LAYERED_KIT_POSTERS: PosterTemplate[] = LAYERED_KIT_DEFINITIONS.map((kit) => ({
  id: kit.id,
  name: kit.name,
  collection: 'creative',
  category: kit.category,
  layout: kit.layout,
  theme: 'emerald',
  aspect: '1:1',
  badge: kit.badge,
  headline: kit.headline,
  subtitle: kit.subtitle,
  cta: kit.cta,
  photo: kit.photo,
  bgPrompt: kit.bgPrompt,
  industries: kit.industries,
  ...(kit.occasionId ? { occasionId: kit.occasionId } : {}),
}));

/** Compose a validated MarketingDesign document with editable layers and graphics for any Kit template */
export function composeKitPoster(input: StudioPosterInput): MarketingDesign {
  const definition =
    LAYERED_KIT_DEFINITIONS.find((d) => d.layout === input.layout) ||
    LAYERED_KIT_DEFINITIONS[0];

  const sizes: Record<string, [number, number]> = {
    '1:1': [1080, 1080],
    '4:5': [1080, 1350],
    '9:16': [1080, 1920],
    '16:9': [1920, 1080],
  };
  const [width, height] = sizes[input.ratio || '1:1'] || sizes['1:1'];
  const unit = Math.min(width, height);
  const layers: DesignLayer[] = [];

  const base = (
    id: string,
    type: DesignLayer['type'],
    x: number,
    y: number,
    w: number,
    h: number
  ): DesignLayer => ({
    id,
    type,
    x: Math.round(x * width),
    y: Math.round(y * height),
    width: Math.round(w * width),
    height: Math.round(h * height),
    color: definition.ink,
    background: 'transparent',
    fontSize: 24,
    opacity: 1,
  });

  const isDarkPaper =
    definition.paper.toLowerCase().includes('#1') ||
    definition.paper.toLowerCase().includes('#2') ||
    definition.paper.toLowerCase().includes('#0') ||
    definition.paper.toLowerCase().includes('#3');

  const isHeroPhotoKit =
    definition.kitSource === 'kit_4' ||
    definition.kitSource === 'kit_5' ||
    definition.kitSource === 'kit_7' ||
    definition.kitSource === 'kit_9';

  if (isHeroPhotoKit) {
    // Hero photo full-bleed atmospheric backdrop
    layers.push({
      ...base('bg_photo', 'image', 0, 0, 1, 1),
      src: input.photo || definition.photo,
      cropX: 50,
      cropY: 0,
    });

    // Translucent contrast scrim overlay so photography shines through with rich clarity
    layers.push({
      ...base('scrim_panel', 'shape', 0.04, 0.04, 0.92, 0.92),
      background: definition.paper,
      opacity: isDarkPaper ? 0.38 : 0.44,
      borderRadius: 20,
      borderColor: definition.accent,
      borderWidth: 2,
    });
  } else {
    // Card showcase templates (Automotive, Clinic, Salon, Real Estate, Retail)
    // 1. Solid container panel
    layers.push({
      ...base('scrim_panel', 'shape', 0.04, 0.04, 0.92, 0.92),
      background: definition.paper,
      opacity: 1,
      borderRadius: 20,
      borderColor: definition.accent,
      borderWidth: 2,
    });

    // 2. Center showcase photo card in FRONT of container panel
    layers.push({
      ...base('bg_photo', 'image', 0.08, 0.43, 0.84, 0.28),
      src: input.photo || definition.photo,
      borderRadius: 14,
      borderColor: definition.accentBg || '#E2E8F0',
      borderWidth: 1,
      cropX: 50,
      cropY: 0,
    });
  }

  // Layer 3: Graphic Emblem (Gold Chef Hat, Diya, Lightning Bolt, Shield, Cross)
  if (definition.graphicEmblem) {
    layers.push({
      ...base('graphic_emblem', 'image', 0.82, 0.07, 0.11, (0.11 * width) / height),
      src: definition.graphicEmblem,
    });
  }

  // Layer 4: Header Branding Bar (Logo + Brand Name)
  if (input.logoUrl) {
    layers.push({
      ...base('brand_logo', 'image', 0.09, 0.08, 0.07, (0.07 * width) / height),
      src: input.logoUrl,
    });
  }

  const brandTextVal = input.brand || 'Your Business Name';
  layers.push({
    ...base('brand', 'text', input.logoUrl ? 0.18 : 0.09, 0.08, 0.62, 0.05),
    text: brandTextVal,
    color: definition.accent,
    fontSize: Math.max(10, Math.min(Math.round(unit * 0.032), (width * 0.62) / (brandTextVal.length * 0.58))),
    fontFamily: definition.fontFamily,
    fontWeight: 800,
    textAlign: 'left',
  });

  // Layer 5: Offer Badge Pill
  const badgeTextVal = input.badge || definition.badge;
  if (badgeTextVal) {
    layers.push({
      ...base('badge_pill', 'shape', 0.09, 0.15, 0.45, 0.045),
      background: definition.accentBg || '#F1F5F9',
      borderRadius: 16,
      borderColor: definition.accent,
      borderWidth: 1,
    });
    layers.push({
      ...base('badge_text', 'text', 0.1, 0.155, 0.43, 0.035),
      text: badgeTextVal.toUpperCase(),
      color: definition.accent,
      fontSize: Math.round(unit * 0.022),
      fontFamily: definition.fontFamily,
      fontWeight: 800,
      textAlign: 'center',
    });
  }

  // Layer 6: Main Headline (Editable typography)
  const headlineTextVal = input.headline || definition.headline;
  layers.push({
    ...base('headline', 'text', 0.09, isHeroPhotoKit ? 0.22 : 0.20, 0.82, isHeroPhotoKit ? 0.18 : 0.14),
    text: headlineTextVal,
    color: definition.ink,
    fontSize: Math.round(unit * (isHeroPhotoKit ? 0.06 : 0.052)),
    fontFamily: definition.fontFamily,
    fontWeight: 800,
    lineHeight: 1.15,
    textAlign: 'left',
  });

  // Layer 7: Graphic Divider (Ornate Gold Flourish Line if present, e.g. Kit 4)
  if (definition.graphicDivider) {
    layers.push({
      ...base('graphic_divider', 'image', 0.09, isHeroPhotoKit ? 0.41 : 0.35, 0.32, (0.32 * width) / height * 0.22),
      src: definition.graphicDivider,
    });
  }

  // Layer 8: Subtitle / Value Proposition
  const subtitleVal = input.subtitle || definition.subtitle;
  if (subtitleVal) {
    const subtitleY = isHeroPhotoKit
      ? (definition.graphicDivider ? 0.45 : 0.42)
      : (definition.graphicDivider ? 0.38 : 0.35);
    layers.push({
      ...base('subtitle', 'text', 0.09, subtitleY, 0.82, isHeroPhotoKit ? 0.09 : 0.06),
      text: subtitleVal,
      color: isDarkPaper ? '#CBD5E1' : '#475569',
      fontSize: Math.round(unit * (isHeroPhotoKit ? 0.028 : 0.024)),
      fontFamily: 'sans',
      fontWeight: 500,
      lineHeight: 1.25,
      textAlign: 'left',
    });
  }

  // Layer 9: Bullet points / Key services checklist (From the kits)
  const bullets = definition.bullets || [];
  if (bullets.length > 0) {
    const bulletText = bullets.map((b) => `✔  ${b}`).join('\n');
    layers.push({
      ...base('features_list', 'text', 0.09, isHeroPhotoKit ? 0.54 : 0.72, 0.82, isHeroPhotoKit ? 0.17 : 0.08),
      text: bulletText,
      color: definition.ink,
      fontSize: Math.round(unit * (isHeroPhotoKit ? 0.026 : 0.022)),
      fontFamily: 'sans',
      fontWeight: 600,
      lineHeight: 1.35,
      textAlign: 'left',
    });
  }

  // Layer 10: Coupon Code Box (For sales kits)
  if (definition.couponCode) {
    layers.push({
      ...base('coupon_box', 'shape', 0.09, isHeroPhotoKit ? 0.725 : 0.73, 0.48, 0.045),
      background: definition.accentBg || '#FEF3C7',
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: definition.accent,
    });
    layers.push({
      ...base('coupon_text', 'text', 0.1, isHeroPhotoKit ? 0.73 : 0.735, 0.46, 0.035),
      text: `USE CODE: ${definition.couponCode}`,
      color: definition.accent,
      fontSize: Math.round(unit * 0.024),
      fontFamily: 'sans',
      fontWeight: 800,
      textAlign: 'center',
    });
  }

  // Layer 11: Call to Action Button
  const ctaVal = input.cta || definition.cta;
  const ctaY = isHeroPhotoKit ? 0.795 : 0.81;
  layers.push({
    ...base('cta_button', 'shape', 0.09, ctaY, 0.55, 0.06),
    background: definition.accent,
    borderRadius: 12,
  });
  layers.push({
    ...base('cta_text', 'text', 0.11, ctaY + 0.012, 0.51, 0.038),
    text: ctaVal,
    color: '#FFFFFF',
    fontSize: Math.round(unit * 0.028),
    fontFamily: 'sans',
    fontWeight: 800,
    textAlign: 'center',
  });

  // Layer 12: Footer (Phone & Website)
  const footerContacts = [
    input.phone ? `📞 ${input.phone}` : '',
    input.website ? `🌐 ${input.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}` : '',
  ]
    .filter(Boolean)
    .join('   •   ');

  if (footerContacts) {
    layers.push({
      ...base('footer_contacts', 'text', 0.09, isHeroPhotoKit ? 0.88 : 0.89, 0.82, 0.035),
      text: footerContacts,
      color: isDarkPaper ? '#94A3B8' : '#64748B',
      fontSize: Math.round(unit * 0.022),
      fontFamily: 'sans',
      fontWeight: 600,
      textAlign: 'left',
    });
  }

  return validateDesign({
    version: 1,
    width,
    height,
    background: definition.paper,
    layers,
  });
}
