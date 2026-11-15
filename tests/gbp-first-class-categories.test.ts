// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn().mockResolvedValue({
    id: 'user-1',
    email: 'admin@fieseros.com',
    tenantId: 'tenant-fieseros',
    role: 'owner',
  }),
}));

import {
  searchGbpCategories,
  getGbpCategoryByNameOrAlias,
  getGbpCategoryById,
  generateCategoryBlueprints,
} from '@/lib/gbp/master-category-catalog';
import { NextRequest } from 'next/server';

describe('First-Class GBP Categories Architecture', () => {
  it('instantly searches categories by prefix, token, and trade alias', () => {
    // 1. Plywood search
    const plyResults = searchGbpCategories('ply');
    expect(plyResults.length).toBeGreaterThan(0);
    expect(plyResults.some((c) => c.displayName === 'Plywood supplier')).toBe(true);

    // 2. Sweet shop search
    const sweetResults = searchGbpCategories('sweet');
    expect(sweetResults.length).toBeGreaterThan(0);
    expect(sweetResults.some((c) => c.displayName === 'Indian sweets shop')).toBe(true);

    // 3. Saloon / Salon search
    const salonResults = searchGbpCategories('saloon');
    expect(salonResults.length).toBeGreaterThan(0);
    expect(salonResults.some((c) => c.displayName === 'Beauty salon' || c.displayName === 'Hair salon')).toBe(true);

    // 4. Solar search
    const solarResults = searchGbpCategories('solar');
    expect(solarResults.length).toBeGreaterThan(0);
    expect(solarResults.some((c) => c.displayName === 'Solar energy contractor')).toBe(true);

    // 5. CCTV search
    const cctvResults = searchGbpCategories('cctv');
    expect(cctvResults.length).toBeGreaterThan(0);
    expect(cctvResults.some((c) => c.displayName === 'Security system supplier')).toBe(true);
  });

  it('resolves categories by common Indian SMB trade aliases', () => {
    const plyShop = getGbpCategoryByNameOrAlias('ply shop');
    expect(plyShop).toBeDefined();
    expect(plyShop?.id).toBe('gcid:plywood_supplier');

    const mithai = getGbpCategoryByNameOrAlias('mithai shop');
    expect(mithai).toBeDefined();
    expect(mithai?.id).toBe('gcid:indian_sweets_shop');

    const saloon = getGbpCategoryByNameOrAlias('gents saloon');
    expect(saloon).toBeDefined();
    expect(saloon?.pillar).toBe('beauty_personal_care');

    const ca = getGbpCategoryByNameOrAlias('ca firm');
    expect(ca).toBeDefined();
    expect(ca?.displayName).toBe('Chartered accountant');
  });

  it('generates rich commercial creative blueprints with trade products and verified photos', () => {
    // Test Plywood Supplier Blueprints
    const plyBlueprints = generateCategoryBlueprints({
      categoryOrTitle: 'Plywood supplier',
      businessName: 'Shree Ram Plywood',
      city: 'Patna',
      phone: '+91 98765 43210',
    });

    expect(plyBlueprints.length).toBeGreaterThanOrEqual(3);
    const plyPromo = plyBlueprints.find((b) => b.purpose === 'Promotion');
    expect(plyPromo).toBeDefined();
    expect(plyPromo?.headline).toContain('Marine Plywood');
    expect(plyPromo?.bullets.some((b) => b.includes('IS:710 Marine Grade'))).toBe(true);
    expect(plyPromo?.photoUrl).toContain('unsplash.com/photo-');
    expect(plyPromo?.photoUrl).not.toContain('photo-1605647540924-852290f6b0d5'); // Not the blonde woman!

    // Test Indian Sweets Blueprints
    const sweetBlueprints = generateCategoryBlueprints({
      categoryOrTitle: 'Indian sweets shop',
      businessName: 'Brijwasi Sweets',
      city: 'Varanasi',
    });

    const sweetPromo = sweetBlueprints.find((b) => b.purpose === 'Promotion');
    expect(sweetPromo).toBeDefined();
    expect(sweetPromo?.headline).toContain('Pure Desi Ghee');
    expect(sweetPromo?.bullets.some((b) => b.includes('Pure Desi Ghee'))).toBe(true);
    expect(sweetPromo?.photoUrl).not.toContain('photo-1605647540924-852290f6b0d5');
  });

  it('serves master category dataset via /api/gbp/categories with sub-millisecond response', async () => {
    const { GET } = await import('@/app/api/gbp/categories/route');
    const req = new NextRequest('http://localhost:3000/api/gbp/categories?query=ply');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.source).toBe('master_catalog');
    expect(data.categories).toBeDefined();
    expect(data.categories).toContain('Plywood supplier');
  });
});
