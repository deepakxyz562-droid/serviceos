// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  mockGetAuthUser: vi.fn(),
  tenantStore: {
    id: 'tenant-apex',
    name: 'Apex Dental Care',
    industry: 'Dentist',
    city: 'Patna',
    settingsJson: JSON.stringify({ activeGbpTitle: 'Apex Dental Care', activeGbpCategory: 'Dentist' }),
  },
  brandProfileStore: {
    businessName: 'Apex Dental Care',
    industry: 'Dentist',
    location: 'Patna',
  },
  socialAccountStore: { value: null as any },
  servicesStore: { value: [{ id: 's1', name: 'Teeth Whitening' }, { id: 's2', name: 'Root Canal' }] },
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: mocks.mockGetAuthUser,
  getProductAppUrl: vi.fn(() => 'https://bgos.site'),
}));

vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findUnique: vi.fn(async () => mocks.tenantStore),
    },
    brandProfile: {
      findUnique: vi.fn(async () => mocks.brandProfileStore),
    },
    socialAccount: {
      findFirst: vi.fn(async () => mocks.socialAccountStore.value),
      findMany: vi.fn(async () => (mocks.socialAccountStore.value ? [mocks.socialAccountStore.value] : [])),
    },
    service: {
      findMany: vi.fn(async () => mocks.servicesStore.value),
    },
    imageLibrary: {
      create: vi.fn(async (args) => ({ id: 'img-1', ...args.data })),
      findMany: vi.fn(async () => []),
    },
  },
}));

describe('Festival Catalog & Business Image Suggestion System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockGetAuthUser.mockResolvedValue({ id: 'user-apex', tenantId: 'tenant-apex' });
  });

  describe('Festival Catalog & Search API (/api/social/designs/festivals)', () => {
    it('returns 242 curated festival images and active festival groups with counts', async () => {
      const { GET } = await import('@/app/api/social/designs/festivals/route');
      const req = new NextRequest('http://localhost:3000/api/social/designs/festivals?limit=20');
      const res = await GET(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.groups.length).toBeGreaterThanOrEqual(15);
      expect(data.total).toBe(242);
      expect(data.photos.length).toBeLessThanOrEqual(20);

      // Verify group emojis and labels
      const diwaliGroup = data.groups.find((g: any) => g.id === 'diwali');
      expect(diwaliGroup).toBeDefined();
      expect(diwaliGroup.emoji).toBe('🪔');
      expect(diwaliGroup.count).toBeGreaterThanOrEqual(8);
    });

    it('searches festival images by specific keyword (e.g. modak, garba, diyas)', async () => {
      const { GET } = await import('@/app/api/social/designs/festivals/route');
      
      // Search for 'modak'
      const modakReq = new NextRequest('http://localhost:3000/api/social/designs/festivals?q=modak');
      const modakRes = await GET(modakReq);
      const modakData = await modakRes.json();
      expect(modakData.photos.length).toBeGreaterThan(0);
      expect(modakData.photos.every((p: any) => p.title.toLowerCase().includes('modak'))).toBe(true);

      // Search for 'garba'
      const garbaReq = new NextRequest('http://localhost:3000/api/social/designs/festivals?q=garba');
      const garbaRes = await GET(garbaReq);
      const garbaData = await garbaRes.json();
      expect(garbaData.photos.length).toBeGreaterThan(0);
      expect(garbaData.photos.some((p: any) => p.festivalKey === 'navratri')).toBe(true);
    });

    it('filters festival images by festivalKey', async () => {
      const { GET } = await import('@/app/api/social/designs/festivals/route');
      const req = new NextRequest('http://localhost:3000/api/social/designs/festivals?festival=diwali');
      const res = await GET(req);
      const data = await res.json();
      expect(data.photos.length).toBeGreaterThanOrEqual(8);
      expect(data.photos.every((p: any) => p.festivalKey === 'diwali')).toBe(true);
    });
  });

  describe('Business Image Suggestions API (/api/social/designs/business-images/suggestions)', () => {
    it('returns tailored commercial scene suggestions for the selected business without user prompt', async () => {
      const { GET } = await import('@/app/api/social/designs/business-images/suggestions/route');
      const req = new NextRequest('http://localhost:3000/api/social/designs/business-images/suggestions');
      const res = await GET(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.businessName).toBe('Apex Dental Care');
      expect(data.category).toBe('Dentist');
      expect(data.suggestions.length).toBeGreaterThanOrEqual(4);

      // Every suggestion has icon, title, badge, sceneDescription and strict NO TEXT promptBlueprint
      for (const s of data.suggestions) {
        expect(s.title).toBeDefined();
        expect(s.icon).toBeDefined();
        expect(s.badge).toBeDefined();
        expect(s.promptBlueprint).toMatch(/NO TEXT/i);
      }
    });
  });

  describe('1-Click Business Image Generator API (/api/social/designs/business-images/generate)', () => {
    it('generates commercial images and SEO metadata for the selected business with zero prompt entry required', async () => {
      const { POST } = await import('@/app/api/social/designs/business-images/generate/route');
      const req = new NextRequest('http://localhost:3000/api/social/designs/business-images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generateAll: true, sceneTitle: 'Modern Clinic Setup' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.businessName).toBe('Apex Dental Care');
      expect(data.urls.length).toBeGreaterThan(0);
      expect(data.urls[0]).toMatch(/^https?:\/\//);
      expect(data.seo).toBeDefined();
      expect(data.seo.title).toBeDefined();
      expect(data.seo.description).toBeDefined();
      expect(Array.isArray(data.seo.tags)).toBe(true);
    });
  });
});
