import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ owner: vi.fn(), tenant: vi.fn(), config: vi.fn() }));
vi.mock('@/lib/commerce/access', () => ({ ownerBusiness: mocks.owner }));
vi.mock('@/lib/db', () => ({ db: { tenant: { findUnique: mocks.tenant }, gptformCommerceConfig: { findFirst: mocks.config } } }));
import { GET } from '@/app/api/commerce/store-share/route';
describe('merchant store sharing', () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.owner.mockResolvedValue({ id: 'own-business', tenantId: 'own-tenant' }); mocks.tenant.mockResolvedValue({ id: 'own-tenant', slug: 'my-store', name: '<script>alert(1)</script>' }); mocks.config.mockResolvedValue({ isActive: true }); });
  it('generates an embedded printable QR with escaped merchant text', async () => {
    const response = await GET(new Request('https://fieseros.com/api/commerce/store-share?businessId=other&language=hi'));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.storeUrl).toMatch(/\/store\/my-store$/);
    expect(data.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(data.html).not.toContain('<script>');
    expect(data.html).toContain('&lt;script&gt;');
    expect(data.html).toContain('ऑर्डर करने');
    expect(mocks.config).toHaveBeenCalledWith({ where: { businessId: 'own-business' } });
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
  it('does not invent a link for unpublished stores', async () => {
    mocks.config.mockResolvedValue({ isActive: false });
    expect((await GET(new Request('https://fieseros.com/api/commerce/store-share'))).status).toBe(409);
  });
  it('requires authentication before loading merchant information', async () => {
    mocks.owner.mockRejectedValue(new Error('UNAUTHORIZED'));
    expect((await GET(new Request('https://fieseros.com/api/commerce/store-share'))).status).toBe(401);
    expect(mocks.tenant).not.toHaveBeenCalled();
  });
});
