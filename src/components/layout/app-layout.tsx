'use client';

import { lazy, Suspense, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/app-store';
import { AppSidebar } from '@/components/layout/sidebar';
import { AppHeader } from '@/components/layout/header';
import { Loader2, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

// ─── Lazy-loaded views ──────────────────────────────────────────────────────
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
const JourneyAutomationView = lazy(() => import('@/components/views/journey-automation-view').then(m => ({ default: m.JourneyAutomationView })));
const SalesPipelineView = lazy(() => import('@/components/views/sales-pipeline-view').then(m => ({ default: m.SalesPipelineView })));
const OmnichannelView = lazy(() => import('@/components/views/omnichannel-view').then(m => ({ default: m.OmnichannelView })));
const MarketplaceView = lazy(() => import('@/components/views/marketplace-view').then(m => ({ default: m.MarketplaceView })));
const EnterpriseView = lazy(() => import('@/components/views/enterprise-view').then(m => ({ default: m.EnterpriseView })));
const BroadcastView = lazy(() => import('@/components/views/broadcast-view').then(m => ({ default: m.BroadcastView })));
const SuperAdminView = lazy(() => import('@/components/views/super-admin-view').then(m => ({ default: m.SuperAdminView })));
const EmployeesView = lazy(() => import('@/components/views/employees-view').then(m => ({ default: m.EmployeesView })));

const QuotesView = lazy(() => import('@/components/views/quotes-view').then(m => ({ default: m.QuotesView })));
const BookingsView = lazy(() => import('@/components/views/bookings-view').then(m => ({ default: m.BookingsView })));
const CalendarView = lazy(() => import('@/components/views/calendar-view').then(m => ({ default: m.CalendarView })));
const ReviewsView = lazy(() => import('@/components/views/reviews-view').then(m => ({ default: m.ReviewsView })));
const ServiceCatalogView = lazy(() => import('@/components/views/service-catalog-view').then(m => ({ default: m.ServiceCatalogView })));
const KnowledgeBaseView = lazy(() => import('@/components/views/knowledge-base-view').then(m => ({ default: m.KnowledgeBaseView })));
const RouteOptimizationView = lazy(() => import('@/components/views/route-optimization-view').then(m => ({ default: m.RouteOptimizationView })));
const DocumentCenterView = lazy(() => import('@/components/views/document-center-view').then(m => ({ default: m.DocumentCenterView })));
const ContactsView = lazy(() => import('@/components/views/contacts-view').then(m => ({ default: m.ContactsView })));
const LeadDiscoveryView = lazy(() => import('@/components/views/lead-discovery-view').then(m => ({ default: m.LeadDiscoveryView })));

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
  journeyAutomation: JourneyAutomationView,
  salesPipeline: SalesPipelineView,
  omnichannel: OmnichannelView,
  marketplace: MarketplaceView,
  enterprise: EnterpriseView,
  broadcast: BroadcastView,
  superAdmin: SuperAdminView,
  employees: EmployeesView,
  quotes: QuotesView,
  bookings: BookingsView,
  calendar: CalendarView,
  reviews: ReviewsView,
  serviceCatalog: ServiceCatalogView,
  knowledgeBase: KnowledgeBaseView,
  routeOptimization: RouteOptimizationView,
  documentCenter: DocumentCenterView,
  contacts: ContactsView,
  leadDiscovery: LeadDiscoveryView,
};

// ─── Loading fallback ────────────────────────────────────────────────────────

function ViewLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3 animate-fade-in">
        <div className="relative">
          <Loader2 className="size-8 animate-spin text-emerald-500" />
          <div className="absolute inset-0 size-8 animate-ping opacity-20 rounded-full bg-emerald-500" />
        </div>
        <span className="text-muted-foreground text-sm">Loading view...</span>
      </div>
    </div>
  );
}

// ─── Fade-in wrapper with stagger ─────────────────────────────────────────

function FadeInView({ children, viewKey }: { children: React.ReactNode; viewKey: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    // Trigger reflow then animate
    void el.offsetHeight;
    el.style.transition = 'opacity 300ms ease-out, transform 300ms ease-out';
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  }, [viewKey]);

  return (
    <div ref={ref}>
      {children}
    </div>
  );
}

// ─── PWA install prompt handler ──────────────────────────────────────────

function PWAInstallListener() {
  const { setInstallPromptEvent } = useAppStore();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [setInstallPromptEvent]);

  return null;
}

// ─── Dark mode sync ────────────────────────────────────────────────────

function DarkModeSync() {
  const { darkMode } = useAppStore();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return null;
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
    <div className={cn('min-h-screen flex flex-col bg-background', darkMode && 'dark')}>
      <DarkModeSync />
      <PWAInstallListener />

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Sidebar (desktop only, mobile uses Sheet) ─────────── */}
        <AppSidebar onLogout={onLogout} />

        {/* ─── Main content area ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden min-h-screen">
          {/* ─── Header ──────────────────────────────────────────── */}
          <AppHeader />

          {/* ─── View content ────────────────────────────────────── */}
          <main
            className={cn(
              'flex-1 overflow-auto',
              isCanvas ? 'p-0' : 'p-3 sm:p-4 lg:p-6 bg-muted/30'
            )}
          >
            <FadeInView viewKey={currentView}>
              <Suspense fallback={<ViewLoader />}>
                <ActiveView />
              </Suspense>
            </FadeInView>
          </main>

          {/* ─── Sticky Footer ──────────────────────────────────── */}
          {!isCanvas && (
            <footer className="shrink-0 border-t bg-background/80 backdrop-blur-sm px-3 sm:px-4 py-2.5 safe-bottom">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  Built with <Heart className="size-3 text-emerald-500 fill-emerald-500" /> by ServiceOS
                </span>
                <span className="hidden sm:inline">© {new Date().getFullYear()} ServiceOS Inc. All rights reserved.</span>
              </div>
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}
