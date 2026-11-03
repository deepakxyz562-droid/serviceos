/**
 * BGOS Poster Template Registry — Flyer-Maker-style professional template gallery.
 *
 * Zero-runtime-dependency shared config (web + mobile import this directly, no API hop).
 * Every template composes into a validated MarketingDesign via
 * `createCommercialPosterDesign()` from './marketing-design', so previews on web,
 * mobile and server exports are guaranteed pixel-consistent.
 *
 * Categories mirror the top-performing categories of consumer poster-maker apps
 * (sale/offer, festival, new arrival, services, booking, grand opening, hiring,
 * quotes, reviews) with Indian-SMB festival windows surfaced automatically.
 */
import {
  CommercialTheme,
  MarketingDesign,
  PosterTemplateLayout,
  createCommercialPosterDesign,
} from './marketing-design';

// ─── Categories ───────────────────────────────────────────────────────────────

export type PosterCategoryId =
  | 'sale_offer'
  | 'festival'
  | 'new_arrival'
  | 'service_spotlight'
  | 'appointment'
  | 'grand_opening'
  | 'hiring'
  | 'quote'
  | 'testimonial';

export interface PosterCategoryMeta {
  id: PosterCategoryId;
  name: string;
  emoji: string;
  description: string;
}

export const POSTER_CATEGORIES: PosterCategoryMeta[] = [
  { id: 'sale_offer', name: 'Sale & Offers', emoji: '🏷️', description: 'Discounts, deals and limited-time promos' },
  { id: 'festival', name: 'Festivals', emoji: '🪔', description: 'Seasonal greetings and festive campaigns' },
  { id: 'new_arrival', name: 'New Arrivals', emoji: '✨', description: 'Launch new products, menus and collections' },
  { id: 'service_spotlight', name: 'Services', emoji: '🛠️', description: 'Showcase what your business does best' },
  { id: 'appointment', name: 'Bookings', emoji: '📅', description: 'Drive appointments and reservations' },
  { id: 'grand_opening', name: 'Grand Opening', emoji: '🎉', description: 'Announce launches, inaugurations and events' },
  { id: 'hiring', name: "We're Hiring", emoji: '💼', description: 'Attract talent to your team' },
  { id: 'quote', name: 'Quotes', emoji: '💬', description: 'Daily thoughts, motivation and greetings' },
  { id: 'testimonial', name: 'Reviews', emoji: '⭐', description: 'Build trust with customer love' },
];

// ─── Occasion windows (auto-surfaced by date) ─────────────────────────────────

export interface PosterOccasionWindow {
  id: string;
  name: string;
  emoji: string;
  /** 1-12 month numbers, inclusive. May wrap across the year end. */
  startMonth: number;
  endMonth: number;
}

export const POSTER_OCCASION_WINDOWS: PosterOccasionWindow[] = [
  { id: 'eid', name: 'Eid Festive Season', emoji: '🌙', startMonth: 3, endMonth: 5 },
  { id: 'rakhi', name: 'Raksha Bandhan', emoji: '🧵', startMonth: 8, endMonth: 8 },
  { id: 'christmas', name: 'Christmas & Holidays', emoji: '🎄', startMonth: 12, endMonth: 12 },
  { id: 'diwali', name: 'Diwali & Festive Season', emoji: '🪔', startMonth: 9, endMonth: 11 },
  { id: 'new_year', name: 'New Year', emoji: '🎊', startMonth: 12, endMonth: 1 },
  { id: 'republic_day', name: 'Republic Day', emoji: '🇮🇳', startMonth: 1, endMonth: 1 },
  { id: 'valentine', name: "Valentine's Day", emoji: '💝', startMonth: 2, endMonth: 2 },
  { id: 'holi', name: 'Holi', emoji: '🎨', startMonth: 2, endMonth: 3 },
  { id: 'summer', name: 'Summer Season', emoji: '☀️', startMonth: 3, endMonth: 6 },
  { id: 'monsoon', name: 'Monsoon Season', emoji: '🌧️', startMonth: 6, endMonth: 8 },
  { id: 'independence_day', name: 'Independence Day', emoji: '🇮🇳', startMonth: 8, endMonth: 8 },
  { id: 'navratri', name: 'Navratri & Dussehra', emoji: '💃', startMonth: 9, endMonth: 10 },
];

function monthInWindow(month: number, win: PosterOccasionWindow): boolean {
  return win.startMonth <= win.endMonth
    ? month >= win.startMonth && month <= win.endMonth
    : month >= win.startMonth || month <= win.endMonth;
}

export function getActivePosterOccasions(currentDate = new Date()): PosterOccasionWindow[] {
  const month = currentDate.getMonth() + 1;
  return POSTER_OCCASION_WINDOWS.filter((w) => monthInWindow(month, w));
}

// ─── Templates ────────────────────────────────────────────────────────────────

export type PosterAspect = '1:1' | '4:5' | '9:16' | '16:9';

export interface PosterTemplate {
  id: string;
  name: string;
  category: PosterCategoryId;
  layout: PosterTemplateLayout;
  theme: CommercialTheme;
  aspect: PosterAspect;
  badge: string;
  headline: string;
  subtitle: string;
  cta: string;
  /** Curated stock photo used for the gallery preview + default canvas background. */
  photo: string;
  /** Prompt used when the user regenerates the background with AI (Cloudflare Flux). */
  bgPrompt: string;
  /** Industry keywords that boost this template for the user's business category. */
  industries?: string[];
  /** Occasion window this template belongs to (floated to top while active). */
  occasionId?: string;
}

const U = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1080&q=80`;

const NO_TEXT =
  'ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO NUMBERS, NO TYPOGRAPHY, NO WATERMARKS, pure visual photography only.';

export const POSTER_TEMPLATES: PosterTemplate[] = [
  // ── Sale & Offers ──────────────────────────────────────────────────────────
  {
    id: 'mega-sale-bold',
    name: 'Mega Sale',
    category: 'sale_offer',
    layout: 'bold_offer',
    theme: 'royal_gold',
    aspect: '4:5',
    badge: 'LIMITED TIME',
    headline: 'MEGA SALE\nUP TO 50% OFF',
    subtitle: 'Hurry! Offer valid till stocks last.',
    cta: 'Shop Now',
    photo: U('photo-1441986300917-64674bd600d8'),
    bgPrompt: `Festive retail sale scene with gift boxes and golden ribbons, warm bokeh lights, premium shopping atmosphere, commercial advertising photography, ${NO_TEXT}`,
    industries: ['retail', 'store', 'shopping', 'supermarket', 'boutique'],
  },
  {
    id: 'flat-offer-split',
    name: 'Flat Offer Card',
    category: 'sale_offer',
    layout: 'split_card',
    theme: 'emerald',
    aspect: '4:5',
    badge: 'FLAT 30% OFF',
    headline: 'BIG SAVINGS\nON EVERYTHING',
    subtitle: 'No minimum purchase. Walk in today!',
    cta: 'Grab Offer',
    photo: U('photo-1607083206968-13611e3d76db'),
    bgPrompt: `Colorful discount shopping flatlay with price tags and shopping bags on clean pastel background, commercial photography, ${NO_TEXT}`,
    industries: ['retail', 'store', 'mall', 'grocery'],
  },
  {
    id: 'weekend-flash',
    name: 'Weekend Flash',
    category: 'sale_offer',
    layout: 'urgent_callout',
    theme: 'trust_amber',
    aspect: '1:1',
    badge: 'THIS WEEKEND',
    headline: '48-HOUR\nFLASH SALE',
    subtitle: 'Doors open 9 AM. First 50 customers get a free gift.',
    cta: 'CALL NOW',
    photo: U('photo-1481437156560-3205f6a55735'),
    bgPrompt: `High-energy shopping crowd with motion blur in a bright modern store, dynamic commercial photography, ${NO_TEXT}`,
    industries: ['retail', 'fashion', 'electronics'],
  },
  {
    id: 'buy1get1-rose',
    name: 'Buy 1 Get 1',
    category: 'sale_offer',
    layout: 'minimal_luxury',
    theme: 'rose_chic',
    aspect: '4:5',
    badge: 'BUY 1 GET 1',
    headline: 'TWICE THE STYLE\nSAME PRICE',
    subtitle: 'On selected collection only.',
    cta: 'Visit Us',
    photo: U('photo-1483985988355-763728e1935b'),
    bgPrompt: `Elegant fashion boutique rack with pastel garments, soft editorial lighting, luxury retail photography, ${NO_TEXT}`,
    industries: ['fashion', 'apparel', 'boutique', 'saree', 'clothing'],
  },
  {
    id: 'jewellery-gold-offer',
    name: 'Gold Offer',
    category: 'sale_offer',
    layout: 'bold_offer',
    theme: 'luxe_dark',
    aspect: '4:5',
    badge: '0% MAKING CHARGES',
    headline: 'GOLD FEST\nEXTRA 10% OFF',
    subtitle: 'BIS Hallmark jewellery with lifetime exchange.',
    cta: 'Book Visit',
    photo: U('photo-1515562141207-7a88fb7ce338'),
    bgPrompt: `Luxury gold jewellery on black velvet with dramatic sparkle, macro commercial jewellery photography, ${NO_TEXT}`,
    industries: ['jewellery', 'jewelry', 'gold', 'diamond'],
  },

  // ── Festivals (occasion-linked) ───────────────────────────────────────────
  {
    id: 'diwali-glow',
    name: 'Diwali Glow',
    category: 'festival',
    layout: 'bold_offer',
    theme: 'royal_gold',
    aspect: '4:5',
    badge: 'HAPPY DIWALI',
    headline: 'FESTIVE SPECIAL\nOFFERS INSIDE',
    subtitle: 'Celebrate with exclusive Diwali collections & gifts.',
    cta: 'Explore Now',
    photo: U('photo-1482575832494-771f74bf6857'),
    bgPrompt: `Warm glowing clay diya lamps with marigold flowers and bokeh, festive Diwali atmosphere, premium commercial photography, ${NO_TEXT}`,
    industries: ['sweets', 'restaurant', 'retail', 'gift', 'jewellery', 'salon'],
    occasionId: 'diwali',
  },
  {
    id: 'diwali-sweets-split',
    name: 'Diwali Sweets',
    category: 'festival',
    layout: 'split_card',
    theme: 'royal_gold',
    aspect: '1:1',
    badge: 'FRESH MITHAI',
    headline: 'DIWALI SWEETS\nNOW AVAILABLE',
    subtitle: 'Handcrafted kaju katli, ladoo & festive hampers.',
    cta: 'Order Now',
    photo: U('photo-1585937421612-70a008356fbe'),
    bgPrompt: `Traditional Indian mithai sweets on brass platter with silver vark and pistachio garnish, festive gourmet photography, ${NO_TEXT}`,
    industries: ['sweets', 'mithai', 'bakery', 'restaurant', 'cafe'],
    occasionId: 'diwali',
  },
  {
    id: 'new-year-fresh',
    name: 'New Year Kickoff',
    category: 'festival',
    layout: 'tech_modern',
    theme: 'cyber_tech',
    aspect: '4:5',
    badge: 'NEW YEAR 2026',
    headline: 'START THE YEAR\nWITH SAVINGS',
    subtitle: 'Early-bird packages & priority slots open now.',
    cta: 'Claim Offer',
    photo: U('photo-1514525253161-7a46d19cd819'),
    bgPrompt: `Celebratory fireworks over modern city skyline at midnight, vibrant commercial photography, ${NO_TEXT}`,
    occasionId: 'new_year',
  },
  {
    id: 'holi-colors',
    name: 'Holi Colors',
    category: 'festival',
    layout: 'bold_offer',
    theme: 'sand',
    aspect: '4:5',
    badge: 'HOLI HAI!',
    headline: 'COLORFUL DEALS\nFOR THE SEASON',
    subtitle: 'Special Holi combos for you and your family.',
    cta: 'Know More',
    photo: U('photo-1576022162129-3e2209f2d3a8'),
    bgPrompt: `Vibrant Holi colour powder explosion in air, joyful festival photography, colorful gulal clouds, ${NO_TEXT}`,
    occasionId: 'holi',
  },
  {
    id: 'independence-pride',
    name: 'Independence Pride',
    category: 'festival',
    layout: 'minimal_luxury',
    theme: 'emerald',
    aspect: '4:5',
    badge: '15TH AUGUST',
    headline: 'PROUDLY SERVING\nOUR NATION',
    subtitle: 'Special tribute offers this Independence Day.',
    cta: 'Visit Us',
    photo: U('photo-1532375810709-75b1da00537c'),
    bgPrompt: `Indian tricolor flag waving against clear blue sky, patriotic commercial photography, ${NO_TEXT}`,
    occasionId: 'independence_day',
  },
  {
    id: 'valentine-glow',
    name: 'Valentine Special',
    category: 'festival',
    layout: 'split_card',
    theme: 'rose_chic',
    aspect: '4:5',
    badge: "VALENTINE'S DAY",
    headline: 'TWO HEARTS\nONE OFFER',
    subtitle: 'Couple packages, gifts & dining specials.',
    cta: 'Book Now',
    photo: U('photo-1518199266791-5375a83190b7'),
    bgPrompt: `Romantic rose petals and candles on elegant table, soft warm lighting, luxury hospitality photography, ${NO_TEXT}`,
    industries: ['restaurant', 'salon', 'gift', 'cafe', 'hotel'],
    occasionId: 'valentine',
  },
  {
    id: 'summer-cool',
    name: 'Summer Cool',
    category: 'festival',
    layout: 'urgent_callout',
    theme: 'trust_amber',
    aspect: '4:5',
    badge: 'SUMMER SERVICE',
    headline: 'BEAT THE HEAT\nAC CHECK ₹299',
    subtitle: 'Complete cooling tune-up by certified experts.',
    cta: 'CALL NOW',
    photo: U('photo-1611145434336-2324aa4079cd'),
    bgPrompt: `Modern air conditioner blowing cool crisp air in bright contemporary living room, refreshing commercial photography, ${NO_TEXT}`,
    industries: ['hvac', 'ac repair', 'appliance', 'electrician', 'home services'],
    occasionId: 'summer',
  },
  {
    id: 'monsoon-shield',
    name: 'Monsoon Shield',
    category: 'festival',
    layout: 'bold_offer',
    theme: 'emerald',
    aspect: '4:5',
    badge: 'PRE-MONSOON',
    headline: 'LEAK-PROOF\nYOUR HOME',
    subtitle: 'Free roof & wall dampness inspection this week.',
    cta: 'Book Slot',
    photo: U('photo-1515694346937-94d85e41e6f0'),
    bgPrompt: `Rain drops on window with cozy protected home interior in background, moody monsoon commercial photography, ${NO_TEXT}`,
    industries: ['waterproofing', 'plumbing', 'construction', 'painting', 'home services'],
    occasionId: 'monsoon',
  },
  {
    id: 'navratri-dress',
    name: 'Navratri Nights',
    category: 'festival',
    layout: 'split_card',
    theme: 'rose_chic',
    aspect: '4:5',
    badge: 'NAVRATRI SPECIAL',
    headline: 'DRESS UP\nFOR NINE NIGHTS',
    subtitle: 'Festive collection with same-day alterations.',
    cta: 'Shop Now',
    photo: U('photo-1583391733956-6c78276477e2'),
    bgPrompt: `Colorful traditional Indian chaniya choli and festive jewellery display, vibrant Navratri celebration photography, ${NO_TEXT}`,
    industries: ['boutique', 'saree', 'fashion', 'apparel', 'jewellery'],
    occasionId: 'navratri',
  },
  {
    id: 'republic-day',
    name: 'Republic Day',
    category: 'festival',
    layout: 'bold_offer',
    theme: 'emerald',
    aspect: '4:5',
    badge: '26TH JANUARY',
    headline: 'GRAND REPUBLIC\nDAY SALE',
    subtitle: 'Tricolor offers across the store. Jai Hind!',
    cta: 'Shop Now',
    photo: U('photo-1532375810709-75b1da00537c'),
    bgPrompt: `Indian flag colors ribbon wave on clean bright background, patriotic celebration photography, ${NO_TEXT}`,
    occasionId: 'republic_day',
  },

  // ── New Arrivals ───────────────────────────────────────────────────────────
  {
    id: 'new-arrival-teaser',
    name: 'Just Launched',
    category: 'new_arrival',
    layout: 'minimal_luxury',
    theme: 'sand',
    aspect: '4:5',
    badge: 'JUST LAUNCHED',
    headline: 'FRESH ARRIVALS\nEVERY WEEK',
    subtitle: 'Be the first to explore the new collection.',
    cta: 'Explore',
    photo: U('photo-1567016432779-094069958ea5'),
    bgPrompt: `Minimal product pedestal with soft spotlight and elegant shadows, premium product launch photography, ${NO_TEXT}`,
    industries: ['retail', 'fashion', 'boutique', 'shoes', 'electronics'],
  },
  {
    id: 'new-menu-split',
    name: 'New Menu',
    category: 'new_arrival',
    layout: 'split_card',
    theme: 'royal_gold',
    aspect: '4:5',
    badge: "NEW ON MENU",
    headline: "TASTE OUR\nNEW CREATIONS",
    subtitle: "Chef's specials crafted fresh every day.",
    cta: 'Order Now',
    photo: U('photo-1555396273-367ea4eb4db5'),
    bgPrompt: `Gourmet Indian dishes on rustic wooden table with steam, appetizing restaurant photography, ${NO_TEXT}`,
    industries: ['restaurant', 'cafe', 'bakery', 'food', 'sweets'],
  },
  {
    id: 'collection-drop',
    name: 'Collection Drop',
    category: 'new_arrival',
    layout: 'tech_modern',
    theme: 'cyber_tech',
    aspect: '1:1',
    badge: 'NEW DROP',
    headline: 'THE COLLECTION\nIS HERE',
    subtitle: 'Limited pieces. Available in-store & online.',
    cta: 'Shop Drop',
    photo: U('photo-1441984904996-e0b6ba687e04'),
    bgPrompt: `Sleek modern merchandise display with neon accent lighting, trendy retail photography, ${NO_TEXT}`,
    industries: ['fashion', 'sneakers', 'apparel', 'electronics', 'mobile'],
  },

  // ── Service Spotlight ─────────────────────────────────────────────────────
  {
    id: 'service-trust',
    name: 'Trusted Experts',
    category: 'service_spotlight',
    layout: 'bold_offer',
    theme: 'trust_amber',
    aspect: '4:5',
    badge: 'CERTIFIED EXPERTS',
    headline: 'SERVICE YOU CAN\nTRUST ALWAYS',
    subtitle: 'Transparent pricing. Warranty on every job.',
    cta: 'Get Quote',
    photo: U('photo-1621905251189-08b45d6a269e'),
    bgPrompt: `Professional service technician in clean uniform with modern tools, trustworthy commercial photography, ${NO_TEXT}`,
    industries: ['plumbing', 'electrician', 'hvac', 'repair', 'construction', 'cleaning'],
  },
  {
    id: 'service-salon',
    name: 'Salon Glow-Up',
    category: 'service_spotlight',
    layout: 'split_card',
    theme: 'rose_chic',
    aspect: '4:5',
    badge: 'NOW OPEN',
    headline: 'GLOW UP\nSEASON IS HERE',
    subtitle: 'Hair, skin & bridal packages by experts.',
    cta: 'Book Chair',
    photo: U('photo-1560066984-138dadb4c035'),
    bgPrompt: `Elegant luxury salon interior with styling chairs and warm mirrors, premium beauty photography, ${NO_TEXT}`,
    industries: ['salon', 'beauty', 'spa', 'makeup', 'bridal'],
  },
  {
    id: 'service-gym',
    name: 'Gym Strength',
    category: 'service_spotlight',
    layout: 'urgent_callout',
    theme: 'dark',
    aspect: '4:5',
    badge: 'JOIN TODAY',
    headline: 'TRANSFORM\nYOUR BODY',
    subtitle: 'Personal training + diet plan included.',
    cta: 'CALL NOW',
    photo: U('photo-1534438327276-14e5300c3a48'),
    bgPrompt: `Athlete lifting weights in dramatic dark gym with rim lighting, powerful fitness photography, ${NO_TEXT}`,
    industries: ['gym', 'fitness', 'yoga', 'sports'],
  },
  {
    id: 'service-clinic',
    name: 'Clinic Care',
    category: 'service_spotlight',
    layout: 'minimal_luxury',
    theme: 'emerald',
    aspect: '4:5',
    badge: 'WALK-IN TODAY',
    headline: 'EXPERT CARE\nFOR YOUR FAMILY',
    subtitle: 'Experienced doctors. Modern facilities.',
    cta: 'Book Visit',
    photo: U('photo-1579684385127-1ef15d508118'),
    bgPrompt: `Bright modern clinic reception with friendly professional staff, clean healthcare photography, ${NO_TEXT}`,
    industries: ['clinic', 'doctor', 'dental', 'healthcare', 'hospital', 'pharmacy'],
  },
  {
    id: 'service-tech',
    name: 'IT Solutions',
    category: 'service_spotlight',
    layout: 'tech_modern',
    theme: 'cyber_tech',
    aspect: '4:5',
    badge: 'NOW ONBOARDING',
    headline: 'SMART SOFTWARE\nREAL RESULTS',
    subtitle: 'Apps, websites & automation for your business.',
    cta: 'Free Demo',
    photo: U('photo-1519389950473-47ba0277781c'),
    bgPrompt: `Modern software team workspace with laptops and glowing dashboards, clean tech photography, ${NO_TEXT}`,
    industries: ['software', 'it', 'saas', 'web', 'digital', 'marketing agency'],
  },
  {
    id: 'service-realestate',
    name: 'Dream Home',
    category: 'service_spotlight',
    layout: 'split_card',
    theme: 'luxe_dark',
    aspect: '4:5',
    badge: 'SITE VISIT OPEN',
    headline: 'FIND YOUR\nDREAM HOME',
    subtitle: 'Premium plots & flats with easy bank loans.',
    cta: 'Schedule Visit',
    photo: U('photo-1560518883-ce09059eeffa'),
    bgPrompt: `Modern residential building exterior at golden hour with landscaped entrance, premium real estate photography, ${NO_TEXT}`,
    industries: ['real estate', 'property', 'builder', 'flats', 'plots'],
  },
  {
    id: 'service-education',
    name: 'Admissions Open',
    category: 'service_spotlight',
    layout: 'bold_offer',
    theme: 'trust_amber',
    aspect: '4:5',
    badge: 'ADMISSIONS OPEN',
    headline: 'LEARN. GROW.\nSUCCEED HERE.',
    subtitle: 'Expert faculty with small batch sizes.',
    cta: 'Enquire Now',
    photo: U('photo-1523050854058-8df90110c9f1'),
    bgPrompt: `Bright modern classroom with engaged students and teacher, optimistic education photography, ${NO_TEXT}`,
    industries: ['school', 'coaching', 'institute', 'tuition', 'education'],
  },

  // ── Bookings ──────────────────────────────────────────────────────────────
  {
    id: 'booking-table',
    name: 'Reserve a Table',
    category: 'appointment',
    layout: 'minimal_luxury',
    theme: 'luxe_dark',
    aspect: '4:5',
    badge: 'RESERVE NOW',
    headline: 'TONIGHT\nTASTES BETTER',
    subtitle: 'Limited tables. Reserve your corner now.',
    cta: 'Book Table',
    photo: U('photo-1414235077428-338989a2e8c0'),
    bgPrompt: `Elegant fine dining table setting with candlelight and wine glasses, luxury restaurant photography, ${NO_TEXT}`,
    industries: ['restaurant', 'cafe', 'bar', 'hotel'],
  },
  {
    id: 'booking-appointment',
    name: 'Slots Filling Fast',
    category: 'appointment',
    layout: 'urgent_callout',
    theme: 'trust_amber',
    aspect: '1:1',
    badge: 'FEW SLOTS LEFT',
    headline: 'BOOK YOUR SLOT\nTHIS WEEK',
    subtitle: 'Same-day appointments available.',
    cta: 'CALL NOW',
    photo: U('photo-1600880292203-757bb62b4baf'),
    bgPrompt: `Friendly consultant at modern reception desk with calendar, welcoming service business photography, ${NO_TEXT}`,
    industries: ['salon', 'clinic', 'consultant', 'services', 'spa'],
  },
  {
    id: 'booking-weekend',
    name: 'Weekend Slots',
    category: 'appointment',
    layout: 'split_card',
    theme: 'emerald',
    aspect: '4:5',
    badge: 'WEEKEND OPEN',
    headline: 'WEEKEND\nAPPOINTMENTS',
    subtitle: 'Saturday & Sunday slots now open for booking.',
    cta: 'WhatsApp Us',
    photo: U('photo-1521737604893-d14cc237f11d'),
    bgPrompt: `Cheerful team preparing a bright modern service space, professional business photography, ${NO_TEXT}`,
    industries: ['services', 'salon', 'clinic', 'fitness', 'repairs'],
  },

  // ── Grand Opening ─────────────────────────────────────────────────────────
  {
    id: 'opening-grand',
    name: 'Grand Opening',
    category: 'grand_opening',
    layout: 'bold_offer',
    theme: 'royal_gold',
    aspect: '4:5',
    badge: 'GRAND OPENING',
    headline: 'WE ARE OPEN!\nJOIN THE CELEBRATION',
    subtitle: 'Inaugural offers + free gifts for first visitors.',
    cta: 'Visit Today',
    photo: U('photo-1533900298318-6b8da08a523e'),
    bgPrompt: `Festive ribbon cutting with balloons and golden confetti at modern storefront, celebration commercial photography, ${NO_TEXT}`,
    industries: ['retail', 'restaurant', 'salon', 'gym', 'showroom'],
  },
  {
    id: 'opening-invite',
    name: 'You Are Invited',
    category: 'grand_opening',
    layout: 'split_card',
    theme: 'rose_chic',
    aspect: '1:1',
    badge: 'THIS SUNDAY',
    headline: 'AN INVITATION\nFOR YOU & FAMILY',
    subtitle: 'Join us for the inauguration & high tea.',
    cta: 'RSVP Now',
    photo: U('photo-1519671482749-fd09be7ccebf'),
    bgPrompt: `Elegant event invitation flatlay with flowers, invitation card and golden accents, celebration photography, ${NO_TEXT}`,
    industries: ['event', 'banquet', 'restaurant', 'studio'],
  },
  {
    id: 'opening-franchise',
    name: 'Now In Your City',
    category: 'grand_opening',
    layout: 'tech_modern',
    theme: 'cyber_tech',
    aspect: '4:5',
    badge: 'NEW BRANCH',
    headline: 'NOW IN\nYOUR CITY',
    subtitle: 'Same trusted service. New convenient location.',
    cta: 'Get Directions',
    photo: U('photo-1486406146926-c627a92ad1ab'),
    bgPrompt: `Modern glass storefront on premium city street at dusk, architectural commercial photography, ${NO_TEXT}`,
    industries: ['showroom', 'clinic', 'bank', 'corporate', 'services'],
  },

  // ── Hiring ────────────────────────────────────────────────────────────────
  {
    id: 'hiring-bold',
    name: "We're Hiring",
    category: 'hiring',
    layout: 'bold_offer',
    theme: 'emerald',
    aspect: '4:5',
    badge: "WE'RE HIRING",
    headline: 'JOIN OUR\nGROWING TEAM',
    subtitle: 'Walk-in interviews. Attractive salary + incentives.',
    cta: 'Apply Now',
    photo: U('photo-1522071820081-009f0129c71c'),
    bgPrompt: `Diverse happy team collaborating in bright modern office, authentic workplace photography, ${NO_TEXT}`,
    industries: ['any'],
  },
  {
    id: 'hiring-urgent',
    name: 'Urgent Openings',
    category: 'hiring',
    layout: 'urgent_callout',
    theme: 'trust_amber',
    aspect: '1:1',
    badge: 'URGENT HIRING',
    headline: 'WALK-IN DRIVE\nTHIS SATURDAY',
    subtitle: 'Freshers welcome. Carry your resume.',
    cta: 'CALL HR',
    photo: U('photo-1556761175-b413da4baf72'),
    bgPrompt: `Confident young professionals in interview discussion at modern office, corporate hiring photography, ${NO_TEXT}`,
    industries: ['any'],
  },
  {
    id: 'hiring-staff',
    name: 'Team Expansion',
    category: 'hiring',
    layout: 'split_card',
    theme: 'sand',
    aspect: '4:5',
    badge: 'MULTIPLE ROLES',
    headline: 'GROW WITH US\nAT EVERY STEP',
    subtitle: 'Sales, support & technical roles open.',
    cta: 'Send Resume',
    photo: U('photo-1600880292089-90a7e086ee0c'),
    bgPrompt: `Job candidates reviewing offer at friendly modern workplace, warm corporate photography, ${NO_TEXT}`,
    industries: ['any'],
  },

  // ── Quotes ────────────────────────────────────────────────────────────────
  {
    id: 'quote-motivation',
    name: 'Morning Motivation',
    category: 'quote',
    layout: 'minimal_luxury',
    theme: 'sand',
    aspect: '1:1',
    badge: 'DAILY THOUGHT',
    headline: 'EVERY SUNRISE IS\nA NEW CHANCE',
    subtitle: 'Good morning from our team to yours.',
    cta: 'Follow Us',
    photo: U('photo-1470252649378-9c29740c9fa8'),
    bgPrompt: `Serene sunrise over calm horizon with soft golden light, inspirational nature photography, ${NO_TEXT}`,
  },
  {
    id: 'quote-festival-greeting',
    name: 'Festive Greeting',
    category: 'quote',
    layout: 'minimal_luxury',
    theme: 'royal_gold',
    aspect: '4:5',
    badge: 'WARM WISHES',
    headline: 'MAY YOUR DAYS\nSPARKLE WITH JOY',
    subtitle: 'Warm greetings from our family to yours.',
    cta: 'Visit Us',
    photo: U('photo-1482575832494-771f74bf6857'),
    bgPrompt: `Elegant golden festival lights with marigold garland on dark background, festive greeting photography, ${NO_TEXT}`,
  },
  {
    id: 'quote-business',
    name: 'Business Wisdom',
    category: 'quote',
    layout: 'tech_modern',
    theme: 'cyber_tech',
    aspect: '1:1',
    badge: 'FOUNDER NOTES',
    headline: 'QUALITY IS NEVER\nAN ACCIDENT',
    subtitle: 'Thank you for 5 wonderful years of trust.',
    cta: 'Read Story',
    photo: U('photo-1454165804606-c3d57bc86b40'),
    bgPrompt: `Minimal desk with notebook and coffee on dark modern office table, thoughtful business photography, ${NO_TEXT}`,
  },

  // ── Testimonials ──────────────────────────────────────────────────────────
  {
    id: 'review-five-star',
    name: '5-Star Love',
    category: 'testimonial',
    layout: 'split_card',
    theme: 'trust_amber',
    aspect: '4:5',
    badge: '⭐⭐⭐⭐⭐ 4.9 RATED',
    headline: 'OUR CUSTOMERS\nSAY IT BEST',
    subtitle: '"Best service in town — highly recommended!"',
    cta: 'Read Reviews',
    photo: U('photo-1556742049-0cfed4f6a45d'),
    bgPrompt: `Happy customer smiling while receiving service at modern business counter, authentic testimonial photography, ${NO_TEXT}`,
    industries: ['any'],
  },
  {
    id: 'review-trust-badge',
    name: 'Trusted Choice',
    category: 'testimonial',
    layout: 'minimal_luxury',
    theme: 'emerald',
    aspect: '4:5',
    badge: '500+ HAPPY CLIENTS',
    headline: 'TRUSTED BY\nTHE COMMUNITY',
    subtitle: 'Rated 4.9 across Google reviews.',
    cta: 'Join Them',
    photo: U('photo-1529156069898-49953e39b3ac'),
    bgPrompt: `Group of smiling diverse customers giving thumbs up in bright modern space, community trust photography, ${NO_TEXT}`,
    industries: ['any'],
  },
  {
    id: 'review-before-after',
    name: 'Real Results',
    category: 'testimonial',
    layout: 'bold_offer',
    theme: 'luxe_dark',
    aspect: '4:5',
    badge: 'REAL RESULTS',
    headline: 'FROM DRAB\nTO STUNNING',
    subtitle: 'See why clients keep coming back.',
    cta: 'Book Yours',
    photo: U('photo-1487412947147-5cebf100ffc2'),
    bgPrompt: `Satisfying transformation reveal moment with joyful client, dramatic before-after commercial photography, ${NO_TEXT}`,
    industries: ['salon', 'interior', 'painting', 'renovation', 'fitness'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CREATIVE & MODERN IMPACT POSTERS (11 Templates)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'creative-neo-brutalist',
    name: 'Neo-Brutalist Drop',
    category: 'sale_offer',
    layout: 'bold_offer',
    theme: 'cyber_tech',
    aspect: '4:5',
    badge: 'MEGA DROP',
    headline: 'CYBER FLASH\n50% OFF TODAY',
    subtitle: 'Ultra-limited quantities. In-store & online.',
    cta: 'Claim Drop',
    photo: U('photo-1552346154-21d32810aba3'),
    bgPrompt: `High-energy modern streetwear sneaker floating against dynamic electric cyan and yellow studio lighting, high contrast commercial product photography, ${NO_TEXT}`,
    industries: ['retail', 'fashion', 'shoes', 'electronics', 'apparel'],
  },
  {
    id: 'creative-gold-atelier',
    name: 'Gold Atelier',
    category: 'sale_offer',
    layout: 'minimal_luxury',
    theme: 'luxe_dark',
    aspect: '4:5',
    badge: 'ROYAL ATELIER',
    headline: 'THE HERITAGE\nCOLLECTION',
    subtitle: '22K hallmark gold & certified diamonds.',
    cta: 'Explore Vault',
    photo: U('photo-1535632066927-ab7c9ab60908'),
    bgPrompt: `Ultra-luxury diamond earrings and gold pendant on draped black velvet pedestal, macro lens detail, glittering specular reflections, ${NO_TEXT}`,
    industries: ['jewellery', 'gold', 'diamonds', 'luxury', 'bridal'],
  },
  {
    id: 'creative-neon-midnight',
    name: 'Midnight Bites & Beats',
    category: 'new_arrival',
    layout: 'split_card',
    theme: 'luxe_dark',
    aspect: '4:5',
    badge: 'ROOFTOP NIGHTS',
    headline: 'MIDNIGHT BEATS\n& ARTISAN EATS',
    subtitle: 'Live acoustic sets & signature chef menu.',
    cta: 'Reserve Table',
    photo: U('photo-1517248135467-4c7edcad34c4'),
    bgPrompt: `Gourmet artisan burgers and craft drinks on rustic wooden table, neon ambient atmospheric lighting, shallow depth of field, ${NO_TEXT}`,
    industries: ['restaurant', 'cafe', 'bar', 'lounge', 'food'],
  },
  {
    id: 'creative-creator-spotlight',
    name: 'Creator & Keynote',
    category: 'service_spotlight',
    layout: 'tech_modern',
    theme: 'cyber_tech',
    aspect: '4:5',
    badge: 'LIVE MASTERCLASS',
    headline: 'SCALING MODERN\nDIGITAL BRANDS',
    subtitle: 'Practical frameworks & verified growth playbooks.',
    cta: 'Join Keynote',
    photo: U('photo-1475721027785-f74eccf877e2'),
    bgPrompt: `Modern studio microphone and sleek digital tablet on minimalist podium, soft dramatic stage rim lighting, high-tech conference atmosphere, ${NO_TEXT}`,
    industries: ['software', 'agency', 'marketing', 'consulting', 'education'],
  },
  {
    id: 'creative-editorial-vogue',
    name: 'Editorial Lookbook',
    category: 'new_arrival',
    layout: 'minimal_luxury',
    theme: 'rose_chic',
    aspect: '4:5',
    badge: 'AUTUMN LOOKBOOK',
    headline: 'TIMELESS DRAPE\n& SILHOUETTES',
    subtitle: 'Handcrafted luxury fabrics tailored for every occasion.',
    cta: 'View Lookbook',
    photo: U('photo-1490481651871-ab68de25d43d'),
    bgPrompt: `High-fashion editorial model in warm designer coat against minimalist neutral concrete studio arches, soft natural shadow play, ${NO_TEXT}`,
    industries: ['fashion', 'boutique', 'saree', 'clothing', 'apparel'],
  },
  {
    id: 'creative-organic-botanical',
    name: 'Botanical Wellness',
    category: 'service_spotlight',
    layout: 'split_card',
    theme: 'emerald',
    aspect: '4:5',
    badge: '100% ORGANIC',
    headline: 'PURE BOTANICAL\nSKIN THERAPY',
    subtitle: 'Cold-pressed serums & holistic wellness remedies.',
    cta: 'Shop Organic',
    photo: U('photo-1608248597359-25459346f04d'),
    bgPrompt: `Glass dropper bottles of natural herbal cosmetic oil with fresh green leaves and gentle water drops, bright clean morning light, ${NO_TEXT}`,
    industries: ['spa', 'skincare', 'wellness', 'organic', 'salon'],
  },
  {
    id: 'creative-mystery-drop',
    name: 'Mystery Drop',
    category: 'new_arrival',
    layout: 'bold_offer',
    theme: 'luxe_dark',
    aspect: '4:5',
    badge: 'CLASSIFIED',
    headline: 'SOMETHING BIG\nDROPS THIS FRIDAY',
    subtitle: 'Be the first to access the private reveal.',
    cta: 'Get Early VIP',
    photo: U('photo-1509198397868-475647b2a1e5'),
    bgPrompt: `Dramatic circular spotlight illuminating an empty minimalist exhibition pedestal in a dark moody gallery, cinematic atmosphere, ${NO_TEXT}`,
    industries: ['retail', 'electronics', 'fashion', 'restaurant', 'any'],
  },
  {
    id: 'creative-midnight-flash',
    name: '24H Midnight Flash',
    category: 'sale_offer',
    layout: 'urgent_callout',
    theme: 'cyber_tech',
    aspect: '4:5',
    badge: '24-HOUR COUNTDOWN',
    headline: 'MIDNIGHT MADNESS\nFLASH DISCOUNTS',
    subtitle: 'Prices drop until clock strikes 12.',
    cta: 'Grab Deal Now',
    photo: U('photo-1526738549149-8e07eca6c147'),
    bgPrompt: `Sleek high-tech electronics and gadgets on carbon fiber table with dramatic electric cyan edge lighting, dynamic angle, ${NO_TEXT}`,
    industries: ['retail', 'electronics', 'ecommerce', 'apparel', 'any'],
  },
  {
    id: 'festival-eid-crescent',
    name: 'Eid Royal Feast',
    category: 'festival',
    layout: 'split_card',
    theme: 'emerald',
    occasionId: 'eid',
    aspect: '4:5',
    badge: 'EID SPECIAL',
    headline: 'EID MUBARAK\nROYAL GOURMET FEAST',
    subtitle: 'Dum biryani, artisan kebabs & fragrant sweets.',
    cta: 'Order Feast',
    photo: U('photo-1563379091339-03b21ab4a4f8'),
    bgPrompt: `Fragrant Dum Biryani in royal brass handi with saffron rice, silver vark and glowing crescent lantern nearby, gourmet festive photography, ${NO_TEXT}`,
    industries: ['restaurant', 'sweet', 'bakery', 'food', 'catering'],
  },
  {
    id: 'festival-christmas-carnival',
    name: 'Holiday Carnival',
    category: 'festival',
    layout: 'bold_offer',
    theme: 'rose_chic',
    occasionId: 'christmas',
    aspect: '4:5',
    badge: 'SEASON GREETINGS',
    headline: 'HOLIDAY CARNIVAL\n& YEAR-END SALE',
    subtitle: 'Festive treats, gift hampers & big discounts.',
    cta: 'Celebrate With Us',
    photo: U('photo-1512389142860-9c449e58a543'),
    bgPrompt: `Festive Christmas pine tree with twinkling warm golden lights, wrapped ribbon gift boxes, and gourmet festive cakes on wooden table, ${NO_TEXT}`,
    industries: ['bakery', 'retail', 'restaurant', 'cafe', 'any'],
  },
  {
    id: 'festival-rakhi-bond',
    name: 'Rakhi Celebrations',
    category: 'festival',
    layout: 'split_card',
    theme: 'royal_gold',
    occasionId: 'rakhi',
    aspect: '4:5',
    badge: 'RAKHI GIFTING',
    headline: 'CELEBRATE THE BOND\nHANDCRAFTED HAMPERS',
    subtitle: 'Traditional sweets, designer rakhi & premium dry fruits.',
    cta: 'Pre-Order Hamper',
    photo: U('photo-1629853368297-76db01f301fc'),
    bgPrompt: `Handcrafted royal floral Rakhi thread resting beside golden brass bowl of fresh Kaju Katli and dry fruits, warm festive light, ${NO_TEXT}`,
    industries: ['sweet', 'bakery', 'jewellery', 'gift', 'retail'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // STANDARD COMMERCIAL & TRADE POSTERS (11 Templates)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'standard-amc-contract',
    name: 'Annual Maintenance (AMC)',
    category: 'service_spotlight',
    layout: 'split_card',
    theme: 'trust_amber',
    aspect: '4:5',
    badge: 'ZERO BREAKDOWN',
    headline: 'ANNUAL MAINTENANCE\nCONTRACT (AMC)',
    subtitle: 'Scheduled tune-ups & priority emergency callouts.',
    cta: 'Get AMC Plan',
    photo: U('photo-1621905251189-08b45d6a269e'),
    bgPrompt: `Certified technician in clean company uniform with digital multimeter inspecting modern HVAC unit, crisp commercial photography, ${NO_TEXT}`,
    industries: ['hvac', 'plumbing', 'electrical', 'appliance', 'trades'],
  },
  {
    id: 'standard-price-guarantee',
    name: 'Lowest Price Guarantee',
    category: 'sale_offer',
    layout: 'bold_offer',
    theme: 'trust_amber',
    aspect: '4:5',
    badge: '100% PRICE MATCH',
    headline: 'LOWEST PRICE\nGUARANTEE',
    subtitle: 'Found a lower price? We beat it instantly.',
    cta: 'Shop With Confidence',
    photo: U('photo-1578916171728-46686eac8d58'),
    bgPrompt: `Modern bright supermarket aisles with tidy displays and clear pricing banners, warm commercial retail photography, ${NO_TEXT}`,
    industries: ['retail', 'groceries', 'electronics', 'hardware', 'any'],
  },
  {
    id: 'standard-walkins-welcome',
    name: 'Walk-Ins Welcome',
    category: 'appointment',
    layout: 'bold_offer',
    theme: 'emerald',
    aspect: '4:5',
    badge: 'NO APPOINTMENT NEEDED',
    headline: 'WALK-INS WELCOME\nTODAY',
    subtitle: 'Immediate consultation with zero wait time.',
    cta: 'Visit Clinic',
    photo: U('photo-1519494026892-80bbd2d6fd0d'),
    bgPrompt: `Bright clean modern medical reception lobby with friendly professional desk staff, welcoming natural light, ${NO_TEXT}`,
    industries: ['clinic', 'dental', 'doctor', 'salon', 'barber'],
  },
  {
    id: 'standard-free-consultation',
    name: 'Free Site Inspection',
    category: 'appointment',
    layout: 'split_card',
    theme: 'trust_amber',
    aspect: '4:5',
    badge: '100% FREE ESTIMATE',
    headline: 'FREE SITE INSPECTION\n& CUSTOM QUOTE',
    subtitle: 'On-site engineering review at zero obligation.',
    cta: 'Book Free Visit',
    photo: U('photo-1541888946425-d0fbb186156a'),
    bgPrompt: `Architect and client reviewing blueprints on sunny modern property development site, crisp professional trade photography, ${NO_TEXT}`,
    industries: ['solar', 'construction', 'roofing', 'interior', 'realestate'],
  },
  {
    id: 'standard-warranty-stamp',
    name: 'Certified Warranty',
    category: 'service_spotlight',
    layout: 'tech_modern',
    theme: 'trust_amber',
    aspect: '4:5',
    badge: '1-YEAR WARRANTY',
    headline: 'CERTIFIED GENUINE\nPARTS & REPAIRS',
    subtitle: '100% OEM parts backed by written warranty.',
    cta: 'View Guarantee',
    photo: U('photo-1486262715619-67b85e0b08d3'),
    bgPrompt: `Precision engineered automotive and mechanical components organized neatly on spotless workbench, crisp studio focus, ${NO_TEXT}`,
    industries: ['auto', 'repair', 'mechanic', 'electronics', 'hvac'],
  },
  {
    id: 'standard-emergency-repair',
    name: 'Emergency Rapid Response',
    category: 'service_spotlight',
    layout: 'urgent_callout',
    theme: 'trust_amber',
    aspect: '4:5',
    badge: 'EMERGENCY 24/7',
    headline: 'URGENT REPAIRS\nWE ARRIVE IN 30 MINS',
    subtitle: 'Breakdown, leak or lockouts. Anytime, anywhere.',
    cta: 'Call Emergency',
    photo: U('photo-1615811361523-6bd03d7748e7'),
    bgPrompt: `Professional service van with amber emergency light beacon parked ready for callout, dramatic dusk lighting, ${NO_TEXT}`,
    industries: ['plumbing', 'electrical', 'towing', 'locksmith', 'repair'],
  },
  {
    id: 'standard-combo-package',
    name: '3-in-1 Signature Combo',
    category: 'sale_offer',
    layout: 'split_card',
    theme: 'royal_gold',
    aspect: '4:5',
    badge: 'COMBO SAVER',
    headline: '3-IN-1 SIGNATURE\nSERVICE COMBO',
    subtitle: 'Deep clean, inspection & sanitization bundle.',
    cta: 'Book Combo Deal',
    photo: U('photo-1607860108855-64acf2078ed9'),
    bgPrompt: `Gleaming clean automobile interior and exterior with spotless reflections, high-end car detailing commercial photography, ${NO_TEXT}`,
    industries: ['auto', 'salon', 'spa', 'cleaning', 'pest'],
  },
  {
    id: 'standard-anniversary-milestone',
    name: '10-Year Anniversary',
    category: 'grand_opening',
    layout: 'bold_offer',
    theme: 'royal_gold',
    aspect: '4:5',
    badge: 'CELEBRATING 10 YEARS',
    headline: '10 YEARS OF TRUST\n& EXCELLENCE',
    subtitle: 'Thank you for making us your #1 neighborhood choice.',
    cta: 'Celebrate With Us',
    photo: U('photo-1513151233558-d860c5398176'),
    bgPrompt: `Festive golden confetti burst with crystal anniversary trophy on luxury marble table, celebratory commercial photography, ${NO_TEXT}`,
    industries: ['any', 'jewellery', 'retail', 'restaurant', 'healthcare'],
  },
  {
    id: 'standard-hiring-corporate',
    name: 'Corporate Hiring',
    category: 'hiring',
    layout: 'split_card',
    theme: 'cyber_tech',
    aspect: '4:5',
    badge: 'CAREER OPPORTUNITY',
    headline: 'SENIOR DEVELOPERS\n& TECH LEADS',
    subtitle: 'Competitive package, remote flexibility & growth.',
    cta: 'Apply Today',
    photo: U('photo-1497366216548-37526070297c'),
    bgPrompt: `Contemporary open-plan tech corporate office with floor-to-ceiling glass windows and ergonomic standing workstations, bright natural light, ${NO_TEXT}`,
    industries: ['software', 'technology', 'saas', 'agency', 'corporate'],
  },
  {
    id: 'standard-rating-milestone',
    name: '1,000+ 5-Star Reviews',
    category: 'testimonial',
    layout: 'minimal_luxury',
    theme: 'royal_gold',
    aspect: '4:5',
    badge: 'TOP RATED 4.9★',
    headline: 'OVER 1,000+\nFIVE-STAR REVIEWS',
    subtitle: 'Verified reviews from customers just like you.',
    cta: 'Read Reviews',
    photo: U('photo-1556742049-0a67c5574f73'),
    bgPrompt: `Professional service manager shaking hands with smiling satisfied customer in bright welcoming showroom, warm commercial photography, ${NO_TEXT}`,
    industries: ['any', 'trades', 'realestate', 'dental', 'clinic'],
  },
  {
    id: 'standard-case-study',
    name: 'Client ROI Transformation',
    category: 'testimonial',
    layout: 'tech_modern',
    theme: 'cyber_tech',
    aspect: '4:5',
    badge: 'VERIFIED ROI',
    headline: '+310% REVENUE GROWTH\nIN JUST 90 DAYS',
    subtitle: 'Real business results powered by our proven systems.',
    cta: 'See Case Study',
    photo: U('photo-1460925895917-afdab827c52f'),
    bgPrompt: `Digital tablet resting on clean boardroom table displaying green upward-trending performance graphs and business metrics, ${NO_TEXT}`,
    industries: ['agency', 'software', 'marketing', 'consulting', 'b2b'],
  },
];

// ─── Composition helpers ──────────────────────────────────────────────────────

export interface PosterBusinessContext {
  businessName?: string;
  phone?: string;
  website?: string;
  logoUrl?: string;
  tagline?: string;
  category?: string;
}

/** Build the `createCommercialPosterDesign` input for a template, business-personalised. */
export function templateToDesignInput(
  template: PosterTemplate,
  business: PosterBusinessContext = {},
  overrides: Partial<{
    headline: string;
    subtitle: string;
    badge: string;
    cta: string;
    photo: string;
    ratio: PosterAspect;
    theme: CommercialTheme;
  }> = {}
): Parameters<typeof createCommercialPosterDesign>[0] {
  return {
    brand: business.businessName || 'Your Business',
    headline: overrides.headline || template.headline,
    subtitle: overrides.subtitle || template.subtitle,
    badge: overrides.badge || template.badge,
    cta: overrides.cta || template.cta,
    phone: business.phone,
    website: business.website,
    logoUrl: business.logoUrl,
    tagline: business.tagline,
    photo: overrides.photo || template.photo,
    ratio: overrides.ratio || template.aspect,
    theme: overrides.theme || template.theme,
    layout: template.layout,
  };
}

/** Compose a ready-to-edit design document from a template. */
export function buildTemplateDesignDoc(
  template: PosterTemplate,
  business: PosterBusinessContext = {},
  overrides: Partial<{
    headline: string;
    subtitle: string;
    badge: string;
    cta: string;
    photo: string;
    ratio: PosterAspect;
    theme: CommercialTheme;
  }> = {}
): MarketingDesign {
  return createCommercialPosterDesign(templateToDesignInput(template, business, overrides));
}

/**
 * Occasion-aware gallery ordering:
 * 1. Templates whose occasion window is active today (newest season first)
 * 2. Remaining templates grouped by category order
 */
export function orderTemplatesForGallery(
  templates: PosterTemplate[] = POSTER_TEMPLATES,
  currentDate = new Date()
): PosterTemplate[] {
  const activeOccasions = getActivePosterOccasions(currentDate);
  const activeIds = new Set(activeOccasions.map((o) => o.id));
  const categoryOrder = new Map(POSTER_CATEGORIES.map((c, i) => [c.id, i]));

  return [...templates].sort((a, b) => {
    const aOcc = a.occasionId && activeIds.has(a.occasionId) ? 0 : 1;
    const bOcc = b.occasionId && activeIds.has(b.occasionId) ? 0 : 1;
    if (aOcc !== bOcc) return aOcc - bOcc;
    if (aOcc === 0 && bOcc === 0) {
      // Both occasion-featured: keep occasion window order, then category
      const oa = activeOccasions.findIndex((o) => o.id === a.occasionId);
      const ob = activeOccasions.findIndex((o) => o.id === b.occasionId);
      if (oa !== ob) return oa - ob;
    }
    const ca = categoryOrder.get(a.category) ?? 99;
    const cb = categoryOrder.get(b.category) ?? 99;
    if (ca !== cb) return ca - cb;
    return a.id.localeCompare(b.id);
  });
}

/** Templates matching the user's business industry, for "Picked for you" ranking. */
export function matchIndustryScore(
  template: PosterTemplate,
  businessCategory?: string
): number {
  if (!businessCategory || !template.industries) return 0;
  if (template.industries.includes('any')) return 0.5;
  const cat = businessCategory.toLowerCase();
  const hasWord = (word: string) =>
    new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(cat);
  return template.industries.some(hasWord) ? 1 : 0;
}

export function getTemplateById(id: string): PosterTemplate | undefined {
  return POSTER_TEMPLATES.find((t) => t.id === id);
}
