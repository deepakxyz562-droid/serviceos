/**
 * AI Receptionist Plan Catalog & Configurations
 * =============================================
 *
 * Single source of truth for the 3 AI Receptionist commercial tiers.
 * Reused by:
 *   - Usage & Billing UI (`usage-billing-tab.tsx`)
 *   - Onboarding Wizard (`ai-receptionist-onboarding.tsx`)
 *   - Database Seed (`seed-addon-catalog.ts`)
 *   - Checkout and Entitlement Controllers
 */

export interface AiReceptionistPlanConfig {
  code: string;
  key: 'starter' | 'pro' | 'business';
  name: string;
  price: number;
  currency: string;
  billingCycle: 'monthly';
  minutes: number;
  includedSeconds: number;
  phoneNumbers: number;
  concurrentCalls: number;
  highlighted?: boolean;
  badge?: string;
  tagline: string;
  description: string;
  features: string[];
  sortOrder: number;
}

export const AI_RECEPTIONIST_PLANS: AiReceptionistPlanConfig[] = [
  {
    code: 'AI_RECEPTIONIST_STARTER',
    key: 'starter',
    name: 'Starter',
    price: 29,
    currency: 'USD',
    billingCycle: 'monthly',
    minutes: 150,
    includedSeconds: 9000, // 150 min × 60
    phoneNumbers: 1,
    concurrentCalls: 1,
    tagline: 'Ideal for solo operators & small businesses',
    description: '150 AI voice minutes per month. 1 concurrent call. 1 phone number included.',
    features: [
      '150 AI receptionist minutes',
      '1 dedicated phone number',
      '1 concurrent call',
      '24/7 autonomous call answering',
      'Lead capture & appointment booking',
      'CRM contact & job synchronization',
    ],
    sortOrder: 1,
  },
  {
    code: 'AI_RECEPTIONIST_PRO',
    key: 'pro',
    name: 'Pro',
    price: 59,
    currency: 'USD',
    billingCycle: 'monthly',
    minutes: 400,
    includedSeconds: 24000, // 400 min × 60
    phoneNumbers: 1,
    concurrentCalls: 3,
    highlighted: true,
    badge: 'Most Popular',
    tagline: 'Perfect for growing service teams',
    description: '400 AI voice minutes per month. 3 concurrent calls. 1 phone number included.',
    features: [
      '400 AI receptionist minutes',
      '1 dedicated phone number',
      'Up to 3 concurrent calls',
      'All Starter features included',
      'Custom voice persona & tone tuning',
      'Warm live-transfer to human staff',
      'Priority call handling during peak hours',
    ],
    sortOrder: 2,
  },
  {
    code: 'AI_RECEPTIONIST_BUSINESS',
    key: 'business',
    name: 'Business',
    price: 129,
    currency: 'USD',
    billingCycle: 'monthly',
    minutes: 1000,
    includedSeconds: 60000, // 1,000 min × 60
    phoneNumbers: 1,
    concurrentCalls: 10,
    tagline: 'For high-volume inbound call operations',
    description: '1,000 AI voice minutes per month. 10 concurrent calls. 1 phone number included.',
    features: [
      '1,000 AI receptionist minutes',
      '1 dedicated phone number',
      'Up to 10 concurrent calls',
      'All Pro features included',
      'Multi-department call routing',
      'Advanced scheduling & conflict resolution',
      'Dedicated enterprise SLA & onboarding',
    ],
    sortOrder: 3,
  },
];

export function getAiReceptionistPlanByCode(code?: string | null): AiReceptionistPlanConfig | undefined {
  if (!code) return undefined;
  const normalized = code.trim().toUpperCase();
  return AI_RECEPTIONIST_PLANS.find((p) => p.code.toUpperCase() === normalized);
}

export function getAiReceptionistPlanByKey(key?: string | null): AiReceptionistPlanConfig | undefined {
  if (!key) return undefined;
  const normalized = key.trim().toLowerCase();
  return AI_RECEPTIONIST_PLANS.find((p) => p.key === normalized);
}
