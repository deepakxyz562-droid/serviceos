/** One canonical destination per BGOS feature following the Stitch 4-tier architecture. */
export const BGOS_NAVIGATION = [
  {
    title: 'Core',
    items: [
      { view: 'dashboard', label: 'Home', iconName: 'Home' },
      { view: 'omnichannel', label: 'Inbox', iconName: 'Mail' },
      { view: 'helpCenter', label: 'Tickets & Support', iconName: 'CircleHelp' },
    ],
  },
  {
    title: 'AI & Phone',
    items: [
      { view: 'agentStudio', label: 'AI Assistant', iconName: 'Bot' },
      { view: 'aiReceptionist', label: 'Business Phone & AI Voice', iconName: 'PhoneCall' },
    ],
  },
  {
    title: 'Growth & CRM',
    items: [
      { view: 'gbpAI', label: 'GBP AI Agents', iconName: 'Sparkles' },
      { view: 'leads', label: 'Leads & CRM', iconName: 'Users' },
      { view: 'socialMedia', label: 'Marketing Studio', iconName: 'Send' },
      { view: 'reviews', label: 'Google Business & Reviews', iconName: 'Store' },
      { view: 'formBuilder', label: 'Forms', iconName: 'FileInput' },
      { view: 'scheduling', label: 'Appointments', iconName: 'Calendar' },
    ],
  },
  {
    title: 'Manage',
    items: [
      { view: 'integrations', label: 'Integrations', iconName: 'Megaphone' },
      { view: 'settings', label: 'Settings', iconName: 'Settings' },
    ],
  },
] as const;

const allowed = new Set<string>([
  ...BGOS_NAVIGATION.flatMap((section) => section.items.map((item) => item.view)),
  'gbpAI',
  'contacts', 'formSubmissions', 'booking', 'calendar', 'meetingTypes', 'appointmentTypes',
  'creatorProfile', 'creatorOffers', 'canvas', 'notifications', 'activityLogs', 'helpAdmin',
  'socialAccounts', 'postComposer', 'postsList', 'socialAnalytics', 'emailProviders',
  'aiCallHistory', 'aiAgents', 'workflows', 'formsAnalytics', 'leadDiscovery', 'employees',
  'liveChat', 'billing', 'campaigns',
]);

export function bgosView(view: string): string {
  if (view === 'workflowAutomations') return 'workflows';
  if (view === 'chatbotBuilder') return 'agentStudio';
  if (view === 'formsDashboard') return 'dashboard';
  return allowed.has(view) ? view : 'dashboard';
}

export function bgosNavigationView(view: string): string {
  if (view === 'contacts' || view === 'campaigns' || view === 'leadDiscovery') return 'leads';
  if (view === 'formSubmissions') return 'formBuilder';
  if (['booking', 'calendar', 'meetingTypes', 'appointmentTypes'].includes(view)) return 'scheduling';
  if (['socialAccounts', 'postComposer', 'postsList', 'socialAnalytics'].includes(view)) return 'socialMedia';
  if (['aiCallHistory', 'aiAgents'].includes(view)) return 'aiReceptionist';
  if (view === 'creatorOffers') return 'creatorProfile';
  if (view === 'employees' || view === 'billing') return 'settings';
  if (view === 'liveChat') return 'omnichannel';
  return bgosView(view);
}
