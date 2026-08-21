/**
 * view-prefetch.ts
 * ----------------
 * View chunk prefetch utility for the CRM dashboard sidebar.
 *
 * When the user hovers over a sidebar nav item, we fire the dynamic import()
 * for that view's module. Webpack/Turbopack deduplicates import() calls, so
 * when the user actually clicks and React.lazy() triggers the same import,
 * the module is already cached — the view renders instantly with no
 * chunk-download delay.
 *
 * This is a PROGRESSIVE ENHANCEMENT:
 *   • If a view ID isn't in the switch, the function is a no-op.
 *   • If prefetch fails (network error, etc.), it's silently ignored.
 *   • The view still works normally without prefetch — just slower on first visit.
 *
 * Why a switch statement instead of a map?
 *   Webpack/Turbopack need string-literal import() calls to create separate
 *   chunks. A map of `() => import(path)` with a variable path would create
 *   a single "context module" containing ALL views, defeating the purpose
 *   of code-splitting. The switch ensures each view gets its own lazy chunk.
 */

export function prefetchView(viewId: string): void {
  switch (viewId) {
    // Dashboard
    case 'dashboard': void import('@/components/views/dashboard-view'); break;
    // CRM
    case 'leads': void import('@/components/views/leads-view'); break;
    case 'contacts': void import('@/components/views/contacts-view'); break;
    case 'customers': void import('@/components/views/crm-view'); break;
    case 'customer360': void import('@/components/views/customer-360-view'); break;
    case 'salesPipeline': void import('@/components/views/sales-pipeline-view'); break;
    // Communication
    case 'broadcast': void import('@/components/views/broadcast-view'); break;
    case 'campaigns': void import('@/components/views/campaigns-view'); break;
    case 'marketingTemplates': void import('@/components/views/marketing-templates-view'); break;
    case 'omnichannel': void import('@/components/views/omnichannel-view'); break;
    case 'whatsapp': void import('@/components/views/whatsapp-view'); break;
    case 'liveChat': void import('@/components/views/live-chat-view'); break;
    case 'smsNumbers': void import('@/components/views/sms-numbers-view'); break;
    // Automation
    case 'workflows': void import('@/components/views/workflows-view'); break;
    case 'canvas': void import('@/components/views/canvas-view'); break;
    case 'triggers': void import('@/components/views/triggers-view'); break;
    case 'variables': void import('@/components/views/variables-view'); break;
    case 'executions': void import('@/components/views/executions-view'); break;
    case 'formBuilder': void import('@/components/views/form-builder-view'); break;
    case 'workflowAutomations': void import('@/components/views/workflow-automations-view'); break;
    // Operations
    case 'operations': void import('@/components/views/operations-view'); break;
    case 'booking': void import('@/components/views/booking-view'); break;
    case 'calendar': void import('@/components/views/calendar-view'); break;
    case 'jobs': void import('@/components/views/jobs-view'); break;
    case 'dispatch': void import('@/components/views/dispatch-view'); break;
    case 'employees': void import('@/components/views/employees-view'); break;
    case 'employeePerformance': void import('@/components/views/employee-performance-view'); break;
    case 'timesheet': void import('@/components/views/timesheet-view'); break;
    // Inventory
    case 'inventory': void import('@/components/views/inventory-view'); break;
    case 'purchaseOrders': void import('@/components/views/purchase-orders-view'); break;
    // Finance
    case 'quotes': void import('@/components/views/quotes-view'); break;
    case 'invoices': void import('@/components/views/invoices-view'); break;
    case 'billing': void import('@/components/views/billing-view'); break;
    case 'expenses': void import('@/components/views/expenses-view'); break;
    // System
    case 'credentials': void import('@/components/views/credentials-view'); break;
    case 'integrations': void import('@/components/views/integrations-view'); break;
    case 'settings': void import('@/components/views/settings-view'); break;
    case 'brandBrain': void import('@/components/views/tenant/brand-brain-view'); break;
    case 'auditLogs': void import('@/components/views/reports-view'); break;
    case 'activityLogs': void import('@/components/views/history-view'); break;
    case 'reports': void import('@/components/views/reports-view'); break;
    case 'notifications': void import('@/components/views/notifications-view'); break;
    // Portals
    case 'customerPortal': void import('@/components/views/customer-portal-view'); break;
    case 'employeePortal': void import('@/components/views/employee-portal-view'); break;
    // AI & Extras
    case 'aiAssistant': void import('@/components/views/ai-assistant-view'); break;
    case 'chatbotBuilder': void import('@/components/views/chatbot-builder-view'); break;
    case 'aiReceptionist': void import('@/components/ai-receptionist/ai-receptionist-settings'); break;
    case 'aiAgents': void import('@/components/views/ai-agents-view'); break;
    case 'aiPhoneNumbers': void import('@/components/views/sms-numbers-view'); break;
    case 'aiCallHistory': void import('@/components/views/ai-call-history-view'); break;
    case 'retargeting': void import('@/components/views/retargeting-view'); break;
    case 'segments': void import('@/components/views/segments-view'); break;
    case 'marketingAnalytics': void import('@/components/views/marketing-analytics-view'); break;
    case 'serviceCatalog': void import('@/components/views/service-catalog-view'); break;
    case 'recurringJobs': void import('@/components/views/recurring-jobs-view'); break;
    case 'communicationProviders': void import('@/components/views/communication-providers-view'); break;
    case 'reviews': void import('@/components/views/reviews-view'); break;
    case 'leadDiscovery': void import('@/components/views/lead-discovery-view'); break;
    case 'journeyAutomation': void import('@/components/views/journey-automation-view'); break;
    case 'marketplace': void import('@/components/views/marketplace-view'); break;
    case 'marketplaceDashboard': void import('@/components/marketplace/provider-marketplace-dashboard'); break;
    case 'enterprise': void import('@/components/views/enterprise-view'); break;
    case 'aiCampaignGenerator': void import('@/components/views/ai-campaign-generator-view'); break;
    case 'webviewEngine': void import('@/components/views/webview-engine-view'); break;
    case 'adsIntegration': void import('@/components/views/ads-integration-view'); break;
    case 'knowledgeBase': void import('@/components/views/knowledge-base-view'); break;
    case 'documentCenter': void import('@/components/views/document-center-view'); break;
    case 'versionHistory': void import('@/components/views/version-history-view'); break;
    case 'saasDashboard': void import('@/components/views/saas-dashboard-view'); break;
    // Audience
    case 'groups': void import('@/components/views/groups-view'); break;
    case 'tags': void import('@/components/views/tags-view'); break;
    case 'contactImports': void import('@/components/views/contact-imports-view'); break;
    case 'contactExports': void import('@/components/views/contact-exports-view'); break;
    case 'audienceAnalytics': void import('@/components/views/audience-analytics-view'); break;
    case 'emailCampaigns': void import('@/components/views/email-campaigns-view'); break;
    case 'emailProviders': void import('@/components/views/email-providers-view'); break;
    case 'emailTemplates': void import('@/components/views/email-templates-view'); break;
    case 'channels': void import('@/components/views/channels-view'); break;
    // Template Studio
    case 'templateStudio': void import('@/components/templates/template-studio-view'); break;
    // Super Admin
    case 'superadmin': void import('@/components/views/superadmin-view'); break;
    // Help & Support
    case 'helpCenter': void import('@/components/views/help-center-view'); break;
    case 'helpAdminTickets': void import('@/components/views/help-admin-view'); break;
    // Social Publishing (Engine 1)
    case 'socialAccounts': void import('@/components/views/tenant/social-accounts-view'); break;
    case 'postComposer': void import('@/components/views/tenant/post-composer-view'); break;
    case 'postsList': void import('@/components/views/tenant/posts-list-view'); break;
    case 'socialAnalytics': void import('@/components/views/tenant/social-analytics-view'); break;
    default: break;
  }
}
