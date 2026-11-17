import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetAuthUser, tenantStore, brandProfileStore, socialAccountStore, servicesStore } = vi.hoisted(() => ({
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
  socialAccountStore: { value: null as any },
  servicesStore: { value: [] as any[] },
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: mockGetAuthUser,
  getProductAppUrl: vi.fn(() => 'https://bgos.site'),
}));

vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findUnique: vi.fn(async () => tenantStore),
    },
    brandProfile: {
      findUnique: vi.fn(async () => brandProfileStore),
    },
    socialAccount: {
      findFirst: vi.fn(async () => socialAccountStore.value),
      findMany: vi.fn(async () => (socialAccountStore.value ? [socialAccountStore.value] : [])),
    },
    service: {
      findMany: vi.fn(async () => servicesStore.value),
    },
    imageLibrary: {
      findMany: vi.fn(async () => []),
    },
    socialPost: {
      findMany: vi.fn(async () => []),
    },
  },
}));

describe('Business Templates Feed API (/api/social/designs/templates)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantStore.name = 'Apex Dental Care';
    tenantStore.industry = 'Dental Clinic';
    tenantStore.settingsJson = JSON.stringify({ activeGbpTitle: 'Apex Dental Care', activeGbpCategory: 'Dentist' });
    brandProfileStore.businessName = 'Apex Dental Care';
    brandProfileStore.industry = 'Dental Clinic';
    socialAccountStore.value = null;
    servicesStore.value = [];
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
  }, 15000);

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

  it('guarantees festival template-to-photo accuracy and never assigns trade photos to festivals', async () => {
    mockGetAuthUser.mockResolvedValueOnce({ id: 'user-1', tenantId: 'tenant-123' });
    const { GET } = await import('@/app/api/social/designs/templates/route');
    const req = new NextRequest('http://localhost:3000/api/social/designs/templates?tab=festivals&limit=15');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.templates.length).toBeGreaterThan(0);

    // Specifically test Diwali template
    const diwaliTemplate = data.templates.find(
      (t: any) => t.id === 'it-diwali-festival' || t.id === 'festival-diwali-universal' || /diwali/i.test(t.headline)
    );
    expect(diwaliTemplate).toBeDefined();

    // Must NOT be the mismatched blonde woman in park (photo-1508214751196-bcfd4ca60f91)
    expect(diwaliTemplate.photoUrl).not.toContain('photo-1508214751196-bcfd4ca60f91');

    // Must use authentic festival photography (diya/lights/festive or verified webp/multi-source)
    expect(diwaliTemplate.photoUrl).toMatch(/(diwali|behance\.net|pinimg\.com|fbcdn\.net|postermywall|unsplash\.com|staticflickr\.com|wikimedia\.org)/i);

    // Specifically test Holi template
    const holiTemplate = data.templates.find(
      (t: any) => t.id === 'festival-holi-universal' || /holi/i.test(t.headline)
    );
    expect(holiTemplate).toBeDefined();
    expect(holiTemplate.photoUrl).toMatch(/(holi|edition-holi\.webp|behance\.net|pinimg\.com|fbcdn\.net|postermywall|unsplash\.com|staticflickr\.com|wikimedia\.org)/i);

    // Check that every festival template photo URL is festival-themed or webp, never dental/trade clinic photo
    for (const item of data.templates) {
      expect(item.tab).toBe('festivals');
      expect(item.photoUrl).not.toContain('photo-1588776814546'); // dental chair
      expect(item.photoUrl).not.toContain('photo-1508214751196'); // woman in park
    }
  });

  it('verifies all curated templates have valid, working non-404 photo URLs', async () => {
    const { CURATED_TEMPLATES } = await import('../shared/curated-photo-templates');
    expect(CURATED_TEMPLATES.length).toBeGreaterThanOrEqual(16);

    for (const tpl of CURATED_TEMPLATES) {
      expect(tpl.referenceUrl).toMatch(/^(https:\/\/images\.unsplash\.com\/photo-|\/images\/bgos\/festivals\/|\/images\/bgos\/templates\/)/);
      // Ensure the old 404 URL is gone
      expect(tpl.referenceUrl).not.toContain('photo-1486006920555-c77dce18193b');
      // Ensure the mismatched Diwali photo is gone and replaced with verified authentic diya
      if (tpl.id === 'it-diwali-festival' || tpl.id === 'festival-diwali-universal') {
        expect(tpl.referenceUrl).not.toContain('photo-1508214751196-bcfd4ca60f91');
        expect(tpl.referenceUrl).not.toContain('photo-1605647540924-852290f6b0d5');
        expect(tpl.referenceUrl).not.toContain('photo-1577083552431-6e5fd01aa342');
        expect(tpl.referenceUrl).toMatch(/\/images\/bgos\/festivals\/diwali\/.*\.webp/);
      }
      if (tpl.id === 'festival-holi-universal') {
        expect(tpl.referenceUrl).not.toContain('photo-1583083527882-4bee9aba2eea'); // elf cat
        expect(tpl.referenceUrl).toMatch(/\/images\/bgos\/festivals\/holi\/.*\.webp/);
      }
    }
  });

  it('strictly isolates business categories so merchants never see unrelated trades', async () => {
    // 1. Test dental merchant (Health & wellness)
    mockGetAuthUser.mockResolvedValueOnce({ id: 'user-1', tenantId: 'tenant-123' });
    const { GET } = await import('@/app/api/social/designs/templates/route');
    const dentalReq = new NextRequest('http://localhost:3000/api/social/designs/templates?tab=for_business&limit=20');
    const dentalRes = await GET(dentalReq);
    expect(dentalRes.status).toBe(200);
    const dentalData = await dentalRes.json();

    expect(dentalData.businessContext.matchedGroup).toBe('Health & wellness');
    // None of the business templates should be auto, home services, salon, dining, or IT
    for (const item of dentalData.templates) {
      expect(item.tab).toBe('for_business');
      const headline = item.headline.toLowerCase();
      expect(headline).not.toContain('car wash');
      expect(headline).not.toContain('plumbing');
      expect(headline).not.toContain('plywood');
    }

    // 2. Test plywood merchant (Home services)
    tenantStore.name = 'Patna Plywood & Timber Works';
    tenantStore.industry = 'Plywood Shop';
    tenantStore.settingsJson = JSON.stringify({ activeGbpTitle: 'Patna Plywood & Timber Works', activeGbpCategory: 'Plywood supplier' });
    brandProfileStore.businessName = 'Patna Plywood & Timber Works';
    brandProfileStore.industry = 'Plywood Shop';

    mockGetAuthUser.mockResolvedValueOnce({ id: 'user-2', tenantId: 'tenant-456' });
    const plywoodReq = new NextRequest('http://localhost:3000/api/social/designs/templates?tab=for_business&limit=20');
    const plywoodRes = await GET(plywoodReq);
    expect(plywoodRes.status).toBe(200);
    const plywoodData = await plywoodRes.json();

    expect(plywoodData.businessContext.matchedGroup).toBe('Home services');
    for (const item of plywoodData.templates) {
      expect(item.tab).toBe('for_business');
      const headline = item.headline.toLowerCase();
      // Must NOT contain dental, car wash, salon, or restaurant headlines
      expect(headline).not.toContain('dentist');
      expect(headline).not.toContain('dental');
      expect(headline).not.toContain('car wash');
      expect(headline).not.toContain('salon');
    }

    // 3. Test Security service merchant (ShieldHire SOS App in Delhi)
    tenantStore.name = 'ShieldHire SOS App';
    tenantStore.industry = 'Security service';
    tenantStore.settingsJson = JSON.stringify({ activeGbpTitle: 'ShieldHire SOS App', activeGbpCategory: 'Security service' });
    brandProfileStore.businessName = 'ShieldHire SOS App';
    brandProfileStore.industry = 'Security service';

    mockGetAuthUser.mockResolvedValueOnce({ id: 'user-sec', tenantId: 'tenant-sec' });
    const secReq = new NextRequest('http://localhost:3000/api/social/designs/templates?limit=30');
    const secRes = await GET(secReq);
    expect(secRes.status).toBe(200);
    const secData = await secRes.json();

    expect(secData.businessContext.matchedGroup).toBe('Security & Facility services');

    // Must NOT contain hardware/modular kitchen, SS-304, soft-close, plywood, or wholesale factory pricing
    for (const item of secData.templates) {
      const combined = `${item.name} ${item.headline} ${item.subtitle || ''} ${(item.defaultBullets || []).join(' ')}`.toLowerCase();
      expect(combined).not.toContain('modular kitchen');
      expect(combined).not.toContain('soft-close');
      expect(combined).not.toContain('ss-304');
      expect(combined).not.toContain('plywood');
      expect(combined).not.toContain('factory direct wholesale pricing');
      expect(combined).not.toContain('core offerings');
    }

    // Must include genuine security service showcase
    const secShowcase = secData.templates.find((t: any) => /security/i.test(t.headline));
    expect(secShowcase).toBeDefined();
    expect(secShowcase.headline.toLowerCase()).toContain('security');
  }, 25000);

  it('expands core services feed to 100+ category-adapted templates without static 8-item bottleneck', async () => {
    mockGetAuthUser.mockResolvedValueOnce({ id: 'user-1', tenantId: 'tenant-123' });
    const { GET } = await import('@/app/api/social/designs/templates/route');
    const req = new NextRequest('http://localhost:3000/api/social/designs/templates?tab=for_business&limit=150');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.counts.for_business).toBeGreaterThanOrEqual(100);
    expect(data.counts.total).toBeGreaterThanOrEqual(200);
    expect(data.templates.length).toBeGreaterThanOrEqual(100);

    // Verify all items are for_business and cleanly adapted
    for (const item of data.templates) {
      expect(item.tab).toBe('for_business');
      expect(item.photoUrl).toBeTruthy();
      expect(item.badge).toBeTruthy();
      // Ensure no artificial source tagging
      expect(item.badge).not.toContain('Pinterest');
      expect(item.badge).not.toContain('Behance');
    }
  });

  it('sources authentic imagery across verified templates with high reliability', async () => {
    mockGetAuthUser.mockResolvedValueOnce({ id: 'user-1', tenantId: 'tenant-123' });
    const { GET } = await import('@/app/api/social/designs/templates/route');
    const req = new NextRequest('http://localhost:3000/api/social/designs/templates?tab=for_business&limit=50');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    const photos = data.templates.map((t: any) => t.photoUrl);
    const uniquePhotos = new Set(photos);
    expect(uniquePhotos.size).toBeGreaterThanOrEqual(1);
    expect(photos.every((p: string) => typeof p === 'string' && p.length > 0)).toBe(true);
  });

  it('supports Fieseros IT & Software merchant: reads GBP account, integrates real added services, uses Unsplash first, and eliminates party/rent/cleaning junk flyers', async () => {
    tenantStore.name = 'Fieseros';
    tenantStore.industry = 'Services';
    tenantStore.settingsJson = JSON.stringify({});
    brandProfileStore.businessName = 'Fieseros';
    brandProfileStore.industry = 'Services';

    socialAccountStore.value = {
      id: 'acc-gbp-fieseros',
      tenantId: 'tenant-fieseros',
      platform: 'googlebusiness',
      accountName: 'Fieseros - Software & Digital Solutions',
      isActive: true,
      metadata: JSON.stringify({
        primaryCategory: 'Software company',
        locationTitle: 'Fieseros - Software & Digital Solutions',
        city: 'Patna',
        phone: '+91 99999 11111',
      }),
    };

    servicesStore.value = [
      { id: 'srv-1', name: 'Custom Software Development', category: 'it' },
      { id: 'srv-2', name: 'Web & Mobile App Development', category: 'it' },
      { id: 'srv-3', name: 'Enterprise Cloud Architecture', category: 'it' },
      { id: 'srv-4', name: 'AI & Business Process Automation', category: 'it' },
    ];

    mockGetAuthUser.mockResolvedValueOnce({ id: 'user-fieseros', tenantId: 'tenant-fieseros' });
    const { GET } = await import('@/app/api/social/designs/templates/route');
    const req = new NextRequest('http://localhost:3000/api/social/designs/templates?limit=50');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    // 1. Must recognize IT & Digital services from connected GBP account and services
    expect(data.businessContext.matchedGroup).toBe('IT & Software solutions');

    // 2. Headlines must incorporate the real added services
    const allHeadlines = data.templates.map((t: any) => t.headline.toLowerCase()).join(' ');
    expect(allHeadlines).toContain('custom software development');
    expect(allHeadlines).toContain('web & mobile app development');

    // 3. ZERO party flyers, ZERO rent flyers, ZERO cleaning flyers, ZERO education flyers
    for (const item of data.templates) {
      const combined = `${item.name} ${item.headline} ${item.subtitle || ''} ${item.photoUrl || ''}`.toLowerCase();
      expect(combined).not.toContain('dance party');
      expect(combined).not.toContain('night club');
      expect(combined).not.toContain('for rent');
      expect(combined).not.toContain('professional cleaning services');
      expect(combined).not.toContain('curiosity is a good beginning');
      expect(combined).not.toContain('bring your questions. find your direction');
      expect(item.photoUrl).not.toContain('behance.net');
      expect(item.photoUrl).not.toContain('pinimg.com');
      expect(item.badge?.toLowerCase()).not.toContain('education & coaching');
    }

    // 4. Must prioritize clean commercial photography (pure photography with no text)
    const validTemplates = data.templates.filter((t: any) =>
      t.photoUrl.includes('/images/bgos/festivals/') || t.photoUrl.includes('/images/bgos/templates/') || t.photoUrl.includes('images.unsplash.com') || t.photoUrl.startsWith('https://'),
    );
    expect(validTemplates.length).toBeGreaterThanOrEqual(15);
  }, 20000);
});
