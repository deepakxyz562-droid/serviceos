import { Platform } from 'react-native';

export const BRAND = {
  name: 'GPTForm',
  tagline: 'Never miss a customer, lead, or booking',
  primaryColor: '#10B981', // Emerald 500
  accentColor: '#0F172A',  // Slate 900
};

// Default backend API base URL
// In development, iOS simulator uses localhost:3000, Android uses 10.0.2.2:3000 or staging
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'https://fieseros.com');

export const API_PATHS = {
  login: '/api/auth/login',
  sessions: '/api/chat/sessions',
  sessionMessages: (id: string) => `/api/chat/sessions/${id}/messages`,
  claimSession: (id: string) => `/api/chat/sessions/${id}/claim`,
  closeSession: (id: string) => `/api/chat/sessions/${id}/close`,
  leads: '/api/leads',
  leadDetail: (id: string) => `/api/leads/${id}`,
  bookings: '/api/bookings',
  forms: '/api/forms',
  aiCopilot: '/api/ai/copilot',
  teachAi: '/api/forms/ai-teach',
};
