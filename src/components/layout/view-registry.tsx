'use client';

import { lazy, Suspense, ComponentType } from 'react';
import type { ViewType } from '@/types/workflow';

// Eagerly loaded core views
import { WorkflowsView } from '@/components/views/workflows-view';

// Dashboard is lazy loaded
const DashboardView = lazy(() => import('@/components/views/dashboard-view').then(m => ({ default: m.DashboardView })));

// Canvas
const CanvasView = lazy(() => import('@/components/views/canvas-view').then(m => ({ default: m.CanvasView })));

// CRM
const LeadsView = lazy(() => import('@/components/views/leads-view').then(m => ({ default: m.LeadsView })));
const ContactsView = lazy(() => import('@/components/views/contacts-view').then(m => ({ default: m.ContactsView })));
const CustomersView = lazy(() => import('@/components/views/crm-view').then(m => ({ default: m.CrmView })));
const Customer360View = lazy(() => import('@/components/views/customer-360-view').then(m => ({ default: m.Customer360View })));
const SalesPipelineView = lazy(() => import('@/components/views/sales-pipeline-view').then(m => ({ default: m.SalesPipelineView })));

// Communication
const InboxView = lazy(() => import('@/components/views/inbox-view').then(m => ({ default: m.InboxView })));
const WhatsAppView = lazy(() => import('@/components/views/whatsapp-view').then(m => ({ default: m.WhatsAppView })));
const BroadcastView = lazy(() => import('@/components/views/broadcast-view').then(m => ({ default: m.BroadcastView })));
const CampaignsView = lazy(() => import('@/components/views/campaigns-view').then(m => ({ default: m.CampaignsView })));
const MarketingTemplatesView = lazy(() => import('@/components/views/marketing-templates-view').then(m => ({ default: m.MarketingTemplatesView })));
const OmnichannelView = lazy(() => import('@/components/views/omnichannel-view').then(m => ({ default: m.OmnichannelView })));

// Automation
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
const SettingsView = lazy(() => import('@/components/views/settings-view').then(m => ({ default: m.SettingsView })));
const AuditLogsView = lazy(() => import('@/components/views/reports-view').then(m => ({ default: m.ReportsView })));
const ReportsView = lazy(() => import('@/components/views/reports-view').then(m => ({ default: m.ReportsView })));

// Portals
const CustomerPortalView = lazy(() => import('@/components/views/customer-portal-view').then(m => ({ default: m.CustomerPortalView })));
const EmployeePortalView = lazy(() => import('@/components/views/employee-portal-view').then(m => ({ default: m.EmployeePortalView })));

// AI & Extras
const AIAssistantView = lazy(() => import('@/components/views/ai-assistant-view').then(m => ({ default: m.AiAssistantView })));
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
const AICampaignGeneratorView = lazy(() => import('@/components/views/ai-campaign-generator-view').then(m => ({ default: m.AiCampaignGeneratorView })));
const WebviewEngineView = lazy(() => import('@/components/views/webview-engine-view').then(m => ({ default: m.WebviewEngineView })));
const AdsIntegrationView = lazy(() => import('@/components/views/ads-integration-view').then(m => ({ default: m.AdsIntegrationView })));
const KnowledgeBaseView = lazy(() => import('@/components/views/knowledge-base-view').then(m => ({ default: m.KnowledgeBaseView })));
const DocumentCenterView = lazy(() => import('@/components/views/document-center-view').then(m => ({ default: m.DocumentCenterView })));
const VersionHistoryView = lazy(() => import('@/components/views/version-history-view').then(m => ({ default: m.VersionHistoryView })));
const SaaSDashboardView = lazy(() => import('@/components/views/saas-dashboard-view').then(m => ({ default: m.SaaSDashboardView })));
const OperationsView = lazy(() => import('@/components/views/operations-view').then(m => ({ default: m.OperationsView })));
const CrmView = lazy(() => import('@/components/views/crm-view').then(m => ({ default: m.CrmView })));

// Super Admin
const SuperAdminView = lazy(() => import('@/components/views/superadmin-view').then(m => ({ default: m.SuperAdminView })));

function ViewLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    </div>
  );
}

const lazyViews: Partial<Record<ViewType, ComponentType>> = {
  // Canvas
  canvas: CanvasView,
  // CRM
  leads: LeadsView,
  contacts: ContactsView,
  customers: CustomersView,
  crm: CrmView,
  customer360: Customer360View,
  salesPipeline: SalesPipelineView,
  // Communication
  whatsapp: WhatsAppView,
  inbox: InboxView,
  broadcast: BroadcastView,
  campaigns: CampaignsView,
  marketingTemplates: MarketingTemplatesView,
  omnichannel: OmnichannelView,
  // Automation
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
  settings: SettingsView,
  auditLogs: AuditLogsView,
  reports: ReportsView,
  // Portals
  customerPortal: CustomerPortalView,
  employeePortal: EmployeePortalView,
  // AI & Extras
  aiAssistant: AIAssistantView,
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
  aiCampaignGenerator: AICampaignGeneratorView,
  webviewEngine: WebviewEngineView,
  adsIntegration: AdsIntegrationView,
  knowledgeBase: KnowledgeBaseView,
  documentCenter: DocumentCenterView,
  versionHistory: VersionHistoryView,
  saasDashboard: SaaSDashboardView,
  // Super Admin
  superadmin: SuperAdminView,
};

export { DashboardView, WorkflowsView, lazyViews, ViewLoader };
