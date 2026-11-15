import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetAuthUser, tenantStore, brandProfileStore } = vi.hoisted(() => ({
  mockGetAuthUser: vi.fn(),
  tenantStore: {
    id: 'tenant-123',
    name: 'Apex Dental Care',
    industry: 'Dental Clinic',
    phone: '+91 98765 43210',
    settingsJson: JSON.stringify({ activeGbpTitle: 'Apex Dental Care', activeGbpCategory: 'Dentist' }),
  },
  brandProfileStore: {
    businessName: 'Apex Dental Care',
    industry: 'Dental Clinic',
    website: 'https://apexdental.com',
    logoUrl: 'https://apexdental.com/logo.png',
  },
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
      findUnique: vi.fn(async () => brandProfileStore),
    },
  },
}));

describe('Business Templates Feed API (/api/social/designs/templates)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    mockGetAuthUser.mockResolvedValueOnce(null);
    const { GET } = await import('@/app/api/social/designs/templates/route');
    const req = new NextRequest('http://localhost:3000/api/social/designs/templates');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns personalized templates for the authenticated business', async () => {
    mockGetAuthUser.mockResolvedValueOnce({ id: 'user-1', tenantId: 'tenant-123' });
    const { GET } = await import('@/app/api/social/designs/templates/route');
    const req = new NextRequest('http://localhost:3000/api/social/designs/templates?limit=16');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.businessContext.name).toBe('Apex Dental Care');
    expect(data.businessContext.matchedGroup).toBe('Health & wellness');
    expect(data.templates.length).toBeGreaterThan(0);
    expect(data.counts.total).toBeGreaterThan(0);

    // Verify template structure
    const sample = data.templates[0];
    expect(sample).toHaveProperty('id');
    expect(sample).toHaveProperty('headline');
    expect(sample).toHaveProperty('photoUrl');
    expect(sample).toHaveProperty('design');
    expect(sample.design).toHaveProperty('layers');
    expect(sample.design.layers.length).toBeGreaterThan(0);

    // Verify brand was injected into the design
    const brandLayer = sample.design.layers.find((l: any) => l.id === 'brand');
    expect(brandLayer?.text).toBe('Apex Dental Care');
  });

  it('filters by festival tab and aspect ratio', async () => {
    mockGetAuthUser.mockResolvedValueOnce({ id: 'user-1', tenantId: 'tenant-123' });
    const { GET } = await import('@/app/api/social/designs/templates/route');
    const req = new NextRequest('http://localhost:3000/api/social/designs/templates?tab=festivals&aspect=1:1&limit=8');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.templates.length).toBeGreaterThan(0);
    for (const item of data.templates) {
      expect(item.tab).toBe('festivals');
      expect(item.aspectRatio).toBe('1:1');
    }
  });

  it('re-export /api/social/templates/for-business functions identically', async () => {
    mockGetAuthUser.mockResolvedValueOnce({ id: 'user-1', tenantId: 'tenant-123' });
    const { GET } = await import('@/app/api/social/templates/for-business/route');
    const req = new NextRequest('http://localhost:3000/api/social/templates/for-business?tab=promotions&limit=4');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.templates.length).toBeGreaterThan(0);
    for (const item of data.templates) {
      expect(item.tab).toBe('promotions');
    }
  });
});
