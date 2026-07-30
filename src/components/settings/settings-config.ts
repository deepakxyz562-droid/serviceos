/**
 * Settings Configuration — single source of truth for the Settings nav.
 *
 * Drives the sidebar layout in `settings-view.tsx`, the search box in
 * `settings-search.tsx`, and the section routing in the same view.
 *
 * Enterprise-level grouping (7 groups):
 *   - 'business'    → Business Management (company, profile, products, automations, etc.)
 *   - 'team'        → Team (organization, manage team, activity, work settings)
 *   - 'schedule'    → Schedule (location services, checklists)
 *   - 'client'      → Client (client hub, emails, requests, connected apps)
 *   - 'communication' → Communication (phone, SMS, WhatsApp, email, AI auto-reply)
 *   - 'integrations' → Integrations & Channels (integrations, credentials, payments, connections)
 *   - 'ai'          → AI (AI agent, auto message/call reply)
 *   - 'billing'     → Account & Billing (subscription, invoices, expenses, payment methods)
 *   - 'system'      → System (audit logs, history, security, developer, help)
 *
 * When you add a new section:
 *   1. Append to SETTINGS_SECTIONS below.
 *   2. Add an icon entry to SETTINGS_ICON_MAP in `settings-icons.tsx`.
 *   3. Add a routing case in `settings-view.tsx` → `renderActiveSection`.
 */

export type SettingsGroup =
  | 'business'
  | 'team'
  | 'schedule'
  | 'client'
  | 'communication'
  | 'integrations'
  | 'ai'
  | 'billing'
  | 'system';

export interface SettingsSection {
  /** Stable unique id used for routing + active state. */
  id: string;
  /** Human label shown in sidebar + search results. */
  label: string;
  /** Lucide icon name (resolved via SETTINGS_ICON_MAP). */
  icon: string;
  /** Short description shown under the label in sidebar + search. */
  description: string;
  /** Enterprise group — drives sidebar grouping. */
  group: SettingsGroup;
  /** If set, this section is wired to an existing tab/component. */
  existingTab?: 'company' | 'users' | 'roles' | 'integrations' | 'hub' | 'aivoice';
  /** Short tag list used to power search matching beyond label/description. */
  keywords?: string[];
  /** Marks sections whose UI is still a "Coming Soon" placeholder. */
  comingSoon?: boolean;
}

export const SETTINGS_GROUP_LABELS: Record<SettingsGroup, string> = {
  business: 'Business Management',
  team: 'Team',
  schedule: 'Schedule',
  client: 'Client',
  communication: 'Communication',
  integrations: 'Integrations & Channels',
  ai: 'AI',
  billing: 'Account & Billing',
  system: 'System',
};

export const SETTINGS_GROUP_ORDER: SettingsGroup[] = [
  'business',
  'team',
  'schedule',
  'client',
  'communication',
  'integrations',
  'ai',
  'billing',
  'system',
];

export const SETTINGS_SECTIONS: SettingsSection[] = [
  // ─── Business Management ────────────────────────────────────────────────
  {
    id: 'company',
    label: 'Company Settings',
    icon: 'Building2',
    description: 'Business profile, branding, hours, locations, branches',
    group: 'business',
    existingTab: 'company',
    keywords: ['profile', 'name', 'industry', 'currency', 'address', 'phone', 'email', 'whatsapp', 'branding', 'company settings'],
  },
  {
    id: 'business-profile',
    label: 'Business Profile',
    icon: 'Building2',
    description: 'Public business profile, logo, tagline, public contact details',
    group: 'business',
    comingSoon: true,
    keywords: ['profile', 'logo', 'tagline', 'public', 'branding'],
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    icon: 'Store',
    description: 'Marketplace profile, visibility, pricing, eligibility, terms',
    group: 'business',
    existingTab: 'hub',
    keywords: ['public hub', 'public page', 'visibility', 'seo', 'gallery', 'hours', 'faq'],
  },
  {
    id: 'products-services',
    label: 'Products & Services',
    icon: 'Package',
    description: 'Service catalog, product catalog, pricing tiers, service categories',
    group: 'business',
    comingSoon: true,
    keywords: ['products', 'services', 'catalog', 'pricing', 'categories'],
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: 'Users',
    description: 'Lead pipeline, opportunity stages, customer types, tags, segments, custom fields',
    group: 'business',
    comingSoon: true,
    keywords: ['leads', 'pipeline', 'opportunities', 'stages', 'segments', 'tags'],
  },
  {
    id: 'jobs-scheduling',
    label: 'Jobs & Scheduling',
    icon: 'Calendar',
    description: 'Job types, visit types, dispatch rules, SLA, priority levels, checklists',
    group: 'business',
    comingSoon: true,
    keywords: ['jobs', 'scheduling', 'dispatch', 'sla', 'priority', 'checklist', 'visits'],
  },
  {
    id: 'custom-fields',
    label: 'Custom Fields',
    icon: 'Braces',
    description: 'Custom fields for contacts, jobs, invoices. Includes Form Builder for custom intake forms',
    group: 'business',
    comingSoon: true,
    keywords: ['custom fields', 'form builder', 'intake forms', 'custom data'],
  },
  {
    id: 'expense-tracking',
    label: 'Expense Tracking',
    icon: 'Wallet',
    description: 'Expense categories, receipt rules, mileage, vendor management, export',
    group: 'business',
    comingSoon: true,
    keywords: ['expenses', 'receipts', 'mileage', 'vendor', 'export', 'tax'],
  },
  {
    id: 'automations',
    label: 'Automations',
    icon: 'Zap',
    description: 'Workflow builder, triggers, conditions, actions, templates, approvals, scheduled jobs',
    group: 'business',
    keywords: ['workflow', 'triggers', 'conditions', 'actions', 'templates', 'approvals', 'scheduled', 'automation'],
  },
  {
    id: 'workflows',
    label: 'Workflows',
    icon: 'Workflow',
    description: 'Visual workflow builder — multi-step automations with branching logic',
    group: 'business',
    comingSoon: true,
    keywords: ['workflow', 'visual builder', 'automation', 'branching', 'multi-step'],
  },
  {
    id: 'google-business-profile',
    label: 'Google Business Profile',
    icon: 'Search',
    description: 'Create or connect your Google Business Profile to reach 3x more leads',
    group: 'business',
    keywords: ['google', 'business profile', 'leads', 'seo', 'local search', 'ranking'],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: 'DollarSign',
    description: 'Invoices, quotes, taxes, currencies, payment methods, payment gateways, late fees, terms',
    group: 'business',
    comingSoon: true,
    keywords: ['invoices', 'quotes', 'tax', 'payment', 'gateway', 'late fee', 'terms'],
  },

  // ─── Team ───────────────────────────────────────────────────────────────
  {
    id: 'organization',
    label: 'Organization',
    icon: 'Network',
    description: 'Org chart, departments, reporting structure, business entity',
    group: 'team',
    comingSoon: true,
    keywords: ['organization', 'org chart', 'departments', 'reporting', 'entity'],
  },
  {
    id: 'team',
    label: 'Manage Team',
    icon: 'Users',
    description: 'Employees, teams, roles, permissions, working hours, leave, skills, certifications',
    group: 'team',
    existingTab: 'users',
    keywords: ['users', 'roles', 'permissions', 'employees', 'invite', 'working hours', 'manage team'],
  },
  {
    id: 'account-activity',
    label: 'Account Activity',
    icon: 'Activity',
    description: 'User login history, session activity, IP addresses, device tracking',
    group: 'team',
    comingSoon: true,
    keywords: ['activity', 'login history', 'sessions', 'devices', 'ip'],
  },
  {
    id: 'work-settings',
    label: 'Work Settings',
    icon: 'Briefcase',
    description: 'Working hours, leave policies, overtime rules, shift templates',
    group: 'team',
    comingSoon: true,
    keywords: ['working hours', 'leave', 'overtime', 'shifts', 'work policy'],
  },

  // ─── Schedule ───────────────────────────────────────────────────────────
  {
    id: 'location-services',
    label: 'Location Services',
    icon: 'MapPin',
    description: 'Service zones, geo-fencing, travel radius, service area mapping',
    group: 'schedule',
    comingSoon: true,
    keywords: ['location', 'service zones', 'geo-fencing', 'travel', 'service area'],
  },
  {
    id: 'checklists',
    label: 'Checklists',
    icon: 'ListChecks',
    description: 'Job checklists, visit checklists, inspection forms, completion rules',
    group: 'schedule',
    comingSoon: true,
    keywords: ['checklist', 'inspection', 'job', 'visit', 'completion'],
  },

  // ─── Client ─────────────────────────────────────────────────────────────
  {
    id: 'client-hub',
    label: 'Client Hub',
    icon: 'Globe',
    description: 'Customer portal config, online booking rules, self-service options',
    group: 'client',
    comingSoon: true,
    keywords: ['client hub', 'customer portal', 'online booking', 'self-service'],
  },
  {
    id: 'emails',
    label: 'Emails',
    icon: 'Mail',
    description: 'Email templates, sender identity, signature, notification rules',
    group: 'client',
    comingSoon: true,
    keywords: ['email', 'templates', 'sender', 'signature', 'notification'],
  },
  {
    id: 'requests-bookings',
    label: 'Requests and Bookings',
    icon: 'CalendarCheck',
    description: 'Request intake forms, booking rules, approval workflow, auto-assignment',
    group: 'client',
    comingSoon: true,
    keywords: ['requests', 'bookings', 'intake', 'approval', 'assignment'],
  },
  {
    id: 'connected-apps',
    label: 'Connected Apps',
    icon: 'Plug',
    description: 'Client-facing integrations, embeddable widgets, booking links',
    group: 'client',
    comingSoon: true,
    keywords: ['connected apps', 'widgets', 'embed', 'booking link', 'client'],
  },

  // ─── Communication ──────────────────────────────────────────────────────
  {
    id: 'dedicated-phone',
    label: 'Dedicated Phone Number',
    icon: 'Phone',
    description: 'Buy, release, and manage phone numbers for SMS, call forwarding, voicemail, AI-answered voice',
    group: 'communication',
    keywords: ['phone number', 'buy', 'release', 'sms', 'call forwarding', 'voicemail', 'voice', 'dedicated'],
  },
  {
    id: 'sms-text',
    label: 'SMS / 2-Way Text',
    icon: 'MessageSquare',
    description: 'SMS provider config, 2-way text messaging, sender ID, keywords',
    group: 'communication',
    comingSoon: true,
    keywords: ['sms', 'text', '2-way', 'sender id', 'keywords', 'messaging'],
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: 'MessageCircle',
    description: 'Meta Cloud API config, templates, phone number, webhook setup',
    group: 'communication',
    comingSoon: true,
    keywords: ['whatsapp', 'meta', 'cloud api', 'templates', 'webhook'],
  },
  {
    id: 'email-providers',
    label: 'Email Providers',
    icon: 'Mail',
    description: 'SMTP config, sender domain, DKIM/SPF, delivery settings',
    group: 'communication',
    comingSoon: true,
    keywords: ['email', 'smtp', 'provider', 'dkim', 'spf', 'delivery', 'sender'],
  },
  {
    id: 'ai-auto-reply',
    label: 'AI Auto-Reply',
    icon: 'Bot',
    description: 'Auto-reply when offline, AI message generation, call reply configuration',
    group: 'communication',
    comingSoon: true,
    keywords: ['ai', 'auto reply', 'offline', 'message', 'call reply', 'bot'],
  },
  {
    id: 'communication',
    label: 'Communication (Legacy)',
    icon: 'MessageSquare',
    description: 'Auto-reply, email, SMS, WhatsApp, templates, notification rules, sender identity',
    group: 'communication',
    keywords: ['email', 'sms', 'whatsapp', 'templates', 'sender', 'auto reply', 'auto-reply', 'offline', 'bot'],
  },

  // ─── Integrations & Channels ────────────────────────────────────────────
  {
    id: 'integrations',
    label: 'Integrations',
    icon: 'Plug',
    description: 'Stripe, QuickBooks, Google Calendar, Zapier, WhatsApp, OpenAI, Claude, Gemini',
    group: 'integrations',
    existingTab: 'integrations',
    keywords: ['stripe', 'quickbooks', 'google calendar', 'zapier', 'whatsapp', 'openai', 'claude', 'gemini', 'wordpress', 'webhooks', 'n8n'],
  },
  {
    id: 'channels-credentials',
    label: 'Channels & Credentials',
    icon: 'KeyRound',
    description: 'API keys, provider credentials, secure vault for all channel configs',
    group: 'integrations',
    comingSoon: true,
    keywords: ['credentials', 'api keys', 'secrets', 'vault', 'channels'],
  },
  {
    id: 'payment-integrations',
    label: 'Payment Integrations',
    icon: 'CreditCard',
    description: 'Stripe, PayPal, Square, QuickBooks, bank feeds, payment gateway config',
    group: 'integrations',
    comingSoon: true,
    keywords: ['stripe', 'paypal', 'square', 'quickbooks', 'payment', 'gateway', 'bank'],
  },
  {
    id: 'account-connections',
    label: 'Account Connections',
    icon: 'Link2',
    description: 'Google, Microsoft, OAuth connections, calendar sync, email sync',
    group: 'integrations',
    comingSoon: true,
    keywords: ['google', 'microsoft', 'oauth', 'connection', 'calendar sync', 'email sync'],
  },

  // ─── AI ─────────────────────────────────────────────────────────────────
  {
    id: 'ai',
    label: 'AI Agent',
    icon: 'Sparkles',
    description: 'AI Assistant, AI Dispatcher, AI Pricing, AI Quote Generator, AI Email Writer, AI Knowledge Base, AI Voice Agent, usage & credits',
    group: 'ai',
    existingTab: 'aivoice',
    keywords: ['ai', 'assistant', 'dispatcher', 'pricing', 'quote', 'email writer', 'knowledge base', 'voice', 'vapi', 'agent'],
  },

  // ─── Account & Billing ──────────────────────────────────────────────────
  {
    id: 'subscription',
    label: 'Subscription',
    icon: 'CreditCard',
    description: 'Current plan, upgrade/downgrade, billing cycle, plan features',
    group: 'billing',
    comingSoon: true,
    keywords: ['subscription', 'plan', 'upgrade', 'downgrade', 'billing cycle'],
  },
  {
    id: 'invoices-payments',
    label: 'Invoices & Payments',
    icon: 'Receipt',
    description: 'Billing history, invoice download, payment receipts, tax documents',
    group: 'billing',
    comingSoon: true,
    keywords: ['invoices', 'payments', 'history', 'receipts', 'tax', 'billing'],
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: 'Wallet',
    description: 'Business expenses, receipt upload, categorization, export for tax',
    group: 'billing',
    comingSoon: true,
    keywords: ['expenses', 'receipts', 'upload', 'categorize', 'export', 'tax'],
  },
  {
    id: 'payment-methods',
    label: 'Payment Methods',
    icon: 'CreditCard',
    description: 'Saved cards, bank accounts, default payment method, auto-pay',
    group: 'billing',
    comingSoon: true,
    keywords: ['payment method', 'card', 'bank', 'auto-pay', 'default'],
  },
  {
    id: 'billing',
    label: 'Billing (Legacy)',
    icon: 'CreditCard',
    description: 'Subscription, usage, invoices, marketplace plan, AI credits, SMS/email usage, storage, payment history, upgrade',
    group: 'billing',
    comingSoon: true,
    keywords: ['subscription', 'plan', 'usage', 'credits', 'storage', 'history', 'upgrade'],
  },

  // ─── System ─────────────────────────────────────────────────────────────
  {
    id: 'audit-logs',
    label: 'Audit Logs',
    icon: 'ScrollText',
    description: 'System audit trail, admin actions, config changes, compliance log',
    group: 'system',
    comingSoon: true,
    keywords: ['audit', 'logs', 'trail', 'admin actions', 'compliance'],
  },
  {
    id: 'history',
    label: 'History',
    icon: 'History',
    description: 'Activity history, record changes, undo log, timeline view',
    group: 'system',
    comingSoon: true,
    keywords: ['history', 'activity', 'changes', 'undo', 'timeline'],
  },
  {
    id: 'security',
    label: 'Security',
    icon: 'Shield',
    description: 'Two-factor auth, sessions, devices, API keys, audit logs, password policy, IP restrictions, data retention',
    group: 'system',
    comingSoon: true,
    keywords: ['2fa', 'mfa', 'sessions', 'devices', 'api keys', 'audit', 'password', 'ip', 'retention'],
  },
  {
    id: 'developer',
    label: 'Developer',
    icon: 'Code',
    description: 'API keys, webhooks, OAuth, marketplace apps, custom integrations, developer docs',
    group: 'system',
    comingSoon: true,
    keywords: ['api keys', 'webhooks', 'oauth', 'marketplace apps', 'docs'],
  },
  {
    id: 'help-support',
    label: 'Help & Support',
    icon: 'LifeBuoy',
    description: 'Support tickets, knowledge base, contact support, system status',
    group: 'system',
    comingSoon: true,
    keywords: ['help', 'support', 'tickets', 'knowledge base', 'contact', 'status'],
  },
];

// ─── Selectors ────────────────────────────────────────────────────────────

export function getSettingsSection(id: string): SettingsSection | undefined {
  return SETTINGS_SECTIONS.find((s) => s.id === id);
}

export function getBusinessSections(): SettingsSection[] {
  return SETTINGS_SECTIONS;
}

export function getSectionsByGroup(group: SettingsGroup): SettingsSection[] {
  return SETTINGS_SECTIONS.filter((s) => s.group === group);
}

/**
 * Search across label, description, and keywords. Case-insensitive,
 * token-aware (every whitespace-separated query token must match
 * somewhere in the section's searchable text).
 */
export function searchSettingsSections(query: string): SettingsSection[] {
  const q = query.trim().toLowerCase();
  if (!q) return SETTINGS_SECTIONS;
  const tokens = q.split(/\s+/);
  return SETTINGS_SECTIONS.filter((section) => {
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
