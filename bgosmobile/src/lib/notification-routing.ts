const destinations = {
  inbox: '/(tabs)/inbox', messages: '/(tabs)/inbox', conversations: '/(tabs)/inbox',
  leads: '/(tabs)/leads', calendar: '/(tabs)/appointments', appointments: '/(tabs)/appointments', bookings: '/(tabs)/appointments',
  reviews: '/(tabs)/growth', forms: '/(tabs)/submissions', 'ai-call-history': '/(tabs)/phone',
} as const;
export function notificationDestination(data: Record<string, unknown>) {
  if (typeof data.url !== 'string') return null;
  try {
    // Notifications select known BGOS screens, never arbitrary external URLs or BOS routes.
    if (!data.url.startsWith('/') || data.url.startsWith('//')) return null;
    const url = new URL(data.url, 'https://bgos.invalid');
    const view = url.searchParams.get('view') || url.pathname.split('/').pop() || '';
    return destinations[view as keyof typeof destinations] || null;
  } catch { return null; }
}
