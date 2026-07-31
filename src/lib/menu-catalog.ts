/**
 * Single source of truth for the superadmin menu-management catalog.
 *
 * This catalog mirrors the sidebar navigation defined in
 * `src/components/layout/sidebar.tsx` (`ownerNavSections`) so that every
 * item visible in the sidebar can be toggled on/off from the superadmin
 * Menu Management panel.
 *
 * Previously, three separate copies of this list existed (the menu-items
 * API route, the defaults API route, and the menu-management UI component)
 * and they had drifted — many sidebar items were missing from the catalog
 * (so they couldn't be toggled off) and some entries were duplicated
 * across sections (retargeting, segments, marketingAnalytics appeared
 * in both Marketing and AI & More).
 *
 * All three consumers now import from this file.
 */

export interface MenuCatalogItem {
  key: string;
  label: string;
  icon: string;
  section: string;
  sortOrder: number;
  /**
   * Minimum plan tier required to ACCESS this menu item (not just see it).
   * When the current tenant's plan rank < planRank(minPlan), the item renders
   * with a Lock icon and clicking it opens an Upgrade modal instead of
   * navigating. The item stays VISIBLE (not hidden) so trial users can
   * discover paid features.
   *
   * Omit `minPlan` (or set to 'trial') to make the item accessible to everyone,
   * including trial users.
   *
   * Canonical tiers: 'trial' | 'starter' | 'growth' | 'business' | 'enterprise'
   * (see src/lib/plan-features.ts)
   */
  minPlan?: 'trial' | 'starter' | 'growth' | 'business' | 'enterprise';
  /**
   * One-line description shown in the Upgrade modal when this item is locked.
   * Helps the user understand what they'd get by upgrading.
   */
  upgradeDescription?: string;
}

export const MENU_CATALOG: MenuCatalogItem[] = [
  // ─── Overview ────────────────────────────────────────────────────────
  { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', section: 'Overview', sortOrder: 0 },
  { key: 'calendar', label: 'Calendar', icon: 'Calendar', section: 'Overview', sortOrder: 1 },
  { key: 'reports', label: 'Reports', icon: 'BarChart3', section: 'Overview', sortOrder: 2 },

  // ─── CRM ─────────────────────────────────────────────────────────────
  { key: 'leads', label: 'Leads', icon: 'Target', section: 'CRM', sortOrder: 10 },
  { key: 'contacts', label: 'Contacts', icon: 'Contact', section: 'CRM', sortOrder: 11 },
  { key: 'customers', label: 'Customers', icon: 'Users', section: 'CRM', sortOrder: 12 },
  { key: 'customer360', label: 'Customer 360', icon: 'UserCircle', section: 'CRM', sortOrder: 13 },
  { key: 'salesPipeline', label: 'Sales Pipeline', icon: 'Kanban', section: 'CRM', sortOrder: 14 },
  { key: 'reviews', label: 'Reviews', icon: 'Star', section: 'CRM', sortOrder: 15 },

  // ─── Operations ──────────────────────────────────────────────────────
  { key: 'jobs', label: 'Jobs', icon: 'Briefcase', section: 'Operations', sortOrder: 20 },
  { key: 'booking', label: 'Booking', icon: 'CalendarCheck', section: 'Operations', sortOrder: 21 },
  { key: 'dispatch', label: 'Live Dispatch', icon: 'Radio', section: 'Operations', sortOrder: 22, minPlan: 'growth', upgradeDescription: 'Dispatch board with smart-assign, live technician map, and real-time job queue. Available on Professional and above — solo operators on Starter can use the Jobs view directly.' },
  { key: 'employees', label: 'Employees', icon: 'UserCog', section: 'Operations', sortOrder: 23 },
  { key: 'timesheet', label: 'Timesheet', icon: 'Clock', section: 'Operations', sortOrder: 24 },
  { key: 'serviceCatalog', label: 'Service Catalog', icon: 'BookOpen', section: 'Operations', sortOrder: 25 },
  { key: 'inventory', label: 'Inventory', icon: 'Package', section: 'Operations', sortOrder: 26, minPlan: 'business', upgradeDescription: 'Track stock-on-hand, SKUs, suppliers, and stock transactions across your warehouse.' },
  { key: 'purchaseOrders', label: 'Purchase Orders', icon: 'ClipboardList', section: 'Operations', sortOrder: 27, minPlan: 'business', upgradeDescription: 'Create purchase orders to vendors, receive shipments, and auto-update inventory stock levels.' },
  { key: 'recurringJobs', label: 'Recurring Jobs', icon: 'Repeat', section: 'Operations', sortOrder: 28, minPlan: 'business', upgradeDescription: 'Schedule recurring + contract jobs that auto-generate visits on a weekly, monthly, or custom cadence.' },

  // ─── Marketing ───────────────────────────────────────────────────────
  // Menu restructured per Jobber-style consolidation:
  //   - Campaigns is the main hub (AI generator + template gallery inline).
  //   - Template Studio, Retargeting, and Marketing Templates are HIDDEN
  //     (disabled=false) — their functionality lives inside Campaigns now.
  //   - To restore: set `enabled: true` on the hidden items.
  { key: 'campaigns', label: 'Campaigns', icon: 'Megaphone', section: 'Marketing', sortOrder: 30, minPlan: 'growth', upgradeDescription: 'Create and manage marketing campaigns across email, SMS, and WhatsApp to grow your customer base.' },
  { key: 'broadcast', label: 'Broadcast', icon: 'Send', section: 'Marketing', sortOrder: 31 },
  // Template Studio — hidden (merged into Campaigns). Keep entry for audit trail.
  { key: 'templateStudio', label: 'Template Studio', icon: 'LayoutTemplate', section: 'Marketing', sortOrder: 32, minPlan: 'growth', upgradeDescription: 'Design reusable templates for emails, messages, quotes, and invoices.' },
  // Retargeting — hidden (now a campaign type inside Campaigns).
  { key: 'retargeting', label: 'Retargeting', icon: 'RefreshCw', section: 'Marketing', sortOrder: 33 },
  { key: 'marketingAnalytics', label: 'Analytics', icon: 'BarChart3', section: 'Marketing', sortOrder: 34 },
  { key: 'segments', label: 'Segments', icon: 'Filter', section: 'Marketing', sortOrder: 35 },
  // Marketing Templates — hidden (merged into Campaigns).
  { key: 'marketingTemplates', label: 'Marketing Templates', icon: 'MessageSquare', section: 'Marketing', sortOrder: 36 },

  // ─── Inbox & Automation ──────────────────────────────────────────────
  { key: 'omnichannel', label: 'Omnichannel Inbox', icon: 'RadioTower', section: 'Inbox & Automation', sortOrder: 40 },
  { key: 'liveChat', label: 'Live Chat', icon: 'MessageSquare', section: 'Inbox & Automation', sortOrder: 41, minPlan: 'growth', upgradeDescription: 'Real-time live chat with website visitors and customers directly from your dashboard.' },
  { key: 'aiAssistant', label: 'AI Assistant', icon: 'Sparkles', section: 'Inbox & Automation', sortOrder: 42 },
  { key: 'chatbotBuilder', label: 'Chatbot Builder', icon: 'Bot', section: 'Inbox & Automation', sortOrder: 43 },
  { key: 'workflows', label: 'Workflows', icon: 'Workflow', section: 'Inbox & Automation', sortOrder: 44, minPlan: 'growth', upgradeDescription: 'Automate business processes — job assignments, reminders, follow-ups, and multi-step actions.' },
  { key: 'workflowAutomations', label: 'Automations', icon: 'GitBranch', section: 'Inbox & Automation', sortOrder: 45 },
  { key: 'triggers', label: 'Triggers', icon: 'Zap', section: 'Inbox & Automation', sortOrder: 46 },
  { key: 'formBuilder', label: 'Form Builder', icon: 'ClipboardList', section: 'Inbox & Automation', sortOrder: 47, minPlan: 'growth', upgradeDescription: 'Build custom forms for lead capture, surveys, customer intake, and service requests.' },
  { key: 'variables', label: 'Variables', icon: 'Variable', section: 'Inbox & Automation', sortOrder: 48 },
  { key: 'executions', label: 'Executions', icon: 'Activity', section: 'Inbox & Automation', sortOrder: 49 },

  // ─── AI Receptionist ─────────────────────────────────────────────────
  { key: 'aiReceptionist', label: 'AI Receptionist Dashboard', icon: 'PhoneCall', section: 'AI Receptionist', sortOrder: 50, minPlan: 'business', upgradeDescription: 'AI-powered receptionist dashboard for call management, analytics, and performance insights.' },
  { key: 'aiAgents', label: 'AI Agents', icon: 'Bot', section: 'AI Receptionist', sortOrder: 51, minPlan: 'business', upgradeDescription: 'Create and manage AI voice agents for automated call handling, scheduling, and customer support.' },
  { key: 'aiPhoneNumbers', label: 'Phone Numbers', icon: 'PhoneIncoming', section: 'AI Receptionist', sortOrder: 52, minPlan: 'business', upgradeDescription: 'Purchase and manage dedicated phone numbers for your AI receptionist and business communications.' },
  { key: 'aiCallHistory', label: 'Call History', icon: 'PhoneCall', section: 'AI Receptionist', sortOrder: 53, minPlan: 'business', upgradeDescription: 'View call logs, recordings, transcripts, and analytics for all AI receptionist calls.' },

  // ─── Finance ─────────────────────────────────────────────────────────
  { key: 'quotes', label: 'Quotes', icon: 'Receipt', section: 'Finance', sortOrder: 60 },
  { key: 'invoices', label: 'Invoices', icon: 'FileText', section: 'Finance', sortOrder: 61 },
  { key: 'expenses', label: 'Expenses', icon: 'Wallet', section: 'Finance', sortOrder: 62 },
  { key: 'billing', label: 'Subscription', icon: 'CreditCard', section: 'Finance', sortOrder: 63 },

  // ─── Setup & Admin ───────────────────────────────────────────────────
  { key: 'settings', label: 'Settings', icon: 'Settings', section: 'Setup & Admin', sortOrder: 70 },
  { key: 'integrations', label: 'Integrations', icon: 'Plug', section: 'Setup & Admin', sortOrder: 71 },
  { key: 'channels', label: 'Channels & Credentials', icon: 'RadioTower', section: 'Setup & Admin', sortOrder: 72 },
  { key: 'credentials', label: 'Credentials', icon: 'KeyRound', section: 'Setup & Admin', sortOrder: 73 },
  { key: 'communicationProviders', label: 'Providers', icon: 'KeyRound', section: 'Setup & Admin', sortOrder: 74 },
  { key: 'auditLogs', label: 'Audit Logs', icon: 'ScrollText', section: 'Setup & Admin', sortOrder: 75 },
  { key: 'activityLogs', label: 'History', icon: 'History', section: 'Setup & Admin', sortOrder: 76 },
  { key: 'customerPortal', label: 'Customer Portal', icon: 'Globe', section: 'Setup & Admin', sortOrder: 77 },
  { key: 'employeePortal', label: 'Employee Portal', icon: 'HardHat', section: 'Setup & Admin', sortOrder: 78 },
  { key: 'helpCenter', label: 'Help & Support', icon: 'LifeBuoy', section: 'Setup & Admin', sortOrder: 79 },
  { key: 'helpAdminTickets', label: 'Support Tickets', icon: 'Ticket', section: 'Setup & Admin', sortOrder: 80 },
  { key: 'helpAdminKB', label: 'Knowledge Base', icon: 'BookOpen', section: 'Setup & Admin', sortOrder: 81 },
  { key: 'helpAdminCategories', label: 'Categories', icon: 'FolderTree', section: 'Setup & Admin', sortOrder: 82 },
  { key: 'helpAdminAnnouncements', label: 'Announcements', icon: 'Megaphone', section: 'Setup & Admin', sortOrder: 83 },
];

/**
 * Default menu items with `enabled: true` — used to seed the global/tenant
 * config when no config exists yet.
 */
export function getDefaultMenuItems(): Array<MenuCatalogItem & { enabled: boolean }> {
  return MENU_CATALOG.map((item) => ({ ...item, enabled: true }));
}
