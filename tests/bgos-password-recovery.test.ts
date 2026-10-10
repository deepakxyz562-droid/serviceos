import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({ user: vi.fn(), invitation: vi.fn(), email: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { user: { findUnique: m.user }, customer: { findFirst: async () => null }, tenant: { findUnique: async () => ({ slug: 'business' }) }, employee: { findFirst: async () => null }, invitation: { create: m.invitation, updateMany: async () => ({ count: 1 }) } } }));
vi.mock('@/lib/auth', () => ({ getAppUrl: () => 'https://fieseros.com' }));
vi.mock('@/lib/email-send', () => ({ sendEmail: m.email }));
vi.mock('@/lib/rate-limit', () => ({ passwordResetLimiter: {}, applyRateLimit: () => null, rateLimitResponse: vi.fn() }));
import { POST } from '@/app/api/auth/request-reset/route';
beforeEach(() => { vi.resetAllMocks(); m.user.mockResolvedValue({ id: 'u', email: 'owner@example.com', isActive: true, tenantId: 't', workspaceId: 'w', role: 'owner' }); m.email.mockResolvedValue({ success: true }); });
const req = () => new NextRequest('https://bgos.fieseros.com/api/auth/request-reset', { method: 'POST', body: JSON.stringify({ email: 'OWNER@example.com', slug: 'attacker?redirect=bad' }) });
it('sends the existing reset flow via transactional email without exposing the token', async () => {
  const res = await POST(req());
  expect(res.status).toBe(200);
  expect(m.email).toHaveBeenCalledWith(expect.objectContaining({ to: 'owner@example.com', usageType: 'transactional', text: expect.stringContaining('https://fieseros.com/business/accept-invite?token=') }));
  const body = await res.json();
  expect(body.resetUrl).toBeUndefined();
  expect(body.expiresAt).toBeUndefined();
});
it('uses the same public response for an unknown address', async () => {
  const known = await (await POST(req())).json();
  m.user.mockResolvedValue(null);
  expect(await (await POST(req())).json()).toEqual(known);
});
