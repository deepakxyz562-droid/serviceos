import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), sql: vi.fn(), rest: vi.fn(), client: vi.fn(), write: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { $queryRawUnsafe: mocks.sql, gptformCommerceOrder: { create: mocks.write, update: mocks.write }, inventoryItem: { update: mocks.write }, expense: { create: mocks.write } } }));
vi.mock('@/lib/supabase-db', () => ({ shouldUseSupabaseDB: mocks.rest }));
vi.mock('@/lib/supabase', () => ({ getSupabaseAdmin: mocks.client }));
import { atomicCommerce } from '@/lib/commerce/atomic';
describe('commerce missing schema safety', () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.rest.mockReturnValue(true); mocks.client.mockReturnValue({ rpc: mocks.rpc }); });
  it.each(['finance', 'order', 'stock', 'updateOrder', 'snapshot', 'claim'] as const)('refuses %s when its atomic function is absent', async operation => {
    mocks.rpc.mockResolvedValue({ error: { code: 'PGRST202', message: 'Function missing' } });
    await expect(atomicCommerce(operation, ['merchant', 'stable-request-key', {}])).rejects.toThrow('COMMERCE_MIGRATION_REQUIRED');
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it('passes identity and the same retry key to PostgreSQL on every attempt', async () => {
    mocks.rpc.mockResolvedValue({ data: { replayed: true } });
    await atomicCommerce('order', ['merchant', 'same-key', { totalMinor: 100 }]);
    await atomicCommerce('order', ['merchant', 'same-key', { totalMinor: 100 }]);
    expect(mocks.rpc.mock.calls[0]).toEqual(mocks.rpc.mock.calls[1]);
    expect(mocks.rpc.mock.calls[0][1]).toMatchObject({ p_business_id: 'merchant', p_key: 'same-key' });
  });
  it('does not mask direct database failure as a successful save', async () => {
    mocks.rest.mockReturnValue(false); mocks.sql.mockRejectedValue(new Error('function does not exist'));
    await expect(atomicCommerce('finance', ['merchant', 'key', {}])).rejects.toThrow();
    expect(mocks.write).not.toHaveBeenCalled();
  });
});
