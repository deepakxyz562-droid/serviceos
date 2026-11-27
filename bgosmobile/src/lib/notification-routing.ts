const destinations = {
  inbox: '/inbox',
  messages: '/inbox',
  conversations: '/inbox',
  omnichannel: '/inbox',
  leads: '/leads',
  calendar: '/appointments',
  appointments: '/appointments',
  bookings: '/appointments',
  reviews: '/(tabs)/reviews',
  marketing: '/(tabs)/marketing',
  photos: '/(tabs)/photos',
  tools: '/(tabs)/tools',
  forms: '/submissions',
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
  '/inbox',
  '/leads',
  '/appointments',
  '/submissions',
  '/agents',
  '/integrations',
  '/growth',
  '/automations',
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
  'conversationId',
  'sessionId',
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
  if (data.conversationId || data.sessionId || data.source === 'live_chat_escalation') {
    return `/inbox${buildDestinationQuery(data)}`;
  }
  if (data.mediaId || data.photoId) return `/(tabs)/photos${buildDestinationQuery(data)}`;
  if (data.postId) {
    const extra = new URLSearchParams();
    if (!data.mode) extra.set('mode', 'posts');
    return `/(tabs)/marketing${buildDestinationQuery(data, extra)}`;
  }
  if (data.reviewId) return '/(tabs)/reviews';
  if (data.leadId) return '/leads';
  if (data.appointmentId || data.bookingId) return '/appointments';
  if (data.conversationId || data.messageId) return '/inbox';

  return null;
}

const DEEP_LINK_VIEW_ROUTES: Record<string, string> = {
  dashboard: '/(tabs)',
  home: '/(tabs)',
  reviews: '/(tabs)/reviews',
  photos: '/(tabs)/photos',
  studio: '/(tabs)/photos?mode=studio',
  marketing: '/(tabs)/marketing',
  tools: '/(tabs)/tools',
  helpcenter: '/help',
  help: '/help',
  settings: '/settings',
  preferences: '/preferences',
  integrations: '/integrations',
  billing: '/my-plan',
  plans: '/my-plan',
  growthreport: '/growth-report',
  'growth-report': '/growth-report',
  inbox: '/inbox',
  leads: '/leads',
  appointments: '/appointments',
};

/**
 * Resolves incoming Universal / App Links (`https://bgos.site/open?view=...`)
 * or custom-scheme links (`bgos://open?view=...`, `bgos://reviews`) into an Expo Router path.
 * Ignores OAuth/auth callback URLs handled by their dedicated screens.
 */
export function resolveBgosDeepLink(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    const isCustomBgos = parsed.protocol === 'bgos:';
    const isBgosWeb =
      (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      /(?:^|\.)bgos\.site$/i.test(parsed.hostname);

    if (!isCustomBgos && !isBgosWeb) return null;

    // Combine host + pathname for bgos://host/path vs https://bgos.site/path
    const routeToken = isCustomBgos
      ? [parsed.hostname, parsed.pathname].filter(Boolean).join('/').replace(/^\/+|\/+$/g, '').toLowerCase()
      : parsed.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();

    if (
      routeToken.includes('gbp-callback') ||
      routeToken.includes('auth-callback') ||
      routeToken.includes('select-profile')
    ) {
      return null;
    }

    // Ignore plain https://bgos.site web URLs unless they target /open or /app
    if (isBgosWeb && routeToken !== 'open' && !routeToken.startsWith('open/') && routeToken !== 'app') {
      return null;
    }

    const viewRaw = (parsed.searchParams.get('view') || '').trim().toLowerCase();
    const socialTab = (parsed.searchParams.get('socialTab') || parsed.searchParams.get('socialtab') || '')
      .trim()
      .toLowerCase();
    const mode = (parsed.searchParams.get('mode') || '').trim().toLowerCase();

    if (viewRaw === 'socialmedia') {
      if (socialTab === 'ai-content' || mode === 'studio') {
        return '/(tabs)/photos?mode=studio';
      }
      return '/(tabs)/marketing';
    }

    if (viewRaw && DEEP_LINK_VIEW_ROUTES[viewRaw]) {
      return DEEP_LINK_VIEW_ROUTES[viewRaw];
    }

    const leaf = routeToken.replace(/^open\/?/, '').split('/').filter(Boolean).pop() || '';
    if (leaf && DEEP_LINK_VIEW_ROUTES[leaf]) {
      return DEEP_LINK_VIEW_ROUTES[leaf];
    }

    if (routeToken === 'open' || routeToken === 'app') {
      return '/(tabs)';
    }

    return null;
  } catch {
    return null;
  }
}
