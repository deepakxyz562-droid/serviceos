import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    review: {
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    notificationPreference: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    appNotification: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    socialAccount: {
      findMany: vi.fn(),
    },
    emailUnsubscribeToken: {
      findUnique: vi.fn(),
    },
    emailEvent: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/social/google-account-helper', () => ({
  prepareGoogleAccount: vi.fn(),
}));

vi.mock('@/lib/social/adapters/googlebusiness', () => ({
  fetchGoogleBusinessReviews: vi.fn(),
  replyToGoogleBusinessReview: vi.fn(),
}));

vi.mock('@/lib/ai-client', () => ({
  callAI: vi.fn(),
}));

vi.mock('@/lib/emails/bgos/sender', () => ({
  isBgosContext: vi.fn(),
}));

vi.mock('@/lib/web-push-send', () => ({
  sendWebPushToUser: vi.fn(),
}));

import { db } from '@/lib/db';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { fetchGoogleBusinessReviews } from '@/lib/social/adapters/googlebusiness';
import { isBgosContext } from '@/lib/emails/bgos/sender';
import { sendWebPushToUser } from '@/lib/web-push-send';
import {
  GoogleBusinessNotConnectedError,
  syncGoogleReviewsForTenant,
} from './sync-google-service';
import { dispatchUnrepliedReviewNotifications } from './unreplied-review-notifications';
import { runGbpReviewsSyncCron } from './gbp-reviews-cron';
import { resolveRequestedView, shouldAutoOpenAuthForDeepLink } from '@/lib/view-deep-link';
import type { BgosTenantSnapshot } from '@/lib/emails/bgos/lifecycle';
import { notificationDestination } from '../../../bgosmobile/src/lib/notification-routing';
import { GET as handleEmailClick } from '@/app/api/email/click/[token]/route';

const NOW = new Date('2026-11-10T10:00:00Z');
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function makeSnapshot(overrides: Partial<BgosTenantSnapshot> = {}): BgosTenantSnapshot {
  return {
    tenantId: 'tenant-bgos-1',
    businessName: 'Deepak Electricals',
    recipientEmail: 'deepak@example.in',
    recipientName: 'Deepak Chandra',
    createdAt: new Date(NOW.getTime() - 10 * DAY_MS),
    plan: 'starter',
    planStatus: 'trial',
    trialEndsAt: new Date(NOW.getTime() + 4 * DAY_MS),
    suspendedAt: null,
    country: 'IN',
    currency: 'INR',
    phone: '+919876543210',
    settingsJson: null,
    isPaidActive: false,
    gbpConnected: true,
    placeId: 'ChIJ123',
    reviewUrl: 'https://g.page/r/test/review',
    totalReviewsCount: 5,
    unrepliedOldReviewsCount: 1,
    publishedPostsCount: 1,
    lastActivityAt: new Date(NOW.getTime() - 2 * DAY_MS),
    sentHistory: [],
    ...overrides,
  };
}

describe('Google Review Sync & Push/In-App Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.tenant.findUnique).mockResolvedValue({
      name: 'Deepak Services',
      settingsJson: null,
    } as any);
    vi.mocked(db.review.count).mockResolvedValue(4);
    vi.mocked(db.review.findFirst).mockResolvedValue(null);
    vi.mocked(db.review.create).mockImplementation(
      (async ({ data }: any) => ({
        id: `rev_${data.googleReviewId}`,
        ...data,
      })) as any,
    );
    vi.mocked(prepareGoogleAccount).mockResolvedValue({ accountId: 'loc-1' } as any);
    vi.mocked(isBgosContext).mockResolvedValue({ isBgos: true, isBgosOnly: true });
    vi.mocked(db.user.findMany).mockResolvedValue([{ id: 'user-owner-1', tenantId: 'tenant-bgos-1' }] as any);
    vi.mocked(db.notificationPreference.findMany).mockResolvedValue([]);
    vi.mocked(db.notificationPreference.findFirst).mockResolvedValue(null);
    vi.mocked(db.appNotification.findMany).mockResolvedValue([]);
    vi.mocked(db.appNotification.create).mockResolvedValue({ id: 'notif-1' } as any);
    vi.mocked(db.appNotification.update).mockResolvedValue({ id: 'notif-1' } as any);
    vi.mocked(sendWebPushToUser).mockResolvedValue({
      sent: 1,
      failed: 0,
      deactivated: 0,
      notConfigured: false,
    });
  });

  it('creates In-App notification + delivers Push for newly imported unreplied BGOS review', async () => {
    vi.mocked(fetchGoogleBusinessReviews).mockResolvedValueOnce({
      reviews: [
        {
          reviewId: 'accounts/1/locations/2/reviews/g-rev-1',
          authorName: 'Rohan Mehta',
          rating: 5,
          comment: 'Super fast AC repair!',
          createTime: new Date(NOW.getTime() - 2 * HOUR_MS).toISOString(),
          updateTime: new Date(NOW.getTime() - 2 * HOUR_MS).toISOString(),
        },
      ],
      averageRating: 4.9,
      totalReviewCount: 5,
    } as any);

    const res = await syncGoogleReviewsForTenant({ tenantId: 'tenant-bgos-1', now: NOW });

    expect(res).toMatchObject({
      totalFetched: 1,
      newReviewsCount: 1,
      notificationsCreated: 1,
      pushesDelivered: 1,
    });
    expect(db.appNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-bgos-1',
          recipientId: 'user-owner-1',
          type: 'customer_review',
          actionUrl: '/app?product=bgos&view=reviews',
          actionLabel: 'Reply to Review',
        }),
      }),
    );
    expect(sendWebPushToUser).toHaveBeenCalledWith(
      'user-owner-1',
      'tenant-bgos-1',
      expect.objectContaining({
        url: '/app?product=bgos&view=reviews',
        data: expect.objectContaining({
          route: '/(tabs)/reviews',
          view: 'reviews',
          reviewId: 'rev_accounts/1/locations/2/reviews/g-rev-1',
        }),
      }),
    );
    expect(db.appNotification.update).toHaveBeenCalledWith({
      where: { id: 'notif-1' },
      data: { pushSent: true, pushSentAt: NOW },
    });
  });

  it('routes CRM tenant review alerts to /?view=reviews', async () => {
    vi.mocked(isBgosContext).mockResolvedValueOnce({ isBgos: false, isBgosOnly: false });
    vi.mocked(fetchGoogleBusinessReviews).mockResolvedValueOnce({
      reviews: [
        {
          reviewId: 'g-rev-crm',
          authorName: 'Ananya',
          rating: 4,
          comment: 'Great service',
          createTime: new Date(NOW.getTime() - HOUR_MS).toISOString(),
          updateTime: new Date(NOW.getTime() - HOUR_MS).toISOString(),
        },
      ],
      averageRating: 4.0,
      totalReviewCount: 5,
    } as any);

    await syncGoogleReviewsForTenant({ tenantId: 'tenant-crm-1', now: NOW });

    expect(db.appNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionUrl: '/?view=reviews',
        }),
      }),
    );
    expect(sendWebPushToUser).toHaveBeenCalledWith(
      'user-owner-1',
      'tenant-crm-1',
      expect.objectContaining({ url: '/?view=reviews' }),
    );
  });

  it('suppresses alerts for historical reviews (>14d) during initial backfill, while notifying recent ones', async () => {
    vi.mocked(db.review.count).mockResolvedValueOnce(0);
    vi.mocked(fetchGoogleBusinessReviews).mockResolvedValueOnce({
      reviews: [
        {
          reviewId: 'old-rev',
          authorName: 'Old Reviewer',
          rating: 5,
          comment: 'Two months ago',
          createTime: new Date(NOW.getTime() - 40 * DAY_MS).toISOString(),
          updateTime: new Date(NOW.getTime() - 40 * DAY_MS).toISOString(),
        },
        {
          reviewId: 'recent-rev',
          authorName: 'Recent Reviewer',
          rating: 5,
          comment: 'Three days ago',
          createTime: new Date(NOW.getTime() - 3 * DAY_MS).toISOString(),
          updateTime: new Date(NOW.getTime() - 3 * DAY_MS).toISOString(),
        },
      ],
      averageRating: 5,
      totalReviewCount: 2,
    } as any);

    const res = await syncGoogleReviewsForTenant({ tenantId: 'tenant-bgos-1', now: NOW });

    expect(res.newReviewsCount).toBe(2);
    expect(res.notificationsCreated).toBe(1);
    expect(res.pushesDelivered).toBe(1);
    expect(sendWebPushToUser).toHaveBeenCalledWith(
      'user-owner-1',
      'tenant-bgos-1',
      expect.objectContaining({
        title: '⭐ New 5★ Google Review from Recent Reviewer',
        data: expect.objectContaining({ count: 1 }),
      }),
    );
  });

  it('deduplicates repeated syncs within 24h and respects customer_review/pushEnabled opt-outs', async () => {
    vi.mocked(fetchGoogleBusinessReviews).mockResolvedValue({
      reviews: [
        {
          reviewId: 'g-dup-1',
          authorName: 'Vikram',
          rating: 3,
          comment: 'Okay',
          createTime: new Date(NOW.getTime() - HOUR_MS).toISOString(),
          updateTime: new Date(NOW.getTime() - HOUR_MS).toISOString(),
        },
      ],
      averageRating: 3,
      totalReviewCount: 5,
    } as any);

    // Case 1: Already notified in last 24h
    vi.mocked(db.appNotification.findMany).mockResolvedValueOnce([
      {
        recipientId: 'user-owner-1',
        metadataJson: JSON.stringify({ googleReviewId: 'g-dup-1' }),
      },
    ] as any);
    const deduped = await syncGoogleReviewsForTenant({ tenantId: 'tenant-bgos-1', now: NOW });
    expect(deduped.notificationsCreated).toBe(0);
    expect(deduped.pushesDelivered).toBe(0);

    // Case 2: User opted out of customer_review alerts
    vi.mocked(db.appNotification.findMany).mockResolvedValueOnce([]);
    vi.mocked(db.notificationPreference.findMany).mockResolvedValueOnce([
      {
        tenantId: 'tenant-bgos-1',
        userId: 'user-owner-1',
        inAppEnabled: true,
        pushEnabled: true,
        typePrefsJson: JSON.stringify({ customer_review: false }),
      },
    ] as any);
    const optedOut = await syncGoogleReviewsForTenant({ tenantId: 'tenant-bgos-1', now: NOW });
    expect(optedOut.notificationsCreated).toBe(0);
    expect(optedOut.pushesDelivered).toBe(0);

    // Case 3: In-app enabled, push disabled -> creates AppNotification without calling Push
    vi.mocked(db.appNotification.findMany).mockResolvedValueOnce([]);
    vi.mocked(db.notificationPreference.findMany).mockResolvedValueOnce([
      {
        tenantId: 'tenant-bgos-1',
        userId: 'user-owner-1',
        inAppEnabled: true,
        pushEnabled: false,
        typePrefsJson: JSON.stringify({ customer_review: true }),
      },
    ] as any);
    const inAppOnly = await syncGoogleReviewsForTenant({ tenantId: 'tenant-bgos-1', now: NOW });
    expect(inAppOnly.notificationsCreated).toBe(1);
    expect(inAppOnly.pushesDelivered).toBe(0);
    expect(sendWebPushToUser).not.toHaveBeenCalled();
  });

  it('throws GoogleBusinessNotConnectedError when tenant has no active GBP account', async () => {
    vi.mocked(prepareGoogleAccount).mockResolvedValueOnce(null);
    await expect(syncGoogleReviewsForTenant({ tenantId: 'tenant-no-gbp' })).rejects.toBeInstanceOf(
      GoogleBusinessNotConnectedError,
    );
  });
});

describe('Unreplied Review Notification Dispatcher (>48h)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.user.findMany).mockResolvedValue([{ id: 'owner-1', tenantId: 'tenant-bgos-1' }] as any);
    vi.mocked(db.notificationPreference.findMany).mockResolvedValue([]);
    vi.mocked(db.notificationPreference.findFirst).mockResolvedValue(null);
    vi.mocked(db.appNotification.findMany).mockResolvedValue([]);
    vi.mocked(db.appNotification.create).mockResolvedValue({ id: 'notif-unreplied-1' } as any);
    vi.mocked(db.appNotification.update).mockResolvedValue({ id: 'notif-unreplied-1' } as any);
    vi.mocked(sendWebPushToUser).mockResolvedValue({
      sent: 1,
      failed: 0,
      deactivated: 0,
      notConfigured: false,
    });
  });

  it('dispatches In-App + Push notifications instead of email, skipping suspended tenants', async () => {
    const activeSnap = makeSnapshot({ unrepliedOldReviewsCount: 2 });
    const suspendedSnap = makeSnapshot({
      tenantId: 'tenant-susp',
      suspendedAt: new Date(NOW.getTime() - DAY_MS),
      unrepliedOldReviewsCount: 3,
    });

    const report = await dispatchUnrepliedReviewNotifications([activeSnap, suspendedSnap], { now: NOW });

    expect(report).toMatchObject({
      eligibleTenants: 1,
      sentTenants: 1,
      notificationsCreated: 1,
      pushesDelivered: 1,
    });
    expect(db.appNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-bgos-1',
          recipientId: 'owner-1',
          type: 'customer_review',
          title: '2 Google reviews awaiting your reply',
          actionUrl: '/app?product=bgos&view=reviews',
        }),
      }),
    );
    expect(sendWebPushToUser).toHaveBeenCalledWith(
      'owner-1',
      'tenant-bgos-1',
      expect.objectContaining({
        url: '/app?product=bgos&view=reviews',
        data: expect.objectContaining({
          route: '/(tabs)/reviews',
          view: 'reviews',
          reminderKind: 'unreplied_reviews',
          count: 2,
        }),
      }),
    );
  });

  it('respects 7-day unreplied reminder dedup and 24h general review-alert cooldown', async () => {
    const snap = makeSnapshot({ unrepliedOldReviewsCount: 1 });

    // Already got an unreplied_reviews reminder 4 days ago
    vi.mocked(db.appNotification.findMany).mockResolvedValueOnce([
      {
        tenantId: 'tenant-bgos-1',
        recipientId: 'owner-1',
        metadataJson: JSON.stringify({ reminderKind: 'unreplied_reviews' }),
        createdAt: new Date(NOW.getTime() - 4 * DAY_MS),
      },
    ] as any);
    const dedup7d = await dispatchUnrepliedReviewNotifications([snap], { now: NOW });
    expect(dedup7d.skippedTenants).toBe(1);
    expect(dedup7d.notificationsCreated).toBe(0);

    // Got a real-time customer_review notification 6 hours ago -> respects 24h cooldown
    vi.mocked(db.appNotification.findMany).mockResolvedValueOnce([
      {
        tenantId: 'tenant-bgos-1',
        recipientId: 'owner-1',
        metadataJson: JSON.stringify({ googleReviewId: 'recent-rev' }),
        createdAt: new Date(NOW.getTime() - 6 * HOUR_MS),
      },
    ] as any);
    const cooldown24h = await dispatchUnrepliedReviewNotifications([snap], { now: NOW });
    expect(cooldown24h.skippedTenants).toBe(1);
    expect(cooldown24h.results[0].reason).toBe('already_notified_recently');
  });

  it('respects customer_review opt-out and supports dryRun inspection', async () => {
    const snap = makeSnapshot({ unrepliedOldReviewsCount: 1 });

    vi.mocked(db.notificationPreference.findMany).mockResolvedValueOnce([
      {
        tenantId: 'tenant-bgos-1',
        userId: 'owner-1',
        inAppEnabled: true,
        pushEnabled: true,
        typePrefsJson: JSON.stringify({ customer_review: false }),
      },
    ] as any);
    const optedOut = await dispatchUnrepliedReviewNotifications([snap], { now: NOW });
    expect(optedOut.skippedTenants).toBe(1);
    expect(optedOut.results[0].reason).toBe('opted_out');
    expect(db.appNotification.create).not.toHaveBeenCalled();

    vi.mocked(db.notificationPreference.findMany).mockResolvedValueOnce([]);
    const dry = await dispatchUnrepliedReviewNotifications([snap], { dryRun: true, now: NOW });
    expect(dry.wouldSendTenants).toBe(1);
    expect(db.appNotification.create).not.toHaveBeenCalled();
    expect(sendWebPushToUser).not.toHaveBeenCalled();
  });
});

describe('GBP Reviews Sync Cron', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.user.findMany).mockResolvedValue([{ id: 'owner-1' }] as any);
    vi.mocked(db.notificationPreference.findMany).mockResolvedValue([]);
    vi.mocked(db.notificationPreference.findFirst).mockResolvedValue(null);
    vi.mocked(db.appNotification.findMany).mockResolvedValue([]);
    vi.mocked(db.appNotification.create).mockResolvedValue({ id: 'n-cron' } as any);
    vi.mocked(db.appNotification.update).mockResolvedValue({ id: 'n-cron' } as any);
    vi.mocked(db.review.count).mockResolvedValue(1);
    vi.mocked(db.review.findFirst).mockResolvedValue(null);
    vi.mocked(db.review.create).mockImplementation(
      (async ({ data }: any) => ({
        id: `rev_${data.googleReviewId}`,
        ...data,
      })) as any,
    );
    vi.mocked(isBgosContext).mockResolvedValue({ isBgos: true, isBgosOnly: true });
    vi.mocked(sendWebPushToUser).mockResolvedValue({
      sent: 1,
      failed: 0,
      deactivated: 0,
      notConfigured: false,
    });
  });

  it('handles dryRun, skips suspended tenants, and isolates per-tenant errors', async () => {
    vi.mocked(db.socialAccount.findMany).mockResolvedValue([
      { tenantId: 't-fail', accountId: 'loc-fail' },
      { tenantId: 't-susp', accountId: 'loc-susp' },
      { tenantId: 't-ok', accountId: 'loc-ok' },
    ] as any);
    vi.mocked(db.tenant.findMany).mockResolvedValue([
      { id: 't-fail', name: 'Fail Biz', suspendedAt: null, settingsJson: null },
      { id: 't-susp', name: 'Suspended Biz', suspendedAt: NOW, settingsJson: null },
      { id: 't-ok', name: 'Healthy Biz', suspendedAt: null, settingsJson: null },
    ] as any);

    const dryReport = await runGbpReviewsSyncCron({ dryRun: true, now: NOW });
    expect(dryReport.wouldSyncTenants).toBe(2);
    expect(dryReport.skippedTenants).toBe(1);
    expect(prepareGoogleAccount).not.toHaveBeenCalled();

    vi.mocked(db.tenant.findUnique)
      .mockResolvedValueOnce({ name: 'Fail Biz', settingsJson: null } as any)
      .mockResolvedValueOnce({ name: 'Healthy Biz', settingsJson: null } as any);
    vi.mocked(prepareGoogleAccount)
      .mockResolvedValueOnce({ accountId: 'loc-fail' } as any)
      .mockResolvedValueOnce({ accountId: 'loc-ok' } as any);
    vi.mocked(fetchGoogleBusinessReviews)
      .mockRejectedValueOnce(new Error('Google API 429'))
      .mockResolvedValueOnce({
        reviews: [
          {
            reviewId: 'g-ok-1',
            authorName: 'Sita',
            rating: 5,
            comment: 'Prompt and polite!',
            createTime: new Date(NOW.getTime() - HOUR_MS).toISOString(),
            updateTime: new Date(NOW.getTime() - HOUR_MS).toISOString(),
          },
        ],
        averageRating: 5,
        totalReviewCount: 2,
      } as any);

    const runReport = await runGbpReviewsSyncCron({ now: NOW });
    expect(runReport).toMatchObject({
      tenantsEvaluated: 3,
      failedTenants: 1,
      skippedTenants: 1,
      syncedTenants: 1,
      totalNewReviews: 1,
      totalNotificationsCreated: 1,
      totalPushesDelivered: 1,
    });
  });
});

describe('Deep-Link, Mobile Notification Routing & Legacy Click Redirects', () => {
  it('resolves valid views, aliases, and BGOS auto-open auth rules', () => {
    expect(resolveRequestedView('reviews')).toBe('reviews');
    expect(resolveRequestedView('forms')).toBe('formBuilder');
    expect(resolveRequestedView('ai-employee')).toBe('aiReceptionist');
    expect(resolveRequestedView('superadmin')).toBeNull();
    expect(resolveRequestedView('superadmin', { isPlatformAdmin: true })).toBe('superadmin');
    expect(resolveRequestedView('unknown-view')).toBeNull();

    expect(shouldAutoOpenAuthForDeepLink('?product=bgos&view=reviews', 'bgos.fieseros.com', '/app')).toBe(true);
    expect(shouldAutoOpenAuthForDeepLink('?product=bgos&view=reviews', 'fieseros.com', '/app')).toBe(true);
    expect(shouldAutoOpenAuthForDeepLink('?view=reviews', 'fieseros.com', '/')).toBe(false);
    expect(shouldAutoOpenAuthForDeepLink('?product=bgos&view=reviews&auth=login', 'bgos.fieseros.com', '/app')).toBe(false);
    expect(shouldAutoOpenAuthForDeepLink('?product=bgos&logout=1', 'bgos.fieseros.com', '/app')).toBe(false);
  });

  it('routes mobile review push payloads cleanly without corrupting route params', () => {
    expect(
      notificationDestination({
        route: '/(tabs)/reviews',
        view: 'reviews',
        reviewId: 'rev-1',
        rating: 5,
        count: 1,
      }),
    ).toBe('/(tabs)/reviews');

    expect(
      notificationDestination({
        url: '/app?product=bgos&view=reviews',
      }),
    ).toBe('/(tabs)/reviews');
  });

  it('repairs legacy double-encoded &amp; destination URLs in /api/email/click/[token]', async () => {
    vi.mocked(db.emailUnsubscribeToken.findUnique).mockResolvedValueOnce({
      token: 'tok-legacy',
      campaignId: null,
      recipientEmail: 'deepak@example.in',
      tenantId: 'tenant-bgos-1',
    } as any);
    vi.mocked(db.emailEvent.create).mockResolvedValueOnce({} as any);

    const legacyEncoded = encodeURIComponent('https://bgos.fieseros.com/app?product=bgos&amp;view=reviews');
    const req = new NextRequest(`https://bgos.fieseros.com/api/email/click/tok-legacy?u=${legacyEncoded}`);
    const res = await handleEmailClick(req, { params: Promise.resolve({ token: 'tok-legacy' }) });

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('https://bgos.fieseros.com/app?product=bgos&view=reviews');
    expect(db.emailEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          url: 'https://bgos.fieseros.com/app?product=bgos&view=reviews',
        }),
      }),
    );

    const badReq = new NextRequest('https://bgos.fieseros.com/api/email/click/tok-legacy?u=javascript%3Aalert(1)');
    const badRes = await handleEmailClick(badReq, { params: Promise.resolve({ token: 'tok-legacy' }) });
    expect(badRes.status).toBe(400);
  });
});
