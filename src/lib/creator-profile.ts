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
  handle: string; // e.g. "deepak"
  displayName: string;
  headline: string;
  bio: string;
  location?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  themeColor: string; // Hex color e.g. "#2563EB"
  verified: boolean;
  rating: number; // e.g. 4.9
  reviewCount: number; // e.g. 128
  sessionsCompleted: number; // e.g. 150
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
    price: 999,
    currency: 'INR',
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
    currency: 'INR',
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
    price: 199,
    currency: 'INR',
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
    price: 499,
    currency: 'INR',
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
  return {
    handle: tenant.slug || 'creator',
    displayName: tenant.name || 'Deepak Chandra',
    headline: 'SaaS Architect, AI Engineer & Founder',
    bio: 'Helping founders, creators, and engineers build, launch, and monetize high-converting AI-powered products. Ex-Google, 10+ years engineering & product experience.',
    location: 'Bangalore, India',
    avatarUrl: tenant.logo || '',
    themeColor: '#2563EB',
    verified: true,
    rating: 4.9,
    reviewCount: 86,
    sessionsCompleted: 142,
    socialLinks: {
      twitter: 'https://x.com',
      linkedin: 'https://linkedin.com',
      github: 'https://github.com',
      website: `https://${tenant.slug}.fieseros.com`,
    },
    aiAgentEnabled: true,
    aiWelcomeMessage: 'Hi! I am Deepak’s AI Assistant. Ask me anything about his services, availability, or how he can help your project.',
    offers: DEFAULT_OFFERS.map((o) => ({
      ...o,
      currency: (tenant.currency as any) || 'INR',
    })),
  };
}
