import { beforeEach, describe, expect, it, vi } from 'vitest';
const tenant = vi.hoisted(() => ({ findUnique: vi.fn(), updateMany: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { tenant } }));
import { getTenantEventTypes, saveTenantEventTypes } from '@/features/scheduling/services/event-type-service';

describe('BGOS scheduling persistence', () => {
  beforeEach(() => vi.resetAllMocks());
  it('keeps an intentionally empty event list instead of recreating public defaults', async () => {
    tenant.findUnique.mockResolvedValue({ settingsJson: '{"schedulingEventTypes":[]}' });
    expect(await getTenantEventTypes('tenant')).toEqual([]);
    expect(tenant.updateMany).not.toHaveBeenCalled();
  });
  it('preserves unrelated settings when saving meeting types', async () => {
    const settingsJson = '{"creatorProfile":{"handle":"team"}}';
    tenant.findUnique.mockResolvedValue({ settingsJson });
    tenant.updateMany.mockResolvedValue({ count: 1 });
    await saveTenantEventTypes('tenant', []);
    const args = tenant.updateMany.mock.calls[0][0];
    expect(args.where).toEqual({ id: 'tenant', settingsJson });
    expect(JSON.parse(args.data.settingsJson)).toEqual({ creatorProfile: { handle: 'team' }, schedulingEventTypes: [] });
  });
  it('reports concurrent edits instead of silently dropping them', async () => {
    tenant.findUnique.mockResolvedValue({ settingsJson: '{}' });
    tenant.updateMany.mockResolvedValue({ count: 0 });
    await expect(saveTenantEventTypes('tenant', [])).rejects.toThrow('Scheduling settings changed');
  });
  it('does not invent available meeting types during a database outage', async () => {
    tenant.findUnique.mockRejectedValue(new Error('offline'));
    await expect(getTenantEventTypes('tenant')).rejects.toThrow('offline');
  });
});
