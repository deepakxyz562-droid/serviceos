export const BGOS_PLANS = {
  free: { name: 'Free', priceInr: 0, contacts: 100, forms: 1, leadCredits: 0, features: ['Digital business card & QR', 'One hosted intake form', '100 contacts'] },
  starter: { name: 'Starter', priceInr: 499, contacts: 1000, forms: null, leadCredits: 0, features: ['Unlimited forms', 'AI chatbot & shared inbox', 'Appointment scheduling', '1,000 contacts'] },
  growth: { name: 'Growth', priceInr: 1499, contacts: 10000, forms: null, leadCredits: 0, features: ['Everything in Starter', 'Email outreach & approvals', 'Review requests', 'Workflow automations', '10,000 contacts'] },
  business: { name: 'Business', priceInr: 3999, contacts: 100000, forms: null, leadCredits: 2500, features: ['Everything in Growth', 'B2B lead intelligence', '2,500 monthly lead search credits', 'Team collaboration', 'Growth analytics'] },
} as const;
export type BgosPlan = keyof typeof BGOS_PLANS;
export function isBgosPlan(value: string): value is BgosPlan { return Object.hasOwn(BGOS_PLANS, value); }
