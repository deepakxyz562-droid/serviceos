import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ owner: vi.fn(), atomic: vi.fn() }));
vi.mock('@/lib/commerce/access', () => ({ ownerBusiness: mocks.owner }));
vi.mock('@/lib/commerce/atomic', () => ({ atomicCommerce: mocks.atomic, commerceError: () => ({ status: 503, message: 'History unavailable' }) }));
import { GET } from '@/app/api/commerce/customer-history/route';
const request = (query = '') => new Request(`https://fieseros.com/api/commerce/customer-history?phone=919876543210${query}`);
describe('customer history access and pagination', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.owner.mockResolvedValue({ id: 'owner-business' });
    mocks.atomic.mockResolvedValue({ records: [], balance: 0, reviewRequired: false, ordersCount: 0, currency: 'INR' });
  });
  it('uses authenticated business identity and private responses', async () => {
    const response = await GET(request('&businessId=someone-else'));
    expect(mocks.atomic).toHaveBeenCalledWith('customerHistory', ['owner-business', '919876543210', 'orders', '', '']);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
  it('returns fifty records and carries the last served record into the next page', async () => {
    const records = Array.from({ length: 51 }, (_, i) => ({ id: `order-${i}`, createdAt: '2026-10-08T00:00:00.000Z' }));
    mocks.atomic.mockResolvedValue({ records, balance: 100 });
    const page = await (await GET(request())).json();
    expect(page.records).toHaveLength(50);
    await GET(request(`&cursor=${page.nextCursor}`));
    expect(mocks.atomic).toHaveBeenLastCalledWith('customerHistory', ['owner-business', '919876543210', 'orders', records[49].createdAt, records[49].id]);
    expect((await GET(request(`&section=ledger&cursor=${page.nextCursor}`))).status).toBe(400);
    expect((await GET(new Request(`https://fieseros.com/api/commerce/customer-history?phone=919999999999&cursor=${page.nextCursor}`))).status).toBe(400);
  });
  it('rejects malformed cursors before querying financial data', async () => {
    expect((await GET(request('&cursor=garbage'))).status).toBe(400);
    expect(mocks.atomic).not.toHaveBeenCalled();
  });
  it('requires authorization and never substitutes zero for a database failure', async () => {
    mocks.owner.mockRejectedValueOnce(new Error('UNAUTHORIZED'));
    expect((await GET(request())).status).toBe(401);
    expect(mocks.atomic).not.toHaveBeenCalled();
    mocks.atomic.mockRejectedValueOnce(new Error('DATABASE_UNAVAILABLE'));
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).not.toHaveProperty('balance');
  });
});
