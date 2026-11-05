const destinations = {
  inbox: '/(tabs)/inbox',
  messages: '/(tabs)/inbox',
  conversations: '/(tabs)/inbox',
  leads: '/(tabs)/leads',
  calendar: '/(tabs)/appointments',
  appointments: '/(tabs)/appointments',
  bookings: '/(tabs)/appointments',
  reviews: '/(tabs)/reviews',
  marketing: '/(tabs)/marketing',
  photos: '/(tabs)/photos',
  tools: '/(tabs)/tools',
  forms: '/(tabs)/submissions',
  'ai-call-history': '/(tabs)/phone',
  growth: '/growth-report',
  profile: '/manage-profile',
} as const;

const ALLOWED_DIRECT_ROUTES = [
  '/(tabs)',
  '/(tabs)/index',
  '/(tabs)/reviews',
  '/(tabs)/marketing',
  '/(tabs)/photos',
  '/(tabs)/tools',
  '/(tabs)/inbox',
  '/(tabs)/leads',
  '/(tabs)/appointments',
  '/(tabs)/submissions',
  '/(tabs)/phone',
  '/manage-profile',
  '/growth-report',
  '/reply-settings',
  '/preferences',
  '/my-plan',
];

export function notificationDestination(data: Record<string, unknown>): string | null {
  if (!data || typeof data !== 'object') return null;

  // 1. Direct route property support (e.g. data: { route: '/(tabs)/reviews' })
  if (typeof data.route === 'string') {
    const route = data.route.trim();
    if (ALLOWED_DIRECT_ROUTES.includes(route)) {
      return route;
    }
  }

  // 2. URL property support (e.g. data: { url: '/reviews' } or data: { url: '/?view=reviews' })
  if (typeof data.url === 'string') {
    try {
      if (!data.url.startsWith('/') || data.url.startsWith('//')) return null;
      const url = new URL(data.url, 'https://bgos.invalid');
      const view = url.searchParams.get('view') || url.pathname.split('/').pop() || '';
      if (view in destinations) {
        return destinations[view as keyof typeof destinations];
      }
    } catch {
      return null;
    }
  }

  // 3. Entity-based fallback (e.g. data: { reviewId: '...' } or data: { leadId: '...' })
  if (data.reviewId) return '/(tabs)/reviews';
  if (data.leadId) return '/(tabs)/leads';
  if (data.appointmentId || data.bookingId) return '/(tabs)/appointments';
  if (data.conversationId || data.messageId) return '/(tabs)/inbox';

  return null;
}
