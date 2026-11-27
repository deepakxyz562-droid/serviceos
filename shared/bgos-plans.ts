export const BGOS_PLANS = {
  free: { name: 'Free', priceInr: 0, contacts: 100, forms: 1, leadCredits: 0, features: ['Digital business card & QR', 'One hosted intake form', '100 contacts'] },
  starter: { name: 'Starter', priceInr: 499, contacts: 1000, forms: null, leadCredits: 0, features: ['AI chatbot & shared inbox', 'Unlimited forms & appointment booking', 'GBP posts, SEO audit & 3×3 grid', '200 AI studio images/month · 1,000 contacts'] },
  growth: { name: 'Growth', priceInr: 1499, contacts: 10000, forms: null, leadCredits: 0, features: ['Everything in Starter', '1-Tap WhatsApp Business reviews & chat', 'AI review autopilot & quiet-chat nudges', '600 AI studio images/month · 10,000 contacts'] },
  business: { name: 'Business', priceInr: 3999, contacts: 100000, forms: null, leadCredits: 2500, features: ['Everything in Growth', 'WhatsApp Repeat Campaigns & 60d comeback blasts', '5×5 Live Geo-Grid rank tracker', 'Team management (up to 25 seats)', '2,000 AI studio images/month · 100,000 contacts'] },
} as const;
export type BgosPlan = keyof typeof BGOS_PLANS;
export function isBgosPlan(value: string): value is BgosPlan { return Object.hasOwn(BGOS_PLANS, value); }
