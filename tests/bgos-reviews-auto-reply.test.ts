import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}));

vi.mock('@/lib/ai-client', () => ({
  callAI: vi.fn().mockResolvedValue('Thank you for your fantastic review! We are delighted to serve you.'),
}));

vi.mock('@/lib/social/adapters/googlebusiness', () => ({
  replyToGoogleBusinessReview: vi.fn().mockRejectedValue(new Error('Quota exceeded for quota metric: quota_limit_value: 0')),
}));

vi.mock('@/lib/social/crypto', () => ({
  decryptToken: vi.fn((token: string) => token),
}));

vi.mock('@/lib/social/token-refresh', () => ({
  refreshExpiredToken: vi.fn((acc: any) => acc),
}));

const mockReviews: any[] = [];
const mockTenant = {
  id: 'tenant-123',
  name: 'FieserOS CRM Solutions',
  phone: '8505945123',
  settingsJson: JSON.stringify({ autoReplyReviews: { enabled: true, minRating: 4 } }),
};

const mockSocialAccount = {
  id: 'sa-1',
  tenantId: 'tenant-123',
  platform: 'googlebusiness',
  isActive: true,
  accessToken: 'valid-token',
  metadata: JSON.stringify({ mapsUri: 'https://maps.google.com/?cid=12345', placeId: 'ChIJ123' }),
};

vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findUnique: vi.fn(async () => mockTenant),
      update: vi.fn(async ({ data }: any) => ({ ...mockTenant, ...data })),
    },
    socialAccount: {
      findFirst: vi.fn(async () => mockSocialAccount),
    },
    review: {
      findFirst: vi.fn(async ({ where }: any) => {
        return mockReviews.find((r) => r.id === where.id);
      }),
      findMany: vi.fn(async () => mockReviews),
      update: vi.fn(async ({ where, data }: any) => {
        const item = mockReviews.find((r) => r.id === where.id);
        if (item) Object.assign(item, data);
        return item;
      }),
    },
  },
}));

import { getAuthUser } from '@/lib/auth';
import { GET as autoReplyGET, POST as autoReplyPOST } from '@/app/api/reviews/auto-reply/route';
import { POST as reviewReplyPOST } from '@/app/api/reviews/[id]/reply/route';

describe('BGOS Review Replies & Auto-Reply Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReviews.length = 0;
    mockReviews.push({
      id: 'rev-1',
      tenantId: 'tenant-123',
      source: 'google',
      googleReviewId: 'accounts/1/locations/2/reviews/rev-1',
      authorName: 'Rahul Verma',
      rating: 5,
      comment: 'Excellent CRM system and responsive customer service!',
      responseJson: null,
      status: 'pending',
    });
  });

  it('GET /api/reviews/auto-reply returns config and pendingCount', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({
      id: 'user-1',
      email: 'owner@fieseros.com',
      tenantId: 'tenant-123',
      role: 'ADMIN',
    } as any);

    const req = new NextRequest('http://localhost:3000/api/reviews/auto-reply');
    const res = await autoReplyGET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.enabled).toBe(true);
    expect(json.pendingCount).toBe(1);
  });

  it('POST /api/reviews/auto-reply generates AI reply, safely catches Google quota 0, preserves reply in DB, and includes mapsUrl', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({
      id: 'user-1',
      email: 'owner@fieseros.com',
      tenantId: 'tenant-123',
      role: 'ADMIN',
    } as any);

    const req = new NextRequest('http://localhost:3000/api/reviews/auto-reply', {
      method: 'POST',
      body: JSON.stringify({ minRating: 4 }),
    });

    const res = await autoReplyPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.processedCount).toBe(1);

    // Verify DB review was updated
    expect(mockReviews[0].status).toBe('published');
    const parsedPayload = JSON.parse(mockReviews[0].responseJson);
    expect(parsedPayload.text).toContain('Thank you for your fantastic review');
    expect(parsedPayload.publishedToGoogle).toBe(false);
    expect(parsedPayload.googleError).toContain('Quota exceeded');
    expect(parsedPayload.mapsUrl).toBe('https://maps.google.com/?cid=12345');
  });

  it('POST /api/reviews/[id]/reply returns truthful publishedToGoogle status and mapsUrl fallback when Google API sync fails', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({
      id: 'user-1',
      email: 'owner@fieseros.com',
      tenantId: 'tenant-123',
      role: 'ADMIN',
    } as any);

    const req = new NextRequest('http://localhost:3000/api/reviews/rev-1/reply', {
      method: 'POST',
      body: JSON.stringify({ replyText: 'Thank you for your support!' }),
    });

    const res = await reviewReplyPOST(req, { params: Promise.resolve({ id: 'rev-1' }) });
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.publishedToGoogle).toBe(false);
    expect(json.googleError).toContain('Quota exceeded');
    expect(json.mapsUrl).toBe('https://maps.google.com/?cid=12345');
    expect(json.message).toContain('Reply saved locally');
  });
});
