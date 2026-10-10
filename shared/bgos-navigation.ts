/** One canonical destination per BGOS feature following the Stitch 4-tier architecture. */
export const BGOS_NAVIGATION = [
  {
    title: 'Core',
    items: [
      { view: 'dashboard', label: 'Home', iconName: 'Home' },
      { view: 'omnichannel', label: 'Inbox', iconName: 'MessageSquare', badge: '12' },
      { view: 'liveChat', label: 'Live Engage', iconName: 'Radio' },
      { view: 'helpCenter', label: 'Tickets & Support', iconName: 'Ticket' },
    ],
  },
  {
    title: 'AI & Phone',
    items: [
      { view: 'agentStudio', label: 'AI Assistant', iconName: 'Bot', badge: 'AI' },
      { view: 'aiReceptionist', label: 'Business Phone & AI', iconName: 'Phone', badge: 'VOICE' },
    ],
  },
  {
    title: 'Growth & CRM',
    items: [
      { view: 'leads', label: 'Leads & CRM', iconName: 'Users' },
      { view: 'socialMedia', label: 'Marketing Studio', iconName: 'Sparkles' },
      { view: 'reviews', label: 'Google Business', iconName: 'Star' },
      { view: 'campaigns', label: 'Campaigns & Outreach', iconName: 'Send' },
      { view: 'leadDiscovery', label: 'Lead Intelligence', iconName: 'Search' },
      { view: 'formBuilder', label: 'Forms & Funnels', iconName: 'FileInput' },
      { view: 'scheduling', label: 'Appointments', iconName: 'Calendar' },
      { view: 'workflows', label: 'Automations', iconName: 'Workflow' },
      { view: 'creatorProfile', label: 'Digital Presence', iconName: 'Globe' },
      { view: 'formsAnalytics', label: 'Analytics & Reports', iconName: 'BarChart3' },
    ],
  },
  {
    title: 'Manage',
    items: [
      { view: 'employees', label: 'Team Members', iconName: 'Shield' },
      { view: 'integrations', label: 'Integrations', iconName: 'Share2' },
      { view: 'billing', label: 'Billing & Subscription', iconName: 'CreditCard' },
      { view: 'settings', label: 'Settings', iconName: 'Settings' },
    ],
  },
] as const;

const allowed = new Set<string>([
  ...BGOS_NAVIGATION.flatMap((section) => section.items.map((item) => item.view)),
  'contacts', 'formSubmissions', 'booking', 'calendar', 'meetingTypes', 'appointmentTypes',
  'creatorOffers', 'canvas', 'notifications', 'activityLogs', 'helpAdmin',
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
