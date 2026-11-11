import { describe, it, expect } from 'vitest';
import { notificationDestination } from '../bgosmobile/src/lib/notification-routing';

describe('BGOS Notification Deep-Link Routing', () => {
  it('routes reviews notifications directly to /(tabs)/reviews', () => {
    expect(notificationDestination({ url: '/reviews' })).toBe('/(tabs)/reviews');
    expect(notificationDestination({ url: '/?view=reviews' })).toBe('/(tabs)/reviews');
  });

  it('honors direct route parameter from allowed whitelist', () => {
    expect(notificationDestination({ route: '/(tabs)/reviews' })).toBe('/(tabs)/reviews');
    expect(notificationDestination({ route: '/inbox' })).toBe('/inbox');
    expect(notificationDestination({ route: '/leads' })).toBe('/leads');
    expect(notificationDestination({ route: '/appointments' })).toBe('/appointments');
    expect(notificationDestination({ route: '/manage-profile' })).toBe('/manage-profile');
    expect(notificationDestination({ route: '/growth-report' })).toBe('/growth-report');
  });

  it('rejects external, removed, or unlisted arbitrary routes', () => {
    expect(notificationDestination({ route: 'https://malicious.com' })).toBeNull();
    expect(notificationDestination({ route: '/admin/arbitrary' })).toBeNull();
    expect(notificationDestination({ route: '/(tabs)/phone' })).toBeNull();
    expect(notificationDestination({ url: 'javascript:void(0)' })).toBeNull();
    expect(notificationDestination({ url: '/?view=ai-call-history' })).toBeNull();
  });

  it('maps entity IDs to appropriate destinations', () => {
    expect(notificationDestination({ reviewId: 'rev_123' })).toBe('/(tabs)/reviews');
    expect(notificationDestination({ leadId: 'lead_456' })).toBe('/leads');
    expect(notificationDestination({ bookingId: 'book_789' })).toBe('/appointments');
    expect(notificationDestination({ conversationId: 'conv_321' })).toBe('/inbox');
  });
});
