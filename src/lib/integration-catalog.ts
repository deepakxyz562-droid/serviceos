/**
 * Integration Hub Catalog — shared default definitions.
 *
 * Used by:
 *  - /api/superadmin/integrations  (global enable/disable of categories + integrations)
 *  - /api/integrations/catalog      (tenant-facing list of available integrations)
 *  - integrations-view.tsx          (frontend fallback + icon mapping)
 *
 * The "live" catalog is stored in the first tenant's settingsJson under the
 * `integrationCatalog` key (mirrors the menu-items pattern). These defaults
 * are used to seed it on first access.
 */

export interface IntegrationCategoryDef {
  key: string;
  label: string;
  description: string;
  icon: string; // lucide icon name
  color: string; // tailwind color stem (emerald, amber, sky, ...)
  sortOrder: number;
  enabled: boolean;
}

export interface IntegrationDef {
  key: string; // unique slug: meta-ads, google-ads, shopify ...
  name: string;
  description: string;
  category: string; // category key
  icon: string; // lucide icon name
  color: string; // tailwind color stem
  provider: string; // meta, google, shopify, stripe, ...
  enabled: boolean;
  featured: boolean;
  sortOrder: number;
  /** detail view type rendered by the hub: 'meta-ads' | 'google-ads' | 'generic' */
  detailType: 'meta-ads' | 'google-ads' | 'generic';
}

export const DEFAULT_CATEGORIES: IntegrationCategoryDef[] = [
  { key: 'ecommerce', label: 'Ecommerce', description: 'Online stores, marketplaces & order sync', icon: 'ShoppingBag', color: 'emerald', sortOrder: 0, enabled: true },
  { key: 'marketing', label: 'Marketing', description: 'Ad platforms & lead generation', icon: 'Megaphone', color: 'amber', sortOrder: 1, enabled: true },
  { key: 'communication', label: 'Communication', description: 'Messaging, email & voice providers', icon: 'MessageSquare', color: 'sky', sortOrder: 2, enabled: true },
  { key: 'accounting', label: 'Accounting', description: 'Books, invoices & tax software', icon: 'Calculator', color: 'teal', sortOrder: 3, enabled: true },
  { key: 'payments', label: 'Payments', description: 'Payment gateways & checkout', icon: 'CreditCard', color: 'violet', sortOrder: 4, enabled: true },
  { key: 'productivity', label: 'Productivity', description: 'Docs, tasks & collaboration', icon: 'Briefcase', color: 'rose', sortOrder: 5, enabled: true },
];

export const DEFAULT_INTEGRATIONS: IntegrationDef[] = [
  // ── Ecommerce ──────────────────────────────────────────
  { key: 'shopify', name: 'Shopify', description: 'Sync orders, products & customers from your Shopify store', category: 'ecommerce', icon: 'ShoppingCart', color: 'emerald', provider: 'shopify', enabled: true, featured: true, sortOrder: 0, detailType: 'generic' },
  { key: 'woocommerce', name: 'WooCommerce', description: 'Connect your WooCommerce store for order & customer sync', category: 'ecommerce', icon: 'Store', color: 'emerald', provider: 'woocommerce', enabled: true, featured: false, sortOrder: 1, detailType: 'generic' },
  { key: 'amazon', name: 'Amazon Seller', description: 'Pull orders and buyer messages from Amazon Seller Central', category: 'ecommerce', icon: 'Package', color: 'emerald', provider: 'amazon', enabled: false, featured: false, sortOrder: 2, detailType: 'generic' },
  // ── Marketing ──────────────────────────────────────────
  { key: 'meta-ads', name: 'Meta Business Platform', description: 'Capture Facebook & Instagram lead-form submissions in real time', category: 'marketing', icon: 'Facebook', color: 'amber', provider: 'meta', enabled: true, featured: true, sortOrder: 0, detailType: 'meta-ads' },
  { key: 'google-ads', name: 'Google Ads', description: 'Capture leads from Google Ads lead-form extensions automatically', category: 'marketing', icon: 'Search', color: 'amber', provider: 'google', enabled: true, featured: true, sortOrder: 1, detailType: 'google-ads' },
  { key: 'linkedin-ads', name: 'LinkedIn Ads', description: 'Capture leads from LinkedIn Lead Gen Forms', category: 'marketing', icon: 'Linkedin', color: 'amber', provider: 'linkedin', enabled: false, featured: false, sortOrder: 2, detailType: 'generic' },
  { key: 'tiktok-ads', name: 'TikTok Ads', description: 'Capture leads from TikTok Lead Generation forms', category: 'marketing', icon: 'Music', color: 'amber', provider: 'tiktok', enabled: false, featured: false, sortOrder: 3, detailType: 'generic' },
  // ── Communication ──────────────────────────────────────
  { key: 'twilio', name: 'Twilio', description: 'Send SMS & voice messages via Twilio', category: 'communication', icon: 'Phone', color: 'sky', provider: 'twilio', enabled: true, featured: false, sortOrder: 0, detailType: 'generic' },
  { key: 'sendgrid', name: 'SendGrid', description: 'Transactional & marketing email via SendGrid', category: 'communication', icon: 'Mail', color: 'sky', provider: 'sendgrid', enabled: true, featured: false, sortOrder: 1, detailType: 'generic' },
  { key: 'whatsapp-cloud', name: 'WhatsApp Cloud API', description: 'Official WhatsApp Business Cloud API messaging', category: 'communication', icon: 'MessageCircle', color: 'sky', provider: 'whatsapp', enabled: true, featured: true, sortOrder: 2, detailType: 'generic' },
  // ── Accounting ─────────────────────────────────────────
  { key: 'quickbooks', name: 'QuickBooks', description: 'Sync invoices & payments with QuickBooks Online', category: 'accounting', icon: 'BookOpen', color: 'teal', provider: 'quickbooks', enabled: true, featured: false, sortOrder: 0, detailType: 'generic' },
  { key: 'xero', name: 'Xero', description: 'Sync invoices & contacts with Xero', category: 'accounting', icon: 'FileSpreadsheet', color: 'teal', provider: 'xero', enabled: false, featured: false, sortOrder: 1, detailType: 'generic' },
  { key: 'zoho-books', name: 'Zoho Books', description: 'Connect Zoho Books for invoicing sync', category: 'accounting', icon: 'BookMarked', color: 'teal', provider: 'zoho', enabled: false, featured: false, sortOrder: 2, detailType: 'generic' },
  // ── Payments ───────────────────────────────────────────
  { key: 'stripe', name: 'Stripe', description: 'Accept payments & manage subscriptions via Stripe', category: 'payments', icon: 'CreditCard', color: 'violet', provider: 'stripe', enabled: true, featured: true, sortOrder: 0, detailType: 'generic' },
  { key: 'paypal', name: 'PayPal', description: 'Accept PayPal payments & subscriptions', category: 'payments', icon: 'Wallet', color: 'violet', provider: 'paypal', enabled: true, featured: false, sortOrder: 1, detailType: 'generic' },
  { key: 'razorpay', name: 'Razorpay', description: 'Accept payments via Razorpay (cards, UPI, netbanking)', category: 'payments', icon: 'Banknote', color: 'violet', provider: 'razorpay', enabled: false, featured: false, sortOrder: 2, detailType: 'generic' },
  // ── Productivity ───────────────────────────────────────
  { key: 'google-workspace', name: 'Google Workspace', description: 'Sync calendar, contacts & drive with Google Workspace', category: 'productivity', icon: 'Calendar', color: 'rose', provider: 'google-workspace', enabled: true, featured: true, sortOrder: 0, detailType: 'generic' },
  { key: 'slack', name: 'Slack', description: 'Send notifications & alerts to Slack channels', category: 'productivity', icon: 'Hash', color: 'rose', provider: 'slack', enabled: true, featured: false, sortOrder: 1, detailType: 'generic' },
  { key: 'notion', name: 'Notion', description: 'Sync notes & databases with Notion', category: 'productivity', icon: 'FileText', color: 'rose', provider: 'notion', enabled: false, featured: false, sortOrder: 2, detailType: 'generic' },
  { key: 'zoom', name: 'Zoom', description: 'Create meetings & sync recordings with Zoom', category: 'productivity', icon: 'Video', color: 'rose', provider: 'zoom', enabled: false, featured: false, sortOrder: 3, detailType: 'generic' },
];

export const INTEGRATION_CATALOG_CONFIG_KEY = 'integrationCatalog';

export interface IntegrationCatalogConfig {
  categories: IntegrationCategoryDef[];
  integrations: IntegrationDef[];
}

export function getDefaultCatalog(): IntegrationCatalogConfig {
  return {
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    integrations: DEFAULT_INTEGRATIONS.map((i) => ({ ...i })),
  };
}
