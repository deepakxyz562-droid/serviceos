'use client';

import { lazy, Suspense, Component, ReactNode, ErrorInfo, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { useIsMobile } from '@/hooks/use-mobile';
import { AppSidebar } from '@/components/layout/sidebar';
import { AppHeader } from '@/components/layout/header';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTrialStatus, TrialPaywallOverlay } from '@/components/billing/trial-paywall';

// ─── Lazy-loaded views — organized by module ──────────────────────────────────

// Dashboard
const DashboardView = lazy(() => import('@/components/views/dashboard-view').then(m => ({ default: m.DashboardView })));

// CRM
const LeadsView = lazy(() => import('@/components/views/leads-view').then(m => ({ default: m.LeadsView })));
const ContactsView = lazy(() => import('@/components/views/contacts-view').then(m => ({ default: m.ContactsView })));
const CustomersView = lazy(() => import('@/components/views/crm-view').then(m => ({ default: m.CrmView })));
const Customer360View = lazy(() => import('@/components/views/customer-360-view').then(m => ({ default: m.Customer360View })));
const SalesPipelineView = lazy(() => import('@/components/views/sales-pipeline-view').then(m => ({ default: m.SalesPipelineView })));

// Communication
const BroadcastView = lazy(() => import('@/components/views/broadcast-view').then(m => ({ default: m.BroadcastView })));
const CampaignsView = lazy(() => import('@/components/views/campaigns-view').then(m => ({ default: m.CampaignsView })));
const MarketingTemplatesView = lazy(() => import('@/components/views/marketing-templates-view').then(m => ({ default: m.MarketingTemplatesView })));
const OmnichannelView = lazy(() => import('@/components/views/omnichannel-view').then(m => ({ default: m.OmnichannelView })));
const WhatsAppView = lazy(() => import('@/components/views/whatsapp-view').then(m => ({ default: m.WhatsAppView })));

// Automation
const WorkflowsView = lazy(() => import('@/components/views/workflows-view').then(m => ({ default: m.WorkflowsView })));
const CanvasView = lazy(() => import('@/components/views/canvas-view').then(m => ({ default: m.CanvasView })));
const TriggersView = lazy(() => import('@/components/views/triggers-view').then(m => ({ default: m.TriggersView })));
const VariablesView = lazy(() => import('@/components/views/variables-view').then(m => ({ default: m.VariablesView })));
const ExecutionsView = lazy(() => import('@/components/views/executions-view').then(m => ({ default: m.ExecutionsView })));
const FormBuilderView = lazy(() => import('@/components/views/form-builder-view').then(m => ({ default: m.FormBuilderView })));
const WorkflowAutomationsView = lazy(() => import('@/components/views/workflow-automations-view').then(m => ({ default: m.WorkflowAutomationsView })));

// Operations
const BookingView = lazy(() => import('@/components/views/booking-view').then(m => ({ default: m.BookingView })));
const CalendarView = lazy(() => import('@/components/views/calendar-view').then(m => ({ default: m.CalendarView })));
const JobsView = lazy(() => import('@/components/views/jobs-view').then(m => ({ default: m.JobsView })));
const DispatchView = lazy(() => import('@/components/views/dispatch-view').then(m => ({ default: m.DispatchView })));
const EmployeesView = lazy(() => import('@/components/views/employees-view').then(m => ({ default: m.EmployeesView })));
const EmployeePerformanceView = lazy(() => import('@/components/views/employee-performance-view').then(m => ({ default: m.EmployeePerformanceView })));
const TimesheetView = lazy(() => import('@/components/views/timesheet-view').then(m => ({ default: m.TimesheetView })));

// Finance
const QuotesView = lazy(() => import('@/components/views/quotes-view').then(m => ({ default: m.QuotesView })));
const InvoicesView = lazy(() => import('@/components/views/invoices-view').then(m => ({ default: m.InvoicesView })));
const BillingView = lazy(() => import('@/components/views/billing-view').then(m => ({ default: m.BillingView })));
const ExpensesView = lazy(() => import('@/components/views/expenses-view').then(m => ({ default: m.ExpensesView })));

// System
const CredentialsView = lazy(() => import('@/components/views/credentials-view').then(m => ({ default: m.CredentialsView })));
const IntegrationsView = lazy(() => import('@/components/views/integrations-view').then(m => ({ default: m.IntegrationsView })));
const SettingsView = lazy(() => import('@/components/views/settings-view').then(m => ({ default: m.SettingsView })));
const ReportsView = lazy(() => import('@/components/views/reports-view').then(m => ({ default: m.ReportsView })));
const ActivityLogsView = lazy(() => import('@/components/views/activity-logs-view').then(m => ({ default: m.ActivityLogsView })));
const NotificationsView = lazy(() => import('@/components/views/notifications-view').then(m => ({ default: m.NotificationsView })));

// Portals
const CustomerPortalView = lazy(() => import('@/components/views/customer-portal-view').then(m => ({ default: m.CustomerPortalView })));
const EmployeePortalView = lazy(() => import('@/components/views/employee-portal-view').then(m => ({ default: m.EmployeePortalView })));

// AI & Extras
const AiAssistantView = lazy(() => import('@/components/views/ai-assistant-view').then(m => ({ default: m.AiAssistantView })));
const ChatbotBuilderView = lazy(() => import('@/components/views/chatbot-builder-view').then(m => ({ default: m.ChatbotBuilderView })));
const RetargetingView = lazy(() => import('@/components/views/retargeting-view').then(m => ({ default: m.RetargetingView })));
const SegmentsView = lazy(() => import('@/components/views/segments-view').then(m => ({ default: m.SegmentsView })));
const MarketingAnalyticsView = lazy(() => import('@/components/views/marketing-analytics-view').then(m => ({ default: m.MarketingAnalyticsView })));
const ServiceCatalogView = lazy(() => import('@/components/views/service-catalog-view').then(m => ({ default: m.ServiceCatalogView })));
const CommunicationProvidersView = lazy(() => import('@/components/views/communication-providers-view').then(m => ({ default: m.CommunicationProvidersView })));
const ReviewsView = lazy(() => import('@/components/views/reviews-view').then(m => ({ default: m.ReviewsView })));
const LeadDiscoveryView = lazy(() => import('@/components/views/lead-discovery-view').then(m => ({ default: m.LeadDiscoveryView })));
const JourneyAutomationView = lazy(() => import('@/components/views/journey-automation-view').then(m => ({ default: m.JourneyAutomationView })));
const MarketplaceView = lazy(() => import('@/components/views/marketplace-view').then(m => ({ default: m.MarketplaceView })));
const EnterpriseView = lazy(() => import('@/components/views/enterprise-view').then(m => ({ default: m.EnterpriseView })));
const AiCampaignGeneratorView = lazy(() => import('@/components/views/ai-campaign-generator-view').then(m => ({ default: m.AiCampaignGeneratorView })));
const WebviewEngineView = lazy(() => import('@/components/views/webview-engine-view').then(m => ({ default: m.WebviewEngineView })));
const AdsIntegrationView = lazy(() => import('@/components/views/ads-integration-view').then(m => ({ default: m.AdsIntegrationView })));
const KnowledgeBaseView = lazy(() => import('@/components/views/knowledge-base-view').then(m => ({ default: m.KnowledgeBaseView })));
const DocumentCenterView = lazy(() => import('@/components/views/document-center-view').then(m => ({ default: m.DocumentCenterView })));
const VersionHistoryView = lazy(() => import('@/components/views/version-history-view').then(m => ({ default: m.VersionHistoryView })));
const SaaSDashboardView = lazy(() => import('@/components/views/saas-dashboard-view').then(m => ({ default: m.SaaSDashboardView })));
const OperationsView = lazy(() => import('@/components/views/operations-view').then(m => ({ default: m.OperationsView })));
const CrmView = lazy(() => import('@/components/views/crm-view').then(m => ({ default: m.CrmView })));

// Audience (enterprise CRM: Contacts → Groups → Tags → Segments → Campaigns)
const GroupsView = lazy(() => import('@/components/views/groups-view').then(m => ({ default: m.GroupsView })));
const TagsView = lazy(() => import('@/components/views/tags-view').then(m => ({ default: m.TagsView })));
const ContactImportsView = lazy(() => import('@/components/views/contact-imports-view').then(m => ({ default: m.ContactImportsView })));
const ContactExportsView = lazy(() => import('@/components/views/contact-exports-view').then(m => ({ default: m.ContactExportsView })));
const AudienceAnalyticsView = lazy(() => import('@/components/views/audience-analytics-view').then(m => ({ default: m.AudienceAnalyticsView })));
const EmailCampaignsView = lazy(() => import('@/components/views/email-campaigns-view').then(m => ({ default: m.EmailCampaignsView })));
const EmailProvidersView = lazy(() => import('@/components/views/email-providers-view').then(m => ({ default: m.EmailProvidersView })));
const EmailTemplatesView = lazy(() => import('@/components/views/email-templates-view').then(m => ({ default: m.EmailTemplatesView })));
const ChannelsView = lazy(() => import('@/components/views/channels-view'));

// Template Studio
const TemplateStudioView = lazy(() => import('@/components/templates/template-studio-view').then(m => ({ default: m.TemplateStudioView })));

// Super Admin
const SuperAdminView = lazy(() => import('@/components/views/superadmin-view').then(m => ({ default: m.SuperAdminView })));

// Help & Support Center
const HelpCenterView = lazy(() => import('@/components/views/help-center-view').then(m => ({ default: m.HelpCenterView })));
const HelpAdminView = lazy(() => import('@/components/views/help-admin-view').then(m => ({ default: m.HelpAdminView })));

// ─── View mapping ───────────────────────────────────────────────────────────

const viewComponents: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  // Dashboard
  dashboard: DashboardView,
  // CRM
  leads: LeadsView,
  contacts: ContactsView,
  customers: CustomersView,
  crm: CrmView,
  customer360: Customer360View,
  salesPipeline: SalesPipelineView,
  // Communication
  broadcast: BroadcastView,
  campaigns: CampaignsView,
  marketingTemplates: MarketingTemplatesView,
  omnichannel: OmnichannelView,
  whatsapp: WhatsAppView,
  // Automation
  workflows: WorkflowsView,
  canvas: CanvasView,
  triggers: TriggersView,
  variables: VariablesView,
  executions: ExecutionsView,
  formBuilder: FormBuilderView,
  workflowAutomations: WorkflowAutomationsView,
  // Operations
  operations: OperationsView,
  booking: BookingView,
  calendar: CalendarView,
  jobs: JobsView,
  dispatch: DispatchView,
  employees: EmployeesView,
  employeePerformance: EmployeePerformanceView,
  timesheet: TimesheetView,
  // Finance
  quotes: QuotesView,
  invoices: InvoicesView,
  billing: BillingView,
  expenses: ExpensesView,
  // System
  credentials: CredentialsView,
  integrations: IntegrationsView,
  settings: SettingsView,
  auditLogs: ReportsView,
  activityLogs: ActivityLogsView,
  reports: ReportsView,
  notifications: NotificationsView,
  // Portals
  customerPortal: CustomerPortalView,
  employeePortal: EmployeePortalView,
  // AI & Extras
  aiAssistant: AiAssistantView,
  chatbotBuilder: ChatbotBuilderView,
  retargeting: RetargetingView,
  segments: SegmentsView,
  marketingAnalytics: MarketingAnalyticsView,
  serviceCatalog: ServiceCatalogView,
  communicationProviders: CommunicationProvidersView,
  reviews: ReviewsView,
  leadDiscovery: LeadDiscoveryView,
  journeyAutomation: JourneyAutomationView,
  marketplace: MarketplaceView,
  enterprise: EnterpriseView,
  aiCampaignGenerator: AiCampaignGeneratorView,
  webviewEngine: WebviewEngineView,
  adsIntegration: AdsIntegrationView,
  knowledgeBase: KnowledgeBaseView,
  documentCenter: DocumentCenterView,
  versionHistory: VersionHistoryView,
  saasDashboard: SaaSDashboardView,
  // Audience
  groups: GroupsView,
  tags: TagsView,
  contactImports: ContactImportsView,
  contactExports: ContactExportsView,
  audienceAnalytics: AudienceAnalyticsView,
  emailCampaigns: EmailCampaignsView,
  emailProviders: EmailProvidersView,
  emailTemplates: EmailTemplatesView,
  channels: ChannelsView,
  // Template Studio
  templateStudio: TemplateStudioView,
  // Super Admin
  superadmin: SuperAdminView,
  // Help & Support Center
  helpCenter: HelpCenterView,
  helpTicketDetail: HelpCenterView,
  helpAdminTickets: HelpAdminView,
  helpAdminTicketDetail: HelpAdminView,
  helpAdminKB: HelpAdminView,
  helpAdminCategories: HelpAdminView,
  helpAdminAnnouncements: HelpAdminView,
};

// ─── Loading fallback ────────────────────────────────────────────────────────

function ViewLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-8 animate-spin text-emerald-500" />
        <span className="text-muted-foreground text-sm">Loading view...</span>
      </div>
    </div>
  );
}

// ─── Error Boundary ──────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ViewErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('View component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      const isChunkError = this.state.error?.message?.includes('Failed to load chunk') || this.state.error?.message?.includes('ChunkLoadError');
      return (
        <div className="flex items-center justify-center min-h-[50vh] p-4">
          <div className="flex flex-col items-center gap-4 max-w-md text-center p-6">
            <div className="size-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertTriangle className="size-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Something went wrong</h3>
            <p className="text-sm text-muted-foreground">
              {isChunkError
                ? 'A resource failed to load. This usually happens when the server is restarting. Please reload the page.'
                : 'This section failed to load. You can try refreshing it.'}
            </p>
            {isChunkError ? (
              <Button size="sm" onClick={() => window.location.reload()} className="gap-2">
                <RefreshCw className="size-3.5" />
                Reload Page
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => this.setState({ hasError: false, error: null })} className="gap-2">
                <RefreshCw className="size-3.5" />
                Try Again
              </Button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

interface AppLayoutProps {
  onLogout?: () => void;
}

export function AppLayout({ onLogout }: AppLayoutProps) {
  const { currentView, darkMode } = useAppStore();
  const isMobile = useIsMobile();
  const trialStatus = useTrialStatus();

  // Sync dark mode to <html> so that <body> (which carries `bg-background`
  // but lives outside this wrapper) also picks up the dark background vars.
  // The wrapper is `fixed inset-0` and covers the full viewport, so this is
  // purely defensive — it ensures any sub-pixel rendering gap below the
  // wrapper is the same color as the nav, invisible in both light and dark.
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    return () => { root.classList.remove('dark'); };
  }, [darkMode]);

  // Resolve the active view component
  const ActiveView = viewComponents[currentView] || DashboardView;

  // Canvas view needs no padding for full-screen editor
  const isCanvas = currentView === 'canvas';

  // ─── Full-takeover console: SuperAdmin owns the entire viewport ─────────
  // The superadmin shell has its OWN top bar + left sidebar + bottom status
  // bar. Rendering the app sidebar/header/bottom-nav alongside it produces
  // a confusing "double sidebar" (two competing navigation columns with
  // overlapping group names like "Platform" and "Operations"). When the
  // superadmin console is active we hand over the full viewport to it and
  // skip the tenant app chrome entirely. The superadmin top bar exposes a
  // "Back to App" button that restores the normal tenant shell.
  const isSuperAdminConsole = currentView === 'superadmin';

  // ─── SuperAdmin console — full-takeover (no app sidebar / header / bottom
  // nav). The console component renders its own three-panel layout. ───────
  if (isSuperAdminConsole) {
    return (
      <div className={cn('fixed inset-0 flex overflow-hidden bg-background', darkMode && 'dark')}>
        <ViewErrorBoundary>
          <Suspense fallback={<ViewLoader />}>
            <SuperAdminView />
          </Suspense>
        </ViewErrorBoundary>
        {/* Trial paywall still applies — superadmin can be locked out too. */}
        <TrialPaywallOverlay trialStatus={trialStatus} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'fixed inset-0 flex overflow-hidden bg-background',
        darkMode && 'dark',
      )}
    >
      <AppSidebar onLogout={onLogout} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader onLogout={onLogout} />

        <main
          className={cn(
            'flex-1 overflow-auto animate-fade-in',
            isCanvas
              ? 'p-0'
              : isMobile
                ? 'p-3 sm:p-4 bg-background pb-[calc(4rem+env(safe-area-inset-bottom,0px))]'
                : 'p-4 lg:p-6 bg-background',
          )}
        >
          <ViewErrorBoundary>
            <Suspense fallback={<ViewLoader />}>
              <ActiveView />
            </Suspense>
          </ViewErrorBoundary>
        </main>

        {/* Mobile bottom nav — `position: fixed; bottom: 0` so it touches the
            TRUE screen bottom on iOS standalone (the `fixed inset-0` wrapper
            + `100dvh` approach does NOT reliably reach the bottom on iOS WebKit
            in standalone PWA mode, leaving a ~34px gap below the nav). The
            nav's own `paddingBottom: env(safe-area-inset-bottom)` fills the
            home-indicator zone. <main> has matching bottom padding so content
            is not hidden behind the fixed nav. Since both <main> and the nav
            use `bg-background`, the padding area is the same color as the nav
            — no visible gap when content is shorter than the viewport. */}
        <MobileBottomNav />
      </div>

      {/* Trial-expiry paywall overlay — blocks all views except 'billing'
          when the tenant's trial has expired. Forces the user to add a
          payment method via the sidebar Subscription page. */}
      <TrialPaywallOverlay trialStatus={trialStatus} />
    </div>
  );
}
