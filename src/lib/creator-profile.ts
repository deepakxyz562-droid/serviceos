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
  currency: 'INR' | 'USD' | 'EUR';
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
}

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

  return {
    isEnabled: false, // Strictly opt-in: not published automatically
    handle: tenant.slug || 'creator',
    displayName: businessName,
    headline: tenant.industry ? `${tenant.industry} Specialist & Consultant` : 'Professional Services & Consulting',
    bio: `Welcome to ${businessName}'s public booking and services page. Explore 1:1 sessions, consultations, and digital resources below.`,
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
    offers: [
      {
        id: 'off_consult_30',
        title: '1:1 Strategy & Consultation',
        slug: 'consultation-30min',
        type: 'one_on_one',
        description: '30-minute high-impact video consultation. Deep dive into your roadmap, architecture, or growth strategy with direct feedback.',
        price: isINR ? 999 : 49,
        currency: effectiveCurrency,
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
        title: 'Ask Me Anything (Priority Response)',
        slug: 'ask-a-question',
        type: 'ask_question',
        description: 'Submit your specific technical or business question and receive a detailed, personalized written and audio response within 24 hours.',
        price: isINR ? 199 : 19,
        currency: effectiveCurrency,
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
        price: isINR ? 499 : 29,
        currency: effectiveCurrency,
        downloadUrl: 'https://assets.serviceos.com/templates/saas-launch-playbook.pdf',
        fileSize: '6.4 MB Guide & Checklist',
        badge: 'INSTANT DOWNLOAD',
        features: ['Production Architecture Checklist', 'Tech Stack Selection Matrix', 'Lifetime updates'],
        isActive: true,
        order: 4,
      },
    ],
  };
}
