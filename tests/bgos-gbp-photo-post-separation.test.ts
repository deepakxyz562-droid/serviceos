import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  postCreate: vi.fn(),
  postFindFirst: vi.fn(),
  postFindMany: vi.fn(),
  postFindUnique: vi.fn(),
  postUpdate: vi.fn(),
  accountsFindMany: vi.fn(),
  tenantFindUnique: vi.fn(),
  publishPost: vi.fn(),
  listGoogleBusinessMedia: vi.fn(),
  prepareGoogleAccount: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: async () => ({ id: 'usr-1', tenantId: 'tenant-test-1' }),
}));

vi.mock('@/lib/bgos-entitlement', () => ({
  requireBgosEntitled: async () => ({ ok: true }),
}));

vi.mock('@/lib/db', () => ({
  db: {
    socialPost: {
      create: mocks.postCreate,
      findFirst: mocks.postFindFirst,
      findMany: mocks.postFindMany,
      findUnique: mocks.postFindUnique,
      update: mocks.postUpdate,
    },
    socialAccount: {
      findMany: mocks.accountsFindMany,
      findFirst: vi.fn().mockResolvedValue(null),
    },
    tenant: {
      findUnique: mocks.tenantFindUnique,
    },
    imageLibrary: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/social/publisher', () => ({
  publishPost: mocks.publishPost,
}));

vi.mock('@/lib/social/google-account-helper', () => ({
  prepareGoogleAccount: mocks.prepareGoogleAccount,
}));

vi.mock('@/lib/social/adapters/googlebusiness', () => ({
  listGoogleBusinessMedia: mocks.listGoogleBusinessMedia,
  uploadGoogleBusinessMedia: vi.fn(),
}));

vi.mock('@/lib/activity-log', () => ({
  logActivity: async () => {},
}));

import { GET as getPhotos, POST as postPhotos } from '@/app/api/social/photos/route';
import { POST as createPost } from '@/app/api/social/posts/route';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.tenantFindUnique.mockResolvedValue({
    id: 'tenant-test-1',
    name: 'FieserOS Auto Care',
    country: 'IN',
    settingsJson: null,
    brandProfile: { businessName: 'FieserOS Auto Care' },
  });
  mocks.accountsFindMany.mockResolvedValue([
    { id: 'acc-gbp-1', platform: 'googlebusiness', accountId: 'loc-1' },
  ]);
  mocks.prepareGoogleAccount.mockResolvedValue({
    id: 'acc-gbp-1',
    platform: 'googlebusiness',
    accountId: 'loc-1',
  });
  mocks.postFindFirst.mockResolvedValue(null);
  mocks.postFindMany.mockResolvedValue([]);
  mocks.postCreate.mockImplementation(async ({ data }) => ({ ...data, id: 'post-new-1' }));
});

describe('GBP Photos & Posts Separation, Concurrency & Review Status', () => {
  it('GET /api/social/photos correctly identifies Google photos as Live on Google Maps', async () => {
    mocks.listGoogleBusinessMedia.mockResolvedValue({
      mediaItems: [
        {
          name: 'accounts/112/locations/456/media/CIABIhCaKO9Do_NiZq7hpCfYiLq0',
          googleUrl: 'https://lh3.googleusercontent.com/temp-review-photo',
          mediaFormat: 'PHOTO',
          createTime: '2026-11-22T04:30:00Z',
        },
        {
          name: 'accounts/112/locations/456/media/AF1QipNX4x_approved_photo',
          googleUrl: 'https://lh3.googleusercontent.com/live-photo',
          mediaFormat: 'PHOTO',
          createTime: '2026-11-16T10:00:00Z',
        },
      ],
    });

    const req = new NextRequest('https://serviceos.com/api/social/photos');
    const res = await getPhotos(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.photos).toHaveLength(2);
    expect(body.photos[0].reviewStatus).toBe('approved');
    expect(body.photos[0].statusLabel).toBe('Live on Google Maps');
    expect(body.photos[1].reviewStatus).toBe('approved');
    expect(body.photos[1].statusLabel).toBe('Live on Google Maps');
  });

  it('POST /api/social/photos sets gbpPostType: photo_media by default and enforces in-flight lock', async () => {
    // 1. In-flight lock test
    mocks.postFindFirst.mockResolvedValueOnce({ id: 'in-flight-post-1', status: 'publishing' });

    const lockReq = new NextRequest('https://serviceos.com/api/social/photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://images.unsplash.com/photo-1.jpg',
        title: 'New Service Bay',
        scheduleMode: 'instant',
      }),
    });

    const lockRes = await postPhotos(lockReq);
    expect(lockRes.status).toBe(409);
    const lockBody = await lockRes.json();
    expect(lockBody.code).toBe('PUBLISH_IN_PROGRESS');

    // 2. Normal photo upload sets gbpPostType to photo_media (never whats_new)
    mocks.postFindFirst.mockResolvedValueOnce(null);
    mocks.postFindUnique.mockResolvedValueOnce({
      id: 'post-new-1',
      status: 'published',
      publishTargets: JSON.stringify([
        {
          platform: 'googlebusiness',
          externalPostId: 'accounts/112/locations/456/media/CIABIhNewMediaId',
          permalink: 'https://lh3.googleusercontent.com/photo.jpg',
        },
      ]),
    });

    const uploadReq = new NextRequest('https://serviceos.com/api/social/photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://images.unsplash.com/photo-1.jpg',
        title: 'New Service Bay',
        scheduleMode: 'instant',
      }),
    });

    const uploadRes = await postPhotos(uploadReq);
    expect(uploadRes.status).toBe(200);
    const uploadBody = await uploadRes.json();

    expect(mocks.postCreate).toHaveBeenCalled();
    const createdData = mocks.postCreate.mock.calls[0][0].data;
    expect(createdData.gbpPostType).toBe('photo_media');
    expect(uploadBody.results[0].reviewStatus).toBe('approved');
    expect(uploadBody.results[0].statusLabel).toBe('Live on Google Maps');
  });

  it('POST /api/social/photos honors postType: whats_new when user chooses Update Post destination', async () => {
    mocks.postFindFirst.mockResolvedValueOnce(null);
    mocks.postFindUnique.mockResolvedValueOnce({
      id: 'post-new-whats-new',
      status: 'published',
      publishTargets: JSON.stringify([
        {
          platform: 'googlebusiness',
          externalPostId: 'accounts/112/locations/456/localPosts/987654321',
          permalink: 'https://local.google.com/place?id=123&use=posts',
        },
      ]),
    });

    const updatePostReq = new NextRequest('https://serviceos.com/api/social/photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://images.unsplash.com/update-banner.jpg',
        title: 'Flash Sale: Oil Change Special',
        description: 'Call us now or stop by today!',
        postType: 'whats_new',
        scheduleMode: 'instant',
      }),
    });

    const updatePostRes = await postPhotos(updatePostReq);
    expect(updatePostRes.status).toBe(200);
    const body = await updatePostRes.json();

    expect(mocks.postCreate).toHaveBeenCalled();
    const createdData = mocks.postCreate.mock.calls[0][0].data;
    expect(createdData.gbpPostType).toBe('whats_new');
    expect(body.message).toContain('Update post published live to Google Business Profile');
  });

  it('POST /api/social/posts enforces in-flight lock and throttles same-day GBP posts', async () => {
    // 1. In-flight lock
    mocks.postFindFirst.mockResolvedValueOnce({ id: 'in-flight-photo-1', status: 'publishing' });

    const lockReq = new NextRequest('https://serviceos.com/api/social/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'key-post-lock-123456789' },
      body: JSON.stringify({
        content: 'Special Offer: 20% off all car diagnostics this weekend!',
        targets: [{ socialAccountId: 'acc-gbp-1', platform: 'googlebusiness' }],
        status: 'published',
      }),
    });

    const lockRes = await createPost(lockReq);
    expect(lockRes.status).toBe(409);
    const lockBody = await lockRes.json();
    expect(lockBody.code).toBe('PUBLISH_IN_PROGRESS');

    // 2. Same-day throttling for GBP posts
    mocks.postFindFirst
      .mockResolvedValueOnce(null) // no in-flight publishing
      .mockResolvedValueOnce({
        id: 'post-earlier-today',
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // published 2 hours ago
      });

    const throttleReq = new NextRequest('https://serviceos.com/api/social/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'key-post-throttle-123456' },
      body: JSON.stringify({
        content: 'Evening Update from the garage',
        targets: [{ socialAccountId: 'acc-gbp-1', platform: 'googlebusiness' }],
        status: 'published',
      }),
    });

    const throttleRes = await createPost(throttleReq);
    expect(throttleRes.status).toBe(201);
    const throttleBody = await throttleRes.json();
    expect(throttleBody.autoScheduled).toBe(true);
    expect(throttleBody.message).toContain('An update was already published to Google today');
    expect(mocks.postCreate.mock.calls[0][0].data.status).toBe('scheduled');
    expect(mocks.publishPost).not.toHaveBeenCalled();
  });
});
