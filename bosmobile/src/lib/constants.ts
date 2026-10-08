
export const BRAND = {
  name: 'BOS',
  tagline: 'One System to Run the Entire Business',
  primaryColor: '#10B981', // Emerald 600 (BOS brand)
  accentColor: '#0F172A',  // Slate 900
};

// Default backend API base URL
// Physical devices and release builds use https://bos.fieseros.com.
// Developers may explicitly override EXPO_PUBLIC_API_URL for a local server.
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://bos.fieseros.com').replace(/\/$/, '');
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || 'https://bos.fieseros.com').replace(/\/$/, '');

export const API_PATHS = {
  login: '/api/auth/login',
  sessions: '/api/chat/sessions',
  sessionMessages: (id: string) => `/api/chat/sessions/${id}/messages`,
  claimSession: (id: string) => `/api/chat/sessions/${id}/claim`,
  closeSession: (id: string) => `/api/chat/sessions/${id}/close`,
  leads: '/api/leads',
  leadDetail: (id: string) => `/api/leads/${id}`,
  bookings: '/api/bookings',
  bookingSettings: '/api/bookings/settings',
  notificationPreferences: '/api/notifications/preferences',
  forms: '/api/forms',
  formDetail: (id: string) => `/api/forms/${id}`,
  agents: '/api/forms/agents',
  agentDetail: (id: string) => `/api/forms/agents/${id}`,
  channels: '/api/omnichannel/channels',
  channelDetail: (id: string) => `/api/omnichannel/channels/${id}`,
  receptionist: '/api/addons/receptionist',
  receptionistTestCall: '/api/addons/receptionist/test-call',
  receptionistCalls: '/api/vapi/calls',
  aiCopilot: '/api/ai/copilot',
  aiChat: '/api/ai/chat',
  aiKnowledge: '/api/ai/knowledge',
  dashboardBootstrap: '/api/dashboard/bootstrap',
  feedback: '/api/feedback',
  teachAi: '/api/forms/ai-teach',
  commerceConfig: '/api/commerce/config',
  commerceOrders: '/api/commerce/orders',
  commerceOrderDetail: (id: string) => `/api/commerce/orders/${id}`,
  commerceCustomers: '/api/commerce/customers',
  commerceMatchPayment: '/api/commerce/orders/match-payment',
  commerceExpenses: '/api/commerce/expenses',
  commerceDaybook: '/api/commerce/daybook',
  commerceKhata: '/api/commerce/khata',
  commerceInventory: '/api/commerce/inventory',
  commerceInvoices: '/api/quote-flow/invoices',
  commerceQuotes: '/api/quote-flow/quotes',
  commerceTemplates: '/api/commerce/templates',
  commercePromotions: '/api/commerce/promotions',
  commerceCustomDomain: '/api/commerce/domain',
  commerceDomainVerify: '/api/commerce/domain/verify',
  storeDirectory: '/api/public/store/directory',
  ecommerceShopifySync: '/api/ecommerce/shopify/sync',
  ecommerceWooSync: '/api/ecommerce/woocommerce/sync',
};
