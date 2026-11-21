import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(async () => ({
    id: 'usr_test123',
    tenantId: 'tnt_test123',
    email: 'test@example.com',
  })),
}));

vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findUnique: vi.fn(async () => ({
        id: 'tnt_test123',
        name: 'The Golden Bistro',
        industry: 'Restaurant',
        city: 'Gurugram',
        communicationPhone: '9876543210',
        website: 'https://goldenbistro.com',
        socialAccounts: [
          { id: 'acc_gbp', platform: 'googlebusiness', accountName: 'The Golden Bistro' },
          { id: 'acc_ig', platform: 'instagram', accountName: 'goldenbistro_ig' },
        ],
        reviews: [
          { authorName: 'Rohit K.', rating: 5, comment: 'Best pasta in town, friendly staff!' },
        ],
      })),
    },
    socialPost: {
      create: vi.fn(async ({ data }: any) => ({
        id: 'post_' + Math.random().toString(36).slice(2),
        ...data,
      })),
      updateMany: vi.fn(async () => ({ count: 30 })),
    },
    imageLibrary: {
      count: vi.fn(async () => 1),
      findMany: vi.fn(async () => [
        { id: 'img_1', url: 'https://example.com/food1.jpg', name: 'Food 1', folder: 'uploaded' },
      ]),
    },
  },
}));

vi.mock('@/lib/ai-client', () => ({
  extractJson: vi.fn((raw: string) => {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }),
  callAI: vi.fn(async () => {
    return JSON.stringify([
      {
        dayOffset: 1,
        postingTime: '11:30',
        theme: 'offer',
        title: 'Weekend Dining Special',
        caption: 'Join us this weekend for our exclusive chef tasting menu in Gurugram! Call 9876543210 to reserve.',
        hashtags: ['#GurugramFood', '#WeekendDining'],
        ctaText: 'Call Now',
        visualConcept: 'Close up artisanal pasta with herbs',
      },
      {
        dayOffset: 2,
        postingTime: '17:30',
        theme: 'review',
        title: 'Loved by Locals',
        caption: '"Best pasta in town, friendly staff!" - Rohit K. (5★). Come experience it today at The Golden Bistro!',
        hashtags: ['#HappyCustomers', '#GurugramEats'],
        ctaText: 'Visit Us',
        visualConcept: 'Warm ambiance with happy diners',
      },
    ]);
  }),
}));

vi.mock('@/lib/social/google-account-helper', () => ({
  prepareGoogleAccount: vi.fn(async () => null),
}));

vi.mock('@/lib/designs/category-image-engine', () => ({
  getCategoryStorageFolder: vi.fn(() => 'restaurant'),
  getCategoryImagesFromS3: vi.fn(async () => ({
    images: [{ url: 'https://example.com/s3_restaurant.webp', sceneTitle: 'Artisanal Dish' }],
  })),
}));

describe('Clean Marketing Suite APIs', () => {
  it('successfully generates a batch campaign plan with structured posts', async () => {
    const { POST: batchCampaignPost } = await import('../src/app/api/social/ai-batch-campaign/route');

    const req = new NextRequest('http://localhost:3000/api/social/ai-batch-campaign', {
      method: 'POST',
      body: JSON.stringify({
        goal: 'Promote weekend dinner specials and increase reservations',
        daysCount: 2,
      }),
    });

    const response = await batchCampaignPost(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.count).toBe(2);
    expect(data.posts[0].title).toBe('Weekend Dining Special');
    expect(data.posts[0].mediaUrl).toBeDefined();

    // Ensure prepareGoogleAccount is called with (tenantId) and NOT (tenantId, db)
    const { prepareGoogleAccount } = await import('@/lib/social/google-account-helper');
    expect(prepareGoogleAccount).toHaveBeenCalledWith('tnt_test123');
  });

  it('successfully batch approves posts', async () => {
    const { POST: batchApprovePost } = await import('../src/app/api/social/posts/batch-approve/route');

    const req = new NextRequest('http://localhost:3000/api/social/posts/batch-approve', {
      method: 'POST',
      body: JSON.stringify({
        approveAll: true,
      }),
    });

    const response = await batchApprovePost(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.approvedCount).toBe(30);
  });

  it('fetches media library assets and remaining AI quota', async () => {
    const { GET: mediaLibraryGet } = await import('../src/app/api/social/media-library/route');

    const req = new NextRequest('http://localhost:3000/api/social/media-library');
    const response = await mediaLibraryGet(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.uploadedPhotos).toHaveLength(1);
    expect(data.categoryPhotos).toHaveLength(1);
    expect(data.aiQuota.limit).toBe(5);
    expect(data.aiQuota.remaining).toBe(4);
  });
});
