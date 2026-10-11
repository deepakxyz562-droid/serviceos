import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), find: vi.fn(), create: vi.fn(), update: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getAuthUser: mocks.auth }));
vi.mock('@/lib/db', () => ({ db: {
  conversation: { findUnique: mocks.find, update: mocks.update },
  inboxMessage: { create: mocks.create, update: mocks.update },
} }));
import { POST } from '@/app/api/omnichannel/conversations/[id]/messages/route';

const send = (body: object) => POST(new NextRequest('http://localhost/api/omnichannel/conversations/one/messages', {
  method: 'POST', body: JSON.stringify(body),
}), { params: Promise.resolve({ id: 'one' }) });

describe('customer message endpoint private-note isolation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ id: 'owner', role: 'owner', tenantId: 'tenant', workspaceId: 'workspace' });
    mocks.find.mockResolvedValue({ id: 'one', conversationId: 'channel-one', tenantId: 'tenant', workspaceId: 'workspace', channel: 'website' });
    mocks.create.mockImplementation(async ({ data }) => ({ ...data, id: 'message', createdAt: new Date() }));
    mocks.update.mockResolvedValue({});
  });
  it.each([
    { content: '[INTERNAL NOTE] Confidential' },
    { content: '  [internal note] Confidential' },
    { content: 'Confidential', mode: 'note' },
    { content: 'Confidential', messageType: 'note' },
    { content: 'Confidential', isInternal: true },
    { content: 'Confidential', isPrivate: true },
  ])('rejects private intent before customer-visible storage: %j', async body => {
    expect((await send(body)).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('preserves normal customer replies', async () => {
    expect((await send({ content: 'Hello customer' })).status).toBe(201);
    expect(mocks.create).toHaveBeenCalledOnce();
  });
  it('rejects a conversation in another workspace', async () => {
    mocks.find.mockResolvedValue({ tenantId: 'tenant', workspaceId: 'other' });
    expect((await send({ content: 'Hello' })).status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
