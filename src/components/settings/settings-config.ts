/**
 * Settings Configuration — single source of truth for the Settings nav.
 *
 * Drives the sidebar layout in `settings-view.tsx`, the search box in
 * `settings-search.tsx`, and the section routing in the same view.
 *
 * Consolidated grouping (7 groups):
 *   - 'business'       → Business (company, products, CRM, custom fields, automations, workflows)
 *   - 'team'            → Team (manage team, work settings, timesheets)
 *   - 'operations'      → Operations (checklists; + scheduling/client-hub/requests when ready)
 *   - 'communication'   → Communication (phone, email, channels & credentials, AI auto-reply)
 *   - 'ai'              → AI (AI configuration — Vapi, dispatcher, assistant, pricing, KB)
 *   - 'integrations'    → Integrations (integrations, Google Business Profile, payment integrations)
 *   - 'account-system'  → Account & System (subscription, expenses, audit logs, history, security, developer, help)
 *
 * `comingSoon` sections are kept in the codebase but HIDDEN from the sidebar
 * + search until their UI is ready. Remove the `comingSoon: true` flag to
 * activate a section.
 *
 * When you add a new section:
 *   1. Append to SETTINGS_SECTIONS below.
 *   2. Add an icon entry to SETTINGS_ICON_MAP in `settings-icons.tsx`.
 *   3. Add a routing case in `settings-view.tsx` → `renderActiveSection`.
 */

export type SettingsGroup =
  | 'business'
  | 'team'
  | 'operations'        // NEW: absorbs old 'schedule' + 'client' operational sections (Checklists, Client Hub, etc.)
  | 'communication'
  | 'ai'                // Dedicated group — AI is a platform capability, not a messaging channel
  | 'integrations'
  | 'account-system';   // NEW: merges old 'billing' + 'system' (admin/system config)

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
  /** When true, the content area renders full-width (drops the max-w-4xl
   *  reading-width constraint). Use for dense, multi-card sections like
   *  Work Settings, Channels & Credentials, Integrations. */
  fullWidth?: boolean;
}

export const SETTINGS_GROUP_LABELS: Record<SettingsGroup, string> = {
  business: 'Business',
  team: 'Team',
  operations: 'Operations',
  communication: 'Communication',
  ai: 'AI',
  integrations: 'Integrations',
  'account-system': 'Account & System',
};

export const SETTINGS_GROUP_ORDER: SettingsGroup[] = [
  'business',
  'team',
  'operations',
  'communication',
  'ai',
  'integrations',
  'account-system',
];

export const SETTINGS_SECTIONS: SettingsSection[] = [
  // ─── Business Management ────────────────────────────────────────────────
  // Company is the unified Company surface — 4 horizontal tabs:
  //   1. Company Information  (CompanySettings + BusinessProfileSettings)
  //   2. Branding             (BrandingSettings — colors, font, footer, white-label)
  //   3. Brand Brain           (BrandBrainView)
  //   4. Marketplace           (MarketplaceSettings)
  //
  // The old `business-profile`, `brand-brain`, and `marketplace` sidebar
  // entries have been removed — their functionality now lives under the
  // Company tabs. Deep links (e.g. ?section=brand-brain) still work via
  // alias cases in settings-view.tsx → CompanySettingsTabs initialTab.
  {
    id: 'company',
    label: 'Company',
    icon: 'Building2',
    description: 'Company information, branding, brand brain, and marketplace profile',
    group: 'business',
    existingTab: 'company',
    keywords: ['profile', 'name', 'industry', 'currency', 'address', 'phone', 'email', 'whatsapp', 'branding', 'logo', 'tagline', 'public', 'colors', 'font', 'brand brain', 'voice', 'tone', 'audience', 'competitors', 'marketplace', 'visibility', 'white label', 'company settings'],
  },
  {
    id: 'verification',
    label: 'Verification & Compliance',
    icon: 'ShieldCheck',
    description: 'Business licence, insurance, KYC identity verification, payment setup',
    group: 'business',
    keywords: ['verification', 'compliance', 'kyc', 'identity', 'insurance', 'licence', 'vat', 'tax', 'payments', 'connect', 'marketplace eligibility', 'call-out fee', 'pricing type'],
  },
  {
    id: 'products-services',
    label: 'Products & Services',
    icon: 'Package',
    description: 'Service catalog, product catalog, pricing tiers, service categories',
    group: 'business',
    keywords: ['products', 'services', 'catalog', 'pricing', 'categories'],
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: 'Kanban',
    description: 'Pipeline stages, lost reasons, lead sources, salesperson assignment rules',
    group: 'business',
    fullWidth: true,
    keywords: ['leads', 'pipeline', 'opportunities', 'stages', 'lost reasons', 'lead sources', 'salesperson', 'assignment', 'crm'],
  },
  {
    id: 'jobs-scheduling',
    label: 'Jobs & Scheduling',
    icon: 'Calendar',
    description: 'Job types, visit types, dispatch rules, SLA, priority levels, checklists',
    group: 'operations',
    comingSoon: true,
    keywords: ['jobs', 'scheduling', 'dispatch', 'sla', 'priority', 'checklist', 'visits'],
  },
  {
    id: 'custom-fields',
    label: 'Custom Fields',
    icon: 'Braces',
    description: 'Custom fields for contacts, jobs, invoices. Includes Form Builder for custom intake forms',
    group: 'business',
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
    keywords: ['workflow', 'visual builder', 'automation', 'branching', 'multi-step'],
  },
  {
    id: 'google-business-profile',
    label: 'Google Business Profile',
    icon: 'Search',
    description: 'Create or connect your Google Business Profile to reach 3x more leads',
    group: 'integrations',
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
    description: 'Quotes, jobs, invoices, visit titles, payment terms, invoice reminders, chemical tracking',
    group: 'team',
    fullWidth: true,
    keywords: ['quotes', 'jobs', 'invoices', 'visit titles', 'payment terms', 'reminders', 'chemical tracking', 'work settings'],
  },
  {
    id: 'timesheet-settings',
    label: 'Timesheet Settings',
    icon: 'Clock',
    description: 'Duration format, payroll period, timer categories (Break, Driving, Office, Supplies + custom)',
    group: 'team',
    fullWidth: true,
    keywords: ['timesheet', 'time tracking', 'duration format', 'payroll', 'timers', 'break', 'driving', 'office', 'supplies', 'clock in', 'clock out'],
  },

  // ─── Operations (was Schedule + Client operational sections) ─────────
  // Checklists is the only visible section here today — the rest are
  // comingSoon placeholders hidden from the sidebar until ready.
  {
    id: 'location-services',
    label: 'Location Services',
    icon: 'MapPin',
    description: 'Service zones, geo-fencing, travel radius, service area mapping',
    group: 'operations',
    comingSoon: true,
    keywords: ['location', 'service zones', 'geo-fencing', 'travel', 'service area'],
  },
  {
    id: 'checklists',
    label: 'Checklists',
    icon: 'ListChecks',
    description: 'Job checklists, visit checklists, inspection forms, completion rules',
    group: 'operations',
    keywords: ['checklist', 'inspection', 'job', 'visit', 'completion'],
  },
  {
    id: 'client-hub',
    label: 'Client Hub',
    icon: 'Globe',
    description: 'Customer portal config, online booking rules, self-service options',
    group: 'operations',
    comingSoon: true,
    keywords: ['client hub', 'customer portal', 'online booking', 'self-service'],
  },
  {
    id: 'requests-bookings',
    label: 'Requests and Bookings',
    icon: 'CalendarCheck',
    description: 'Request intake forms, booking rules, approval workflow, auto-assignment',
    group: 'operations',
    comingSoon: true,
    keywords: ['requests', 'bookings', 'intake', 'approval', 'assignment'],
  },

  {
    id: 'connected-apps',
    label: 'Connected Apps',
    icon: 'Plug',
    description: 'Client-facing integrations, embeddable widgets, booking links',
    group: 'integrations',
    comingSoon: true,
    keywords: ['connected apps', 'widgets', 'embed', 'booking link', 'client'],
  },

  // ─── Communication ──────────────────────────────────────────────────────
  // Emails moved here from the old 'client' group (it's a communication
  // channel, not a client-facing feature). Channels & Credentials moved here
  // from the old 'integrations' group (it's where SMS/WhatsApp/Email
  // providers are configured — communication, not third-party integrations).
  {
    id: 'emails',
    label: 'Emails',
    icon: 'Mail',
    description: 'Email templates, sender identity, signature, notification rules',
    group: 'communication',
    keywords: ['email', 'templates', 'sender', 'signature', 'notification'],
  },
  {
    id: 'dedicated-phone',
    label: 'Dedicated Phone Number',
    icon: 'Phone',
    description: 'Buy, release, and manage phone numbers for SMS, call forwarding, voicemail, AI-answered voice',
    group: 'communication',
    keywords: ['phone number', 'buy', 'release', 'sms', 'call forwarding', 'voicemail', 'voice', 'dedicated'],
  },
  // NOTE: SMS / 2-Way Text, WhatsApp, and Email Providers sections have been
  // REMOVED from Settings — they are duplicates of the Channels & Credentials
  // section (Integrations group), which is the single source of truth for all
  // communication provider CRUD (SMS, WhatsApp, Email, Credentials). The
  // unique features (SMS keywords/2-way, WhatsApp templates/webhook) are
  // embedded directly inside the Channels view's SMS and WhatsApp tabs.
  {
    id: 'ai-auto-reply',
    label: 'AI Auto-Reply',
    icon: 'Bot',
    description: 'Auto-reply when offline, AI message generation, call reply configuration',
    group: 'communication',
    keywords: ['ai', 'auto reply', 'offline', 'message', 'call reply', 'bot'],
  },

  // ─── Integrations ─────────────────────────────────────────────────────
  {
    id: 'integrations',
    label: 'Integrations',
    icon: 'Plug',
    description: 'PayPal, WhatsApp, OpenAI, Claude, Gemini, webhooks',
    group: 'integrations',
    existingTab: 'integrations',
    fullWidth: true,
    keywords: ['paypal', 'zapier', 'whatsapp', 'openai', 'claude', 'gemini', 'wordpress', 'webhooks', 'n8n'],
  },
  {
    id: 'channels-credentials',
    label: 'Channels & Credentials',
    icon: 'KeyRound',
    description: 'SMS, WhatsApp, Email provider config, API keys, secure vault for all channel configs',
    group: 'communication',
    fullWidth: true,
    keywords: ['credentials', 'api keys', 'secrets', 'vault', 'channels', 'sms', 'whatsapp', 'email', 'provider', 'twilio'],
  },
  {
    id: 'payment-integrations',
    label: 'Payment Integrations',
    icon: 'CreditCard',
    description: 'PayPal, Square, payment gateway config',
    group: 'integrations',
    keywords: ['paypal', 'square', 'payment', 'gateway'],
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
  // Phase 9.8: The 'ai' section is now the platform-managed AI Receptionist
  // workspace ONLY. The legacy BYOK Vapi configuration has been removed —
  // Fieseros owns the Vapi/Twilio integrations (managed by Superadmin).
  // Tenants configure their receptionist (name, greeting, hours, transfers,
  // phone numbers, routing) but never see provider credentials.
  {
    id: 'ai',
    label: 'AI Receptionist',
    icon: 'Sparkles',
    description: 'Your 24/7 AI voice receptionist — manage calls, phone numbers, greeting, business hours, transfers, usage, and test calls',
    group: 'ai',
    existingTab: 'aivoice',
    keywords: ['ai', 'receptionist', 'voice', 'calls', 'phone number', 'greeting', 'agent', 'assistant', 'call history', 'test call'],
  },

  // ─── Account & System (merged old 'billing' + 'system') ─────────────────
  {
    id: 'subscription',
    label: 'Subscription',
    icon: 'CreditCard',
    description: 'Current plan, upgrade/downgrade, billing cycle, plan features',
    group: 'account-system',
    keywords: ['subscription', 'plan', 'upgrade', 'downgrade', 'billing cycle'],
  },
  {
    id: 'invoices-payments',
    label: 'Invoices & Payments',
    icon: 'Receipt',
    description: 'Billing history, invoice download, payment receipts, tax documents',
    group: 'account-system',
    comingSoon: true,
    keywords: ['invoices', 'payments', 'history', 'receipts', 'tax', 'billing'],
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: 'Wallet',
    description: 'Business expenses, receipt upload, categorization, export for tax',
    group: 'account-system',
    keywords: ['expenses', 'receipts', 'upload', 'categorize', 'export', 'tax'],
  },
  {
    id: 'payment-methods',
    label: 'Payment Methods',
    icon: 'CreditCard',
    description: 'Saved cards, bank accounts, default payment method, auto-pay',
    group: 'account-system',
    comingSoon: true,
    keywords: ['payment method', 'card', 'bank', 'auto-pay', 'default'],
  },
  {
    id: 'audit-logs',
    label: 'Audit Logs',
    icon: 'ScrollText',
    description: 'System audit trail, admin actions, config changes, compliance log',
    group: 'account-system',
    keywords: ['audit', 'logs', 'trail', 'admin actions', 'compliance'],
  },
  {
    id: 'history',
    label: 'History',
    icon: 'History',
    description: 'Activity history, record changes, undo log, timeline view',
    group: 'account-system',
    keywords: ['history', 'activity', 'changes', 'undo', 'timeline'],
  },
  // NOTE: `comingSoon: true` removed from Security + Developer — both have
  // real, wired components (<SecuritySettings>, <DeveloperSettings>) in
  // settings-view.tsx. The flag was incorrect metadata, not a reflection of
  // implementation status.
  {
    id: 'security',
    label: 'Security',
    icon: 'Shield',
    description: 'Two-factor auth, sessions, devices, API keys, audit logs, password policy, IP restrictions, data retention',
    group: 'account-system',
    keywords: ['2fa', 'mfa', 'sessions', 'devices', 'api keys', 'audit', 'password', 'ip', 'retention'],
  },
  {
    id: 'developer',
    label: 'Developer',
    icon: 'Code',
    description: 'API keys, webhooks, OAuth, marketplace apps, custom integrations, developer docs',
    group: 'account-system',
    keywords: ['api keys', 'webhooks', 'oauth', 'marketplace apps', 'docs'],
  },
  {
    id: 'help-support',
    label: 'Help & Support',
    icon: 'LifeBuoy',
    description: 'Support tickets, knowledge base, contact support, system status',
    group: 'account-system',
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
 *
 * Hides `comingSoon` sections — they're not ready for users to discover
 * via search. Remove the `!s.comingSoon` filter when a section is activated.
 */
export function searchSettingsSections(query: string): SettingsSection[] {
  const q = query.trim().toLowerCase();
  const pool = SETTINGS_SECTIONS.filter((s) => !s.comingSoon);
  if (!q) return pool;
  const tokens = q.split(/\s+/);
  return pool.filter((section) => {
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
