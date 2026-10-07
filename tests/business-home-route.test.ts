import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  user: vi.fn(), business: vi.fn(), tenant: vi.fn(), orders: vi.fn(), orderCount: vi.fn(), stock: vi.fn(), invoices: vi.fn(),
  member: vi.fn(),
}));
vi.mock('@/lib/quote-flow-session', async () => {
  const calc = await import('@/lib/quote-flow-calc');
  return { getQuoteFlowUser: mocks.user, computeTotals: calc.computeTotals };
});
vi.mock('@/lib/db', () => ({ db: {
  user: { findUnique: mocks.member },
  aiBusiness: { findUnique: mocks.business }, tenant: { findUnique: mocks.tenant },
  gptformCommerceOrder: { findMany: mocks.orders, count: mocks.orderCount },
  inventoryItem: { findMany: mocks.stock }, aiInvoice: { findMany: mocks.invoices },
} }));
import { GET } from '@/app/api/commerce/home/route';

describe('owner Home snapshot', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: 'owner-a', tenantId: 'tenant-a' });
    mocks.member.mockResolvedValue({ role: 'owner', isActive: true });
    mocks.business.mockResolvedValue({ id: 'business-a', tenantId: 'tenant-a', currency: 'INR' });
    mocks.tenant.mockResolvedValue({ settingsJson: JSON.stringify({ blueprint: { businessType: 'grocery', country: 'IN', salesChannels: ['in_store'] } }) });
    mocks.orders.mockResolvedValue([{ status: 'CONFIRMED', paymentStatus: 'UNPAID', total: 200 }]);
    mocks.orderCount.mockResolvedValue(1); mocks.stock.mockResolvedValue([]); mocks.invoices.mockResolvedValue([]);
  });
  it('requires authentication before accessing data', async () => {
    mocks.user.mockResolvedValue(null);
    expect((await GET(new Request('http://localhost/api/commerce/home'))).status).toBe(401);
    expect(mocks.business).not.toHaveBeenCalled();
  });
  it('rejects a business linked to another tenant', async () => {
    mocks.business.mockResolvedValue({ id: 'business-other', tenantId: 'tenant-other' });
    expect((await GET(new Request('http://localhost/api/commerce/home'))).status).toBe(404);
    expect(mocks.orders).not.toHaveBeenCalled();
  });
  it('does not expose the owner summary to an employee with a legacy business record', async () => {
    mocks.member.mockResolvedValue({ role: 'employee', isActive: true });
    expect((await GET(new Request('http://localhost/api/commerce/home'))).status).toBe(403);
    expect(mocks.business).not.toHaveBeenCalled();
  });
  it('scopes all sources and does not invent balance/dues/collection amounts', async () => {
    const response = await GET(new Request('http://localhost/api/commerce/home?businessId=other'));
    const data = await response.json();
    expect(data.metrics.sales).toBe(200);
    expect(data.metrics.balance).toBeNull();
    expect(data.metrics.moneyIn).toBeNull();
    expect(data.metrics.toPay).toBeNull();
    expect(mocks.orders.mock.calls[0][0].where.businessId).toBe('business-a');
    expect(mocks.stock.mock.calls[0][0].where.tenantId).toBe('tenant-a');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
  it('keeps a failed metric unavailable while loading other metrics', async () => {
    mocks.orders.mockRejectedValueOnce(new Error('Database unavailable'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await GET(new Request('http://localhost/api/commerce/home'));
    const data = await response.json();
    expect(data.metrics.sales).toBeUndefined();
    expect(data.metrics.activeOrders).toBe(1);
    spy.mockRestore();
  });
});
