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

// ─── Lazy-loaded views (reduces initial bundle & memory) ──────────────────────
const DashboardView = lazy(() => import('@/components/views/dashboard-view').then(m => ({ default: m.DashboardView })));
const LeadsView = lazy(() => import('@/components/views/leads-view').then(m => ({ default: m.LeadsView })));
const JobsView = lazy(() => import('@/components/views/jobs-view').then(m => ({ default: m.JobsView })));
const DispatchView = lazy(() => import('@/components/views/dispatch-view').then(m => ({ default: m.DispatchView })));
const CrmView = lazy(() => import('@/components/views/crm-view').then(m => ({ default: m.CrmView })));
const WhatsAppView = lazy(() => import('@/components/views/whatsapp-view').then(m => ({ default: m.WhatsAppView })));
const WorkflowsView = lazy(() => import('@/components/views/workflows-view').then(m => ({ default: m.WorkflowsView })));
const ExecutionsView = lazy(() => import('@/components/views/executions-view').then(m => ({ default: m.ExecutionsView })));
const CredentialsView = lazy(() => import('@/components/views/credentials-view').then(m => ({ default: m.CredentialsView })));

const InvoicesView = lazy(() => import('@/components/views/invoices-view').then(m => ({ default: m.InvoicesView })));
const ReportsView = lazy(() => import('@/components/views/reports-view').then(m => ({ default: m.ReportsView })));
const BillingView = lazy(() => import('@/components/views/billing-view').then(m => ({ default: m.BillingView })));
const VariablesView = lazy(() => import('@/components/views/variables-view').then(m => ({ default: m.VariablesView })));
const TemplatesView = lazy(() => import('@/components/views/templates-view').then(m => ({ default: m.TemplatesView })));
const SettingsView = lazy(() => import('@/components/views/settings-view').then(m => ({ default: m.SettingsView })));
const CanvasView = lazy(() => import('@/components/views/canvas-view').then(m => ({ default: m.CanvasView })));
const SaaSDashboardView = lazy(() => import('@/components/views/saas-dashboard-view').then(m => ({ default: m.SaaSDashboardView })));
const OperationsView = lazy(() => import('@/components/views/operations-view').then(m => ({ default: m.OperationsView })));
const VersionHistoryView = lazy(() => import('@/components/views/version-history-view').then(m => ({ default: m.VersionHistoryView })));
const EmployeePortalView = lazy(() => import('@/components/views/employee-portal-view').then(m => ({ default: m.EmployeePortalView })));
const CustomerPortalView = lazy(() => import('@/components/views/customer-portal-view').then(m => ({ default: m.CustomerPortalView })));

// WhatsApp Customer Engagement Platform Views
const InboxView = lazy(() => import('@/components/views/inbox-view').then(m => ({ default: m.InboxView })));
const Customer360View = lazy(() => import('@/components/views/customer360-view').then(m => ({ default: m.Customer360View })));
const CampaignsView = lazy(() => import('@/components/views/campaigns-view').then(m => ({ default: m.CampaignsView })));
const SegmentsView = lazy(() => import('@/components/views/segments-view').then(m => ({ default: m.SegmentsView })));
const RetargetingView = lazy(() => import('@/components/views/retargeting-view').then(m => ({ default: m.RetargetingView })));
const ChatbotBuilderView = lazy(() => import('@/components/views/chatbot-builder-view').then(m => ({ default: m.ChatbotBuilderView })));
const AiAssistantView = lazy(() => import('@/components/views/ai-assistant-view').then(m => ({ default: m.AiAssistantView })));
const AiCampaignGeneratorView = lazy(() => import('@/components/views/ai-campaign-generator-view').then(m => ({ default: m.AiCampaignGeneratorView })));
const FormBuilderView = lazy(() => import('@/components/views/form-builder-view').then(m => ({ default: m.FormBuilderView })));
const WebviewEngineView = lazy(() => import('@/components/views/webview-engine-view').then(m => ({ default: m.WebviewEngineView })));
const AdsIntegrationView = lazy(() => import('@/components/views/ads-integration-view').then(m => ({ default: m.AdsIntegrationView })));
const JourneyAutomationView = lazy(() => import('@/components/views/journey-automation-view').then(m => ({ default: m.JourneyAutomationView })));
const SalesPipelineView = lazy(() => import('@/components/views/sales-pipeline-view').then(m => ({ default: m.SalesPipelineView })));
const OmnichannelView = lazy(() => import('@/components/views/omnichannel-view').then(m => ({ default: m.OmnichannelView })));
const MarketplaceView = lazy(() => import('@/components/views/marketplace-view').then(m => ({ default: m.MarketplaceView })));
const EnterpriseView = lazy(() => import('@/components/views/enterprise-view').then(m => ({ default: m.EnterpriseView })));
const BroadcastView = lazy(() => import('@/components/views/broadcast-view').then(m => ({ default: m.BroadcastView })));
const QuotesView = lazy(() => import('@/components/views/quotes-view').then(m => ({ default: m.QuotesView })));
const WorkflowAutomationsView = lazy(() => import('@/components/views/workflow-automations-view').then(m => ({ default: m.WorkflowAutomationsView })));

// Marketing Hub Views
const MarketingTemplatesView = lazy(() => import('@/components/views/marketing-templates-view').then(m => ({ default: m.MarketingTemplatesView })));
const MarketingAnalyticsView = lazy(() => import('@/components/views/marketing-analytics-view').then(m => ({ default: m.MarketingAnalyticsView })));
const CommunicationProvidersView = lazy(() => import('@/components/views/communication-providers-view').then(m => ({ default: m.CommunicationProvidersView })));

// Contacts & People Views
const ContactsView = lazy(() => import('@/components/views/contacts-view').then(m => ({ default: m.ContactsView })));
const LeadDiscoveryView = lazy(() => import('@/components/views/lead-discovery-view').then(m => ({ default: m.LeadDiscoveryView })));
const BookingView = lazy(() => import('@/components/views/booking-view').then(m => ({ default: m.BookingView })));
const CalendarView = lazy(() => import('@/components/views/calendar-view').then(m => ({ default: m.CalendarView })));
const EmployeesView = lazy(() => import('@/components/views/employees-view').then(m => ({ default: m.EmployeesView })));
const ReviewsView = lazy(() => import('@/components/views/reviews-view').then(m => ({ default: m.ReviewsView })));
const ServiceCatalogView = lazy(() => import('@/components/views/service-catalog-view').then(m => ({ default: m.ServiceCatalogView })));
const KnowledgeBaseView = lazy(() => import('@/components/views/knowledge-base-view').then(m => ({ default: m.KnowledgeBaseView })));
const DocumentCenterView = lazy(() => import('@/components/views/document-center-view').then(m => ({ default: m.DocumentCenterView })));
const TriggersView = lazy(() => import('@/components/views/triggers-view').then(m => ({ default: m.TriggersView })));

// ─── View mapping ───────────────────────────────────────────────────────────

const viewComponents: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  dashboard: DashboardView,
  leads: LeadsView,
  jobs: JobsView,
  dispatch: DispatchView,
  crm: CrmView,
  whatsapp: WhatsAppView,
  workflows: WorkflowsView,
  executions: ExecutionsView,
  credentials: CredentialsView,

  invoices: InvoicesView,
  reports: ReportsView,
  billing: BillingView,
  variables: VariablesView,
  templates: TemplatesView,
  settings: SettingsView,
  operations: OperationsView,
  canvas: CanvasView,
  versionHistory: VersionHistoryView,
  saasDashboard: SaaSDashboardView,
  employeePortal: EmployeePortalView,
  customerPortal: CustomerPortalView,
  // WhatsApp Customer Engagement Platform
  inbox: InboxView,
  customer360: Customer360View,
  campaigns: CampaignsView,
  segments: SegmentsView,
  retargeting: RetargetingView,
  chatbotBuilder: ChatbotBuilderView,
  aiAssistant: AiAssistantView,
  aiCampaignGenerator: AiCampaignGeneratorView,
  formBuilder: FormBuilderView,
  webviewEngine: WebviewEngineView,
  adsIntegration: AdsIntegrationView,
  journeyAutomation: JourneyAutomationView,
  salesPipeline: SalesPipelineView,
  omnichannel: OmnichannelView,
  marketplace: MarketplaceView,
  enterprise: EnterpriseView,
  broadcast: BroadcastView,
  quotes: QuotesView,
  workflowAutomations: WorkflowAutomationsView,
  // Marketing Hub
  marketingTemplates: MarketingTemplatesView,
  marketingAnalytics: MarketingAnalyticsView,
  communicationProviders: CommunicationProvidersView,
  // Contacts & People
  contacts: ContactsView,
  leadDiscovery: LeadDiscoveryView,
  booking: BookingView,
  calendar: CalendarView,
  employees: EmployeesView,
  reviews: ReviewsView,
  serviceCatalog: ServiceCatalogView,
  knowledgeBase: KnowledgeBaseView,
  documentCenter: DocumentCenterView,
  triggers: TriggersView,
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
              <Button
                size="sm"
                onClick={() => window.location.reload()}
                className="gap-2"
              >
                <RefreshCw className="size-3.5" />
                Reload Page
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="gap-2"
              >
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

// ─── Props ──────────────────────────────────────────────────────────────────

interface AppLayoutProps {
  onLogout?: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AppLayout({ onLogout }: AppLayoutProps) {
  const { currentView, darkMode } = useAppStore();
  const isMobile = useIsMobile();

  // Resolve the active view component
  const ActiveView = viewComponents[currentView] || DashboardView;

  // Canvas view needs no padding for full-screen editor
  const isCanvas = currentView === 'canvas';

  return (
    <div className={cn('h-[100dvh] flex overflow-hidden bg-background', darkMode && 'dark')}>
      {/* ─── Sidebar (desktop only, mobile uses Sheet) ──────────────────── */}
      <AppSidebar onLogout={onLogout} />

      {/* ─── Main content area ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ─── Header ──────────────────────────────────────────────────── */}
        <AppHeader />

        {/* ─── View content ────────────────────────────────────────────── */}
        <main
          className={cn(
            'flex-1 overflow-auto animate-fade-in',
            isCanvas ? 'p-0' : isMobile ? 'p-3 sm:p-4 bg-muted/30' : 'p-4 lg:p-6 bg-muted/30',
            // Add bottom padding for mobile nav
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

      {/* ─── Mobile Bottom Navigation ──────────────────────────────────── */}
      <MobileBottomNav />
    </div>
  );
}
