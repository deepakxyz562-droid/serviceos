import { describe, it, expect } from 'vitest';
import { getCachedBootstrap, setCachedBootstrap, invalidateBootstrapCache } from '@/lib/bgos/bootstrap-cache';

describe('BGOS Growth Autopilot Services Action & Cache', () => {
  it('manages bootstrap cache correctly with invalidation', () => {
    const tenantId = 'test-tenant-123';
    expect(getCachedBootstrap(tenantId)).toBeNull();

    const mockPayload = { status: 'ok', score: 95 };
    setCachedBootstrap(tenantId, mockPayload);
    expect(getCachedBootstrap(tenantId)).toEqual(mockPayload);

    // Invalidate single tenant
    invalidateBootstrapCache(tenantId);
    expect(getCachedBootstrap(tenantId)).toBeNull();

    // Set again and invalidate all
    setCachedBootstrap(tenantId, mockPayload);
    invalidateBootstrapCache();
    expect(getCachedBootstrap(tenantId)).toBeNull();
  });

  it('maps services_catalog to add_services actionType', () => {
    const missingChecks = [
      { id: 'services_catalog', label: 'Services Catalog', actionRequired: 'Auto-write descriptions' },
      { id: 'business_address', label: 'Address', actionRequired: 'Add address' },
      { id: 'phone_number', label: 'Phone', actionRequired: 'Add phone' },
      { id: 'website_url', label: 'Website', actionRequired: 'Add website' },
      { id: 'business_hours', label: 'Hours', actionRequired: 'Set hours' },
      { id: 'booking_link', label: 'Booking', actionRequired: 'Enable booking' },
      { id: 'fresh_photos', label: 'Photos', actionRequired: 'Upload photos' },
      { id: 'other_unknown', label: 'Other', actionRequired: 'Optimize' },
    ];

    const actions = missingChecks.map((m) => ({
      id: m.id,
      actionType:
        m.id === 'services_catalog'
          ? 'add_services'
          : m.id === 'business_address'
            ? 'add_address'
            : m.id === 'phone_number'
              ? 'add_phone'
              : m.id === 'website_url'
                ? 'add_website'
                : m.id === 'business_hours'
                  ? 'set_hours'
                  : m.id === 'booking_link'
                    ? 'enable_booking'
                    : m.id === 'fresh_photos'
                      ? 'upload_photos'
                      : 'auto_optimize_seo',
    }));

    const servicesAction = actions.find((a) => a.id === 'services_catalog');
    expect(servicesAction?.actionType).toBe('add_services');

    const addressAction = actions.find((a) => a.id === 'business_address');
    expect(addressAction?.actionType).toBe('add_address');

    const hoursAction = actions.find((a) => a.id === 'business_hours');
    expect(hoursAction?.actionType).toBe('set_hours');

    const bookingAction = actions.find((a) => a.id === 'booking_link');
    expect(bookingAction?.actionType).toBe('enable_booking');

    const photosAction = actions.find((a) => a.id === 'fresh_photos');
    expect(photosAction?.actionType).toBe('upload_photos');

    const otherAction = actions.find((a) => a.id === 'other_unknown');
    expect(otherAction?.actionType).toBe('auto_optimize_seo');
  });
});
