import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';

const DEFAULT_MENU_ITEMS = [
  // CRM
  { key: 'leads', label: 'Leads', icon: 'Target', section: 'CRM', sortOrder: 0 },
  { key: 'contacts', label: 'Contacts', icon: 'Contact', section: 'CRM', sortOrder: 1 },
  { key: 'customers', label: 'Customers', icon: 'Users', section: 'CRM', sortOrder: 2 },
  { key: 'customer360', label: 'Customer 360', icon: 'UserCircle', section: 'CRM', sortOrder: 3 },
  { key: 'salesPipeline', label: 'Sales Pipeline', icon: 'Kanban', section: 'CRM', sortOrder: 4 },
  // Communication
  { key: 'omnichannel', label: 'Omnichannel', icon: 'RadioTower', section: 'Communication', sortOrder: 5 },
  { key: 'broadcast', label: 'Broadcast', icon: 'Send', section: 'Communication', sortOrder: 6 },
  { key: 'marketingTemplates', label: 'Marketing Templates', icon: 'MessageSquare', section: 'Communication', sortOrder: 7 },
  // Marketing
  { key: 'campaigns', label: 'Campaigns', icon: 'Megaphone', section: 'Marketing', sortOrder: 8 },
  { key: 'segments', label: 'Segments', icon: 'Filter', section: 'Marketing', sortOrder: 9 },
  { key: 'retargeting', label: 'Retargeting', icon: 'RefreshCw', section: 'Marketing', sortOrder: 10 },
  { key: 'marketingAnalytics', label: 'Analytics', icon: 'BarChart3', section: 'Marketing', sortOrder: 11 },
  // Automation
  { key: 'workflows', label: 'Workflows', icon: 'Workflow', section: 'Automation', sortOrder: 10 },
  { key: 'triggers', label: 'Triggers', icon: 'Zap', section: 'Automation', sortOrder: 11 },
  { key: 'variables', label: 'Variables', icon: 'Variable', section: 'Automation', sortOrder: 12 },
  { key: 'executions', label: 'Executions', icon: 'Activity', section: 'Automation', sortOrder: 13 },
  { key: 'formBuilder', label: 'Form Builder', icon: 'ClipboardList', section: 'Automation', sortOrder: 14 },
  { key: 'workflowAutomations', label: 'Workflow Automations', icon: 'GitBranch', section: 'Automation', sortOrder: 15 },
  // Operations
  { key: 'booking', label: 'Booking', icon: 'CalendarCheck', section: 'Operations', sortOrder: 16 },
  { key: 'calendar', label: 'Calendar', icon: 'Calendar', section: 'Operations', sortOrder: 17 },
  { key: 'jobs', label: 'Jobs', icon: 'Briefcase', section: 'Operations', sortOrder: 18 },
  { key: 'dispatch', label: 'Dispatch', icon: 'Radio', section: 'Operations', sortOrder: 19 },
  { key: 'employees', label: 'Employees', icon: 'UserCog', section: 'Operations', sortOrder: 20 },
  // Finance
  { key: 'quotes', label: 'Quotes', icon: 'Receipt', section: 'Finance', sortOrder: 21 },
  { key: 'invoices', label: 'Invoices', icon: 'FileText', section: 'Finance', sortOrder: 22 },
  { key: 'billing', label: 'Billing', icon: 'CreditCard', section: 'Finance', sortOrder: 23 },
  // System
  { key: 'channels', label: 'Channels & Credentials', icon: 'RadioTower', section: 'System', sortOrder: 24 },
  { key: 'credentials', label: 'Credentials', icon: 'KeyRound', section: 'System', sortOrder: 25 },
  { key: 'integrations', label: 'Integrations', icon: 'Plug', section: 'System', sortOrder: 26 },
  { key: 'settings', label: 'Settings', icon: 'Settings', section: 'System', sortOrder: 27 },
  { key: 'auditLogs', label: 'Audit Logs', icon: 'ScrollText', section: 'System', sortOrder: 28 },
  { key: 'reports', label: 'Reports', icon: 'BarChart3', section: 'System', sortOrder: 29 },
  // Portals
  { key: 'customerPortal', label: 'Customer Portal', icon: 'Globe', section: 'Portals', sortOrder: 30 },
  { key: 'employeePortal', label: 'Employee Portal', icon: 'HardHat', section: 'Portals', sortOrder: 31 },
  // AI & More
  { key: 'aiAssistant', label: 'AI Assistant', icon: 'Sparkles', section: 'AI & More', sortOrder: 32 },
  { key: 'chatbotBuilder', label: 'Chatbot Builder', icon: 'Bot', section: 'AI & More', sortOrder: 33 },
  { key: 'retargeting', label: 'Retargeting', icon: 'RefreshCw', section: 'AI & More', sortOrder: 34 },
  { key: 'segments', label: 'Segments', icon: 'Filter', section: 'AI & More', sortOrder: 35 },
  { key: 'marketingAnalytics', label: 'Analytics', icon: 'BarChart3', section: 'AI & More', sortOrder: 36 },
  { key: 'serviceCatalog', label: 'Service Catalog', icon: 'BookOpen', section: 'AI & More', sortOrder: 37 },
  { key: 'communicationProviders', label: 'Providers', icon: 'KeyRound', section: 'AI & More', sortOrder: 38 },
  { key: 'reviews', label: 'Reviews', icon: 'Star', section: 'AI & More', sortOrder: 39 },
];

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isSuperAdminRequest())) {
    return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
  }

  return NextResponse.json({
    items: DEFAULT_MENU_ITEMS.map((item) => ({
      ...item,
      id: `default_${item.key}`,
      enabled: true,
    })),
  });
}
