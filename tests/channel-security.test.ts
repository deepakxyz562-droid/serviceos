import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({ auth: vi.fn(), count: vi.fn(), list: vi.fn(), find: vi.fn(), create: vi.fn(), update: vi.fn(), connections: vi.fn(), connection: vi.fn(), catalog: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getAuthUser: m.auth }));
vi.mock('@/lib/db', () => ({ db: { channelConfig: { count: m.count, findMany: m.list, findFirst: m.find, create: m.create, createMany: vi.fn(), update: m.update }, channelConnection: { findMany: m.connections, findFirst: m.connection }, channelCatalog: { findMany: m.catalog } } }));
import { GET, POST } from '@/app/api/omnichannel/channels/route';
import { GET as legacyGET, POST as legacyPOST } from '@/app/api/channel-configs/route';
import { publicChannelConfig } from '@/lib/channel-public-config';
const req = (body?: object) => new NextRequest('https://fieseros.com/api/omnichannel/channels?tenantId=other', body ? { method: 'POST', body: JSON.stringify(body) } : {});
const payload = { channel: 'whatsapp', name: 'WhatsApp' };
describe('channel settings security', () => {
  beforeEach(() => {
    vi.resetAllMocks(); m.auth.mockResolvedValue({ id: 'owner', role: 'owner', tenantId: 'mine' }); m.count.mockResolvedValue(1); m.catalog.mockResolvedValue([]); m.connections.mockResolvedValue([]); m.connection.mockResolvedValue(null);
    m.list.mockResolvedValue([{ id: 'channel', channel: 'whatsapp', status: 'active', configJson: '{"accessToken":"private","phone":"123","nested":{"password":"secret"}}' }]);
    m.find.mockResolvedValue({ id: 'channel', status: 'active', configJson: '{}' }); m.update.mockImplementation(({ data }) => ({ id: 'channel', channel: 'whatsapp', ...data }));
  });
  it('rejects missing sessions before database reads or writes on both routes', async () => {
    m.auth.mockResolvedValue(null);
    for (const handler of [GET, legacyGET]) expect((await handler(req())).status).toBe(401);
    for (const handler of [POST, legacyPOST]) expect((await handler(req(payload))).status).toBe(401);
    expect(m.list).not.toHaveBeenCalled(); expect(m.update).not.toHaveBeenCalled();
  });
  it('rejects customer sessions and sessions without a business', async () => {
    for (const user of [{ role: 'customer', tenantId: 'mine' }, { role: 'owner', tenantId: null }]) {
      m.auth.mockResolvedValue(user); expect((await GET(req())).status).toBe(403); expect((await POST(req(payload))).status).toBe(403);
    }
  });
  it('scopes reads and removes nested secrets; legacy active flags are not verified', async () => {
    const response = await GET(req()); const rows = await response.json();
    expect(m.list.mock.calls[0][0].where).toEqual({ tenantId: 'mine' });
    expect(rows[0]).toMatchObject({ connected: false, config: { phone: '123', nested: {} } });
    expect(JSON.stringify(rows)).not.toContain('private');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
  it('rejects tenant overrides and fabricated activation', async () => {
    expect((await POST(req({ ...payload, tenantId: 'other' }))).status).toBe(403);
    expect((await POST(req({ ...payload, connected: true }))).status).toBe(409);
    expect(m.update).not.toHaveBeenCalled();
  });
  it('allows an explicit pause and ignores client supplied verification and billing fields', async () => {
    m.connection.mockResolvedValue({ status: 'CONNECTED' });
    const response = await POST(req({ ...payload, connected: false, lastTestStatus: 'success', setupCompleted: true, tier: 'unlimited', workspaceId: 'other' }));
    expect(response.status).toBe(200); expect((await response.json()).connected).toBe(false);
    expect(m.update.mock.calls[0][0].data).toEqual({ name: 'WhatsApp', configJson: '{}', status: 'inactive' });
  });
  it('rejects secrets in preferences rather than echoing or storing them', async () => {
    expect((await POST(req({ ...payload, config: { nested: { accessToken: 'secret' } } }))).status).toBe(400);
    expect(m.update).not.toHaveBeenCalled();
  });
  it('sanitizes secrets within arrays too', () => {
    expect(publicChannelConfig({ list: [{ apiKey: 'secret', enabled: true }] })).toEqual({ list: [{ enabled: true }] });
  });
});
