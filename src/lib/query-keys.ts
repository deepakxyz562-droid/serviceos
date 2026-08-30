/**
 * query-keys.ts
 * =============
 * Canonical React Query key factory — the SINGLE source of truth for query
 * identity across the entire Fieseros codebase.
 *
 * ─── Why this exists ─────────────────────────────────────────────────────────
 * Before this file, query keys were defined ad-hoc across 27+ files with
 * 6 different "customers" key shapes, 3 different "jobs" key shapes, and
 * 14 different `employee-*` prefixes that didn't share a parent. This made
 * cache invalidation unreliable — invalidating `['jobs']` wouldn't catch
 * `['jobs', params]` from a different hook file if the key shape differed
 * even slightly.
 *
 * This file fixes that by providing a hierarchical key structure where:
 *   - `qk.jobs.all` catches EVERY jobs query (lists + details)
 *   - `qk.jobs.lists()` catches every jobs LIST query (not details)
 *   - `qk.jobs.list(filters)` is one specific filtered list
 *   - `qk.jobs.detail(id)` is one specific job detail
 *
 * ─── Invalidation behavior ──────────────────────────────────────────────────
 * React Query's `invalidateQueries({ queryKey })` uses prefix matching by
 * default (`exact: false`). So:
 *
 *   qc.invalidateQueries({ queryKey: qk.jobs.all })
 *     → invalidates ['jobs'], ['jobs','list'], ['jobs','list',{...}], ['jobs','detail'], ['jobs','detail','abc']
 *
 *   qc.invalidateQueries({ queryKey: qk.jobs.lists() })
 *     → invalidates ['jobs','list'], ['jobs','list',{...}]  (NOT details)
 *
 *   qc.invalidateQueries({ queryKey: qk.jobs.detail(id) })
 *     → invalidates ['jobs','detail',id]  (just this one detail)
 *
 * ─── Usage ───────────────────────────────────────────────────────────────────
 *   // In a hook:
 *   useQuery({ queryKey: qk.jobs.list({ status, search }), queryFn: ... })
 *
 *   // In a mutation's onSuccess:
 *   onSuccess: () => qc.invalidateQueries({ queryKey: qk.jobs.all })
 *
 *   // With dependency-aware invalidation (Phase 1.3+1.4):
 *   onSuccess: (_data, variables) => {
 *     for (const key of getJobInvalidations({ mutation: 'update', ...variables })) {
 *       qc.invalidateQueries({ queryKey: key });
 *     }
 *   }
 *
 * ─── Migration ───────────────────────────────────────────────────────────────
 * This file is introduced in Phase 1.1. Existing hooks in
 * `use-crm-data.ts` and `use-supabase-queries.ts` will be migrated to use
 * these keys in Phase 1.2. The old inline `queryKeys` factory in
 * `use-supabase-queries.ts` (14 dead entries, 2 bypassed hooks) will be
 * removed once all callers are migrated.
 */

// ─── Helper type ─────────────────────────────────────────────────────────────
/** Loose filter type — tightened per-hook where needed. */
type Filters = Record<string, unknown>;

// ─── CRM Entities ────────────────────────────────────────────────────────────

export const qk = {
  // ── Jobs ──────────────────────────────────────────────────────────────────
  jobs: {
    all: ['jobs'] as const,
    lists: () => [...qk.jobs.all, 'list'] as const,
    list: (filters?: Filters) => [...qk.jobs.lists(), filters ?? {}] as const,
    details: () => [...qk.jobs.all, 'detail'] as const,
    detail: (id: string) => [...qk.jobs.details(), id] as const,
    /**
     * Calendar events — sourced from /api/jobs but rendered in calendar context.
     *
     * Hierarchy:
     *   qk.jobs.calendar.all()  → ['jobs', 'calendar']  (invalidates ALL calendar variants)
     *   qk.jobs.calendar.list() → ['jobs', 'calendar', {}]  (one specific filtered view)
     *
     * Use `all()` for invalidation after job mutations (catches every calendar
     * filter combination). Use `list(filters)` for the queryKey of a specific
     * calendar query.
     */
    calendar: {
      all: () => [...qk.jobs.all, 'calendar'] as const,
      list: (filters?: Filters) => [...qk.jobs.all, 'calendar', filters ?? {}] as const,
    },
  },

  // ── Customers (the Customer model — /api/customers) ───────────────────────
  customers: {
    all: ['customers'] as const,
    lists: () => [...qk.customers.all, 'list'] as const,
    list: (filters?: Filters) => [...qk.customers.lists(), filters ?? {}] as const,
    details: () => [...qk.customers.all, 'detail'] as const,
    detail: (id: string) => [...qk.customers.details(), id] as const,
    /** Customer 360 view — aggregated detail + timeline + bookings + invoices. */
    view360: (id: string) => [...qk.customers.detail(id), 'view360'] as const,
    /** Customer timeline entries. */
    timeline: (id: string) => [...qk.customers.detail(id), 'timeline'] as const,
    /** Customer assets (equipment, installed products). */
    assets: (id: string) => [...qk.customers.detail(id), 'assets'] as const,
  },

  // ── Contacts (the Contact model — /api/contacts, richer than Customer) ────
  contacts: {
    all: ['contacts'] as const,
    lists: () => [...qk.contacts.all, 'list'] as const,
    list: (filters?: Filters) => [...qk.contacts.lists(), filters ?? {}] as const,
    details: () => [...qk.contacts.all, 'detail'] as const,
    detail: (id: string) => [...qk.contacts.details(), id] as const,
  },

  // ── Leads ─────────────────────────────────────────────────────────────────
  leads: {
    all: ['leads'] as const,
    lists: () => [...qk.leads.all, 'list'] as const,
    list: (filters?: Filters) => [...qk.leads.lists(), filters ?? {}] as const,
    details: () => [...qk.leads.all, 'detail'] as const,
    detail: (id: string) => [...qk.leads.details(), id] as const,
  },

  // ── Invoices ──────────────────────────────────────────────────────────────
  invoices: {
    all: ['invoices'] as const,
    lists: () => [...qk.invoices.all, 'list'] as const,
    list: (filters?: Filters) => [...qk.invoices.lists(), filters ?? {}] as const,
    details: () => [...qk.invoices.all, 'detail'] as const,
    detail: (id: string) => [...qk.invoices.details(), id] as const,
  },

  // ── Payments ──────────────────────────────────────────────────────────────
  payments: {
    all: ['payments'] as const,
    lists: () => [...qk.payments.all, 'list'] as const,
    list: (filters?: Filters) => [...qk.payments.lists(), filters ?? {}] as const,
    /** Payments for a specific invoice. */
    forInvoice: (invoiceId: string) => [...qk.payments.all, 'invoice', invoiceId] as const,
    /** Payments for a specific customer. */
    forCustomer: (customerId: string) => [...qk.payments.all, 'customer', customerId] as const,
  },

  // ── Expenses ──────────────────────────────────────────────────────────────
  expenses: {
    all: ['expenses'] as const,
    lists: () => [...qk.expenses.all, 'list'] as const,
    list: (filters?: Filters) => [...qk.expenses.lists(), filters ?? {}] as const,
    details: () => [...qk.expenses.all, 'detail'] as const,
    detail: (id: string) => [...qk.expenses.details(), id] as const,
  },

  // ── Quotes ────────────────────────────────────────────────────────────────
  quotes: {
    all: ['quotes'] as const,
    lists: () => [...qk.quotes.all, 'list'] as const,
    list: (filters?: Filters) => [...qk.quotes.lists(), filters ?? {}] as const,
    details: () => [...qk.quotes.all, 'detail'] as const,
    detail: (id: string) => [...qk.quotes.details(), id] as const,
  },

  // ── Bookings ──────────────────────────────────────────────────────────────
  bookings: {
    all: ['bookings'] as const,
    lists: () => [...qk.bookings.all, 'list'] as const,
    list: (filters?: Filters) => [...qk.bookings.lists(), filters ?? {}] as const,
    details: () => [...qk.bookings.all, 'detail'] as const,
    detail: (id: string) => [...qk.bookings.details(), id] as const,
  },

  // ── Employees ─────────────────────────────────────────────────────────────
  // The hierarchical detail().tab() structure consolidates the 14 different
  // `employee-*` key prefixes found in the audit into one consistent namespace.
  employees: {
    all: ['employees'] as const,
    lists: () => [...qk.employees.all, 'list'] as const,
    list: (filters?: Filters) => [...qk.employees.lists(), filters ?? {}] as const,
    details: () => [...qk.employees.all, 'detail'] as const,
    detail: (id: string) => [...qk.employees.details(), id] as const,
    /**
     * Tab-scoped query for a specific employee (e.g. jobs, shifts, equipment,
     * documents, payroll, performance, activity, route, reviews, calendar).
     *
     * Invalidation with `qk.employees.detail(id)` catches ALL tabs for that
     * employee — useful after an employee update that affects multiple tabs.
     */
    tab: (id: string, tab: string, filters?: Filters) =>
      [...qk.employees.detail(id), 'tab', tab, filters ?? {}] as const,
  },

  // ── Dispatch (live status, real-time) ─────────────────────────────────────
  dispatch: {
    all: ['dispatch'] as const,
    live: () => [...qk.dispatch.all, 'live'] as const,
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  dashboard: {
    all: ['dashboard'] as const,
    bootstrap: () => [...qk.dashboard.all, 'bootstrap'] as const,
    stats: () => [...qk.dashboard.all, 'stats'] as const,
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  notifications: {
    all: ['notifications'] as const,
    lists: () => [...qk.notifications.all, 'list'] as const,
    list: (filters?: Filters) => [...qk.notifications.lists(), filters ?? {}] as const,
    unread: () => [...qk.notifications.all, 'unread-count'] as const,
    preferences: () => [...qk.notifications.all, 'preferences'] as const,
  },

  // ── Conversations / Inbox ─────────────────────────────────────────────────
  conversations: {
    all: ['conversations'] as const,
    lists: () => [...qk.conversations.all, 'list'] as const,
    list: (filters?: Filters) => [...qk.conversations.lists(), filters ?? {}] as const,
    details: () => [...qk.conversations.all, 'detail'] as const,
    detail: (id: string) => [...qk.conversations.details(), id] as const,
    messages: (conversationId: string) => [...qk.conversations.detail(conversationId), 'messages'] as const,
  },

  // ── Campaigns / Broadcasts ────────────────────────────────────────────────
  campaigns: {
    all: ['campaigns'] as const,
    lists: () => [...qk.campaigns.all, 'list'] as const,
    list: (filters?: Filters) => [...qk.campaigns.lists(), filters ?? {}] as const,
  },

  broadcasts: {
    all: ['broadcasts'] as const,
    lists: () => [...qk.broadcasts.all, 'list'] as const,
    list: (filters?: Filters) => [...qk.broadcasts.lists(), filters ?? {}] as const,
  },

  // ── Inventory ─────────────────────────────────────────────────────────────
  inventory: {
    all: ['inventory'] as const,
    items: (filters?: Filters) => [...qk.inventory.all, 'items', filters ?? {}] as const,
    transactions: (filters?: Filters) => [...qk.inventory.all, 'transactions', filters ?? {}] as const,
    purchaseOrders: (filters?: Filters) => [...qk.inventory.all, 'purchase-orders', filters ?? {}] as const,
    assets: (filters?: Filters) => [...qk.inventory.all, 'assets', filters ?? {}] as const,
  },

  // ── Marketplace (PUBLIC — these CAN be cached longer) ─────────────────────
  marketplace: {
    all: ['marketplace'] as const,
    providers: (filters?: Filters) => [...qk.marketplace.all, 'providers', filters ?? {}] as const,
    counts: (country?: string, city?: string) =>
      [...qk.marketplace.all, 'counts', { country, city }] as const,
    cities: (country?: string) => [...qk.marketplace.all, 'cities', { country }] as const,
  },

  // ── Reports / Analytics ───────────────────────────────────────────────────
  reports: {
    all: ['reports'] as const,
    metric: (metric: string, range?: Filters) => [...qk.reports.all, metric, range ?? {}] as const,
  },

  // ── Time Tracking / Timesheet ─────────────────────────────────────────────
  timeTracking: {
    all: ['time-tracking'] as const,
    team: (filters?: Filters) => [...qk.timeTracking.all, 'team', filters ?? {}] as const,
    payroll: (filters?: Filters) => [...qk.timeTracking.all, 'payroll', filters ?? {}] as const,
  },

  // ── Operations Resources (webhook sources, dispatch resources) ────────────
  operations: {
    all: ['operations'] as const,
    /**
     * Prefix key for ALL resource queries. Use for invalidation:
     *   qc.invalidateQueries({ queryKey: qk.operations.resourcesAll() })
     * catches every filtered resource query.
     */
    resourcesAll: () => [...qk.operations.all, 'resources'] as const,
    /** Specific resource query (with filters). Use as the queryKey. */
    resources: (filters?: Filters) => [...qk.operations.resourcesAll(), filters ?? {}] as const,
    webhookSources: (filters?: Filters) => [...qk.operations.all, 'webhook-sources', filters ?? {}] as const,
  },

  // ── Automation (workflows, triggers, forms) ───────────────────────────────
  workflows: {
    all: ['workflows'] as const,
    lists: () => [...qk.workflows.all, 'list'] as const,
    list: (filters?: Filters) => [...qk.workflows.lists(), filters ?? {}] as const,
    details: () => [...qk.workflows.all, 'detail'] as const,
    detail: (id: string) => [...qk.workflows.details(), id] as const,
    automations: () => [...qk.workflows.all, 'automations'] as const,
  },

  triggers: {
    all: ['triggers'] as const,
    lists: () => [...qk.triggers.all, 'list'] as const,
  },

  forms: {
    all: ['forms'] as const,
    lists: () => [...qk.forms.all, 'list'] as const,
  },

  // ── Settings / Config ─────────────────────────────────────────────────────
  settings: {
    all: ['settings'] as const,
    autoReply: () => [...qk.settings.all, 'auto-reply'] as const,
    channelConfigs: () => [...qk.settings.all, 'channel-configs'] as const,
    credentials: () => [...qk.settings.all, 'credentials'] as const,
    smsNumbers: () => [...qk.settings.all, 'sms-numbers'] as const,
    vapiAgents: () => [...qk.settings.all, 'vapi-agents'] as const,
  },

  auditLogs: {
    all: ['auditLogs'] as const,
    list: (filters?: Filters) => [...qk.auditLogs.all, filters ?? {}] as const,
  },

  activityLogs: {
    all: ['activityLogs'] as const,
    list: (filters?: Filters) => [...qk.activityLogs.all, filters ?? {}] as const,
  },

  // ── Super Admin ───────────────────────────────────────────────────────────
  // Note: nested values use plain arrays (not self-references) to avoid
  // temporal-dead-zone errors during object initialization. Methods use
  // arrow functions so `qk.*` is resolved at call time, not init time.
  superadmin: {
    all: ['superadmin'] as const,
    tenants: {
      all: ['superadmin', 'tenants'] as const,
      lists: () => ['superadmin', 'tenants', 'list'] as const,
      list: (filters?: Filters) => ['superadmin', 'tenants', 'list', filters ?? {}] as const,
      details: () => ['superadmin', 'tenants', 'detail'] as const,
      detail: (id: string) => ['superadmin', 'tenants', 'detail', id] as const,
    },
    subscriptions: {
      all: ['superadmin', 'subscriptions'] as const,
      lists: () => ['superadmin', 'subscriptions', 'list'] as const,
      detail: (id: string) => ['superadmin', 'subscriptions', 'detail', id] as const,
    },
    featureFlags: ['superadmin', 'feature-flags'] as const,
    menuItems: {
      all: ['superadmin', 'menu-items'] as const,
      global: ['superadmin', 'menu-items', 'global'] as const,
      forTenant: (tenantId: string) => ['superadmin', 'menu-items', tenantId] as const,
    },
    plans: ['superadmin', 'plans'] as const,
    planFeatures: ['superadmin', 'plan-features'] as const,
    aiKeys: ['superadmin', 'ai-keys'] as const,
    stats: ['superadmin', 'stats'] as const,
    users: ['superadmin', 'users'] as const,
  },

  // ── Public (chat widget presence, etc.) ───────────────────────────────────
  public: {
    all: ['public'] as const,
    presence: (tenantId: string) => [...qk.public.all, 'presence', tenantId] as const,
  },
} as const;

// ─── Type helper for invalidation functions (Phase 1.4) ─────────────────────
/** A query key is a readonly array of string | number | object | undefined. */
export type QueryKey = readonly (string | number | object | undefined)[];

/**
 * Backward-compatibility shim.
 *
 * The old `queryKeys` export from `use-supabase-queries.ts` used a flat
 * structure: `queryKeys.leads(tenantId)`, `queryKeys.lead(id)`, etc.
 * During Phase 1.2 migration, callers will be updated to use the new
 * hierarchical `qk.*` structure. This shim prevents breakage during the
 * transition.
 *
 * ─── Why tenant IDs are intentionally ignored ────────────────────────────────
 * The old factory accepted an optional `tenantId` parameter on every list
 * key: `queryKeys.leads(tenantId)` → `['leads', tenantId]`. The new canonical
 * factory does NOT include tenantId in the key: `qk.leads.lists()` →
 * `['leads', 'list']`.
 *
 * This is safe because the application has a **single-tenant CRM session
 * boundary**: one `QueryClient` per browser session, one authenticated user
 * per session, one `tenantId` per user (from `getAuthUser()`). Regular users
 * never see data from another tenant's CRM — the API enforces this server-side.
 *
 * Superadmin queries (tenants, subscriptions, feature flags, menu items) ARE
 * namespaced under `qk.superadmin.*` because superadmin can switch between
 * tenants — but those queries return tenant management metadata, not CRM data.
 *
 * The `queryClient.clear()` call on logout (added in Phase 1.1 retrofit)
 * ensures no CRM data leaks between sessions when a different user logs in
 * on the same browser.
 *
 * @deprecated Use `qk` instead. This shim will be removed after all callers
 *             are migrated to `qk.*` directly (happens naturally during
 *             Phase 1.8+ view migrations). The `tenantId` parameters on the
 *             shim functions are intentionally ignored — see the explanation
 *             above.
 */
export const queryKeys = {
  // CRM
  leads: (_tenantId?: string) => qk.leads.lists(),
  lead: (id: string) => qk.leads.detail(id),
  contacts: (_tenantId?: string) => qk.contacts.lists(),
  customers: (_tenantId?: string) => qk.customers.lists(),
  customer: (id: string) => qk.customers.detail(id),
  customer360: (id: string) => qk.customers.view360(id),

  // Communication
  conversations: (_tenantId?: string) => qk.conversations.lists(),
  conversation: (id: string) => qk.conversations.detail(id),
  inboxMessages: (conversationId: string) => qk.conversations.messages(conversationId),
  campaigns: (_tenantId?: string) => qk.campaigns.lists(),
  broadcast: (_tenantId?: string) => qk.broadcasts.lists(),
  channelConfigs: (_tenantId?: string) => qk.settings.channelConfigs(),

  // Automation
  workflows: (_tenantId?: string) => qk.workflows.lists(),
  workflow: (id: string) => qk.workflows.detail(id),
  triggers: (_tenantId?: string) => qk.triggers.lists(),
  forms: (_tenantId?: string) => qk.forms.lists(),
  credentials: (_tenantId?: string) => qk.settings.credentials(),

  // Operations
  jobs: (_tenantId?: string) => qk.jobs.lists(),
  job: (id: string) => qk.jobs.detail(id),
  bookings: (_tenantId?: string) => qk.bookings.lists(),
  employees: (_tenantId?: string) => qk.employees.lists(),
  employee: (id: string) => qk.employees.detail(id),

  // Finance
  quotes: (_tenantId?: string) => qk.quotes.lists(),
  quote: (id: string) => qk.quotes.detail(id),
  invoices: (_tenantId?: string) => qk.invoices.lists(),
  invoice: (id: string) => qk.invoices.detail(id),

  // System
  auditLogs: (_tenantId?: string) => qk.auditLogs.list(),

  // Super Admin
  saasStats: () => qk.superadmin.stats,
  tenants: () => qk.superadmin.tenants.lists(),
  tenant: (id: string) => qk.superadmin.tenants.detail(id),
  subscriptions: () => qk.superadmin.subscriptions.lists(),
  subscription: (id: string) => qk.superadmin.subscriptions.detail(id),
  featureFlags: (_tenantId?: string) => qk.superadmin.featureFlags,
  menuItems: (tenantId: string) => qk.superadmin.menuItems.forTenant(tenantId),
  users: () => qk.superadmin.users,

  // Dashboard
  dashboardStats: (_tenantId?: string) => qk.dashboard.stats(),
} as const;
