import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ user: vi.fn(), contacts: vi.fn(), leads: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getAuthUser: mocks.user }));
vi.mock('@/lib/db', () => ({ db: { contact: { findMany: mocks.contacts }, lead: { findMany: mocks.leads } } }));
vi.mock('@/lib/bgos-usage', () => ({ reserveLeadCredits: vi.fn(), finalizeLeadCredits: vi.fn() }));
import { POST } from '@/app/api/bgos/discovery/route';
function request() { return new NextRequest('http://localhost/api/bgos/discovery', { method: 'POST', body: JSON.stringify({ provider: 'directory', query: 'Example' }), headers: { 'Content-Type': 'application/json' } }); }
beforeEach(() => { vi.resetAllMocks(); mocks.user.mockResolvedValue({ id: 'u', tenantId: 't', role: 'owner' }); mocks.contacts.mockResolvedValue([]); mocks.leads.mockResolvedValue([]); });
it('returns an empty result instead of fabricated verified prospects', async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ prospects: [], total: 0 });
  expect(mocks.contacts.mock.calls[0][0].where.tenantId).toBe('t');
});
it('does not claim unverified saved contacts are verified decision makers', async () => {
  mocks.contacts.mockResolvedValue([{ id: 'c', name: 'Example', email: 'person@example.com', company: 'Example' }]);
  const data = await (await POST(request())).json();
  expect(data.prospects[0]).toMatchObject({ verification: 'unknown', title: '' });
});
it('reports unavailable storage rather than returning a successful empty search', async () => {
  mocks.contacts.mockRejectedValue(new Error('Database unavailable'));
  expect((await POST(request())).status).toBe(503);
});
it('rejects unauthenticated directory searches', async () => {
  mocks.user.mockResolvedValue(null);
  expect((await POST(request())).status).toBe(403);
  expect(mocks.contacts).not.toHaveBeenCalled();
});
