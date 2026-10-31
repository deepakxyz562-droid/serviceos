export const BRAND = {
  name: 'BGOS',
  tagline: 'Business Growth Operating System',
  primaryColor: '#009F50', // BGOS Emerald
  accentColor: '#34D399',  // Emerald glow
  heroColor: '#043B26',    // Deep Emerald
  inkColor: '#070B2D',     // Ink Navy
};

function resolveDefaultHost(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }
  // When running locally in Expo, dynamically connect to the dev machine LAN IP
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Constants = require('expo-constants')?.default || require('expo-constants');
      const hostUri = Constants?.expoConfig?.hostUri;
      if (hostUri) {
        const devIp = hostUri.split(':')[0];
        if (devIp) {
          return `http://${devIp}:3000`;
        }
      }
    } catch {}
  }
  return 'https://bgos.fieseros.com';
}

// Default backend API base URL for BGOS
export const API_BASE_URL = resolveDefaultHost();
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || resolveDefaultHost()).replace(/\/$/, '');

// BGOS Support details (Meta Verified WhatsApp Business)
export const BGOS_SUPPORT_WHATSAPP_DIGITS = '916127967087';
export const BGOS_SUPPORT_PHONE_DISPLAY = '+91 61279 67087';
export const BGOS_SUPPORT_EMAIL = 'support@fieseros.com';

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
