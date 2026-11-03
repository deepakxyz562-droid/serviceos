import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-client';

export const dynamic = 'force-dynamic';

export interface PromptSuggestion {
  id: string;
  category: 'service' | 'offer' | 'review' | 'ai_assistant' | 'urgency';
  chipLabel: string;
  badge: string;
  prompt: string;
  headline: string;
  aspectRatio: '4:5' | '1:1';
  icon: string;
  title: string;
}

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((x): x is string => typeof x === 'string')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
    return [];
  } catch {
    return [];
  }
}

function normalizeSuggestion(s: Partial<PromptSuggestion> & { id: string; prompt: string }): PromptSuggestion {
  const chipLabel = (s.chipLabel || s.headline || '💡 Marketing Idea').trim();
  const emojiMatch = chipLabel.match(/^([\p{Emoji_Presentation}\p{Extended_Pictographic}]+|\S+)\s*(.*)$/u);
  const icon = s.icon || (emojiMatch ? emojiMatch[1] : '💡');
  const title = s.title || (emojiMatch && emojiMatch[2] ? emojiMatch[2] : chipLabel.replace(/^💡\s*/, ''));
  return {
    id: s.id,
    category: (s.category as PromptSuggestion['category']) || 'service',
    chipLabel: s.chipLabel || `${icon} ${title}`,
    icon: icon || '💡',
    title: title || chipLabel,
    badge: s.badge || 'RECOMMENDED',
    prompt: s.prompt,
    headline: s.headline || title,
    aspectRatio: s.aspectRatio === '1:1' ? '1:1' : '4:5',
  };
}

interface CapabilityProfile {
  heroService: string;
  secondService: string;
  usps: string;
  currentOffers: string;
  baseline: PromptSuggestion[];
}

function resolveCapabilities(businessName: string, category: string, location: string, website: string, uspsOverride?: string, offerOverride?: string, customServices?: string[]): CapabilityProfile {
  const catLower = (category || '').toLowerCase();
  const nameLower = (businessName || '').toLowerCase();
  const hasCustom = Array.isArray(customServices) && customServices.length > 0;

  // 1. Sweet Shop / Mithai / Bakery / Confectionery / Cafe / Restaurant
  if (
    catLower.includes('sweet') ||
    catLower.includes('mithai') ||
    catLower.includes('bakery') ||
    catLower.includes('confection') ||
    catLower.includes('dessert') ||
    catLower.includes('cake') ||
    catLower.includes('ladoo') ||
    catLower.includes('food') ||
    catLower.includes('restaurant') ||
    catLower.includes('cafe') ||
    nameLower.includes('sweet') ||
    nameLower.includes('mithai') ||
    nameLower.includes('bakery')
  ) {
    const heroService = hasCustom ? customServices[0] : 'Traditional Pure Ghee Sweets & Mithai';
    const secondService = hasCustom && customServices[1] ? customServices[1] : 'Festive Assorted Gift Hampers';
    const usps = uspsOverride || '100% Pure Desi Ghee, handcrafted daily, authentic traditional recipes, zero preservatives';
    const currentOffers = offerOverride || 'Special Festive Discounts on Assorted Mithai Boxes & Dry Fruit Hampers';

    const baseline: PromptSuggestion[] = [
      {
        id: 's_sweet_hero',
        category: 'service',
        chipLabel: '🍬 Traditional Pure Ghee Sweets',
        icon: '🍬',
        title: 'Traditional Pure Ghee Sweets',
        badge: 'HANDCRAFTED DAILY',
        headline: 'Authentic Taste. Pure Desi Ghee.',
        aspectRatio: '4:5',
        prompt: `Create a mouthwatering promotional poster for ${heroService} at ${businessName} in ${location}. Showcase rich Kaju Katli, Gulab Jamun, and Motichoor Ladoos on festive brass platters. Highlight: ${usps}. Order fresh sweets at ${website}.`,
      },
      {
        id: 's_sweet_offer',
        category: 'offer',
        chipLabel: '🎁 Festive Gift Hampers',
        icon: '🎁',
        title: 'Festive Gift Hampers',
        badge: 'FESTIVE PACK',
        headline: 'Gift Sweet Memories This Season',
        aspectRatio: '4:5',
        prompt: `Create an eye-catching marketing graphic for ${currentOffers} from ${businessName}. Feature premium assorted sweet boxes and dry fruits. Order today at ${website}.`,
      },
      {
        id: 's_sweet_bulk',
        category: 'service',
        chipLabel: '🎉 Wedding & Bulk Catering',
        icon: '🎉',
        title: 'Wedding & Bulk Catering',
        badge: 'BULK ORDERS',
        headline: 'Sweeten Your Celebrations',
        aspectRatio: '4:5',
        prompt: `Create a promotional graphic announcing bulk sweet boxes and custom wedding gifting from ${businessName} in ${location}. Contact us at ${website}.`,
      },
      {
        id: 's_sweet_review',
        category: 'review',
        chipLabel: '⭐ Generations of Authentic Taste',
        icon: '⭐',
        title: 'Generations of Authentic Taste',
        badge: 'CUSTOMER FAVORITE',
        headline: 'Loved by Thousands for Purity & Taste',
        aspectRatio: '4:5',
        prompt: `Create a trust-building social graphic highlighting 5-star customer reviews, unbeatable freshness, and pure ingredients at ${businessName}. Visit ${website}.`,
      },
      {
        id: 's_sweet_fresh',
        category: 'urgency',
        chipLabel: '⚡ Fresh Morning Batch Ready',
        icon: '⚡',
        title: 'Fresh Morning Batch Ready',
        badge: 'FRESH TODAY',
        headline: 'Warm, Fresh Sweets Available Now',
        aspectRatio: '4:5',
        prompt: `Create an appetizing urgency post announcing warm fresh sweets and savory treats ready today at ${businessName} in ${location}. Pick up or order online at ${website}.`,
      },
    ];

    return { heroService, secondService, usps, currentOffers, baseline };
  }

  // 2. Clothing / Fashion Boutique / Saree / Apparel / Bridal / Tailoring
  if (
    catLower.includes('cloth') ||
    catLower.includes('fashion') ||
    catLower.includes('apparel') ||
    catLower.includes('boutique') ||
    catLower.includes('garment') ||
    catLower.includes('saree') ||
    catLower.includes('tailor') ||
    catLower.includes('ethnic') ||
    catLower.includes('dress') ||
    catLower.includes('textile') ||
    nameLower.includes('boutique') ||
    nameLower.includes('fashion') ||
    nameLower.includes('saree')
  ) {
    const heroService = hasCustom ? customServices[0] : 'Designer Ethnic & Bridal Wear';
    const secondService = hasCustom && customServices[1] ? customServices[1] : 'Handcrafted Silk Sarees & Kurtis';
    const usps = uspsOverride || 'Premium fabrics, bespoke tailoring, trending festive styles, perfect fit guaranteed';
    const currentOffers = offerOverride || 'Flat 40% Off on New Season Festive Collection';

    const baseline: PromptSuggestion[] = [
      {
        id: 's_fashion_hero',
        category: 'service',
        chipLabel: '👗 Designer Ethnic Wear',
        icon: '👗',
        title: 'Designer Ethnic Wear',
        badge: 'NEW COLLECTION',
        headline: 'Grace in Every Thread',
        aspectRatio: '4:5',
        prompt: `Create an editorial fashion poster showcasing ${heroService} from ${businessName} in ${location}. Highlight elegant drapes, silk textures, and festive boutique showroom styling. Shop at ${website}.`,
      },
      {
        id: 's_fashion_offer',
        category: 'offer',
        chipLabel: '🔥 Festive Season Sale',
        icon: '🔥',
        title: 'Festive Season Sale',
        badge: 'SPECIAL SALE',
        headline: 'Up to 50% Off Designer Wear',
        aspectRatio: '4:5',
        prompt: `Create a high-impact sale graphic for ${currentOffers} on designer sarees, lehengas, and suits at ${businessName}. Limited period offer at ${website}.`,
      },
      {
        id: 's_fashion_bridal',
        category: 'service',
        chipLabel: '👰 Bridal Trousseau Edition',
        icon: '👰',
        title: 'Bridal Trousseau Edition',
        badge: 'BRIDAL COUTURE',
        headline: 'Make Your Big Day Unforgettable',
        aspectRatio: '4:5',
        prompt: `Create a luxurious bridal wear promotional poster for bespoke lehengas and wedding silks at ${businessName}. Book your bridal styling at ${website}.`,
      },
      {
        id: 's_fashion_review',
        category: 'review',
        chipLabel: '⭐ Loved for Fit & Fabric',
        icon: '⭐',
        title: 'Loved for Fit & Fabric',
        badge: 'TOP RATED',
        headline: 'Loved by Modern Fashionistas',
        aspectRatio: '4:5',
        prompt: `Create a customer appreciation post highlighting rave 5-star reviews on craftsmanship and perfect fitting from ${businessName}. Explore at ${website}.`,
      },
      {
        id: 's_fashion_urgency',
        category: 'urgency',
        chipLabel: '⚡ Limited Edition Drop',
        icon: '⚡',
        title: 'Limited Edition Drop',
        badge: 'LIMITED PIECES',
        headline: 'Exclusive Pieces. Selling Fast.',
        aspectRatio: '4:5',
        prompt: `Create an urgency fashion flyer announcing limited pieces left in the new festive arrival at ${businessName}. Grab your look at ${website}.`,
      },
    ];

    return { heroService, secondService, usps, currentOffers, baseline };
  }

  // 3. Jewellery / Gold / Diamond / Gems / Ornaments
  if (
    catLower.includes('jewel') ||
    catLower.includes('gold') ||
    catLower.includes('diamond') ||
    catLower.includes('gem') ||
    catLower.includes('ornament') ||
    catLower.includes('silver') ||
    nameLower.includes('jewel') ||
    nameLower.includes('gold') ||
    nameLower.includes('diamond')
  ) {
    const heroService = hasCustom ? customServices[0] : '22K BIS Hallmarked Gold Jewellery';
    const secondService = hasCustom && customServices[1] ? customServices[1] : 'Certified Diamond Solitaires & Bridal Sets';
    const usps = uspsOverride || '100% BIS Hallmarked purity, certified natural diamonds, transparent pricing, zero making charge deals';
    const currentOffers = offerOverride || 'Special 0% Making Charges & Festive Gold Exchange';

    const baseline: PromptSuggestion[] = [
      {
        id: 's_jewel_hero',
        category: 'service',
        chipLabel: '💎 22K Hallmark Gold Sets',
        icon: '💎',
        title: '22K Hallmark Gold Sets',
        badge: 'HALLMARK CERTIFIED',
        headline: 'Crafted for Royalty. Worn with Pride.',
        aspectRatio: '4:5',
        prompt: `Create an ultra-luxury high-jewelry advertising creative featuring glittering 22K gold necklaces and bangles from ${businessName}. Black velvet background, macro spotlighting. Explore at ${website}.`,
      },
      {
        id: 's_jewel_offer',
        category: 'offer',
        chipLabel: '🔥 Zero Making Charges',
        icon: '🔥',
        title: 'Zero Making Charges',
        badge: 'LIMITED DEAL',
        headline: 'Save Big on Making Charges',
        aspectRatio: '4:5',
        prompt: `Create a prestigious promotional poster for ${currentOffers} on selected gold and diamond jewellery at ${businessName}. Visit showroom or book at ${website}.`,
      },
      {
        id: 's_jewel_diamonds',
        category: 'service',
        chipLabel: '💍 Certified Diamond Solitaires',
        icon: '💍',
        title: 'Certified Diamond Solitaires',
        badge: 'DIAMOND FEST',
        headline: 'A Diamond for Every Dream',
        aspectRatio: '4:5',
        prompt: `Create a breathtaking jewellery poster showcasing certified diamond rings and necklaces from ${businessName}. Pure luxury aesthetic. Discover at ${website}.`,
      },
      {
        id: 's_jewel_review',
        category: 'review',
        chipLabel: '⭐ Generations of Trust',
        icon: '⭐',
        title: 'Generations of Trust',
        badge: 'TRUSTED JEWELLER',
        headline: 'Generations of Certified Purity',
        aspectRatio: '4:5',
        prompt: `Create a heritage trust-building post highlighting 100% BIS certification, transparent buyback, and 5-star customer reviews for ${businessName}. Visit ${website}.`,
      },
      {
        id: 's_jewel_scheme',
        category: 'urgency',
        chipLabel: '✨ Gold Accumulation Scheme',
        icon: '✨',
        title: 'Gold Accumulation Scheme',
        badge: 'SMART SAVINGS',
        headline: 'Grow Your Gold Month by Month',
        aspectRatio: '4:5',
        prompt: `Create a commercial graphic promoting the easy monthly gold savings plan with bonus benefits from ${businessName}. Enroll today at ${website}.`,
      },
    ];

    return { heroService, secondService, usps, currentOffers, baseline };
  }

  // 4. IT Services / Software Agency / Web Development / Tech
  if (
    catLower.includes('it ') ||
    catLower.includes('software agency') ||
    catLower.includes('web development') ||
    catLower.includes('digital agency') ||
    catLower.includes('tech company') ||
    catLower.includes('mobile app') ||
    catLower.includes('tracking') ||
    catLower.includes('cloud') ||
    nameLower.includes('technologies') ||
    nameLower.includes('infotech') ||
    (nameLower.includes('software') && !nameLower.includes('fieser'))
  ) {
    const hasAppOrTracking =
      catLower.includes('mobile app') ||
      catLower.includes('app development') ||
      catLower.includes('tracking') ||
      catLower.includes('attendance') ||
      (Array.isArray(customServices) &&
        customServices.some((s) => /app|track|attend|gps|fleet|dispatch|staff|field/i.test(s)));

    if (hasAppOrTracking) {
      const heroService = hasCustom && customServices.some((s) => /track|gps|attend|field|app/i.test(s))
        ? customServices.find((s) => /track|gps|attend|field|app/i.test(s))!
        : 'Live Employee & Field Staff Tracking Mobile App';
      const secondService = hasCustom && customServices.length > 1
        ? customServices[1]
        : 'Geo-Fenced Mobile Attendance & Route Optimization';
      const usps = uspsOverride || 'Real-time GPS tracking, 100% automated check-in, battery-efficient telemetry, instant manager dashboard';
      const currentOffers = offerOverride || 'Free 14-Day Pilot Sprint & Custom App Demo';

      const baseline: PromptSuggestion[] = [
        {
          id: 's_app_tracking_hero',
          category: 'service',
          chipLabel: '📱 Live Employee Tracking App',
          icon: '📱',
          title: 'Live Employee Tracking App',
          badge: 'LIVE GPS TRACKING',
          headline: 'Track Field Staff in Real-Time',
          aspectRatio: '4:5',
          prompt: `Create a sleek commercial mobile app poster promoting our real-time Employee Tracking & Field Staff Management App. Smartphone mockup showing live GPS map navigation, employee location pins, and daily route tracking from ${businessName}. Visit ${website}.`,
        },
        {
          id: 's_app_geofence_offer',
          category: 'offer',
          chipLabel: '⏱️ Geo-Fenced Attendance App',
          icon: '⏱️',
          title: 'Geo-Fenced Attendance App',
          badge: 'AUTO CHECK-IN',
          headline: 'Automated Attendance on Phone',
          aspectRatio: '4:5',
          prompt: `Create a high-impact mobile app poster showcasing automated punch-in with GPS geo-fencing, zero proxy attendance, and real-time reports from ${businessName}. Learn more at ${website}.`,
        },
        {
          id: 's_app_route_service',
          category: 'service',
          chipLabel: '🗺️ Field Force Route Tracker',
          icon: '🗺️',
          title: 'Field Force Route Tracker',
          badge: 'ROUTE OPTIMIZER',
          headline: 'Cut Travel Costs & Idle Time',
          aspectRatio: '4:5',
          prompt: `Create a sleek mobile app graphic highlighting real-time route optimization, task milestones, and live staff travel tracking for ${businessName}. Schedule a demo at ${website}.`,
        },
        {
          id: 's_app_manager_dashboard',
          category: 'review',
          chipLabel: '📊 Manager Analytics Dashboard',
          icon: '📊',
          title: 'Manager Analytics Dashboard',
          badge: 'MOBILE DASHBOARD',
          headline: 'Instant Staff Reports in Pocket',
          aspectRatio: '4:5',
          prompt: `Create a modern mobile app promotional poster featuring manager analytics dashboard, live battery status, and instant job completion reports from ${businessName}. Explore at ${website}.`,
        },
        {
          id: 's_app_custom_dev_urgency',
          category: 'urgency',
          chipLabel: '🚀 Custom App in 14 Days',
          icon: '🚀',
          title: 'Custom App in 14 Days',
          badge: 'CUSTOM BRANDED',
          headline: 'Launch Your Own Tracking App',
          aspectRatio: '4:5',
          prompt: `Create a compelling B2B social flyer inviting business owners to get their own custom-branded employee tracking and field force app built by ${businessName} in 14 days. Book a free consultation at ${website}.`,
        },
      ];

      return { heroService, secondService, usps, currentOffers, baseline };
    }

    const heroService = hasCustom ? customServices[0] : 'Custom Web & Mobile Application Development';
    const secondService = hasCustom && customServices[1] ? customServices[1] : 'Cloud Architecture & Enterprise Modernization';
    const usps = uspsOverride || 'Full-cycle engineering, modern tech stacks, agile delivery, 99.9% uptime';
    const currentOffers = offerOverride || 'Free Tech Audit & 30-Day Prototype Sprint';

    const baseline: PromptSuggestion[] = [
      {
        id: 's_tech_hero',
        category: 'service',
        chipLabel: '💻 Custom Software & Apps',
        icon: '💻',
        title: 'Custom Software & Apps',
        badge: 'ENGINEERING EXCELLENCE',
        headline: 'Scalable Software Built for Growth',
        aspectRatio: '4:5',
        prompt: `Create a sleek modern technology poster promoting ${heroService} from ${businessName}. High-tech aesthetic with code UI dashboard and modern workspace. Visit ${website}.`,
      },
      {
        id: 's_tech_offer',
        category: 'offer',
        chipLabel: '🔥 Free Architecture Audit',
        icon: '🔥',
        title: 'Free Architecture Audit',
        badge: 'FREE CONSULT',
        headline: 'Modernize Your Tech Stack',
        aspectRatio: '4:5',
        prompt: `Create a B2B tech promotional flyer for ${currentOffers} from ${businessName}. Book your 45-min consultation at ${website}.`,
      },
      {
        id: 's_tech_cloud',
        category: 'service',
        chipLabel: '☁️ Cloud & API Automation',
        icon: '☁️',
        title: 'Cloud & API Automation',
        badge: 'CLOUD NATIVE',
        headline: 'Automate Workflows & Cut Costs',
        aspectRatio: '4:5',
        prompt: `Create a high-impact technology post showcasing cloud migration and API integrations by ${businessName}. Learn more at ${website}.`,
      },
      {
        id: 's_tech_review',
        category: 'review',
        chipLabel: '⭐ Enterprise Delivery Proof',
        icon: '⭐',
        title: 'Enterprise Delivery Proof',
        badge: 'PROVEN IMPACT',
        headline: 'Trusted by High-Growth Companies',
        aspectRatio: '4:5',
        prompt: `Create a trust-building client review post highlighting on-time delivery, robust architecture, and 5-star ratings for ${businessName}. Discover at ${website}.`,
      },
      {
        id: 's_tech_urgency',
        category: 'urgency',
        chipLabel: '⚡ Dedicated Squad Slots',
        icon: '⚡',
        title: 'Dedicated Squad Slots',
        badge: 'LIMITED AVAILABILITY',
        headline: 'Reserve Your Dev Team for Next Quarter',
        aspectRatio: '4:5',
        prompt: `Create an urgency B2B graphic announcing reserved developer squad bookings for upcoming project roadmaps at ${businessName}. Schedule at ${website}.`,
      },
    ];

    return { heroService, secondService, usps, currentOffers, baseline };
  }

  // 5. HVAC / Heating & Air Conditioning
  if (catLower.includes('hvac') || catLower.includes('heating') || catLower.includes('air conditioning') || catLower.includes('cooling') || catLower.includes('furnace')) {
    const heroService = hasCustom ? customServices[0] : 'Heating & AC Maintenance';
    const secondService = hasCustom && customServices[1] ? customServices[1] : 'Emergency System Diagnostics';
    const usps = uspsOverride || 'Certified technicians, rapid arrival, transparent upfront pricing';
    const currentOffers = offerOverride || 'Seasonal Tune-Up & Safety Inspection Special';

    const baseline: PromptSuggestion[] = [
      {
        id: 's_hero',
        category: 'service',
        chipLabel: `🔧 ${heroService} Focus`,
        icon: '🔧',
        title: `${heroService} Focus`,
        badge: 'HERO SERVICE',
        headline: `Reliable ${heroService}. Done Right.`,
        aspectRatio: '4:5',
        prompt: `Create a professional marketing graphic promoting our ${heroService} in ${location}. Highlight our USPs: ${usps}. Call to action: Book today at ${website}.`,
      },
      {
        id: 's_offer',
        category: 'offer',
        chipLabel: '🔥 Seasonal Special Offer',
        icon: '🔥',
        title: 'Seasonal Special Offer',
        badge: 'SPECIAL OFFER',
        headline: 'Save on Your Heating & AC',
        aspectRatio: '4:5',
        prompt: `Create a high-converting promotional post for our ${currentOffers} on ${heroService} and ${secondService}. Target local homeowners in ${location}. Visit ${website}.`,
      },
      {
        id: 's_review',
        category: 'review',
        chipLabel: '⭐ 5-Star Customer Proof',
        icon: '⭐',
        title: '5-Star Customer Proof',
        badge: 'CUSTOMER PROOF',
        headline: 'Loved by Local Homeowners',
        aspectRatio: '4:5',
        prompt: `Create a trust-building customer review post highlighting top-rated 5-star feedback, prompt arrival, and spotless workmanship from ${businessName}.`,
      },
      {
        id: 's_ai',
        category: 'ai_assistant',
        chipLabel: '🤖 Easy Online Booking',
        icon: '🤖',
        title: 'Easy Online Booking',
        badge: 'INSTANT BOOKING',
        headline: 'Fast Booking. No Waiting.',
        aspectRatio: '4:5',
        prompt: `Create a modern graphic promoting hassle-free online booking and fast dispatch for ${businessName} in ${location}. Schedule at ${website}.`,
      },
      {
        id: 's_urgency',
        category: 'urgency',
        chipLabel: '⚡ Emergency Weekend Service',
        icon: '⚡',
        title: 'Emergency Weekend Service',
        badge: 'LIMITED SLOTS',
        headline: 'Emergency Dispatch Available',
        aspectRatio: '4:5',
        prompt: `Create an urgency marketing post announcing priority HVAC dispatch in ${location}. Zero hidden fees and fast response at ${website}.`,
      },
    ];

    return { heroService, secondService, usps, currentOffers, baseline };
  }

  // 6. Plumbing
  if (catLower.includes('plumb') || catLower.includes('drain')) {
    const heroService = hasCustom ? customServices[0] : 'Emergency Plumbing & Leak Repair';
    const secondService = hasCustom && customServices[1] ? customServices[1] : 'Drain Cleaning & Diagnostics';
    const usps = uspsOverride || 'Licensed plumbers, prompt dispatch, clean & guaranteed work';
    const currentOffers = offerOverride || '10% Off Your First Plumbing Service';

    const baseline: PromptSuggestion[] = [
      {
        id: 's_hero',
        category: 'service',
        chipLabel: `🔧 ${heroService}`,
        icon: '🔧',
        title: heroService,
        badge: 'HERO SERVICE',
        headline: 'Fast, Spotless Plumbing Repairs',
        aspectRatio: '4:5',
        prompt: `Create a professional marketing graphic promoting ${heroService} in ${location}. Highlight: ${usps}. Book at ${website}.`,
      },
      {
        id: 's_offer',
        category: 'offer',
        chipLabel: '🔥 First-Time Client Discount',
        icon: '🔥',
        title: 'First-Time Client Discount',
        badge: 'SPECIAL OFFER',
        headline: 'Save on Plumbing Today',
        aspectRatio: '4:5',
        prompt: `Create a high-converting promotional post for ${currentOffers}. Target local homeowners in ${location}. End with visit ${website}.`,
      },
      {
        id: 's_review',
        category: 'review',
        chipLabel: '⭐ 5-Star Customer Proof',
        icon: '⭐',
        title: '5-Star Customer Proof',
        badge: 'TOP RATED',
        headline: 'Trusted by Your Neighbors',
        aspectRatio: '4:5',
        prompt: `Create a trust-building customer review post highlighting prompt arrival, clean workspaces, and 5-star ratings for ${businessName}.`,
      },
      {
        id: 's_ai',
        category: 'ai_assistant',
        chipLabel: '🤖 Book Plumber Online',
        icon: '🤖',
        title: 'Book Plumber Online',
        badge: 'INSTANT BOOKING',
        headline: 'Book in 60 Seconds',
        aspectRatio: '4:5',
        prompt: `Create a clean social graphic showing how easy it is to schedule a licensed plumber from ${businessName} online at ${website}.`,
      },
      {
        id: 's_urgency',
        category: 'urgency',
        chipLabel: '⚡ Same-Day Leak Triage',
        icon: '⚡',
        title: 'Same-Day Leak Triage',
        badge: 'FAST DISPATCH',
        headline: 'Emergency Plumber On Call',
        aspectRatio: '4:5',
        prompt: `Create an urgent announcement post for same-day plumbing dispatch in ${location}. Fast arrival, no surprise charges at ${website}.`,
      },
    ];

    return { heroService, secondService, usps, currentOffers, baseline };
  }

  // 7. Cleaning / Janitorial
  if (catLower.includes('clean') || catLower.includes('maid') || catLower.includes('janitorial')) {
    const heroService = hasCustom ? customServices[0] : 'Deep Cleaning & Sanitization';
    const secondService = hasCustom && customServices[1] ? customServices[1] : 'Move-In & Move-Out Cleaning';
    const usps = uspsOverride || 'Vetted professionals, eco-friendly supplies, 100% satisfaction guaranteed';
    const currentOffers = offerOverride || 'First-Time Client Deep Cleaning Special';

    const baseline: PromptSuggestion[] = [
      {
        id: 's_hero',
        category: 'service',
        chipLabel: `✨ ${heroService}`,
        icon: '✨',
        title: heroService,
        badge: 'HERO SERVICE',
        headline: 'Spotless Spaces. Zero Stress.',
        aspectRatio: '4:5',
        prompt: `Create an inviting marketing graphic promoting ${heroService} in ${location}. Highlight: ${usps}. Book at ${website}.`,
      },
      {
        id: 's_offer',
        category: 'offer',
        chipLabel: '🔥 Deep Clean Special Offer',
        icon: '🔥',
        title: 'Deep Clean Special Offer',
        badge: 'SPECIAL OFFER',
        headline: 'Fresh Home, Special Price',
        aspectRatio: '4:5',
        prompt: `Create a promotional post for ${currentOffers} in ${location}. Book your slot at ${website}.`,
      },
      {
        id: 's_review',
        category: 'review',
        chipLabel: '⭐ 5-Star Customer Proof',
        icon: '⭐',
        title: '5-Star Customer Proof',
        badge: 'CLIENT LOVE',
        headline: 'Rated 5 Stars by Clients',
        aspectRatio: '4:5',
        prompt: `Create a trust-building graphic highlighting spotless results and glowing reviews for ${businessName}.`,
      },
      {
        id: 's_ai',
        category: 'ai_assistant',
        chipLabel: '🤖 Schedule Online',
        icon: '🤖',
        title: 'Schedule Online',
        badge: 'EASY BOOKING',
        headline: 'Book Your Clean in Minutes',
        aspectRatio: '4:5',
        prompt: `Promote seamless online booking for cleaning appointments at ${website}.`,
      },
      {
        id: 's_urgency',
        category: 'urgency',
        chipLabel: '⚡ Weekend Slots Open',
        icon: '⚡',
        title: 'Weekend Slots Open',
        badge: 'LIMITED SLOTS',
        headline: 'Weekend Availability Open',
        aspectRatio: '4:5',
        prompt: `Create an urgency graphic announcing open cleaning slots in ${location} this weekend at ${website}.`,
      },
    ];

    return { heroService, secondService, usps, currentOffers, baseline };
  }

  // 8. FieserOS SaaS Platform
  if (nameLower.includes('fieser') || catLower.includes('saas') || catLower.includes('field service platform')) {
    const heroService = hasCustom ? customServices[0] : 'AI Assistant & Workflow Automation';
    const secondService = hasCustom && customServices[1] ? customServices[1] : 'Smart Job Dispatch & Instant Quotes';
    const usps = uspsOverride || 'Turn one instruction into a connected workflow; save 15+ hours/week; zero missed leads';
    const currentOffers = offerOverride || 'Explore Fieseros AI Assistant Free — Streamline Your Field Service Operations';

    const baseline: PromptSuggestion[] = [
      {
        id: 's_ai',
        category: 'ai_assistant',
        chipLabel: '🤖 AI Workflow & Automation',
        icon: '🤖',
        title: 'AI Workflow & Automation',
        badge: 'AI WORKFLOW',
        headline: 'Less admin. More jobs.',
        aspectRatio: '4:5',
        prompt: `Create a professional social media marketing post promoting the Fieseros AI Assistant. Brand: ${businessName} | Website: ${website}. Highlight how trade businesses turn conversation into quotes, jobs, and confirmation. Visit ${website}.`,
      },
      {
        id: 's_dispatch',
        category: 'service',
        chipLabel: '⚡ Instant Job Dispatch',
        icon: '⚡',
        title: 'Instant Job Dispatch',
        badge: 'FAST DISPATCH',
        headline: 'Never Miss Another Job',
        aspectRatio: '4:5',
        prompt: `Create a high-impact SaaS promotional graphic for ${businessName}. Highlight how trade companies dispatch jobs in under 30 seconds. Visit ${website}.`,
      },
      {
        id: 's_quotes',
        category: 'service',
        chipLabel: '💼 30-Second Quotes',
        icon: '💼',
        title: '30-Second Quotes',
        badge: 'SMART QUOTES',
        headline: 'Get Paid 2x Faster',
        aspectRatio: '4:5',
        prompt: `Create a sleek marketing graphic showcasing instant quotes and automated customer confirmation on ${businessName}. Visit ${website}.`,
      },
      {
        id: 's_reviews',
        category: 'review',
        chipLabel: '⭐ 5-Star Review Growth',
        icon: '⭐',
        title: '5-Star Review Growth',
        badge: 'REPUTATION BOOST',
        headline: 'Automate 5-Star Reviews',
        aspectRatio: '4:5',
        prompt: `Create a growth-focused social post showing how ${businessName} automatically requests Google reviews after completed jobs. Learn more at ${website}.`,
      },
      {
        id: 's_upgrade',
        category: 'offer',
        chipLabel: '🚀 Upgrade Your Operations',
        icon: '🚀',
        title: 'Upgrade Your Operations',
        badge: 'FREE DEMO',
        headline: 'Run Your Business on Autopilot',
        aspectRatio: '4:5',
        prompt: `Create a compelling call-to-action graphic inviting trade and service business owners to transform their daily admin with ${businessName}. Start today at ${website}.`,
      },
    ];

    return { heroService, secondService, usps, currentOffers, baseline };
  }

  // 9. General / Custom Professional Business
  const heroService = hasCustom ? customServices[0] : 'Professional Quality Services';
  const secondService = hasCustom && customServices[1] ? customServices[1] : 'Scheduled Service & Premium Care';
  const usps = uspsOverride || 'Experienced professionals, prompt turnaround, 100% satisfaction guaranteed';
  const currentOffers = offerOverride || 'Special Limited-Time Offer for New Customers';

  const baseline: PromptSuggestion[] = [
    {
      id: 's_hero',
      category: 'service',
      chipLabel: `🛠️ ${heroService}`,
      icon: '🛠️',
      title: heroService,
      badge: 'HERO SERVICE',
      headline: `Quality ${heroService}. Done Right.`,
      aspectRatio: '4:5',
      prompt: `Create a professional marketing graphic promoting our ${heroService} in ${location}. Highlight our USPs: ${usps}. Book today at ${website}.`,
    },
    {
      id: 's_offer',
      category: 'offer',
      chipLabel: '🔥 Limited-Time Special Offer',
      icon: '🔥',
      title: 'Limited-Time Special Offer',
      badge: 'SPECIAL OFFER',
      headline: 'Special Savings This Week',
      aspectRatio: '4:5',
      prompt: `Create a promotional post for our ${currentOffers} on ${heroService} in ${location}. Visit ${website}.`,
    },
    {
      id: 's_review',
      category: 'review',
      chipLabel: '⭐ 5-Star Customer Proof',
      icon: '⭐',
      title: '5-Star Customer Proof',
      badge: 'TOP RATED',
      headline: 'Loved by Local Customers',
      aspectRatio: '4:5',
      prompt: `Create a customer review post highlighting top-rated 5-star feedback, punctual arrival, and spotless quality from ${businessName}.`,
    },
    {
      id: 's_ai',
      category: 'ai_assistant',
      chipLabel: '🤖 Easy Online Booking',
      icon: '🤖',
      title: 'Easy Online Booking',
      badge: 'INSTANT BOOKING',
      headline: 'Fast Booking. Zero Hassle.',
      aspectRatio: '4:5',
      prompt: `Create a modern graphic promoting hassle-free online booking for ${businessName}. Visit ${website}.`,
    },
    {
      id: 's_urgency',
      category: 'urgency',
      chipLabel: '⚡ Priority Slots Available',
      icon: '⚡',
      title: 'Priority Slots Available',
      badge: 'LIMITED SLOTS',
      headline: 'Priority Slots Open This Week',
      aspectRatio: '4:5',
      prompt: `Create an urgency marketing post announcing priority service availability in ${location}. Book at ${website}.`,
    },
  ];

  return { heroService, secondService, usps, currentOffers, baseline };
}

function getRotatedSuggestions(capabilities: CapabilityProfile, businessName: string, location: string, website: string, category: string): PromptSuggestion[] {
  const cat = (category || '').toLowerCase();
  const base = capabilities.baseline;
  const seed = Math.floor(Date.now() / 8000);

  if (cat.includes('sweet') || cat.includes('mithai') || cat.includes('bakery') || cat.includes('food') || cat.includes('restaurant')) {
    return [
      {
        id: `rot_sweet_1_${seed}`,
        category: 'offer',
        chipLabel: '🎁 Festive Gift Hampers',
        icon: '🎁',
        title: 'Festive Gift Hampers',
        badge: 'FESTIVE PACK',
        headline: 'Celebrate with Royal Mithai Hampers',
        aspectRatio: '4:5',
        prompt: `Create an appetizing commercial graphic showcasing luxury assorted festive mithai gift boxes from ${businessName}. Highlight Kaju Katli, Gulab Jamun, and premium dry fruits on silver platters. Order online at ${website}.`,
      },
      {
        id: `rot_sweet_2_${seed}`,
        category: 'service',
        chipLabel: '🎉 Bulk & Wedding Orders',
        icon: '🎉',
        title: 'Bulk & Wedding Orders',
        badge: 'BULK ORDERS',
        headline: 'Sweeten Your Special Occasions',
        aspectRatio: '4:5',
        prompt: `Create a promotional flyer for bulk wedding and event sweets catering from ${businessName}. 100% Pure Desi Ghee confections handcrafted fresh. Inquire at ${website}.`,
      },
      {
        id: `rot_sweet_3_${seed}`,
        category: 'urgency',
        chipLabel: '⚡ Fresh Daily Batch',
        icon: '⚡',
        title: 'Fresh Daily Batch',
        badge: 'FRESH TODAY',
        headline: 'Warm, Fresh Sweets Ready Now',
        aspectRatio: '4:5',
        prompt: `Create a mouthwatering social post announcing today's fresh morning batch of warm sweets and snacks at ${businessName} in ${location}. Order at ${website}.`,
      },
      {
        id: `rot_sweet_4_${seed}`,
        category: 'review',
        chipLabel: '⭐ 100% Pure Desi Ghee',
        icon: '⭐',
        title: '100% Pure Desi Ghee',
        badge: 'PURITY GUARANTEED',
        headline: 'The Taste of Authentic Purity',
        aspectRatio: '4:5',
        prompt: `Create a trust-focused social graphic highlighting authentic taste, traditional recipes, and pure desi ghee ingredients from ${businessName}. Explore at ${website}.`,
      },
      {
        id: `rot_sweet_5_${seed}`,
        category: 'offer',
        chipLabel: '🔥 Weekend Sweet Feast',
        icon: '🔥',
        title: 'Weekend Sweet Feast',
        badge: 'WEEKEND SPECIAL',
        headline: 'Treat Your Family This Weekend',
        aspectRatio: '4:5',
        prompt: `Create an enticing weekend promotional post for assorted confections, rasgulla, and dry fruit sweets from ${businessName}. Visit ${website}.`,
      },
    ];
  }

  if (cat.includes('cloth') || cat.includes('fashion') || cat.includes('boutique') || cat.includes('saree') || cat.includes('apparel')) {
    return [
      {
        id: `rot_fashion_1_${seed}`,
        category: 'offer',
        chipLabel: '👗 Flat 40% Off Festive Sale',
        icon: '👗',
        title: 'Flat 40% Off Festive Sale',
        badge: 'MEGA SALE',
        headline: 'Exclusive Designer Festive Sale',
        aspectRatio: '4:5',
        prompt: `Create a chic high-fashion social media poster announcing 40% off on designer sarees, lehengas, and kurtis at ${businessName}. Shop online at ${website}.`,
      },
      {
        id: `rot_fashion_2_${seed}`,
        category: 'service',
        chipLabel: '👰 Bridal Trousseau Edition',
        icon: '👰',
        title: 'Bridal Trousseau Edition',
        badge: 'BRIDAL COUTURE',
        headline: 'Handcrafted Bridal Masterpieces',
        aspectRatio: '4:5',
        prompt: `Create a luxurious editorial fashion poster for the bespoke bridal and wedding collection at ${businessName}. Book your styling session at ${website}.`,
      },
      {
        id: `rot_fashion_3_${seed}`,
        category: 'service',
        chipLabel: '✨ New Arrivals Showcase',
        icon: '✨',
        title: 'New Arrivals Showcase',
        badge: 'NEW COLLECTION',
        headline: 'Fresh Runway Styles Just Landed',
        aspectRatio: '4:5',
        prompt: `Create an elegant fashion boutique poster showcasing newly launched seasonal styles, breathable fabrics, and trending silhouettes from ${businessName}. Visit ${website}.`,
      },
      {
        id: `rot_fashion_4_${seed}`,
        category: 'review',
        chipLabel: '⭐ Loved for Fit & Fabric',
        icon: '⭐',
        title: 'Loved for Fit & Fabric',
        badge: 'CLIENT LOVE',
        headline: 'Perfect Fit. Unmatched Elegance.',
        aspectRatio: '4:5',
        prompt: `Create a stylish customer proof post highlighting rave reviews on quality, fabric, and bespoke tailoring from ${businessName}. Discover at ${website}.`,
      },
      {
        id: `rot_fashion_5_${seed}`,
        category: 'urgency',
        chipLabel: '⚡ Limited Edition Drop',
        icon: '⚡',
        title: 'Limited Edition Drop',
        badge: 'SELLING FAST',
        headline: 'Only Few Pieces Left in Stock',
        aspectRatio: '4:5',
        prompt: `Create an urgency social creative announcing limited stock on trending festive outfits at ${businessName}. Grab yours at ${website}.`,
      },
    ];
  }

  if (cat.includes('jewel') || cat.includes('gold') || cat.includes('diamond')) {
    return [
      {
        id: `rot_jewel_1_${seed}`,
        category: 'offer',
        chipLabel: '💎 Zero Making Charges',
        icon: '💎',
        title: 'Zero Making Charges',
        badge: 'LIMITED OFFER',
        headline: '0% Making Charges on Gold Jewellery',
        aspectRatio: '4:5',
        prompt: `Create a dazzling luxury advertising poster for 0% making charges on 22K hallmark gold jewellery from ${businessName}. Visit showroom or explore at ${website}.`,
      },
      {
        id: `rot_jewel_2_${seed}`,
        category: 'service',
        chipLabel: '💍 Diamond Solitaire Fest',
        icon: '💍',
        title: 'Diamond Solitaire Fest',
        badge: 'CERTIFIED DIAMONDS',
        headline: 'Forever Sparkle. Certified Solitaires.',
        aspectRatio: '4:5',
        prompt: `Create a breathtaking jewellery poster featuring certified diamond rings and necklaces from ${businessName}. Macro lens velvet aesthetics. Book a consultation at ${website}.`,
      },
      {
        id: `rot_jewel_3_${seed}`,
        category: 'service',
        chipLabel: '👑 Royal Bridal Jewellery',
        icon: '👑',
        title: 'Royal Bridal Jewellery',
        badge: 'BRIDAL SETS',
        headline: 'Heritage Temple & Bridal Sets',
        aspectRatio: '4:5',
        prompt: `Create an opulent advertising creative highlighting heritage temple gold and polki choker sets from ${businessName}. Plan your bridal visit at ${website}.`,
      },
      {
        id: `rot_jewel_4_${seed}`,
        category: 'review',
        chipLabel: '⭐ 100% BIS Hallmark Purity',
        icon: '⭐',
        title: '100% BIS Hallmark Purity',
        badge: 'PURITY GUARANTEE',
        headline: 'Trusted by Generations of Families',
        aspectRatio: '4:5',
        prompt: `Create a prestige brand creative emphasizing 100% BIS Hallmarked gold, lifetime exchange policy, and transparent pricing at ${businessName}. Visit ${website}.`,
      },
      {
        id: `rot_jewel_5_${seed}`,
        category: 'urgency',
        chipLabel: '✨ Gold Savings Plan',
        icon: '✨',
        title: 'Gold Savings Plan',
        badge: 'SMART SAVINGS',
        headline: 'Start Your Monthly Gold Scheme',
        aspectRatio: '4:5',
        prompt: `Create an informative social poster inviting customers to enroll in the monthly gold accumulation scheme with exciting bonus benefits from ${businessName} at ${website}.`,
      },
    ];
  }

  if (cat.includes('app') || cat.includes('tracking') || cat.includes('attendance') || cat.includes('mobile')) {
    return [
      {
        id: `rot_app_1_${seed}`,
        category: 'service',
        chipLabel: '📍 Live GPS Staff Tracking',
        icon: '📍',
        title: 'Live GPS Staff Tracking',
        badge: 'REAL-TIME TRACKING',
        headline: 'See Field Team Locations Live',
        aspectRatio: '4:5',
        prompt: `Create a cutting-edge mobile app advertising poster showcasing live field employee GPS map tracking, staff route playback, and geofenced visit alerts for ${businessName}. Discover at ${website}.`,
      },
      {
        id: `rot_app_2_${seed}`,
        category: 'offer',
        chipLabel: '⚡ 14-Day Free App Trial',
        icon: '⚡',
        title: '14-Day Free App Trial',
        badge: 'NO COMMITMENT',
        headline: 'Automate Field Staff in 5 Minutes',
        aspectRatio: '4:5',
        prompt: `Create a high-converting B2B mobile app promotion for 14-day free pilot of the employee tracking and attendance system from ${businessName}. Start now at ${website}.`,
      },
      {
        id: `rot_app_3_${seed}`,
        category: 'service',
        chipLabel: '⏱️ Selfie & Geofence Attendance',
        icon: '⏱️',
        title: 'Selfie & Geofence Attendance',
        badge: 'ZERO PROXY',
        headline: 'Touchless Mobile Punch-In',
        aspectRatio: '4:5',
        prompt: `Create a high-impact promotional flyer for mobile attendance with facial recognition and GPS geofencing from ${businessName}. Explore at ${website}.`,
      },
      {
        id: `rot_app_4_${seed}`,
        category: 'review',
        chipLabel: '⭐ 99.8% Tracking Accuracy',
        icon: '⭐',
        title: '99.8% Tracking Accuracy',
        badge: 'PROVEN SYSTEM',
        headline: 'Trusted by 500+ Distributed Teams',
        aspectRatio: '4:5',
        prompt: `Create a trust-building social post highlighting battery-friendly live tracking, 99.8% uptime, and 5-star customer reviews for ${businessName}. Visit ${website}.`,
      },
      {
        id: `rot_app_5_${seed}`,
        category: 'urgency',
        chipLabel: '🚀 Custom Branded App',
        icon: '🚀',
        title: 'Custom Branded App',
        badge: 'WHITE LABEL',
        headline: 'Your Company Name On Play Store',
        aspectRatio: '4:5',
        prompt: `Create an urgency B2B promotional flyer inviting enterprise clients to deploy their custom-branded employee management and tracking app by ${businessName}. Book demo at ${website}.`,
      },
    ];
  }

  return [
    ...base.slice(1),
    base[0],
  ];
}

async function extractWebsiteHighlights(rawUrl: string): Promise<{ tags: string[]; summary?: string }> {
  try {
    let target = (rawUrl || '').trim();
    if (!target) return { tags: [] };
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = `https://${target}`;
    }
    if (target.includes('localhost') || target.includes('fieseros.com/p/')) {
      return { tags: [] };
    }

    const res = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ServiceOSBot/1.0; +https://fieseros.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return { tags: [] };
    const html = await res.text();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch =
      html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
      html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);

    const headings: string[] = [];
    const headingMatches = html.matchAll(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi);
    for (const m of headingMatches) {
      const hText = m[1].replace(/\s+/g, ' ').replace(/<[^>]+>/g, '').trim();
      if (hText.length >= 4 && hText.length <= 40 && !headings.includes(hText)) {
        headings.push(hText);
      }
      if (headings.length >= 8) break;
    }

    const textToAnalyze = `${titleMatch ? titleMatch[1] : ''} ${descMatch ? descMatch[1] : ''} ${headings.join(' ')}`.toLowerCase();

    const discoveredTags: string[] = [];
    if (/employee track|staff track|worker track|user track/i.test(textToAnalyze)) {
      discoveredTags.push('📍 Employee Tracking');
    }
    if (/gps|live location|real-time location|geo-fenc|geofenc/i.test(textToAnalyze)) {
      discoveredTags.push('⏱️ GPS Attendance');
    }
    if (/attendance|check-in|punch|timesheet/i.test(textToAnalyze) && !discoveredTags.includes('⏱️ GPS Attendance')) {
      discoveredTags.push('⏱️ Mobile Attendance');
    }
    if (/field force|field service|field staff|dispatch|technician/i.test(textToAnalyze)) {
      discoveredTags.push('🗺️ Field Force Dispatch');
    }
    if (/mobile app|ios|android|react native|flutter/i.test(textToAnalyze)) {
      discoveredTags.push('📱 Custom Mobile App');
    }
    if (/fleet|route|delivery|vehicle/i.test(textToAnalyze)) {
      discoveredTags.push('🚗 Route Optimization');
    }
    if (/dashboard|analytics|reports/i.test(textToAnalyze)) {
      discoveredTags.push('📊 Live Dashboard');
    }

    for (const h of headings) {
      if (discoveredTags.length >= 6) break;
      const cleanH = h.replace(/^[#\-_*]+\s*/, '').trim();
      if (
        cleanH.length >= 4 &&
        cleanH.length <= 25 &&
        !discoveredTags.some((d) => d.toLowerCase().includes(cleanH.toLowerCase()))
      ) {
        discoveredTags.push(cleanH);
      }
    }

    return {
      tags: discoveredTags.slice(0, 6),
      summary: descMatch ? descMatch[1] : undefined,
    };
  } catch {
    return { tags: [] };
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const profileId = url.searchParams.get('profileId');
    const businessNameOverride = url.searchParams.get('businessName');
    const categoryOverride = url.searchParams.get('category') || url.searchParams.get('industry');
    const websiteOverride = url.searchParams.get('website');
    const scan = url.searchParams.get('scan') === '1';
    const refresh = url.searchParams.get('refresh') === '1';

    const [tenant, googleAccounts, reviews] = await Promise.all([
      db.tenant.findUnique({
        where: { id: user.tenantId },
        include: { brandProfile: true },
      }),
      db.socialAccount.findMany({
        where: {
          tenantId: user.tenantId,
          platform: 'googlebusiness',
          isActive: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      db.review.findMany({
        where: { tenantId: user.tenantId, rating: { gte: 4 } },
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: { author: true, text: true, rating: true },
      }),
    ]);

    // Match active Google Business Profile
    let activeGbp = googleAccounts[0];
    if (profileId) {
      const match = googleAccounts.find((a) => {
        if (a.id === profileId || a.accountId === profileId) return true;
        try {
          const meta = typeof a.metadata === 'string' ? JSON.parse(a.metadata) : a.metadata;
          return meta?.locationId === profileId;
        } catch {
          return false;
        }
      });
      if (match) activeGbp = match;
    }

    let gbpMeta: Record<string, any> = {};
    if (activeGbp?.metadata) {
      try {
        gbpMeta = typeof activeGbp.metadata === 'string' ? JSON.parse(activeGbp.metadata) : (activeGbp.metadata || {});
      } catch {}
    }

    // Resolve business identity prioritizing active Google Business Profile over stale default registration names
    const businessName =
      (businessNameOverride && businessNameOverride.trim()) ||
      gbpMeta.locationTitle ||
      activeGbp?.accountName ||
      tenant?.brandProfile?.businessName ||
      tenant?.name ||
      'Fieseros';

    const industry =
      (categoryOverride && categoryOverride.trim()) ||
      gbpMeta.category ||
      tenant?.brandProfile?.industry ||
      tenant?.industry ||
      'Professional Services';

    const website =
      (websiteOverride && websiteOverride.trim()) ||
      gbpMeta.website ||
      tenant?.brandProfile?.website ||
      tenant?.website ||
      (tenant?.slug ? `https://fieseros.com/p/${tenant.slug}` : 'https://fieseros.com');

    // Extract website highlights & feature tags if website is provided
    let extractedData = { tags: [] as string[], summary: undefined as string | undefined };
    if (website && !website.includes('localhost') && !website.includes('fieseros.com/p/')) {
      extractedData = await extractWebsiteHighlights(website);
    }

    const fallbackTags: Record<string, string[]> = {
      app: ['📍 Employee Tracking', '⏱️ GPS Attendance', '🗺️ Live Route Map', '📊 Manager Dashboard', '⚡ 14-Day Free Trial'],
      sweet: ['🍬 Kaju Katli', '🍯 Gulab Jamun', '🎁 Festive Gift Box', '✨ Pure Desi Ghee', '🚚 Same-Day Delivery'],
      cloth: ['👗 Banarasi Silk Sarees', '👰 Bridal Lehengas', '✨ Festive Designer Suits', '🏷️ Flat 30% Off', '🚚 Fast Shipping'],
      jewel: ['💎 Hallmark 22K Gold', '💍 Certified Diamonds', '👑 Royal Bridal Sets', '✨ 0% Making Charges', '📜 Gold Savings Plan'],
      trade: ['🔧 Emergency Repair', '⚡ Same-Day Arrival', '🛡️ Licensed & Insured', '🏷️ 20% Off Service', '⭐ 5-Star Reviews'],
    };

    const domainKey =
      industry.toLowerCase().includes('app') || industry.toLowerCase().includes('track') || industry.toLowerCase().includes('soft')
        ? 'app'
        : industry.toLowerCase().includes('sweet') || industry.toLowerCase().includes('mithai') || industry.toLowerCase().includes('bakery')
        ? 'sweet'
        : industry.toLowerCase().includes('cloth') || industry.toLowerCase().includes('fashion') || industry.toLowerCase().includes('saree')
        ? 'cloth'
        : industry.toLowerCase().includes('jewel') || industry.toLowerCase().includes('gold')
        ? 'jewel'
        : 'trade';

    const websiteTags = Array.from(new Set([...extractedData.tags, ...fallbackTags[domainKey]])).slice(0, 6);

    const location =
      (gbpMeta.address ? gbpMeta.address.split(',').slice(-3).join(',').trim() : null) ||
      tenant?.brandProfile?.location ||
      tenant?.city ||
      'Local area';

    const services = parseJsonArray(tenant?.brandProfile?.services);
    const products = parseJsonArray(tenant?.brandProfile?.products);
    const allOfferings = Array.from(new Set([...services, ...products, ...extractedData.tags]));
    const uspsOverride = tenant?.brandProfile?.usps || undefined;
    const offerOverride = tenant?.brandProfile?.currentOffers || undefined;

    const capabilities = resolveCapabilities(
      businessName,
      industry,
      location,
      website,
      uspsOverride,
      offerOverride,
      allOfferings
    );

    if (refresh) {
      try {
        const aiPrompt = `
Generate 5 distinct, high-converting social media marketing prompt suggestions for this business:
Business: ${businessName}
Industry / Niche: ${industry}
Location: ${location}
Website: ${website}
Discovered Website Features: ${websiteTags.join(', ')}
Products/Services: ${allOfferings.length > 0 ? allOfferings.join(', ') : `${capabilities.heroService}, ${capabilities.secondService}`}
USPs: ${capabilities.usps}
Current Offer: ${capabilities.currentOffers}

IMPORTANT:
- Make suggestions specifically tailored to ${industry} (e.g. if custom mobile app, employee tracking, mention real-time GPS tracking, attendance punch, route playback, manager dashboard; if sweets shop, mention fresh mithai, kaju katli, gulab jamun, gift hampers; if clothing, mention sarees, bridal wear, festive collection; if jewellery, mention hallmark gold, diamond rings; if trade, mention doorstep repairs).
- DO NOT suggest boiler repair or plumbing unless the business is explicitly a plumbing/HVAC company.

Return a STRICT JSON array of 5 objects with keys:
id (string), category ("service" | "offer" | "review" | "ai_assistant" | "urgency"), chipLabel (short title with emoji, under 28 chars), badge (short uppercase tag), prompt (detailed 1-3 sentence instruction), headline (catchy 3-6 word graphic headline), aspectRatio ("4:5").
`;
        const aiRes = await callAI({
          messages: [{ role: 'user', content: aiPrompt }],
          temperature: 0.85,
        });
        const clean = aiRes.content.replace(/```json/gi, '').replace(/```/gi, '').trim();
        const start = clean.indexOf('[');
        const end = clean.lastIndexOf(']');
        if (start !== -1 && end > start) {
          const parsed = JSON.parse(clean.slice(start, end + 1));
          if (Array.isArray(parsed) && parsed.length >= 3) {
            return NextResponse.json({
              businessName,
              industry,
              website,
              websiteTags,
              location,
              suggestions: parsed.slice(0, 5).map((p: any) => normalizeSuggestion(p)),
            });
          }
        }
      } catch (aiErr) {
        console.warn('AI suggestions call failed, serving fresh rotated suggestions:', aiErr instanceof Error ? aiErr.message : aiErr);
      }

      // Fresh rotated suggestions guaranteed on refresh
      const rotated = getRotatedSuggestions(capabilities, businessName, location, website, industry);
      return NextResponse.json({
        businessName,
        industry,
        website,
        websiteTags,
        location,
        suggestions: rotated.map((b) => normalizeSuggestion(b)),
      });
    }

    return NextResponse.json({
      businessName,
      industry,
      website,
      websiteTags,
      location,
      suggestions: capabilities.baseline.map((b) => normalizeSuggestion(b)),
    });
  } catch (err: unknown) {
    console.error('[/api/social/prompts/suggestions]', err);
    return NextResponse.json(
      { error: 'Failed to load prompt suggestions' },
      { status: 500 }
    );
  }
}
