'use client';

import { lazy, Suspense, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/app-store';
import { AppSidebar } from '@/components/layout/sidebar';
import { AppHeader } from '@/components/layout/header';
import { Loader2, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

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
const JourneyAutomationView = lazy(() => import('@/components/views/journey-automation-view').then(m => ({ default: m.JourneyAutomationView })));
const SalesPipelineView = lazy(() => import('@/components/views/sales-pipeline-view').then(m => ({ default: m.SalesPipelineView })));
const OmnichannelView = lazy(() => import('@/components/views/omnichannel-view').then(m => ({ default: m.OmnichannelView })));
const MarketplaceView = lazy(() => import('@/components/views/marketplace-view').then(m => ({ default: m.MarketplaceView })));
const EnterpriseView = lazy(() => import('@/components/views/enterprise-view').then(m => ({ default: m.EnterpriseView })));
const BroadcastView = lazy(() => import('@/components/views/broadcast-view').then(m => ({ default: m.BroadcastView })));

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
  journeyAutomation: JourneyAutomationView,
  salesPipeline: SalesPipelineView,
  omnichannel: OmnichannelView,
  marketplace: MarketplaceView,
  enterprise: EnterpriseView,
  broadcast: BroadcastView,
};

// ─── Loading fallback ────────────────────────────────────────────────────────

function ViewLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-8 animate-spin text-emerald-500" />
        <span className="text-muted-foreground text-sm">Loading view...</span>
      </div>
    </div>
  );
}

// ─── Fade-in wrapper ────────────────────────────────────────────────────────

function FadeInView({ children, viewKey }: { children: React.ReactNode; viewKey: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = '0';
    // Trigger reflow then animate
    void el.offsetHeight;
    el.style.transition = 'opacity 300ms ease-out';
    el.style.opacity = '1';
  }, [viewKey]);

  return (
    <div ref={ref}>
      {children}
    </div>
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface AppLayoutProps {
  onLogout?: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AppLayout({ onLogout }: AppLayoutProps) {
  const { currentView, darkMode } = useAppStore();

  // Resolve the active view component
  const ActiveView = viewComponents[currentView] || DashboardView;

  // Canvas view needs no padding for full-screen editor
  const isCanvas = currentView === 'canvas';

  return (
    <div className={cn('h-screen flex overflow-hidden bg-background', darkMode && 'dark')}>
      {/* ─── Sidebar ────────────────────────────────────────────────────── */}
      <AppSidebar onLogout={onLogout} />

      {/* ─── Main content area ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden min-h-screen">
        {/* ─── Header ──────────────────────────────────────────────────── */}
        <AppHeader />

        {/* ─── View content ────────────────────────────────────────────── */}
        <main
          className={cn(
            'flex-1 overflow-auto',
            isCanvas ? 'p-0' : 'p-4 sm:p-6 bg-muted/30'
          )}
        >
          <FadeInView viewKey={currentView}>
            <Suspense fallback={<ViewLoader />}>
              <ActiveView />
            </Suspense>
          </FadeInView>
        </main>

        {/* ─── Sticky Footer ──────────────────────────────────────────── */}
        {!isCanvas && (
          <footer className="shrink-0 border-t bg-background px-4 py-2.5">
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
  );
}
