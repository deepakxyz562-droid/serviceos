import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

const DEFAULT_MENU_ITEMS = [
  // Operations
  { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', section: 'operations', sortOrder: 0 },
  { key: 'operations', label: 'Operations', icon: 'LayoutDashboard', section: 'operations', sortOrder: 1 },
  { key: 'jobs', label: 'Jobs', icon: 'Briefcase', section: 'operations', sortOrder: 2 },
  { key: 'calendar', label: 'Calendar', icon: 'Calendar', section: 'operations', sortOrder: 3 },
  { key: 'dispatch', label: 'Dispatch', icon: 'Radio', section: 'operations', sortOrder: 4 },
  // People
  { key: 'contacts', label: 'Contacts', icon: 'Users', section: 'people', sortOrder: 5 },
  { key: 'leads', label: 'Leads', icon: 'Target', section: 'people', sortOrder: 6 },
  { key: 'employees', label: 'Employees', icon: 'Users', section: 'people', sortOrder: 7 },
  { key: 'customers', label: 'Customers', icon: 'Users', section: 'people', sortOrder: 8 },
  // Marketing
  { key: 'campaigns', label: 'Campaigns', icon: 'Megaphone', section: 'marketing', sortOrder: 9 },
  { key: 'segments', label: 'Segments', icon: 'Filter', section: 'marketing', sortOrder: 10 },
  { key: 'marketing_templates', label: 'Templates', icon: 'FileText', section: 'marketing', sortOrder: 11 },
  { key: 'marketing_analytics', label: 'Analytics', icon: 'BarChart3', section: 'marketing', sortOrder: 12 },
  // Sales
  { key: 'sales_pipeline', label: 'Pipeline', icon: 'ShoppingCart', section: 'sales', sortOrder: 13 },
  { key: 'quotes', label: 'Quotes', icon: 'FileText', section: 'sales', sortOrder: 14 },
  { key: 'invoices', label: 'Invoices', icon: 'Receipt', section: 'sales', sortOrder: 15 },
  // WhatsApp CRM
  { key: 'inbox', label: 'Inbox', icon: 'MessageSquare', section: 'whatsapp_crm', sortOrder: 16 },
  { key: 'broadcast', label: 'Broadcast', icon: 'Radio', section: 'whatsapp_crm', sortOrder: 17 },
  { key: 'chatbot_builder', label: 'Chatbot Builder', icon: 'Bot', section: 'whatsapp_crm', sortOrder: 18 },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'MessageSquare', section: 'whatsapp_crm', sortOrder: 19 },
  // AI & Automation
  { key: 'ai_assistant', label: 'AI Assistant', icon: 'Bot', section: 'ai_automation', sortOrder: 20 },
  { key: 'workflows', label: 'Workflows', icon: 'Workflow', section: 'ai_automation', sortOrder: 21 },
  { key: 'workflow_automations', label: 'Automations', icon: 'Zap', section: 'ai_automation', sortOrder: 22 },
  { key: 'triggers', label: 'Triggers', icon: 'Zap', section: 'ai_automation', sortOrder: 23 },
  // Channels
  { key: 'omnichannel', label: 'Omnichannel', icon: 'Radio', section: 'channels', sortOrder: 24 },
  { key: 'communication_providers', label: 'Providers', icon: 'Settings', section: 'channels', sortOrder: 25 },
  { key: 'forms', label: 'Forms', icon: 'FileInput', section: 'channels', sortOrder: 26 },
  // Finance
  { key: 'billing', label: 'Billing', icon: 'CreditCard', section: 'finance', sortOrder: 27 },
  { key: 'reports', label: 'Reports', icon: 'BarChart3', section: 'finance', sortOrder: 28 },
  // Resources
  { key: 'knowledge_base', label: 'Knowledge Base', icon: 'BookOpen', section: 'resources', sortOrder: 29 },
  { key: 'document_center', label: 'Documents', icon: 'FileText', section: 'resources', sortOrder: 30 },
  { key: 'marketplace', label: 'Marketplace', icon: 'Store', section: 'resources', sortOrder: 31 },
  // Platform
  { key: 'settings', label: 'Settings', icon: 'Settings', section: 'platform', sortOrder: 32 },
  { key: 'credentials', label: 'Credentials', icon: 'Key', section: 'platform', sortOrder: 33 },
  { key: 'integrations', label: 'Integrations', icon: 'Puzzle', section: 'platform', sortOrder: 34 },
];

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (auth.role !== 'superadmin') {
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
