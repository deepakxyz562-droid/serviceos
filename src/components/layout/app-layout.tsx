'use client';

import { lazy, Suspense, Component, ReactNode, ErrorInfo } from 'react';
import { useAppStore } from '@/store/app-store';
import { useIsMobile } from '@/hooks/use-mobile';
import { AppSidebar } from '@/components/layout/sidebar';
import { AppHeader } from '@/components/layout/header';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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

// Finance
const QuotesView = lazy(() => import('@/components/views/quotes-view').then(m => ({ default: m.QuotesView })));
const InvoicesView = lazy(() => import('@/components/views/invoices-view').then(m => ({ default: m.InvoicesView })));
const BillingView = lazy(() => import('@/components/views/billing-view').then(m => ({ default: m.BillingView })));

// System
const CredentialsView = lazy(() => import('@/components/views/credentials-view').then(m => ({ default: m.CredentialsView })));
const IntegrationsView = lazy(() => import('@/components/views/integrations-view').then(m => ({ default: m.IntegrationsView })));
const SettingsView = lazy(() => import('@/components/views/settings-view').then(m => ({ default: m.SettingsView })));
const ReportsView = lazy(() => import('@/components/views/reports-view').then(m => ({ default: m.ReportsView })));

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

// Super Admin
const SuperAdminView = lazy(() => import('@/components/views/superadmin-view').then(m => ({ default: m.SuperAdminView })));

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
  // Finance
  quotes: QuotesView,
  invoices: InvoicesView,
  billing: BillingView,
  // System
  credentials: CredentialsView,
  integrations: IntegrationsView,
  settings: SettingsView,
  auditLogs: ReportsView,
  reports: ReportsView,
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
  // Super Admin
  superadmin: SuperAdminView,
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

  // Resolve the active view component
  const ActiveView = viewComponents[currentView] || DashboardView;

  // Canvas view needs no padding for full-screen editor
  const isCanvas = currentView === 'canvas';

  return (
    <div className={cn('h-[100dvh] flex overflow-hidden bg-background', darkMode && 'dark')}>
      <AppSidebar onLogout={onLogout} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader />

        <main
          className={cn(
            'flex-1 overflow-auto animate-fade-in',
            isCanvas ? 'p-0' : isMobile ? 'p-3 sm:p-4 bg-muted/30' : 'p-4 lg:p-6 bg-muted/30',
            isMobile && 'pb-mobile-nav'
          )}
        >
          <ViewErrorBoundary>
            <Suspense fallback={<ViewLoader />}>
              <ActiveView />
            </Suspense>
          </ViewErrorBoundary>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
