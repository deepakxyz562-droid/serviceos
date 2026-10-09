import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), agent: vi.fn(), conversation: vi.fn(), update: vi.fn(), create: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getAuthUser: mocks.auth }));
vi.mock('@/lib/db', () => ({ db: { user: { findFirst: mocks.agent }, conversation: { findUnique: mocks.conversation }, conversationAssignment: { updateMany: mocks.update, create: mocks.create } } }));
import { POST } from '@/app/api/omnichannel/conversations/[id]/assign/route';
const user = { id: 'owner', role: 'owner', name: 'Owner', email: 'owner@example.test', tenantId: 'tenant', workspaceId: 'workspace' };
const request = (body: unknown) => new NextRequest('http://localhost/api/omnichannel/conversations/one/assign', { method: 'POST', body: JSON.stringify(body) });
describe('BGOS inbox agent assignment', () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue(user); });
  it('rejects an agent outside the active tenant and workspace', async () => {
    mocks.agent.mockResolvedValue(null);
    expect((await POST(request({ agentId: 'foreign' }), { params: Promise.resolve({ id: 'one' }) })).status).toBe(404);
    expect(mocks.agent.mock.calls[0][0].where).toMatchObject({ tenantId: 'tenant', isActive: true, OR: [{ workspaceId: 'workspace' }, { workspaceId: null }] });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('takes the display name from the verified agent, not the request', async () => {
    mocks.agent.mockResolvedValue({ id: 'owner', name: 'Verified', email: user.email });
    mocks.conversation.mockResolvedValue({ id: 'one', conversationId: 'channel-one', tenantId: 'tenant', workspaceId: 'workspace' });
    mocks.create.mockImplementation(async ({ data }) => ({ ...data, id: 'assignment', createdAt: new Date() }));
    expect((await POST(request({ agentName: 'Impersonated' }), { params: Promise.resolve({ id: 'one' }) })).status).toBe(200);
    expect(mocks.create.mock.calls[0][0].data.agentName).toBe('Verified');
  });
});
