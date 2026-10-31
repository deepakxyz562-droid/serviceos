import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const m = vi.hoisted(() => ({
  findFirst: vi.fn(),
  getAuthUser: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    integrationCredential: { findFirst: m.findFirst },
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: m.getAuthUser,
  verifyToken: vi.fn(),
}));

import { GET as startFacebook } from '@/app/api/oauth/facebook/route';
import { GET as startInstagram } from '@/app/api/oauth/instagram/route';

beforeEach(() => {
  vi.resetAllMocks();
  m.getAuthUser.mockResolvedValue({
    id: 'user_123',
    email: 'test@fieseros.com',
    role: 'owner',
    tenantId: 'tenant_123',
  });
  m.findFirst.mockResolvedValue({
    id: 'cred_1',
    clientId: '2180370786060435',
    redirectUri: null,
    scopes: null,
    provider: 'facebook',
  });
});

it('uses bgos.fieseros.com host for redirect_uri when requested on bgos.fieseros.com', async () => {
  const req = new NextRequest('https://bgos.fieseros.com/api/oauth/facebook', {
    headers: { host: 'bgos.fieseros.com' },
  });

  const res = await startFacebook(req);
  expect(res.status).toBe(307);

  const location = new URL(res.headers.get('location')!);
  expect(location.hostname).toBe('www.facebook.com');
  expect(location.searchParams.get('client_id')).toBe('2180370786060435');
  expect(location.searchParams.get('redirect_uri')).toBe('https://bgos.fieseros.com/api/oauth/facebook/callback');

  const stateStr = Buffer.from(location.searchParams.get('state')!, 'base64url').toString('utf8');
  const state = JSON.parse(stateStr);
  expect(state.redirectUri).toBe('https://bgos.fieseros.com/api/oauth/facebook/callback');
  expect(state.tenantId).toBe('tenant_123');
});

it('uses fieseros.com host for redirect_uri when requested on fieseros.com', async () => {
  const req = new NextRequest('https://fieseros.com/api/oauth/facebook', {
    headers: { host: 'fieseros.com' },
  });

  const res = await startFacebook(req);
  expect(res.status).toBe(307);

  const location = new URL(res.headers.get('location')!);
  expect(location.searchParams.get('redirect_uri')).toBe('https://fieseros.com/api/oauth/facebook/callback');

  const stateStr = Buffer.from(location.searchParams.get('state')!, 'base64url').toString('utf8');
  const state = JSON.parse(stateStr);
  expect(state.redirectUri).toBe('https://fieseros.com/api/oauth/facebook/callback');
});

it('uses bgos.fieseros.com host for instagram redirect_uri and encodes into state', async () => {
  const req = new NextRequest('https://bgos.fieseros.com/api/oauth/instagram', {
    headers: { host: 'bgos.fieseros.com' },
  });

  const res = await startInstagram(req);
  expect(res.status).toBe(307);

  const location = new URL(res.headers.get('location')!);
  expect(location.searchParams.get('redirect_uri')).toBe('https://bgos.fieseros.com/api/oauth/instagram/callback');

  const stateStr = Buffer.from(location.searchParams.get('state')!, 'base64url').toString('utf8');
  const state = JSON.parse(stateStr);
  expect(state.redirectUri).toBe('https://bgos.fieseros.com/api/oauth/instagram/callback');
});
