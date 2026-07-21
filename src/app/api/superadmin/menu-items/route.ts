import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';

const GLOBAL_CONFIG_KEY = 'globalMenuConfig';

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

interface MenuItemEntry {
  key: string;
  label: string;
  icon: string;
  section: string;
  sortOrder: number;
  enabled: boolean;
}

// Helper: safely parse settingsJson from a tenant record
function parseSettings(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw as Record<string, unknown>;
}

// Get global menu config from the first tenant's settingsJson
async function getGlobalMenuConfig(): Promise<MenuItemEntry[]> {
  try {
    const tenants = await db.tenant.findMany({ take: 1 });
    if (!tenants || tenants.length === 0) return getDefaultItems();

    const settings = parseSettings(tenants[0].settingsJson);
    const config = settings[GLOBAL_CONFIG_KEY] as MenuItemEntry[] | undefined;

    if (!config || config.length === 0) {
      // Initialize with defaults
      const defaults = getDefaultItems();
      await saveGlobalMenuConfig(defaults);
      return defaults;
    }
    return config;
  } catch (error) {
    console.error('[getGlobalMenuConfig] Error:', error);
    return getDefaultItems();
  }
}

// Save global menu config to the first tenant's settingsJson
async function saveGlobalMenuConfig(items: MenuItemEntry[]): Promise<void> {
  const tenants = await db.tenant.findMany({ take: 1 });
  if (!tenants || tenants.length === 0) {
    throw new Error('No tenants found — cannot save global menu config');
  }

  const tenantId = (tenants[0] as Record<string, unknown>).id as string;
  const settings = parseSettings(tenants[0].settingsJson);
  settings[GLOBAL_CONFIG_KEY] = items;

  await db.tenant.update({
    where: { id: tenantId },
    data: { settingsJson: JSON.stringify(settings) },
  });
}

// Get tenant-specific menu config from the tenant's settingsJson
async function getTenantMenuConfig(tenantId: string): Promise<MenuItemEntry[]> {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return getDefaultItems();

  const settings = parseSettings(tenant.settingsJson);
  const config = settings.menuConfig as MenuItemEntry[] | undefined;
  if (!config || config.length === 0) return getDefaultItems();
  return config;
}

// Save tenant-specific menu config to the tenant's settingsJson
async function saveTenantMenuConfig(tenantId: string, items: MenuItemEntry[]): Promise<void> {
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    throw new Error(`Tenant ${tenantId} not found`);
  }

  const settings = parseSettings(tenant.settingsJson);
  settings.menuConfig = items;

  await db.tenant.update({
    where: { id: tenantId },
    data: { settingsJson: JSON.stringify(settings) },
  });
}

function getDefaultItems(): MenuItemEntry[] {
  return DEFAULT_MENU_ITEMS.map((item) => ({ ...item, enabled: true }));
}

// GET: List menu items for a tenant, or global defaults
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const scope = searchParams.get('scope');

    // If scope=global, fetch from settingsJson
    if (scope === 'global') {
      const items = await getGlobalMenuConfig();
      return NextResponse.json({ items: items.map((item) => ({ ...item, id: `global_${item.key}`, tenantId: null })) });
    }

    if (!tenantId) {
      return NextResponse.json({
        items: DEFAULT_MENU_ITEMS.map((item) => ({
          ...item,
          id: `default_${item.key}`,
          enabled: true,
          tenantId: null,
        })),
      });
    }

    // For tenant-specific, read from tenant settingsJson
    const items = await getTenantMenuConfig(tenantId);
    return NextResponse.json({ items: items.map((item) => ({ ...item, id: `tenant_${item.key}`, tenantId })) });
  } catch (error) {
    console.error('[SuperAdmin Menu Items GET] Error:', error);
    return NextResponse.json({
      items: DEFAULT_MENU_ITEMS.map((item) => ({
        ...item,
        id: `default_${item.key}`,
        enabled: true,
        tenantId: null,
      })),
    });
  }
}

// PUT: Toggle a single menu item
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }
    const body = await request.json();
    const { tenantId, menuKey, enabled, scope } = body;

    if (!menuKey) {
      return NextResponse.json({ error: 'Menu key is required' }, { status: 400 });
    }
    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Enabled must be a boolean' }, { status: 400 });
    }

    // For global scope (or no tenantId), update the global config in settingsJson
    if (scope === 'global' || !tenantId) {
      const items = await getGlobalMenuConfig();
      const updatedItems = items.map((item) =>
        item.key === menuKey ? { ...item, enabled } : item
      );
      await saveGlobalMenuConfig(updatedItems);
      return NextResponse.json({ success: true, scope: 'global' });
    }

    // For tenant-specific, update the tenant's menuConfig in settingsJson
    const items = await getTenantMenuConfig(tenantId);
    const updatedItems = items.map((item) =>
      item.key === menuKey ? { ...item, enabled } : item
    );
    await saveTenantMenuConfig(tenantId, updatedItems);
    return NextResponse.json({ success: true, scope: 'tenant' });
  } catch (error) {
    console.error('[SuperAdmin Menu Items PUT] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to toggle menu item';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Save menu item configuration (bulk)
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }
    const body = await request.json();
    const { tenantId, items, scope } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Items must be an array' }, { status: 400 });
    }

    // For global scope, update the global config
    if (scope === 'global' || !tenantId) {
      const currentItems = await getGlobalMenuConfig();
      const updatedItems = currentItems.map((item) => {
        const update = items.find((i: { key: string }) => i.key === item.key);
        return update ? { ...item, enabled: update.enabled } : item;
      });
      await saveGlobalMenuConfig(updatedItems);
      return NextResponse.json({ success: true, updated: items.length, scope: 'global' });
    }

    // For tenant-specific, update tenant settingsJson
    const currentItems = await getTenantMenuConfig(tenantId);
    const updatedItems = currentItems.map((item) => {
      const update = items.find((i: { key: string }) => i.key === item.key);
      return update ? { ...item, enabled: update.enabled } : item;
    });
    await saveTenantMenuConfig(tenantId, updatedItems);
    return NextResponse.json({ success: true, updated: items.length, scope: 'tenant' });
  } catch (error) {
    console.error('[SuperAdmin Menu Items POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to save menu items';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
