/** Canonical BGOS surface. BOS commerce/accounting modules are intentionally absent. */
export const BGOS_NAVIGATION = [
  { title: 'Overview', items: [{ view: 'dashboard', label: 'Overview', iconName: 'LayoutDashboard' }] },
  { title: 'Acquire', items: [
    { view: 'formBuilder', label: 'Forms & funnels', iconName: 'FileInput' },
    { view: 'formSubmissions', label: 'Responses', iconName: 'Inbox' },
    { view: 'leadDiscovery', label: 'Lead intelligence', iconName: 'Search' },
    { view: 'creatorProfile', label: 'Digital card & mini-site', iconName: 'QrCode' },
    { view: 'reviews', label: 'Reviews & reputation', iconName: 'Star' },
  ] },
  { title: 'Engage', items: [
    { view: 'omnichannel', label: 'Team inbox', iconName: 'RadioTower' },
    { view: 'agentStudio', label: 'AI studio', iconName: 'Bot' },
    { view: 'workflows', label: 'Automations', iconName: 'Workflow' },
  ] },
  { title: 'Convert', items: [
    { view: 'scheduling', label: 'Scheduling', iconName: 'Calendar' },
    { view: 'contacts', label: 'Contacts', iconName: 'Users' },
    { view: 'campaigns', label: 'Outreach', iconName: 'Send' },
    { view: 'formsAnalytics', label: 'Growth analytics', iconName: 'BarChart3' },
  ] },
  { title: 'Workspace', items: [
    { view: 'integrations', label: 'Integrations', iconName: 'Share2' },
    { view: 'billing', label: 'Plan & usage', iconName: 'CreditCard' },
    { view: 'settings', label: 'Settings', iconName: 'Settings' },
  ] },
] as const;

const allowed = new Set<string>([
  ...BGOS_NAVIGATION.flatMap(section => section.items.map(item => item.view)),
  'leads', 'booking', 'calendar', 'meetingTypes', 'appointmentTypes',
  'creatorOffers', 'canvas', 'notifications', 'helpCenter', 'activityLogs',
]);
export function bgosView(view: string): string {
  if (view === 'workflowAutomations') return 'workflows';
  if (view === 'chatbotBuilder') return 'agentStudio';
  if (view === 'formsDashboard') return 'dashboard';
  return allowed.has(view) ? view : 'dashboard';
}
