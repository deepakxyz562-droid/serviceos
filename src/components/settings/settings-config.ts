/**
 * Settings Configuration — single source of truth for the Settings nav.
 *
 * Drives the sidebar layout in `settings-view.tsx`, the search box in
 * `settings-search.tsx`, and the section routing in the same view.
 *
 * Two categories:
 *   - 'business'   → Business Owner settings (14 sections)
 *   - 'platform'   → Platform Admin / SuperAdmin settings (separate nav,
 *                    already managed in the SuperAdmin dashboard). Kept
 *                    here only for documentation/search; not rendered in
 *                    this Business Owner shell.
 *
 * When you add a new section:
 *   1. Append to SETTINGS_SECTIONS below.
 *   2. Add an icon entry to SETTINGS_ICON_MAP in `settings-icons.tsx`.
 *   3. Add a routing case in `settings-view.tsx` → `renderActiveSection`.
 */

export type SettingsCategory = 'business' | 'platform';

export interface SettingsSection {
  /** Stable unique id used for routing + active state. */
  id: string;
  /** Human label shown in sidebar + search results. */
  label: string;
  /** Lucide icon name (resolved via SETTINGS_ICON_MAP). */
  icon: string;
  /** Short description shown under the label in sidebar + search. */
  description: string;
  /** Business Owner vs Platform Admin grouping. */
  category: SettingsCategory;
  /** If set, this section is wired to an existing tab/component. */
  existingTab?: 'company' | 'users' | 'roles' | 'integrations' | 'hub' | 'aivoice';
  /** Short tag list used to power search matching beyond label/description. */
  keywords?: string[];
  /** Marks sections whose UI is still a "Coming Soon" placeholder. */
  comingSoon?: boolean;
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: 'company',
    label: 'Company',
    icon: 'Building2',
    description: 'Business profile, branding, hours, locations, branches',
    category: 'business',
    existingTab: 'company',
    keywords: ['profile', 'name', 'industry', 'currency', 'address', 'phone', 'email', 'whatsapp', 'branding'],
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    icon: 'Store',
    description: 'Marketplace profile, visibility, pricing, eligibility, terms',
    category: 'business',
    existingTab: 'hub',
    keywords: ['public hub', 'public page', 'visibility', 'seo', 'gallery', 'hours', 'faq'],
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: 'Users',
    description: 'Lead pipeline, opportunity stages, customer types, tags, segments, custom fields',
    category: 'business',
    comingSoon: true,
    keywords: ['leads', 'pipeline', 'opportunities', 'stages', 'segments', 'tags'],
  },
  {
    id: 'jobs-scheduling',
    label: 'Jobs & Scheduling',
    icon: 'Calendar',
    description: 'Job types, visit types, dispatch rules, SLA, priority levels, checklists',
    category: 'business',
    comingSoon: true,
    keywords: ['jobs', 'scheduling', 'dispatch', 'sla', 'priority', 'checklist', 'visits'],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: 'DollarSign',
    description: 'Invoices, quotes, taxes, currencies, payment methods, payment gateways, late fees, terms',
    category: 'business',
    comingSoon: true,
    keywords: ['invoices', 'quotes', 'tax', 'payment', 'gateway', 'late fee', 'terms'],
  },
  {
    id: 'team',
    label: 'Team',
    icon: 'Users',
    description: 'Employees, teams, roles, permissions, working hours, leave, skills, certifications',
    category: 'business',
    existingTab: 'users',
    keywords: ['users', 'roles', 'permissions', 'employees', 'invite', 'working hours'],
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: 'Heart',
    description: 'Customer portal, online booking, maintenance plans, warranty, notifications',
    category: 'business',
    comingSoon: true,
    keywords: ['portal', 'booking', 'maintenance', 'warranty', 'notifications'],
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: 'MessageSquare',
    description: 'Email, SMS, WhatsApp, templates, notification rules, sender identity',
    category: 'business',
    comingSoon: true,
    keywords: ['email', 'sms', 'whatsapp', 'templates', 'sender'],
  },
  {
    id: 'ai',
    label: 'AI',
    icon: 'Sparkles',
    description: 'AI Assistant, AI Dispatcher, AI Pricing, AI Quote Generator, AI Email Writer, AI Knowledge Base, AI Voice Agent, usage & credits',
    category: 'business',
    existingTab: 'aivoice',
    keywords: ['ai', 'assistant', 'dispatcher', 'pricing', 'quote', 'email writer', 'knowledge base', 'voice', 'vapi'],
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: 'Plug',
    description: 'Stripe, QuickBooks, Google Calendar, Zapier, WhatsApp, OpenAI, Claude, Gemini',
    category: 'business',
    existingTab: 'integrations',
    keywords: ['stripe', 'quickbooks', 'google calendar', 'zapier', 'whatsapp', 'openai', 'claude', 'gemini', 'wordpress', 'webhooks', 'n8n'],
  },
  {
    id: 'automations',
    label: 'Automations',
    icon: 'Zap',
    description: 'Workflow builder, triggers, conditions, actions, templates, approvals, scheduled jobs',
    category: 'business',
    comingSoon: true,
    keywords: ['workflow', 'triggers', 'conditions', 'actions', 'templates', 'approvals', 'scheduled'],
  },
  {
    id: 'security',
    label: 'Security',
    icon: 'Shield',
    description: 'Two-factor auth, sessions, devices, API keys, audit logs, password policy, IP restrictions, data retention',
    category: 'business',
    comingSoon: true,
    keywords: ['2fa', 'mfa', 'sessions', 'devices', 'api keys', 'audit', 'password', 'ip', 'retention'],
  },
  {
    id: 'developer',
    label: 'Developer',
    icon: 'Code',
    description: 'API keys, webhooks, OAuth, marketplace apps, custom integrations, developer docs',
    category: 'business',
    comingSoon: true,
    keywords: ['api keys', 'webhooks', 'oauth', 'marketplace apps', 'docs'],
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: 'CreditCard',
    description: 'Subscription, usage, invoices, marketplace plan, AI credits, SMS/email usage, storage, payment history, upgrade',
    category: 'business',
    comingSoon: true,
    keywords: ['subscription', 'plan', 'usage', 'credits', 'storage', 'history', 'upgrade'],
  },
];

// ─── Selectors ────────────────────────────────────────────────────────────

export function getSettingsSection(id: string): SettingsSection | undefined {
  return SETTINGS_SECTIONS.find((s) => s.id === id);
}

export function getBusinessSections(): SettingsSection[] {
  return SETTINGS_SECTIONS.filter((s) => s.category === 'business');
}

export function getPlatformSections(): SettingsSection[] {
  return SETTINGS_SECTIONS.filter((s) => s.category === 'platform');
}

/**
 * Search across label, description, and keywords. Case-insensitive,
 * token-aware (every whitespace-separated query token must match
 * somewhere in the section's searchable text).
 */
export function searchSettingsSections(query: string): SettingsSection[] {
  const q = query.trim().toLowerCase();
  if (!q) return getBusinessSections();
  const tokens = q.split(/\s+/);
  return getBusinessSections().filter((section) => {
    const haystack = [
      section.label,
      section.description,
      ...(section.keywords ?? []),
    ]
      .join(' ')
      .toLowerCase();
    return tokens.every((tok) => haystack.includes(tok));
  });
}
