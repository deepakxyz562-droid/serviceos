export const BRAND = {
  name: 'BGOS',
  tagline: 'Business Growth Operating System',
  primaryColor: '#009F50', // BGOS Emerald
  accentColor: '#34D399',  // Emerald glow
  heroColor: '#043B26',    // Deep Emerald
  inkColor: '#070B2D',     // Ink Navy
};

export const CLOUD_FALLBACK_API_URL = 'https://bgos.site';

function resolveDefaultHost(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }
  // Only connect to dev machine LAN IP if explicitly opted in via EXPO_PUBLIC_USE_LOCAL_BACKEND
  if (
    typeof __DEV__ !== 'undefined' &&
    __DEV__ &&
    (process.env.EXPO_PUBLIC_USE_LOCAL_BACKEND === 'true' ||
      process.env.EXPO_PUBLIC_USE_LOCAL_BACKEND === '1')
  ) {
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
  return CLOUD_FALLBACK_API_URL;
}

// Default backend API base URL for BGOS (API endpoints can use local LAN dev IP during development)
export const API_BASE_URL = resolveDefaultHost();

// Web URL for browser checkout, payment gateways, legal pages & OAuth:
// Always use live HTTPS domain (https://bgos.site) so Razorpay, UPI & OAuth work seamlessly
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || 'https://bgos.site').replace(/\/$/, '');

// Dedicated Payment Gateway host for Razorpay Standard Checkout & UPI.
export const PAYMENT_WEB_URL = (process.env.EXPO_PUBLIC_PAYMENT_URL || 'https://bgos.site').replace(/\/$/, '');

// Standalone BGOS Business Page & Booking Card host (never redirects to Marketplace)
export const BGOS_PUBLIC_WEB_URL = (
  process.env.EXPO_PUBLIC_BGOS_WEB_URL || 'https://bgos.site'
).replace(/\/$/, '');

/**
 * Resolves any image URL or relative path (e.g. `/images/bgos/templates/...` or `/uploads/...`)
 * to a fully-qualified absolute URL so React Native image loaders (Fresco on Android / NSURLSession on iOS)
 * and GBP APIs can safely load it without corrupting native device URIs.
 */
export function resolvePhotoUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('content://') ||
    trimmed.startsWith('ph://') ||
    trimmed.startsWith('assets-library://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  // User uploads (/uploads/...) are served from the main application host (WEB_URL).
  if (cleanPath.startsWith('/uploads/')) {
    return `${WEB_URL}${cleanPath}`;
  }
  return `${BGOS_PUBLIC_WEB_URL}${cleanPath}`;
}

// BGOS Support details (Meta Verified WhatsApp Business)
export const BGOS_SUPPORT_WHATSAPP_DIGITS = '916127967087';
export const BGOS_SUPPORT_PHONE_DISPLAY = '+91 61279 67087';
export const BGOS_SUPPORT_EMAIL = 'support@bgos.site';

export const API_PATHS = {
  login: '/api/auth/login',
  phoneLogin: '/api/bgos/mobile-auth/phone',
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
