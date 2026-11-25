import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockDb = vi.hoisted(() => ({
  tenant: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  review: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  service: {
    findMany: vi.fn(),
  },
}));

const mockGetAuthUser = vi.hoisted(() => vi.fn());
const mockPrepareGoogleAccount = vi.hoisted(() => vi.fn());
const mockResolveGoogleConnectionState = vi.hoisted(() => vi.fn());
const mockInvalidatePlacePayloadCacheForTenant = vi.hoisted(() => vi.fn());
const mockFetchGoogleBusinessPlaceDetails = vi.hoisted(() => vi.fn());
const mockFetchGoogleBusinessPerformanceMetrics = vi.hoisted(() => vi.fn());
const mockListGooglePlaceActions = vi.hoisted(() => vi.fn());
const mockSyncGooglePlaceActionsForTenant = vi.hoisted(() => vi.fn());
const mockInvalidateBootstrapCache = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/auth', () => ({ getAuthUser: mockGetAuthUser }));
vi.mock('@/lib/social/google-review-scope', () => ({
  googleReviewScope: vi.fn().mockResolvedValue({}),
}));
vi.mock('@/lib/social/google-account-helper', () => ({
  prepareGoogleAccount: mockPrepareGoogleAccount,
}));
vi.mock('@/lib/social/google-connection-state', () => ({
  PLACE_PAYLOAD_CACHE: new Map(),
  invalidatePlacePayloadCacheForTenant: mockInvalidatePlacePayloadCacheForTenant,
  resolveGoogleConnectionState: mockResolveGoogleConnectionState,
}));
vi.mock('@/lib/social/adapters/googlebusiness', () => ({
  fetchGoogleBusinessPlaceDetails: mockFetchGoogleBusinessPlaceDetails,
  fetchGoogleBusinessPerformanceMetrics: mockFetchGoogleBusinessPerformanceMetrics,
  listGooglePlaceActions: mockListGooglePlaceActions,
  updateGoogleBusinessProfile: vi.fn(),
  replyToGoogleBusinessReview: vi.fn(),
}));
vi.mock('@/lib/gbp/place-actions-sync', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/gbp/place-actions-sync')>();
  return {
    ...actual,
    syncGooglePlaceActionsForTenant: mockSyncGooglePlaceActionsForTenant,
  };
});
vi.mock('@/lib/bgos/bootstrap-cache', () => ({
  invalidateBootstrapCache: mockInvalidateBootstrapCache,
}));
vi.mock('@/lib/emails/bgos/sender', () => ({
  sendBgosGbpUpdatePendingEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/gbp/pending-update', () => ({
  getPendingGoogleUpdate: vi.fn().mockReturnValue(null),
  setPendingGoogleUpdate: vi.fn().mockResolvedValue(undefined),
  checkAndEnforcePendingLock: vi.fn().mockReturnValue({ locked: false }),
}));

import { GET as getGbpPlace } from '@/app/api/gbp/place/route';
import { POST as postGrowthAction } from '@/app/api/gbp/growth-actions/route';

describe('GBP Live Booking URL & Update Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockResolvedValue({ userId: 'u_1', tenantId: 't_1', role: 'owner' });
    mockDb.review.findMany.mockResolvedValue([]);
    mockDb.review.count.mockResolvedValue(0);
    mockDb.service.findMany.mockResolvedValue([]);
    mockResolveGoogleConnectionState.mockResolvedValue({ connectionState: 'CONNECTED' });
    mockPrepareGoogleAccount.mockResolvedValue({
      id: 'acc_1',
      accountId: '123456',
      accountName: 'FieserOS',
      accessToken: 'tok',
      metadata: {},
    });
    mockFetchGoogleBusinessPlaceDetails.mockResolvedValue({
      title: 'FieserOS',
      category: 'Software company',
      address: 'Patna, IN',
      phone: '+918505945123',
      website: 'https://fieseros.com',
      placeId: 'ChIJ_test',
      mapsUri: 'https://maps.google.com/?cid=1',
    });
    mockFetchGoogleBusinessPerformanceMetrics.mockResolvedValue({
      searchImpressions: 100,
      mapsImpressions: 120,
      callClicks: 10,
      directionRequests: 15,
      websiteClicks: 20,
      bookings: 4,
    });
  });

  it('returns the exact live APPOINTMENT url from Google Business Profile in GET /api/gbp/place', async () => {
    mockDb.tenant.findUnique.mockResolvedValue({
      id: 't_1',
      name: 'FieserOS',
      slug: 'fieseros',
      publicSlug: 'fieseros',
      phone: '+918505945123',
      website: 'https://fieseros.com',
      settingsJson: JSON.stringify({
        bookingLink: 'https://bgos.site/fieseros/book',
        googlePlaceActions: { appointmentUri: 'https://bgos.site/fieseros/book' },
      }),
      brandProfile: null,
    });
    mockListGooglePlaceActions.mockResolvedValue([
      {
        name: 'locations/123456/placeActionLinks/appt1',
        placeActionType: 'APPOINTMENT',
        uri: 'https://calendar.app.google/fieseros-live',
      },
    ]);

    const req = new NextRequest('http://localhost/api/gbp/place?refresh=true');
    const res = await getGbpPlace(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockListGooglePlaceActions).toHaveBeenCalledTimes(1);
    expect(data.place.googleBookingUrl).toBe('https://calendar.app.google/fieseros-live');
    expect(data.place.savedBookingUrl).toBe('https://bgos.site/fieseros/book');
    expect(data.place.defaultBookingUrl).toBe('https://bgos.site/fieseros/book');
    expect(data.place.placeActionLinks).toHaveLength(1);
  });

  it('updates custom booking URL and resets back to default BGOS booking URL cleanly with cache invalidation', async () => {
    mockDb.tenant.findUnique.mockResolvedValue({
      id: 't_1',
      name: 'FieserOS',
      slug: 'fieseros',
      publicSlug: 'fieseros',
      settingsJson: JSON.stringify({
        bookingLink: 'https://calendly.com/old-custom-link',
        googlePlaceActions: { appointmentUri: 'https://calendly.com/old-custom-link' },
      }),
    });
    mockDb.tenant.update.mockResolvedValue({});
    mockSyncGooglePlaceActionsForTenant.mockResolvedValue({
      attempted: true,
      connected: true,
      syncedActions: ['APPOINTMENT'],
      appointmentUri: 'https://bgos.site/fieseros/book',
      warnings: [],
    });

    const resetReq = new NextRequest('http://localhost/api/gbp/growth-actions', {
      method: 'POST',
      body: JSON.stringify({
        action: 'update_booking_button',
        bookingType: 'bgos',
      }),
    });
    const resetRes = await postGrowthAction(resetReq);
    const resetJson = await resetRes.json();

    expect(resetRes.status).toBe(200);
    expect(resetJson.bookingUrl).toBe('https://bgos.site/fieseros/book');
    expect(resetJson.syncedToGoogle).toBe(true);
    expect(resetJson.googleWarnings).toEqual([]);
    expect(mockInvalidatePlacePayloadCacheForTenant).toHaveBeenCalledWith('t_1');
    expect(mockInvalidateBootstrapCache).toHaveBeenCalledWith('t_1');

    const updateCall = mockDb.tenant.update.mock.calls[0][0];
    const savedSettings = JSON.parse(updateCall.data.settingsJson);
    expect(savedSettings.bookingLink).toBe('https://bgos.site/fieseros/book');
    expect(savedSettings.googlePlaceActions.appointmentUri).toBe('https://bgos.site/fieseros/book');
  });
});
