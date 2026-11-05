import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({ create: vi.fn(), findUnique: vi.fn(), accounts: vi.fn(), publish: vi.fn(), after: vi.fn(), renderDesign: vi.fn() }));
vi.mock('next/server', async original => ({ ...await original<typeof import('next/server')>(), after: m.after }));
vi.mock('@/lib/auth', () => ({ getAuthUser: async () => ({ id: 'u', tenantId: 't' }) }));
vi.mock('@/lib/db', () => ({ db: { socialPost: { create: m.create, findUnique: m.findUnique }, socialAccount: { findMany: m.accounts } } }));
vi.mock('@/lib/social/publisher', () => ({ publishPost: m.publish }));
vi.mock('@/lib/designs/render', () => ({ renderDesign: m.renderDesign }));
vi.mock('@/lib/activity-log', () => ({ logActivity: async () => {} }));
import { POST } from '@/app/api/social/posts/route';
beforeEach(() => {
  vi.resetAllMocks();
  m.accounts.mockResolvedValue([{ id: 'a', platform: 'facebook' }]);
  m.findUnique.mockResolvedValue(null);
  m.create.mockImplementation(async ({ data }) => ({ ...data, id: data.id || 'post' }));
});
const request = (extra = {}, key = 'request-key-123456789') => new NextRequest('https://bgos.fieseros.com/api/social/posts', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify({ content: 'Business update', targets: [{ socialAccountId: 'a', platform: 'facebook' }], status: 'published', ...extra }) });
it('queues publish-now so the publisher can claim it and cron can recover it', async () => {
  const res = await POST(request());
  expect(res.status).toBe(201);
  expect(m.create.mock.calls[0][0].data).toMatchObject({ status: 'scheduled', scheduledAt: expect.any(Date) });
  expect(m.after).toHaveBeenCalledOnce();
  await m.after.mock.calls[0][0]();
  expect(m.publish).toHaveBeenCalledWith(expect.stringMatching(/^sp_/));
});
it('returns the existing post on a retry without republishing', async () => {
  m.findUnique.mockResolvedValue({ id: 'existing', mediaUrls: '[]', publishTargets: '[]' });
  const res = await POST(request());
  expect((await res.json()).data.id).toBe('existing');
  expect(m.create).not.toHaveBeenCalled();
  expect(m.after).not.toHaveBeenCalled();
});
it('rejects a past schedule and account/platform mismatch', async () => {
  expect((await POST(request({ status: 'scheduled', scheduledAt: '2020-01-01' }))).status).toBe(400);
  expect((await POST(request({ targets: [{ socialAccountId: 'a', platform: 'instagram' }] }))).status).toBe(400);
  expect(m.create).not.toHaveBeenCalled();
});
it('renders design into a composite PNG when publishing a poster', async () => {
  m.renderDesign.mockResolvedValue({ imageUrl: 'https://assets.example.com/designs/rendered.png' });
  const dummyDesign = { version: 1, width: 1080, height: 1080, background: '#000000', layers: [] };
  const res = await POST(request({ isPoster: true, mediaUrls: ['https://images.unsplash.com/raw-photo.jpg'], design: dummyDesign }, 'key-poster-12345678'));
  expect(res.status).toBe(201);
  expect(m.renderDesign).toHaveBeenCalled();
  expect(m.create.mock.calls[0][0].data.mediaUrls).toBe(JSON.stringify(['https://assets.example.com/designs/rendered.png']));
});
it('bypasses renderDesign when mediaUrl is already an exported design graphic', async () => {
  const dummyDesign = { version: 1, width: 1080, height: 1080, background: '#000000', layers: [] };
  const res = await POST(request({ isPoster: true, isPreRendered: true, mediaUrls: ['https://assets.example.com/designs/already-rendered.png'], design: dummyDesign }, 'key-poster-already-123'));
  expect(res.status).toBe(201);
  expect(m.renderDesign).not.toHaveBeenCalled();
  expect(m.create.mock.calls[0][0].data.mediaUrls).toBe(JSON.stringify(['https://assets.example.com/designs/already-rendered.png']));
});
it('keeps a failed design export out of the publishing queue', async () => {
  m.renderDesign.mockRejectedValue(new Error('Font download timeout'));
  const dummyDesign = { version: 1, width: 1080, height: 1080, background: '#000000', layers: [] };
  const res = await POST(request({ mediaUrls: ['https://example.com/designs/source.jpg'], design: dummyDesign }, 'key-fallback-12345678'));
  expect(res.status).toBe(503);
  expect(m.renderDesign).toHaveBeenCalled();
  expect(m.create).not.toHaveBeenCalled();
  expect(m.after).not.toHaveBeenCalled();
});
