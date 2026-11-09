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

const PASSTHROUGH_PARAMS = [
  'mediaId',
  'photoId',
  'tab',
  'postId',
  'mode',
  'pill',
  'googleUrl',
] as const;

function buildDestinationQuery(
  data: Record<string, unknown>,
  existing?: URLSearchParams,
): string {
  const qs = new URLSearchParams(existing || undefined);
  for (const key of PASSTHROUGH_PARAMS) {
    const val = data[key];
    if (typeof val === 'string' && val.trim() && !qs.has(key)) {
      qs.set(key, val.trim());
    }
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export function notificationDestination(data: Record<string, unknown>): string | null {
  if (!data || typeof data !== 'object') return null;

  // 1. Direct route property support (supports query string & data param passthrough)
  if (typeof data.route === 'string') {
    const rawRoute = data.route.trim();
    const qIdx = rawRoute.indexOf('?');
    const basePath = qIdx >= 0 ? rawRoute.slice(0, qIdx) : rawRoute;
    const existingQs = qIdx >= 0 ? new URLSearchParams(rawRoute.slice(qIdx + 1)) : undefined;
    if (ALLOWED_DIRECT_ROUTES.includes(basePath)) {
      return `${basePath}${buildDestinationQuery(data, existingQs)}`;
    }
  }

  // 2. URL property support (e.g. data: { url: '/reviews' } or data: { url: '/?view=reviews' })
  if (typeof data.url === 'string') {
    try {
      if (!data.url.startsWith('/') || data.url.startsWith('//')) return null;
      const url = new URL(data.url, 'https://bgos.invalid');
      const view = url.searchParams.get('view') || url.pathname.split('/').pop() || '';
      if (view in destinations) {
        return `${destinations[view as keyof typeof destinations]}${buildDestinationQuery(data)}`;
      }
    } catch {
      return null;
    }
  }

  // 3. Entity-based fallback
  if (data.mediaId || data.photoId) return `/(tabs)/photos${buildDestinationQuery(data)}`;
  if (data.postId) {
    const extra = new URLSearchParams();
    if (!data.mode) extra.set('mode', 'posts');
    return `/(tabs)/marketing${buildDestinationQuery(data, extra)}`;
  }
  if (data.reviewId) return '/(tabs)/reviews';
  if (data.leadId) return '/(tabs)/leads';
  if (data.appointmentId || data.bookingId) return '/(tabs)/appointments';
  if (data.conversationId || data.messageId) return '/(tabs)/inbox';

  return null;
}
