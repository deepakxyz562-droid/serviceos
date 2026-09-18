/**
 * Template Tags — free-text descriptors for search.
 *
 * Unlike categories/industries/use-cases (which are curated unions), tags
 * are open-ended strings. They help with long-tail search queries like
 * "hipaa compliant" or "multi-step".
 *
 * This file ships a curated starter set. Community templates (Release 5)
 * can add arbitrary tags at submission time.
 */

export const TEMPLATE_TAGS: string[] = [
  // Compliance / legal
  'hipaa', 'gdpr', 'pci', 'ccpa',
  // Form structure
  'multi-step', 'single-page', 'conversational', 'conditional-logic',
  // Payment
  'payment-required', 'free', 'donation', 'subscription', 'deposit',
  // Integrations
  'stripe', 'paypal', 'razorpay', 'slack', 'zapier', 'webhook',
  // Industry-specific
  'appointment', 'consultation', 'estimate', 'inspection', 'audit',
  'booking', 'reservation', 'signup', 'application',
  // Audience qualifiers
  'mobile-friendly', 'embeddable', 'white-label',
  // Content type
  'file-upload', 'e-signature', 'payment-field', 'calculator', 'rating',
  'survey', 'quiz', 'poll', 'checklist', 'report',
  // Region / language
  'english', 'spanish', 'french', 'german', 'hindi', 'arabic',
  // Popularity badges (set dynamically, not in templates)
  // 'trending', 'featured', 'new', 'popular'
];

/** Check if a tag is in the curated set. */
export function isKnownTag(tag: string): boolean {
  return TEMPLATE_TAGS.includes(tag.toLowerCase());
}

/** Normalize a tag string (lowercase, trim, replace spaces with hyphens). */
export function normalizeTag(tag: string): string {
  return tag.toLowerCase().trim().replace(/\s+/g, '-');
}
