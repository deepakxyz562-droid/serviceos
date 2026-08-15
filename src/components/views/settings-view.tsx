'use client';

/**
 * SettingsView — thin config-driven shell for the Business Owner
 * Settings surface, now organized into 9 enterprise-level groups.
 *
 * Renders:
 *   - A page header showing the active section's icon + label + description
 *   - A command-palette-style SettingsSearch at the top
 *   - A left SettingsSidebar (sticky on desktop, Sheet drawer on mobile)
 *   - The active section's component on the right
 *
 * Sections with real UI:
 *   - Company, Marketplace, Team, Integrations, AI (existing tabs)
 *   - Communication (auto-reply card)
 *   - Automations (real, functional UI)
 *   - Google Business Profile (real, functional UI)
 *   - Dedicated Phone Number (embeds SmsNumbersView)
 *
 * All other sections render a "Coming Soon" placeholder card with a
 * preview of what will be configured there.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Package,
  Braces,
  Wallet,
  Workflow,
  Network,
  Activity,
  Briefcase,
  MapPin,
  ListChecks,
  Globe,
  Mail,
  CalendarCheck,
  Plug,
  Bot,
  KeyRound,
  Link2,
  CreditCard,
  Receipt,
  ScrollText,
  History,
  Shield,
  Code,
  LifeBuoy,
  DollarSign,
  Search as SearchIcon,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SettingsSidebar } from '@/components/settings/settings-sidebar';
import { SettingsSearch } from '@/components/settings/settings-search';
import { getSettingsSection, SETTINGS_SECTIONS } from '@/components/settings/settings-config';
import { getSettingsIcon } from '@/components/settings/settings-icons';

import { CompanySettings } from '@/components/settings/sections/company-settings';
import { MarketplaceSettings } from '@/components/settings/sections/marketplace-settings';
import { CrmSettings } from '@/components/settings/sections/crm-settings';
import { JobsSchedulingSettings } from '@/components/settings/sections/jobs-scheduling-settings';
import { FinanceSettings } from '@/components/settings/sections/finance-settings';
import { BrandBrainView } from '@/components/views/tenant/brand-brain-view';
import { TeamSettings } from '@/components/settings/sections/team-settings';
import { CustomersSettings } from '@/components/settings/sections/customers-settings';
import { CommunicationSettings } from '@/components/settings/sections/communication-settings';
import { AiSettings } from '@/components/settings/sections/ai-settings';
import { IntegrationsSettings } from '@/components/settings/sections/integrations-settings';
import { AutomationsSettings } from '@/components/settings/sections/automations-settings';
import { SecuritySettings } from '@/components/settings/sections/security-settings';
import { DeveloperSettings } from '@/components/settings/sections/developer-settings';
import { BillingSettings } from '@/components/settings/sections/billing-settings';
import { GoogleBusinessProfileSettings } from '@/components/settings/sections/google-business-profile-settings';
import { DedicatedPhoneSettings } from '@/components/settings/sections/dedicated-phone-settings';
import { WorkSettings } from '@/components/settings/sections/work-settings';
import { TimesheetSettings } from '@/components/settings/sections/timesheet-settings';
import { AiAutoReplySettings } from '@/components/settings/sections/ai-auto-reply-settings';
import { PaymentIntegrationsSettings } from '@/components/settings/sections/payment-integrations-settings';
import { BusinessProfileSettings } from '@/components/settings/sections/business-profile-section';
import { GenericPlaceholder } from '@/components/settings/sections/generic-placeholder';

// Embed full developed views inside Settings (single source of truth pattern).
import { ServiceCatalogView } from '@/components/views/service-catalog-view';
import { WorkflowsView } from '@/components/views/workflows-view';
import { ChecklistBuilder } from '@/components/views/checklists-view';
import { FormBuilderView } from '@/components/views/form-builder-view';
import ChannelsView from '@/components/views/channels-view';
import { CredentialsView } from '@/components/views/credentials-view';
import { EmailTemplatesView } from '@/components/views/email-templates-view';
import { ActivityLogsView } from '@/components/views/activity-logs-view';
import { HistoryView } from '@/components/views/history-view';
import { HelpCenterView } from '@/components/views/help-center-view';
import { BillingView } from '@/components/views/billing-view';
import { ExpensesView } from '@/components/views/expenses-view';
import { CustomerPortalView } from '@/components/views/customer-portal-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/store/app-store';

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Normalize legacy kebab-case industry values to the canonical Title-Case
 * form. Mirrors the normalizer inside company-settings.tsx so the
 * Marketplace section receives the same value the Company form just saved.
 */
function normalizeIndustry(value: string): string {
  if (!value) return '';
  const map: Record<string, string> = {
    'home-services': 'Home Services',
    'packers-movers': 'Moving',
    'plumbing': 'Plumbing',
    'cleaning': 'Cleaning',
    'window-cleaning': 'Cleaning',
    'pest-control': 'Pest Control',
    'hvac': 'HVAC',
    'electrical': 'Electrical',
    'landscaping': 'Landscaping',
    'courier': 'Moving',
    'home-repair': 'Home Services',
    'salon-beauty': 'Other',
    'roofing': 'Roofing',
    'painting': 'Painting',
  };
  return map[value.toLowerCase()] || value;
}

// ─── Placeholder configs for new sections ──────────────────────────────────

const PLACEHOLDER_CONFIGS: Record<string, {
  title: string;
  description: string;
  icon: typeof Building2;
  accent?: 'emerald' | 'amber' | 'sky' | 'rose' | 'violet' | 'slate';
  items: Array<{ label: string; hint?: string }>;
}> = {
  'products-services': {
    title: 'Products & Services',
    description: 'Service catalog, product catalog, pricing tiers, service categories',
    icon: Package,
    accent: 'emerald',
    items: [
      { label: 'Service Catalog', hint: 'Define services with pricing, duration, category' },
      { label: 'Product Catalog', hint: 'Physical products with SKU, price, stock' },
      { label: 'Pricing Tiers', hint: 'Tiered pricing for different customer segments' },
      { label: 'Service Categories', hint: 'Group services for booking & reporting' },
    ],
  },
  'custom-fields': {
    title: 'Custom Fields',
    description: 'Custom fields for contacts, jobs, invoices. Includes Form Builder for custom intake forms',
    icon: Braces,
    accent: 'violet',
    items: [
      { label: 'Contact Custom Fields', hint: 'Add custom data fields to contact records' },
      { label: 'Job Custom Fields', hint: 'Capture job-specific data (e.g. appliance model)' },
      { label: 'Invoice Custom Fields', hint: 'Add custom line items or metadata' },
      { label: 'Form Builder', hint: 'Drag-and-drop custom intake forms for bookings' },
    ],
  },
  'expense-tracking': {
    title: 'Expense Tracking',
    description: 'Expense categories, receipt rules, mileage, vendor management, export',
    icon: Wallet,
    accent: 'emerald',
    items: [
      { label: 'Expense Categories', hint: 'Define categories for tax classification' },
      { label: 'Receipt Upload Rules', hint: 'Auto-categorize expenses from receipts' },
      { label: 'Mileage Tracking', hint: 'Track mileage for jobs and reimbursements' },
      { label: 'Vendor Management', hint: 'Track recurring vendor expenses' },
      { label: 'Export', hint: 'Export to CSV for tax filing & accounting' },
    ],
  },
  'workflows': {
    title: 'Workflows',
    description: 'Visual workflow builder — multi-step automations with branching logic',
    icon: Workflow,
    accent: 'violet',
    items: [
      { label: 'Visual Builder', hint: 'Drag-and-drop canvas for multi-step workflows' },
      { label: 'Branching Logic', hint: 'If/then/else branching with AND/OR groups' },
      { label: 'Triggers', hint: 'Events that start a workflow (new lead, job done)' },
      { label: 'Actions', hint: 'Send email, create task, update field, call webhook' },
      { label: 'Templates', hint: 'Pre-built workflows for common scenarios' },
    ],
  },
  'organization': {
    title: 'Organization',
    description: 'Org chart, departments, reporting structure, business entity',
    icon: Network,
    accent: 'sky',
    items: [
      { label: 'Org Chart', hint: 'Visual reporting hierarchy' },
      { label: 'Departments', hint: 'Define departments and team leads' },
      { label: 'Business Entity', hint: 'Legal entity info for invoicing & tax' },
    ],
  },
  'account-activity': {
    title: 'Account Activity',
    description: 'User login history, session activity, IP addresses, device tracking',
    icon: Activity,
    accent: 'sky',
    items: [
      { label: 'Login History', hint: 'Who logged in when, from where' },
      { label: 'Active Sessions', hint: 'Revoke suspicious sessions' },
      { label: 'Device Tracking', hint: 'Known devices and trusted status' },
    ],
  },
  'work-settings': {
    title: 'Work Settings',
    description: 'Working hours, leave policies, overtime rules, shift templates',
    icon: Briefcase,
    accent: 'sky',
    items: [
      { label: 'Working Hours', hint: 'Default business hours per team member' },
      { label: 'Leave Policies', hint: 'PTO, sick leave, holiday policies' },
      { label: 'Overtime Rules', hint: 'Daily/weekly overtime thresholds' },
      { label: 'Shift Templates', hint: 'Reusable shift patterns for scheduling' },
    ],
  },
  'location-services': {
    title: 'Location Services',
    description: 'Service zones, geo-fencing, travel radius, service area mapping',
    icon: MapPin,
    accent: 'amber',
    items: [
      { label: 'Service Zones', hint: 'Define geographic service areas' },
      { label: 'Geo-fencing', hint: 'Auto-assign jobs based on location' },
      { label: 'Travel Radius', hint: 'Limit bookings to within X miles/km' },
      { label: 'Service Area Map', hint: 'Visual map of your coverage area' },
    ],
  },
  'checklists': {
    title: 'Checklists',
    description: 'Job checklists, visit checklists, inspection forms, completion rules',
    icon: ListChecks,
    accent: 'amber',
    items: [
      { label: 'Job Checklists', hint: 'Required steps per job type' },
      { label: 'Visit Checklists', hint: 'Per-visit completion checklists' },
      { label: 'Inspection Forms', hint: 'Photo + text inspection reports' },
      { label: 'Completion Rules', hint: 'Block job close until checklist done' },
    ],
  },
  'client-hub': {
    title: 'Client Hub',
    description: 'Customer portal config, online booking rules, self-service options',
    icon: Globe,
    accent: 'emerald',
    items: [
      { label: 'Portal Branding', hint: 'Custom logo, colors for customer portal' },
      { label: 'Online Booking Rules', hint: 'What customers can book, lead times' },
      { label: 'Self-Service Options', hint: 'Reschedule, cancel, pay invoices' },
      { label: 'Portal URL', hint: 'Custom subdomain for your client hub' },
    ],
  },
  'emails': {
    title: 'Emails',
    description: 'Email templates, sender identity, signature, notification rules',
    icon: Mail,
    accent: 'emerald',
    items: [
      { label: 'Email Templates', hint: 'Pre-built templates for common scenarios' },
      { label: 'Sender Identity', hint: 'From name, from email, reply-to' },
      { label: 'Email Signature', hint: 'Default signature for all outgoing emails' },
      { label: 'Notification Rules', hint: 'Who gets notified of what event' },
    ],
  },
  'requests-bookings': {
    title: 'Requests and Bookings',
    description: 'Request intake forms, booking rules, approval workflow, auto-assignment',
    icon: CalendarCheck,
    accent: 'emerald',
    items: [
      { label: 'Request Intake Forms', hint: 'Custom forms for service requests' },
      { label: 'Booking Rules', hint: 'Lead time, buffer, max bookings per day' },
      { label: 'Approval Workflow', hint: 'Require approval before booking confirmed' },
      { label: 'Auto-Assignment', hint: 'Auto-assign bookings to available team' },
    ],
  },
  'connected-apps': {
    title: 'Connected Apps',
    description: 'Client-facing integrations, embeddable widgets, booking links',
    icon: Plug,
    accent: 'violet',
    items: [
      { label: 'Embeddable Widgets', hint: 'Booking widget for your website' },
      { label: 'Booking Links', hint: 'Shareable booking URLs' },
      { label: 'Client Portal Apps', hint: 'White-label client portal apps' },
    ],
  },
  'ai-auto-reply': {
    title: 'AI Auto-Reply',
    description: 'Auto-reply when offline, AI message generation, call reply configuration',
    icon: Bot,
    accent: 'violet',
    items: [
      { label: 'Offline Auto-Reply', hint: 'Scripted or AI-generated replies when team offline' },
      { label: 'AI Message Generation', hint: 'Contextual responses using your knowledge base' },
      { label: 'Call Reply Config', hint: 'AI-answered calls with custom voice & script' },
      { label: 'Quiet Hours', hint: 'When auto-reply is active' },
    ],
  },
  'channels-credentials': {
    title: 'Channels & Credentials',
    description: 'API keys, provider credentials, secure vault for all channel configs',
    icon: KeyRound,
    accent: 'amber',
    items: [
      { label: 'API Keys', hint: 'Provider API keys (Twilio, SendGrid, etc.)' },
      { label: 'Secure Vault', hint: 'Encrypted storage for all credentials' },
      { label: 'Channel Status', hint: 'Which channels are connected and active' },
    ],
  },
  'payment-integrations': {
    title: 'Payment Integrations',
    description: 'Stripe, PayPal, Square, payment gateway config',
    icon: CreditCard,
    accent: 'emerald',
    items: [
      { label: 'Stripe', hint: 'Credit card processing' },
      { label: 'PayPal', hint: 'PayPal payment integration' },
      { label: 'Square', hint: 'Point-of-sale payments' },
    ],
  },
  'account-connections': {
    title: 'Account Connections',
    description: 'Google, Microsoft, OAuth connections, calendar sync, email sync',
    icon: Link2,
    accent: 'violet',
    items: [
      { label: 'Google Workspace', hint: 'Gmail, Google Calendar, Contacts sync' },
      { label: 'Microsoft 365', hint: 'Outlook, Teams, Calendar sync' },
      { label: 'OAuth Connections', hint: 'Manage connected OAuth apps' },
    ],
  },
  'subscription': {
    title: 'Subscription',
    description: 'Current plan, upgrade/downgrade, billing cycle, plan features',
    icon: CreditCard,
    accent: 'emerald',
    items: [
      { label: 'Current Plan', hint: 'View your current subscription tier' },
      { label: 'Upgrade/Downgrade', hint: 'Change your plan at any time' },
      { label: 'Billing Cycle', hint: 'Monthly or annual billing' },
      { label: 'Plan Features', hint: 'What is included in your plan' },
    ],
  },
  'invoices-payments': {
    title: 'Invoices & Payments',
    description: 'Billing history, invoice download, payment receipts, tax documents',
    icon: Receipt,
    accent: 'emerald',
    items: [
      { label: 'Billing History', hint: 'All past invoices' },
      { label: 'Invoice Download', hint: 'PDF download for accounting' },
      { label: 'Payment Receipts', hint: 'Receipts for completed payments' },
      { label: 'Tax Documents', hint: 'Annual tax statements' },
    ],
  },
  'expenses': {
    title: 'Expenses',
    description: 'Business expenses, receipt upload, categorization, export for tax',
    icon: Wallet,
    accent: 'emerald',
    items: [
      { label: 'Expense Entry', hint: 'Log business expenses' },
      { label: 'Receipt Upload', hint: 'Attach receipts to expenses' },
      { label: 'Categorization', hint: 'Auto-categorize for tax purposes' },
      { label: 'Export', hint: 'Export to CSV or accounting software' },
    ],
  },
  'payment-methods': {
    title: 'Payment Methods',
    description: 'Saved cards, bank accounts, default payment method, auto-pay',
    icon: CreditCard,
    accent: 'emerald',
    items: [
      { label: 'Saved Cards', hint: 'Credit cards on file' },
      { label: 'Bank Accounts', hint: 'ACH bank accounts on file' },
      { label: 'Default Method', hint: 'Primary payment method' },
      { label: 'Auto-Pay', hint: 'Automatic subscription renewal' },
    ],
  },
  'audit-logs': {
    title: 'Audit Logs',
    description: 'System audit trail, admin actions, config changes, compliance log',
    icon: ScrollText,
    accent: 'slate',
    items: [
      { label: 'Admin Actions', hint: 'Log of all administrative actions' },
      { label: 'Config Changes', hint: 'Track who changed what settings' },
      { label: 'Compliance Log', hint: 'Immutable audit trail for compliance' },
      { label: 'Export', hint: 'Export audit logs for external review' },
    ],
  },
  'history': {
    title: 'History',
    description: 'Activity history, record changes, undo log, timeline view',
    icon: History,
    accent: 'slate',
    items: [
      { label: 'Activity History', hint: 'Timeline of all activity' },
      { label: 'Record Changes', hint: 'Track changes to records over time' },
      { label: 'Undo Log', hint: 'Revert recent changes' },
    ],
  },
  'help-support': {
    title: 'Help & Support',
    description: 'Support tickets, knowledge base, contact support, system status',
    icon: LifeBuoy,
    accent: 'sky',
    items: [
      { label: 'Support Tickets', hint: 'Submit and track support requests' },
      { label: 'Knowledge Base', hint: 'Browse help articles and guides' },
      { label: 'Contact Support', hint: 'Direct line to our support team' },
      { label: 'System Status', hint: 'Real-time platform status' },
    ],
  },
};

// ─── Component ─────────────────────────────────────────────────────────────

export function SettingsView() {
  // Consume any pending deep-link target section (e.g. when the user clicked
  // "Configure AI Voice" on the AI Receptionist view). Falls back to 'company'
  // when no pending section is set. Cleared after consumption so a refresh
  // returns to the default 'company' section.
  const pendingSettingsSection = useAppStore((s) => s.pendingSettingsSection);
  const setPendingSettingsSection = useAppStore((s) => s.setPendingSettingsSection);
  const [activeSection, setActiveSection] = useState(
    () => pendingSettingsSection || 'company',
  );

  // Clear the pending signal once consumed so a subsequent refresh or
  // settings open doesn't re-target the same section unexpectedly.
  useEffect(() => {
    if (pendingSettingsSection) {
      setPendingSettingsSection(null);
    }
  }, [pendingSettingsSection, setPendingSettingsSection]);

  // Shared tenant snapshot — Marketplace section needs tenantId/industry/slug
  // for its URL preview. Company section owns its own form state but calls
  // `refreshTenant` after a successful save so this snapshot stays in sync.
  const [tenant, setTenant] = useState<{
    id: string | null;
    industry: string;
    slug: string;
  }>({ id: null, industry: '', slug: '' });
  const [tenantLoading, setTenantLoading] = useState(true);
  // Track whether the current user is a platform admin (superadmin or admin
  // without a tenant). MarketplaceSettings uses this to show a different
  // message instead of the misleading "Complete onboarding" copy.
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  const refreshTenant = useCallback(async () => {
    setTenantLoading(true);
    try {
      const res = await fetch('/api/auth/me?XTransformPort=3000');
      if (res.ok) {
        const data = await res.json();
        const t = data.tenant;
        if (t) {
          setTenant({
            id: t.id,
            industry: normalizeIndustry(t.industry || ''),
            slug: t.slug || '',
          });
        }
        // Detect platform admin: superadmin flag, superadmin role, or admin
        // role without a tenantId (the legacy platform-admin pattern).
        const u = data.user;
        if (u) {
          const platformAdmin =
            u.isSuperAdmin === true ||
            u.role === 'superadmin' ||
            u.role === 'super_admin' ||
            (u.role === 'admin' && !u.tenantId);
          setIsPlatformAdmin(platformAdmin);
        }
      }
    } catch {
      // silently fail — Marketplace section will render its "no tenant" state
    } finally {
      setTenantLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTenant();
  }, [refreshTenant]);

  const activeConfig = getSettingsSection(activeSection);
  const ActiveIcon = activeConfig ? getSettingsIcon(activeConfig.icon) : null;

  const renderActiveSection = () => {
    switch (activeSection) {
      // ─── Real, wired sections ────────────────────────────────────────────
      case 'company':
        return <CompanySettings onSaved={refreshTenant} />;
      case 'marketplace':
        return (
          <MarketplaceSettings
            tenantId={tenant.id}
            industry={tenant.industry}
            slug={tenant.slug}
            loading={tenantLoading}
            isPlatformAdmin={isPlatformAdmin}
          />
        );
      case 'crm':
        return <CrmSettings />;
      case 'jobs-scheduling':
        return <JobsSchedulingSettings />;
      case 'finance':
        return <FinanceSettings />;
      case 'team':
        return <TeamSettings />;
      case 'customers':
        return <CustomersSettings />;
      case 'communication':
        return <CommunicationSettings />;
      case 'ai':
        return <AiSettings />;
      case 'integrations':
        return <IntegrationsSettings />;
      case 'automations':
        return <AutomationsSettings />;
      case 'security':
        return <SecuritySettings />;
      case 'developer':
        return <DeveloperSettings />;
      case 'billing':
        return <BillingSettings />;
      case 'google-business-profile':
        return <GoogleBusinessProfileSettings />;
      case 'brand-brain':
        return <BrandBrainView />;
      case 'dedicated-phone':
        return <DedicatedPhoneSettings onNavigateSection={setActiveSection} />;

      // ─── Sections that embed developed views (Phase 2 mapping) ──────────
      case 'products-services':
        return <ServiceCatalogView />;
      case 'workflows':
        return <WorkflowsView />;
      case 'checklists':
        return <ChecklistBuilder />;
      case 'custom-fields':
        return <FormBuilderView />;
      case 'channels-credentials':
        return (
          <Tabs defaultValue="channels" className="w-full">
            <TabsList>
              <TabsTrigger value="channels">Channels</TabsTrigger>
              <TabsTrigger value="credentials">Credentials</TabsTrigger>
            </TabsList>
            <TabsContent value="channels" className="mt-4">
              <ChannelsView />
            </TabsContent>
            <TabsContent value="credentials" className="mt-4">
              <CredentialsView />
            </TabsContent>
          </Tabs>
        );
      case 'emails':
        return <EmailTemplatesView />;
      case 'audit-logs':
        return <ActivityLogsView />;
      case 'history':
        return <HistoryView />;
      case 'help-support':
        return <HelpCenterView />;
      case 'subscription':
        return <BillingView />;
      case 'expenses':
        return <ExpensesView />;

      // ─── Phase 3: newly built DB-backed settings sections ───────────────
      case 'work-settings':
        return <WorkSettings />;
      case 'timesheet-settings':
        return <TimesheetSettings />;
      case 'ai-auto-reply':
        return <AiAutoReplySettings />;
      case 'payment-integrations':
        return <PaymentIntegrationsSettings />;

      // ─── Business Profile (real UI — was a placeholder until ISSUE-4) ──
      case 'business-profile':
        return <BusinessProfileSettings onSaved={refreshTenant} />;

      // ─── Placeholder sections (Coming Soon) ─────────────────────────────
      default: {
        const config = PLACEHOLDER_CONFIGS[activeSection];
        if (config) {
          return (
            <GenericPlaceholder
              title={config.title}
              description={config.description}
              icon={config.icon}
              accent={config.accent}
              configuredItems={config.items}
            />
          );
        }
        // Fallback to Company if section not found
        return <CompanySettings onSaved={refreshTenant} />;
      }
    }
  };

  return (
    <div className="w-full">
      {/* Page header — shows the active section's icon + label + description */}
      <header className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2.5">
          {ActiveIcon && <ActiveIcon className="size-5 sm:size-6 text-emerald-600" />}
          <span>{activeConfig?.label ?? 'Settings'}</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-3xl">
          {activeConfig?.description}
        </p>
      </header>

      {/* Command-palette search — filters across all sections.
          Made prominent (card + heading + helper) so users notice it
          instead of scrolling through 40+ sections to find what they need. */}
      <div className="mb-6 rounded-xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-transparent dark:from-emerald-950/20 dark:border-emerald-900/40 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-2">
          <SearchIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-sm font-semibold text-foreground">Find a setting</h2>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Search across all {SETTINGS_SECTIONS.length} sections by name, keyword, or description
          </span>
        </div>
        <SettingsSearch activeSectionId={activeSection} onSelect={setActiveSection} />
      </div>

      {/* Layout: sticky sidebar (desktop) / Sheet drawer (mobile) + content */}
      <div className="flex flex-col lg:flex-row gap-6">
        <SettingsSidebar
          activeSectionId={activeSection}
          onSelect={setActiveSection}
        />
        <main className="flex-1 min-w-0">
          {renderActiveSection()}
        </main>
      </div>
    </div>
  );
}
