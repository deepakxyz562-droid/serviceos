import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetAuthUser, tenantStore, countStore } = vi.hoisted(() => ({
  mockGetAuthUser: vi.fn(),
  tenantStore: {
    id: 'tenant-quota-test',
    name: 'Apex Dental Care',
    industry: 'Dental Clinic',
    city: 'Patna',
    planStatus: 'trial',
    plan: 'starter',
    settingsJson: '{}',
  },
  countStore: { value: 0 },
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: mockGetAuthUser,
}));

vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findUnique: vi.fn(async () => tenantStore),
    },
    brandProfile: {
      findUnique: vi.fn(async () => ({
        businessName: 'Apex Dental Care',
        industry: 'Dental Clinic',
        location: 'Patna',
      })),
    },
    socialAccount: {
      findFirst: vi.fn(async () => null),
    },
    service: {
      findMany: vi.fn(async () => [{ name: 'Dental Cleaning' }]),
    },
    imageLibrary: {
      count: vi.fn(async () => countStore.value),
      create: vi.fn(async () => ({ id: 'img-1' })),
    },
  },
}));

describe('AI Image Generation Quota Policy (/api/social/designs/business-images/generate)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockResolvedValue({ id: 'user-1', tenantId: 'tenant-quota-test' });
    tenantStore.planStatus = 'trial';
    tenantStore.plan = 'starter';
    countStore.value = 0;
  });

  it('returns current quota details via GET for trial user', async () => {
    countStore.value = 2;
    const { GET } = await import('@/app/api/social/designs/business-images/generate/route');
    const req = new NextRequest('http://localhost:3000/api/social/designs/business-images/generate');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.quota).toEqual({
      used: 2,
      limit: 5,
      remaining: 3,
      tier: 'trial',
      limitReached: false,
    });
  });

  it('returns current quota details via GET for active subscriber', async () => {
    tenantStore.planStatus = 'active';
    tenantStore.plan = 'pro';
    countStore.value = 4;

    const { GET } = await import('@/app/api/social/designs/business-images/generate/route');
    const req = new NextRequest('http://localhost:3000/api/social/designs/business-images/generate');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.quota).toEqual({
      used: 4,
      limit: 5,
      remaining: 1,
      tier: 'active',
      limitReached: false,
    });
  });

  it('allows trial user to generate when lifetime images are under 5', async () => {
    countStore.value = 3;
    const { POST } = await import('@/app/api/social/designs/business-images/generate/route');
    const req = new NextRequest('http://localhost:3000/api/social/designs/business-images/generate', {
      method: 'POST',
      body: JSON.stringify({
        sceneTitle: 'Modern Clinic Operatory',
        promptBlueprint: 'A modern bright dental operatory',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.quota.tier).toBe('trial');
    expect(data.quota.used).toBe(4);
    expect(data.quota.remaining).toBe(1);
  });

  it('blocks trial user when 5 lifetime images have been used', async () => {
    countStore.value = 5;
    const { POST } = await import('@/app/api/social/designs/business-images/generate/route');
    const req = new NextRequest('http://localhost:3000/api/social/designs/business-images/generate', {
      method: 'POST',
      body: JSON.stringify({
        sceneTitle: 'Attempt 6th Image',
        promptBlueprint: 'A modern bright dental operatory',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.limitReached).toBe(true);
    expect(data.quota.tier).toBe('trial');
    expect(data.quota.remaining).toBe(0);
    expect(data.message).toContain('free trial');
    expect(data.message).toContain('Upgrade your plan');
  });

  it('allows active subscriber to generate when today images are under 5', async () => {
    tenantStore.planStatus = 'active';
    tenantStore.plan = 'growth';
    countStore.value = 2;

    const { POST } = await import('@/app/api/social/designs/business-images/generate/route');
    const req = new NextRequest('http://localhost:3000/api/social/designs/business-images/generate', {
      method: 'POST',
      body: JSON.stringify({
        sceneTitle: 'Active Subscriber Scene',
        promptBlueprint: 'A modern dental chair',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.quota.tier).toBe('active');
    expect(data.quota.used).toBe(3);
    expect(data.quota.remaining).toBe(2);
  });

  it('blocks active subscriber when 5 daily images have been reached today', async () => {
    tenantStore.planStatus = 'active';
    tenantStore.plan = 'growth';
    countStore.value = 5;

    const { POST } = await import('@/app/api/social/designs/business-images/generate/route');
    const req = new NextRequest('http://localhost:3000/api/social/designs/business-images/generate', {
      method: 'POST',
      body: JSON.stringify({
        sceneTitle: 'Active Subscriber 6th Today',
        promptBlueprint: 'A modern dental chair',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.limitReached).toBe(true);
    expect(data.quota.tier).toBe('active');
    expect(data.quota.remaining).toBe(0);
    expect(data.message).toContain('daily limit');
    expect(data.message).toContain('reset tomorrow at midnight');
  });
});
