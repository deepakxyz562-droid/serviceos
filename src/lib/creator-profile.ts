/**
 * Creator Profile & Offers Types and Utility Functions
 * Powers the Topmate-style public creator page (/@username or /p/[username])
 * and the unified Offers & Monetization engine.
 */

export interface CreatorOffer {
  id: string;
  title: string;
  slug: string;
  type: 'one_on_one' | 'consultation' | 'ask_question' | 'digital_product' | 'package';
  description: string;
  price: number; // In base units (e.g. 999 for ₹999, 29 for $29)
  currency: 'INR' | 'USD' | 'EUR' | string;
  durationMinutes?: number; // For 1:1 calls (15, 30, 45, 60)
  eventSlug?: string; // Connected event type slug in slot engine (e.g. '30min')
  downloadUrl?: string; // For digital products
  fileSize?: string; // e.g. '4.2 MB PDF'
  turnaroundHours?: number; // For 'ask_question' (e.g. 24 hours)
  badge?: string; // 'POPULAR', 'RECOMMENDED', 'FREE'
  features?: string[]; // Bullet points
  isActive: boolean;
  order: number;
}

export interface WebsiteSection {
  id: string;
  title: string;
  icon: string;
  enabled: boolean;
}

export interface HeroConfig {
  headline: string;
  subheadline: string;
  primaryButtonText: string;
  primaryButtonLink: string;
  secondaryButtonText: string;
  secondaryButtonLink: string;
  backgroundImage?: string;
  overlayStyle?: 'glass' | 'clean' | 'gradient';
  keyFeatures?: Array<{
    id: string;
    icon: string;
    title: string;
    subtitle: string;
  }>;
}

export type PortfolioMediaType = 'youtube' | 'instagram' | 'image' | 'vimeo' | 'link';

export interface PortfolioMediaItem {
  id: string;
  type: PortfolioMediaType;
  title: string;
  caption?: string;
  url: string;
  embedId?: string;
  embedUrl?: string;
  thumbnailUrl?: string;
  category?: string;     // e.g. "Acting Showreel", "Monologue", "Fashion Shoot", "Commercial", "Wedding", "Headshot"
  featured?: boolean;    // Pinned to hero / top showreel player
  isShortOrReel?: boolean;
  order: number;
}

export interface CreativeCastingSpecs {
  profession?: 'actor' | 'photographer' | 'videographer' | 'model' | 'voice_artist' | 'creator' | 'performer' | 'other';
  height?: string;         // e.g. "5'10\"" or "178 cm"
  playingAgeRange?: string; // e.g. "24 - 34"
  eyeColor?: string;       // e.g. "Brown", "Hazel", "Blue"
  hairColor?: string;      // e.g. "Black", "Dark Brown"
  languages?: string[];    // e.g. ["English", "Hindi", "Punjabi"]
  unionStatus?: string;    // e.g. "SAG-AFTRA", "Non-Union", "Equity"
  agencyName?: string;     // e.g. "Elite Artists", "Independent"
  agentEmail?: string;
  agentPhone?: string;
  imdbUrl?: string;
  equipment?: string[];    // e.g. ["Sony FX3", "Canon EOS R5", "DJI Ronin"]
}

export interface CreatorProfileData {
  isEnabled: boolean; // Strictly opt-in: profile is only publicly published when true
  handle: string; // e.g. "mybusiness"
  displayName: string;
  headline: string;
  bio: string;
  location?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  themeColor: string; // Hex color e.g. "#2563EB"
  verified: boolean;
  rating: number; // e.g. 5.0
  reviewCount: number; // e.g. 0
  sessionsCompleted: number; // e.g. 0
  socialLinks: {
    twitter?: string;
    linkedin?: string;
    youtube?: string;
    instagram?: string;
    github?: string;
    website?: string;
  };
  aiAgentEnabled: boolean;
  aiWelcomeMessage?: string;
  offers: CreatorOffer[];
  portfolioMedia?: PortfolioMediaItem[];
  creativeSpecs?: CreativeCastingSpecs;
  pageTitle?: string;
  metaDescription?: string;
  publishedStatus?: 'published' | 'draft' | 'archived';
  websiteSections?: WebsiteSection[];
  heroConfig?: HeroConfig;
}

export const DEFAULT_WEBSITE_SECTIONS: WebsiteSection[] = [
  { id: 'header', title: 'Header & Navigation', icon: 'Home', enabled: true },
  { id: 'hero', title: 'Hero Banner', icon: 'Sparkles', enabled: true },
  { id: 'services', title: 'Services', icon: 'Briefcase', enabled: true },
  { id: 'about', title: 'About Us', icon: 'Building2', enabled: true },
  { id: 'why_us', title: 'Why Choose Us', icon: 'ShieldCheck', enabled: true },
  { id: 'testimonials', title: 'Testimonials', icon: 'Star', enabled: true },
  { id: 'gallery', title: 'Gallery', icon: 'Images', enabled: true },
  { id: 'contact', title: 'Contact & Map', icon: 'MapPin', enabled: true },
  { id: 'faq', title: 'FAQ', icon: 'HelpCircle', enabled: false },
  { id: 'ai_assistant', title: 'AI Assistant', icon: 'Bot', enabled: true },
];

export const DEFAULT_HERO_CONFIG: HeroConfig = {
  headline: 'A cleaner home. A brighter you.',
  subheadline: 'Professional home and office cleaning services in Tucson. Trusted, affordable and hassle-free.',
  primaryButtonText: 'Book a Cleaning',
  primaryButtonLink: 'Booking Page',
  secondaryButtonText: 'Get a Free Quote',
  secondaryButtonLink: 'Contact Form',
  backgroundImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80',
  overlayStyle: 'glass',
  keyFeatures: [
    { id: 'feat_1', icon: 'ShieldCheck', title: 'Trusted & Verified', subtitle: 'Background-checked professionals' },
    { id: 'feat_2', icon: 'Clock', title: 'Flexible Scheduling', subtitle: 'Book at your convenience' },
    { id: 'feat_3', icon: 'ThumbsUp', title: '100% Satisfaction', subtitle: 'We guarantee quality service' },
  ],
};

export const DEFAULT_OFFERS: CreatorOffer[] = [
  {
    id: 'off_consult_30',
    title: '1:1 Strategy & Consultation',
    slug: 'consultation-30min',
    type: 'one_on_one',
    description: '30-minute high-impact video consultation. Deep dive into your roadmap, architecture, or growth strategy with direct feedback.',
    price: 49,
    currency: 'USD',
    durationMinutes: 30,
    eventSlug: '30min',
    badge: 'MOST POPULAR',
    features: ['30 Min Google Meet', 'Actionable Roadmap Notes', 'Follow-up Q&A on chat'],
    isActive: true,
    order: 1,
  },
  {
    id: 'off_quick_15',
    title: '15-Min Quick Connect',
    slug: 'quick-connect-15min',
    type: 'one_on_one',
    description: 'Brief 15-minute introductory discovery session. Ideal for quick questions, fit evaluation, or exploring collaborations.',
    price: 0,
    currency: 'USD',
    durationMinutes: 15,
    eventSlug: '15min',
    badge: 'FREE',
    features: ['15 Min Video Call', 'Quick Advice & Guidance'],
    isActive: true,
    order: 2,
  },
  {
    id: 'off_ask_question',
    title: 'Ask Me Anything (Priority Response)',
    slug: 'ask-a-question',
    type: 'ask_question',
    description: 'Submit your specific technical or business question and receive a detailed, personalized written and audio response within 24 hours.',
    price: 19,
    currency: 'USD',
    turnaroundHours: 24,
    badge: 'FAST RESPONSE',
    features: ['Guaranteed reply in 24h', 'In-depth review of your problem', 'Actionable references'],
    isActive: true,
    order: 3,
  },
  {
    id: 'off_digital_template',
    title: 'SaaS Launch & Architecture Playbook',
    slug: 'saas-playbook-template',
    type: 'digital_product',
    description: 'Comprehensive Notion templates, architecture checklists, and production deployment guide used to scale SaaS applications.',
    price: 29,
    currency: 'USD',
    downloadUrl: 'https://assets.serviceos.com/templates/saas-launch-playbook.pdf',
    fileSize: '6.4 MB Guide & Checklist',
    badge: 'INSTANT DOWNLOAD',
    features: ['Production Architecture Checklist', 'Tech Stack Selection Matrix', 'Lifetime updates'],
    isActive: true,
    order: 4,
  },
];

export function buildDefaultCreatorProfile(tenant: {
  id: string;
  name: string;
  slug: string;
  industry?: string | null;
  logo?: string | null;
  currency?: string | null;
}): CreatorProfileData {
  const businessName = tenant.name || 'Creator';
  const effectiveCurrency = (tenant.currency || 'USD').toUpperCase();
  const isINR = effectiveCurrency === 'INR';
  const isCreative = /actor|photographer|videographer|creative|model|artist|performer|voice/i.test(tenant.industry || '');

  const defaultMedia: PortfolioMediaItem[] = isCreative
    ? [
        {
          id: 'media_showreel',
          type: 'youtube',
          title: 'Official Cinematic Showreel',
          caption: 'High-definition performance, monologue, and cinematography highlights.',
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          embedId: 'dQw4w9WgXcQ',
          embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1',
          thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
          category: 'Showreel',
          featured: true,
          order: 1,
        },
        {
          id: 'media_reel_1',
          type: 'instagram',
          title: 'On-Set BTS & Commercial Reel',
          caption: 'Behind-the-scenes look at the commercial shoot and lighting setup.',
          url: 'https://www.instagram.com/reel/C8qL1234567/',
          embedId: 'C8qL1234567',
          embedUrl: 'https://www.instagram.com/p/C8qL1234567/embed/captioned/',
          category: 'Behind The Scenes',
          isShortOrReel: true,
          order: 2,
        },
        {
          id: 'media_photo_1',
          type: 'image',
          title: 'Editorial Portrait & Headshot (3 Looks)',
          caption: 'Natural-light character study and studio headshots.',
          url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
          thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
          category: 'Headshots & Portraits',
          order: 3,
        },
      ]
    : [];

  const defaultCreativeSpecs: CreativeCastingSpecs = {
    profession: /actor/i.test(tenant.industry || '')
      ? 'actor'
      : /photographer/i.test(tenant.industry || '')
      ? 'photographer'
      : /model/i.test(tenant.industry || '')
      ? 'model'
      : isCreative
      ? 'creator'
      : undefined,
    languages: isCreative ? ['English', 'Hindi'] : undefined,
    playingAgeRange: isCreative ? '22 - 32' : undefined,
    height: isCreative ? `5'10" (178 cm)` : undefined,
  };

  return {
    isEnabled: false, // Strictly opt-in: not published automatically
    handle: tenant.slug || 'creator',
    displayName: businessName,
    headline: isCreative
      ? (tenant.industry ? `${tenant.industry} & Visual Artist` : 'Actor, Photographer & Visual Artist')
      : (tenant.industry ? `${tenant.industry} Specialist & Consultant` : 'Professional Services & Consulting'),
    bio: isCreative
      ? `Welcome to ${businessName}'s official portfolio and booking page. Explore my showreel, photography works, video reels, and shoot packages below.`
      : `Welcome to ${businessName}'s public booking and services page. Explore 1:1 sessions, consultations, and digital resources below.`,
    location: '',
    avatarUrl: tenant.logo || '',
    themeColor: '#2563EB',
    verified: false,
    rating: 5.0,
    reviewCount: 0,
    sessionsCompleted: 0,
    socialLinks: {
      website: tenant.slug ? `https://${tenant.slug}.fieseros.com` : '',
    },
    aiAgentEnabled: true,
    aiWelcomeMessage: `Hi! I am ${businessName}’s AI Assistant. Ask me anything about our services, availability, or how we can help you.`,
    portfolioMedia: defaultMedia,
    creativeSpecs: defaultCreativeSpecs,
    offers: [
      {
        id: 'off_consult_30',
        title: isCreative ? 'Casting / Project Consultation (30 Min)' : '1:1 Strategy & Consultation',
        slug: 'consultation-30min',
        type: 'one_on_one',
        description: isCreative
          ? '30-minute creative consultation to discuss your script, shoot requirements, character vision, or casting fit.'
          : '30-minute high-impact video consultation. Deep dive into your roadmap, architecture, or growth strategy with direct feedback.',
        price: isINR ? 999 : 49,
        currency: effectiveCurrency,
        durationMinutes: 30,
        eventSlug: '30min',
        badge: 'MOST POPULAR',
        features: ['30 Min Google Meet', 'Script & Vision Review', 'Follow-up Notes'],
        isActive: true,
        order: 1,
      },
      {
        id: 'off_quick_15',
        title: '15-Min Quick Connect',
        slug: 'quick-connect-15min',
        type: 'one_on_one',
        description: 'Brief 15-minute introductory discovery session. Ideal for quick questions, fit evaluation, or exploring collaborations.',
        price: 0,
        currency: effectiveCurrency,
        durationMinutes: 15,
        eventSlug: '15min',
        badge: 'FREE',
        features: ['15 Min Video Call', 'Quick Advice & Guidance'],
        isActive: true,
        order: 2,
      },
      {
        id: 'off_ask_question',
        title: isCreative ? 'Script / Monologue Video Review' : 'Ask Me Anything (Priority Response)',
        slug: 'ask-a-question',
        type: 'ask_question',
        description: isCreative
          ? 'Submit your monologue video, audition tape, or photography brief for detailed personalized feedback within 24 hours.'
          : 'Submit your specific technical or business question and receive a detailed, personalized written and audio response within 24 hours.',
        price: isINR ? 499 : 29,
        currency: effectiveCurrency,
        turnaroundHours: 24,
        badge: 'FAST RESPONSE',
        features: ['Guaranteed reply in 24h', 'Detailed feedback notes', 'Actionable suggestions'],
        isActive: true,
        order: 3,
      },
      {
        id: 'off_digital_template',
        title: isCreative ? 'Half-Day Shoot / Production Session' : 'SaaS Launch & Architecture Playbook',
        slug: isCreative ? 'half-day-production' : 'saas-playbook-template',
        type: isCreative ? 'package' : 'digital_product',
        description: isCreative
          ? '4 hours on-location or studio production. Includes 3 looks/scenes, color-graded deliverables, and commercial usage rights.'
          : 'Comprehensive Notion templates, architecture checklists, and production deployment guide used to scale SaaS applications.',
        price: isINR ? (isCreative ? 15000 : 499) : (isCreative ? 499 : 29),
        currency: effectiveCurrency,
        downloadUrl: isCreative ? undefined : 'https://assets.serviceos.com/templates/saas-launch-playbook.pdf',
        fileSize: isCreative ? undefined : '6.4 MB Guide & Checklist',
        badge: isCreative ? 'PREMIUM PACKAGE' : 'INSTANT DOWNLOAD',
        features: isCreative
          ? ['4-Hour On-Location/Studio Shoot', '3 Looks / Scenes Covered', 'High-Res Color Graded Deliverables', 'Full Commercial Rights']
          : ['Production Architecture Checklist', 'Tech Stack Selection Matrix', 'Lifetime updates'],
        isActive: true,
        order: 4,
      },
    ],
    pageTitle: `${businessName} | ${isCreative ? 'Creative Portfolio & Showreel' : 'Professional Cleaning & Services'}`,
    metaDescription: `${businessName}'s official portfolio, showreels, media galleries, and service packages. Book sessions and request quotes online.`,
    publishedStatus: 'published',
    websiteSections: DEFAULT_WEBSITE_SECTIONS,
    heroConfig: DEFAULT_HERO_CONFIG,
  };
}
