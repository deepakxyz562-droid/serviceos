/** One canonical destination per BGOS feature. BOS operations stay outside this product. */
export const BGOS_NAVIGATION = [
  { title: 'Workspace', items: [
    { view: 'dashboard', label: 'Overview', iconName: 'LayoutDashboard' },
    { view: 'creatorProfile', label: 'Business profile', iconName: 'Globe' },
    { view: 'leads', label: 'Leads & CRM', iconName: 'Users' },
    { view: 'omnichannel', label: 'Inbox', iconName: 'MessageSquare' },
    { view: 'scheduling', label: 'Appointments', iconName: 'Calendar' },
  ] },
  { title: 'Grow your business', items: [
    { view: 'socialMedia', label: 'Marketing studio', iconName: 'Sparkles' },
    { view: 'leadDiscovery', label: 'Lead intelligence', iconName: 'Search' },
    { view: 'campaigns', label: 'Outreach', iconName: 'Send' },
    { view: 'reviews', label: 'Reviews & reputation', iconName: 'Star' },
    { view: 'agentStudio', label: 'AI studio', iconName: 'Bot' },
    { view: 'formBuilder', label: 'Forms & funnels', iconName: 'FileInput' },
    { view: 'workflows', label: 'Automations', iconName: 'Workflow' },
  ] },
  { title: 'Manage', items: [
    { view: 'aiReceptionist', label: 'Business phone', iconName: 'Phone' },
    { view: 'formsAnalytics', label: 'Growth analytics', iconName: 'BarChart3' },
    { view: 'integrations', label: 'Integrations', iconName: 'Share2' },
    { view: 'billing', label: 'Plan & usage', iconName: 'CreditCard' },
    { view: 'settings', label: 'Settings', iconName: 'Settings' },
  ] },
] as const;

const allowed = new Set<string>([
  ...BGOS_NAVIGATION.flatMap(section => section.items.map(item => item.view)),
  'contacts', 'formSubmissions', 'booking', 'calendar', 'meetingTypes', 'appointmentTypes',
  'creatorOffers', 'canvas', 'notifications', 'helpCenter', 'activityLogs',
  'socialAccounts', 'postComposer', 'postsList', 'socialAnalytics', 'emailProviders',
  'aiCallHistory', 'aiAgents',
]);
export function bgosView(view: string): string {
  if (view === 'workflowAutomations') return 'workflows';
  if (view === 'chatbotBuilder') return 'agentStudio';
  if (view === 'formsDashboard') return 'dashboard';
  return allowed.has(view) ? view : 'dashboard';
}

export function bgosNavigationView(view: string): string {
  if (view === 'contacts') return 'leads';
  if (view === 'formSubmissions') return 'formBuilder';
  if (['booking', 'calendar', 'meetingTypes', 'appointmentTypes'].includes(view)) return 'scheduling';
  if (['socialAccounts', 'postComposer', 'postsList', 'socialAnalytics'].includes(view)) return 'socialMedia';
  if (['aiCallHistory', 'aiAgents'].includes(view)) return 'aiReceptionist';
  if (view === 'creatorOffers') return 'creatorProfile';
  return bgosView(view);
}
