import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn().mockResolvedValue({
    id: 'user-1',
    email: 'admin@fieseros.com',
    tenantId: 'tenant-fieseros',
    role: 'owner',
  }),
}));

vi.mock('@/lib/social/google-account-helper', () => ({
  prepareGoogleAccount: vi.fn().mockResolvedValue(null),
}));

describe('GBP 100% Dynamic Categories & Services Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dynamically suggests software categories for fieseros without hardcoded arrays', async () => {
    const { GET } = await import('@/app/api/gbp/categories/route');
    const req = new NextRequest('http://localhost:3000/api/gbp/categories?query=soft&businessName=fieseros');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.categories).toBeDefined();
    expect(Array.isArray(data.categories)).toBe(true);
    expect(data.categories.length).toBeGreaterThan(0);
    // All returned categories should be relevant to software
    const hasSoftCategory = data.categories.some((c: string) => /software|computer|tech|web/i.test(c));
    expect(hasSoftCategory).toBe(true);
    // Should NOT return grocery or bakery categories when searching soft
    expect(data.categories.some((c: string) => /bakery|grocery|supermarket/i.test(c))).toBe(false);
  }, 15000);

  it('dynamically generates authentic software offerings for fieseros (Software company) and NEVER returns In-Store Shopping or Home Delivery', async () => {
    const { POST } = await import('@/app/api/gbp/services/suggest/route');
    const req = new NextRequest('http://localhost:3000/api/gbp/services/suggest', {
      method: 'POST',
      body: JSON.stringify({
        businessName: 'fieseros',
        category: 'Software company',
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.services).toBeDefined();
    expect(Array.isArray(data.services)).toBe(true);
    expect(data.services.length).toBeGreaterThan(0);

    // Offerings must be software-relevant
    const hasSoftwareOffering = data.services.some((s: string) =>
      /software|development|app|web|cloud|saas|api|it|consulting/i.test(s)
    );
    expect(hasSoftwareOffering).toBe(true);

    // Strictly MUST NOT contain retail artifacts
    expect(data.services).not.toContain('In-Store Shopping');
    expect(data.services).not.toContain('Home Delivery');
    expect(data.services.some((s: string) => /in-store shopping|home delivery/i.test(s))).toBe(false);
  }, 15000);

  it('dynamically generates authentic supermarket offerings for shiv-ganga market (Supermarket / Grocery store)', async () => {
    const { POST } = await import('@/app/api/gbp/services/suggest/route');
    const req = new NextRequest('http://localhost:3000/api/gbp/services/suggest', {
      method: 'POST',
      body: JSON.stringify({
        businessName: 'shiv-ganga market',
        category: 'Supermarket',
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.services).toBeDefined();
    expect(Array.isArray(data.services)).toBe(true);
    expect(data.services.length).toBeGreaterThan(0);

    // Should contain supermarket offerings
    const hasGroceryOffering = data.services.some((s: string) =>
      /produce|grocer|food|dairy|staple|vegetable|fruit|essential|shopping/i.test(s)
    );
    expect(hasGroceryOffering).toBe(true);
    // Should NOT contain software offerings
    expect(data.services.some((s: string) => /custom software|mobile app development|cloud devops/i.test(s))).toBe(false);
  }, 30000);

  it('dynamically synthesizes offerings for any arbitrary new business category without hardcoded regex traps', async () => {
    const { POST } = await import('@/app/api/gbp/services/suggest/route');
    const req = new NextRequest('http://localhost:3000/api/gbp/services/suggest', {
      method: 'POST',
      body: JSON.stringify({
        businessName: 'Smile Dental Studio',
        category: 'Dental clinic',
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.services).toBeDefined();
    expect(Array.isArray(data.services)).toBe(true);
    expect(data.services.length).toBeGreaterThan(0);

    // Should be dental-relevant, not defaulting to In-Store Shopping
    expect(data.services).not.toContain('In-Store Shopping');
    expect(data.services).not.toContain('Home Delivery');
  }, 15000);

  it('filters services dynamically when typing a query in the services search field', async () => {
    const { GET } = await import('@/app/api/gbp/services/suggest/route');
    const req = new NextRequest('http://localhost:3000/api/gbp/services/suggest?category=Software+company&businessName=fieseros&query=mobile');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.services).toBeDefined();
    expect(Array.isArray(data.services)).toBe(true);
    // Must return offerings tailored to mobile/software
    const hasMobileMatch = data.services.some((s: string) => /mobile|app|phone|ios|android/i.test(s));
    expect(hasMobileMatch).toBe(true);
  }, 15000);
});
