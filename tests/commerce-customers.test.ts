import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ session: vi.fn(), orders: vi.fn(), customers: vi.fn() }));
vi.mock('@/lib/quote-flow-session', () => ({ requireQuoteFlowBusiness: mocks.session }));
vi.mock('@/lib/db', () => ({ db: { gptformCommerceOrder: { findMany: mocks.orders }, aiCustomer: { findMany: mocks.customers } } }));
import { GET } from '@/app/api/commerce/customers/route';
const request = () => new NextRequest('http://localhost/api/commerce/customers?businessId=other');
const order = (id: number, status = 'CONFIRMED') => ({ id: String(id), customerPhone: '919876543210', customerName: 'Buyer', total: 10, paymentStatus: 'UNPAID', status, createdAt: new Date('2026-10-07'), itemsJson: '[]' });
describe('commerce customer directory', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.mockResolvedValue({ business: { id: 'own-business', currency: 'USD' } });
    mocks.customers.mockResolvedValue([]);
    mocks.orders.mockResolvedValue([]);
  });
  it('includes saved customers with no orders, including separate contacts without phones', async () => {
    mocks.customers.mockResolvedValue([{ id: 'a', name: 'One', phone: '' }, { id: 'b', name: 'Two', phone: '' }]);
    const data = await (await GET(request())).json();
    expect(data.customers.map((c: any) => c.id)).toEqual(['a', 'b']);
    expect(data.customers[0]).toMatchObject({ totalSpent: 0, avgOrderValue: 0, lastVisit: null });
    expect(data.currency).toBe('USD');
  });
  it('reads beyond the old 1000 order cap and scopes every page to the authorized business', async () => {
    const orders = Array.from({ length: 1001 }, (_, i) => order(i));
    mocks.orders.mockImplementation(({ skip, take }) => Promise.resolve(orders.slice(skip, skip + take)));
    const data = await (await GET(request())).json();
    expect(data.customers[0].ordersCount).toBe(1001);
    expect(data.customers[0].totalSpent).toBe(10010);
    expect(mocks.orders).toHaveBeenCalledTimes(3);
    for (const [args] of mocks.orders.mock.calls) expect(args.where.businessId).toBe('own-business');
    expect(mocks.customers.mock.calls[0][0].where.businessId).toBe('own-business');
  });
  it('keeps cancelled orders in history without counting them as spend', async () => {
    mocks.orders.mockResolvedValue([order(1, 'CANCELLED'), order(2), { ...order(3, 'DELIVERED'), paymentStatus: 'REFUNDED' }]);
    mocks.customers.mockResolvedValue([{ id: 'saved', name: 'Saved name', phone: '+91 98765 43210' }]);
    const data = await (await GET(request())).json();
    expect(data.customers).toHaveLength(1);
    expect(data.customers[0]).toMatchObject({ id: 'saved', name: 'Saved name', ordersCount: 3, totalSpent: 10 });
    expect(data.customers[0].recentOrders).toHaveLength(3);
  });
  it('requires an authorized business before reading any contacts', async () => {
    mocks.session.mockRejectedValue(new Error('UNAUTHORIZED'));
    expect((await GET(request())).status).toBe(401);
    expect(mocks.customers).not.toHaveBeenCalled();
    expect(mocks.orders).not.toHaveBeenCalled();
  });
});
