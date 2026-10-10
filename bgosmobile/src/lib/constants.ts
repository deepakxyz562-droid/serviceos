export const BRAND = {
  name: 'BGOS',
  tagline: 'Business Growth Operating System',
  primaryColor: '#007F73', // BGOS Teal
  accentColor: '#00BFAE',  // Cyan glow
  heroColor: '#003E43',    // Deep Teal
  inkColor: '#070B2D',     // Ink Navy
};

// Default backend API base URL for BGOS
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://bgos.fieseros.com').replace(/\/$/, '');
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || 'https://bgos.fieseros.com').replace(/\/$/, '');

export const API_PATHS = {
  login: '/api/auth/login',
  currentUser: '/api/bgos/mobile-auth/session',
  // Omnichannel Live Inbox
  inboxSessions: '/api/omnichannel/conversations',
  inboxMessages: (id: string) => `/api/omnichannel/conversations/${id}/messages`,
  sendReply: (id: string) => `/api/omnichannel/conversations/${id}/messages`,
  // CRM Lite & Leads
  leads: '/api/leads',
  contacts: '/api/contacts',
  // Form Submissions
  forms: '/api/forms',
  formSubmissions: (id: string) => `/api/forms/${id}/responses`,
  allSubmissions: '/api/forms/responses',
  // AI Agents & Chatbots
  agents: '/api/forms/agents',
  agentChat: (id: string) => `/api/forms/agents/${id}/chat`,
  // Appointments & Booking
  bookings: '/api/bookings',
  // Growth & Reviews
  reviews: '/api/reviews',
  brandProfile: '/api/brand-profile',
  broadcasts: '/api/campaigns/send',
};
