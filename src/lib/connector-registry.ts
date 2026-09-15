/**
 * Connector Registry — Integrations marketplace schema.
 *
 * Defines the contract for every integration connector:
 * - Authentication method (OAuth, API key, basic, none)
 * - Sync sources (what data the connector can pull)
 * - Available actions (what the connector can push/trigger)
 * - Webhook support
 * - Permissions
 *
 * Each connector is a data declaration, not a class instance. The
 * integration runtime reads these declarations and executes the
 * appropriate OAuth flow / sync job / action dispatch.
 */

export type ConnectorAuthType = 'oauth' | 'api_key' | 'basic' | 'webhook' | 'none';

export type ConnectorCategory =
  | 'knowledge'    // Google Drive, Notion, GitHub, YouTube
  | 'business'      // HubSpot, Salesforce, Zoho, Fieseros
  | 'support'       // Zendesk, Intercom, Crisp, Freshdesk
  | 'communication' // WhatsApp, Slack, Messenger, Google Chat
  | 'automation'    // Zapier, Make, Custom API
  | 'ecommerce';    // Shopify, WooCommerce

export interface ConnectorAction {
  id: string;
  label: string;
  description: string;
  // The action's input schema (JSON Schema format)
  inputSchema?: Record<string, unknown>;
  // Whether this action has side effects (vs read-only)
  hasSideEffects: boolean;
}

export interface ConnectorSyncSource {
  id: string;
  label: string;
  description: string;
  // How often the sync runs by default
  defaultFrequency: 'manual' | 'hourly' | 'daily' | 'weekly';
}

export interface Connector {
  id: string;
  name: string;
  category: ConnectorCategory;
  description: string;
  logo?: string;
  authType: ConnectorAuthType;
  // OAuth config (if authType === 'oauth')
  oauth?: {
    authorizeUrl: string;
    tokenUrl: string;
    scopes: string[];
    // The env var name that holds the client ID/secret
    clientIdEnv?: string;
    clientSecretEnv?: string;
  };
  // Sync sources (what data the connector can pull into Fieseros)
  syncSources: ConnectorSyncSource[];
  // Actions (what the connector can do — triggered by AI or automation)
  actions: ConnectorAction[];
  // Whether the connector is currently implemented (vs planned)
  implemented: boolean;
  // Whether the connector is available for standalone Forms product
  availableForForms: boolean;
  // Whether the connector is available for CRM product
  availableForCrm: boolean;
}

/**
 * The connector registry. Add new connectors here.
 * Implemented connectors have `implemented: true`; planned ones have
 * `implemented: false` so the UI can show "Coming soon" badges.
 */
export const CONNECTOR_REGISTRY: Connector[] = [
  // ── Knowledge sources ──
  {
    id: 'website_crawler',
    name: 'Website Crawler',
    category: 'knowledge',
    description: 'Crawl your website, extract content, and index it into the AI knowledge base for retrieval-augmented generation.',
    authType: 'none',
    syncSources: [
      { id: 'sitemap', label: 'Sitemap pages', description: 'Discover and crawl all pages from your sitemap.xml', defaultFrequency: 'weekly' },
      { id: 'single_url', label: 'Individual URLs', description: 'Crawl specific pages on demand', defaultFrequency: 'manual' },
    ],
    actions: [],
    implemented: true,
    availableForForms: true,
    availableForCrm: true,
  },
  {
    id: 'google_drive',
    name: 'Google Drive',
    category: 'knowledge',
    description: 'Sync documents from Google Drive into your AI knowledge base.',
    authType: 'oauth',
    oauth: {
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      clientIdEnv: 'GOOGLE_DRIVE_CLIENT_ID',
      clientSecretEnv: 'GOOGLE_DRIVE_CLIENT_SECRET',
    },
    syncSources: [
      { id: 'drive_docs', label: 'Documents', description: 'Sync Google Docs, PDFs, and text files', defaultFrequency: 'daily' },
    ],
    actions: [],
    implemented: false,
    availableForForms: true,
    availableForCrm: true,
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'knowledge',
    description: 'Sync Notion pages and databases into your AI knowledge base.',
    authType: 'oauth',
    oauth: {
      authorizeUrl: 'https://api.notion.com/v1/oauth/authorize',
      tokenUrl: 'https://api.notion.com/v1/oauth/token',
      scopes: [],
      clientIdEnv: 'NOTION_CLIENT_ID',
      clientSecretEnv: 'NOTION_CLIENT_SECRET',
    },
    syncSources: [
      { id: 'notion_pages', label: 'Pages', description: 'Sync Notion pages', defaultFrequency: 'daily' },
      { id: 'notion_dbs', label: 'Databases', description: 'Sync Notion databases as structured docs', defaultFrequency: 'daily' },
    ],
    actions: [],
    implemented: false,
    availableForForms: true,
    availableForCrm: true,
  },

  // ── Business ──
  {
    id: 'fieseros_crm',
    name: 'Fieseros CRM',
    category: 'business',
    description: 'Native integration with Fieseros CRM. Create leads, customers, jobs, quotes, and invoices from form submissions.',
    authType: 'none',
    syncSources: [],
    actions: [
      { id: 'create_lead', label: 'Create Lead', description: 'Create a CRM lead from a form submission', hasSideEffects: true },
      { id: 'create_customer', label: 'Create Customer', description: 'Create a CRM customer', hasSideEffects: true },
      { id: 'create_job', label: 'Create Job', description: 'Create a CRM job', hasSideEffects: true },
      { id: 'create_quote', label: 'Create Quote', description: 'Create a CRM quote', hasSideEffects: true },
      { id: 'create_invoice', label: 'Create Invoice', description: 'Create a CRM invoice', hasSideEffects: true },
    ],
    implemented: true,
    availableForForms: true,
    availableForCrm: true,
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'business',
    description: 'Sync contacts, deals, and tickets with HubSpot CRM.',
    authType: 'oauth',
    oauth: {
      authorizeUrl: 'https://app.hubspot.com/oauth/authorize',
      tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
      scopes: ['contacts', 'companies', 'deals'],
      clientIdEnv: 'HUBSPOT_CLIENT_ID',
      clientSecretEnv: 'HUBSPOT_CLIENT_SECRET',
    },
    syncSources: [
      { id: 'hs_contacts', label: 'Contacts', description: 'Sync HubSpot contacts', defaultFrequency: 'hourly' },
      { id: 'hs_deals', label: 'Deals', description: 'Sync HubSpot deals', defaultFrequency: 'hourly' },
    ],
    actions: [
      { id: 'create_contact', label: 'Create Contact', description: 'Create a HubSpot contact', hasSideEffects: true },
      { id: 'create_deal', label: 'Create Deal', description: 'Create a HubSpot deal', hasSideEffects: true },
    ],
    implemented: false,
    availableForForms: true,
    availableForCrm: true,
  },

  // ── Communication ──
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    category: 'communication',
    description: 'Send WhatsApp messages and receive inbound messages via WhatsApp Business API.',
    authType: 'api_key',
    syncSources: [],
    actions: [
      { id: 'send_message', label: 'Send Message', description: 'Send a WhatsApp message', hasSideEffects: true },
      { id: 'send_template', label: 'Send Template', description: 'Send a WhatsApp template message', hasSideEffects: true },
    ],
    implemented: true,
    availableForForms: true,
    availableForCrm: true,
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'communication',
    description: 'Send notifications to Slack channels and sync messages.',
    authType: 'oauth',
    oauth: {
      authorizeUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      scopes: ['chat:write', 'channels:read'],
      clientIdEnv: 'SLACK_CLIENT_ID',
      clientSecretEnv: 'SLACK_CLIENT_SECRET',
    },
    syncSources: [],
    actions: [
      { id: 'send_notification', label: 'Send Notification', description: 'Post a message to a Slack channel', hasSideEffects: true },
    ],
    implemented: false,
    availableForForms: true,
    availableForCrm: true,
  },

  // ── Ecommerce ──
  {
    id: 'shopify',
    name: 'Shopify',
    category: 'ecommerce',
    description: 'Sync products, collections, and orders from Shopify. Embed AI forms on Shopify storefront.',
    authType: 'oauth',
    oauth: {
      authorizeUrl: 'https://{shop}.myshopify.com/admin/oauth/authorize',
      tokenUrl: 'https://{shop}.myshopify.com/admin/oauth/access_token',
      scopes: ['read_products', 'write_products', 'read_orders'],
      clientIdEnv: 'SHOPIFY_CLIENT_ID',
      clientSecretEnv: 'SHOPIFY_CLIENT_SECRET',
    },
    syncSources: [
      { id: 'shopify_products', label: 'Products', description: 'Sync Shopify products', defaultFrequency: 'hourly' },
      { id: 'shopify_orders', label: 'Orders', description: 'Sync Shopify orders', defaultFrequency: 'hourly' },
    ],
    actions: [
      { id: 'create_order', label: 'Create Order', description: 'Create a Shopify order', hasSideEffects: true },
    ],
    implemented: false,
    availableForForms: true,
    availableForCrm: true,
  },
  {
    id: 'wordpress',
    name: 'WordPress',
    category: 'ecommerce',
    description: 'Embed AI forms via shortcode or Gutenberg block. Sync WP content to knowledge base.',
    authType: 'api_key',
    syncSources: [
      { id: 'wp_posts', label: 'Posts', description: 'Sync WordPress posts to knowledge base', defaultFrequency: 'daily' },
      { id: 'wp_pages', label: 'Pages', description: 'Sync WordPress pages to knowledge base', defaultFrequency: 'daily' },
    ],
    actions: [
      { id: 'embed_form', label: 'Embed Form', description: 'Embed a form via shortcode', hasSideEffects: false },
      { id: 'embed_chat', label: 'Embed Chat Widget', description: 'Embed the AI chat widget', hasSideEffects: false },
    ],
    implemented: true,
    availableForForms: true,
    availableForCrm: true,
  },

  // ── Automation ──
  {
    id: 'webhook',
    name: 'Custom Webhook',
    category: 'automation',
    description: 'Send form submissions to any URL via webhook. Receive data via inbound webhook.',
    authType: 'webhook',
    syncSources: [],
    actions: [
      { id: 'call_webhook', label: 'Call Webhook', description: 'POST to a custom URL', hasSideEffects: true },
    ],
    implemented: true,
    availableForForms: true,
    availableForCrm: true,
  },
  {
    id: 'zapier',
    name: 'Zapier',
    category: 'automation',
    description: 'Connect to 5,000+ apps via Zapier. Trigger Zaps from form submissions.',
    authType: 'api_key',
    syncSources: [],
    actions: [
      { id: 'trigger_zap', label: 'Trigger Zap', description: 'Trigger a Zapier Zap', hasSideEffects: true },
    ],
    implemented: false,
    availableForForms: true,
    availableForCrm: true,
  },
];

/**
 * Get all connectors by category.
 */
export function getConnectorsByCategory(category: ConnectorCategory): Connector[] {
  return CONNECTOR_REGISTRY.filter((c) => c.category === category);
}

/**
 * Get a connector by ID.
 */
export function getConnector(id: string): Connector | undefined {
  return CONNECTOR_REGISTRY.find((c) => c.id === id);
}

/**
 * Get all implemented connectors (for the integrations UI).
 */
export function getImplementedConnectors(): Connector[] {
  return CONNECTOR_REGISTRY.filter((c) => c.implemented);
}

/**
 * Get all connectors available for the Forms product.
 */
export function getFormsConnectors(): Connector[] {
  return CONNECTOR_REGISTRY.filter((c) => c.availableForForms);
}
