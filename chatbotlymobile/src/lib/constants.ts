export const BRAND = {
  name: 'Chatbotly',
  tagline: 'AI Forms, Chatbots, Live Inbox & Appointments',
  primaryColor: '#0ea5e9', // Sky 500 / Electric Cyan
  accentColor: '#0f172a',  // Slate 900
};

// Default backend API base URL for Chatbotly
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://chatbotly.fieseros.com').replace(/\/$/, '');
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || 'https://chatbotly.fieseros.com').replace(/\/$/, '');

export const API_PATHS = {
  login: '/api/auth/login',
  currentUser: '/api/auth/me',
  // Omnichannel Live Inbox
  inboxSessions: '/api/omnichannel/conversations',
  inboxMessages: (id: string) => `/api/omnichannel/conversations/${id}/messages`,
  sendReply: (id: string) => `/api/omnichannel/conversations/${id}/messages`,
  // Form Submissions
  forms: '/api/forms',
  formSubmissions: (id: string) => `/api/forms/${id}/submissions`,
  allSubmissions: '/api/forms/submissions',
  // AI Agents & Chatbots
  agents: '/api/forms/agents',
  agentChat: (id: string) => `/api/forms/agents/${id}/chat`,
  // Appointments & Booking
  bookings: '/api/scheduling/appointments',
  calendarEvents: '/api/scheduling/calendar',
};
