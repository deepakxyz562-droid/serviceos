import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({ issue: vi.fn(), find: vi.fn(), update: vi.fn(), resolve: vi.fn(), verify: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getAppUrl: () => 'https://fieseros.com', issueAuthTokens: m.issue, getRefreshSessionMetadata: () => ({}) }));
vi.mock('@/lib/db', () => ({ db: { user: { findUnique: m.find, update: m.update } } }));
vi.mock('@/lib/rate-limit', () => ({ applyRateLimit: () => null, authLimiter: {}, oauthLimiter: { reset: vi.fn() }, getClientIp: () => '127.0.0.1', rateLimitResponse: vi.fn() }));
vi.mock('@/lib/quote-flow-google-auth', () => ({ verifyGoogleToken: m.verify }));
vi.mock('@/lib/bgos-mobile-account', () => ({ resolveBgosMobileAccount: m.resolve }));
vi.mock('@/lib/product-access', () => ({ activateProductWorkspace: vi.fn(), ProductAccessError: class extends Error {} }));
import { GET as start } from '@/app/api/bgos/mobile-auth/google/route';
import { GET as callback } from '@/app/api/bgos/mobile-auth/callback/route';
import { POST as exchange } from '@/app/api/bgos/mobile-auth/exchange/route';
import { MOBILE_COOKIE, challengeFor, randomVerifier, sealMobileState } from '@/lib/bgos-mobile-auth';
const verifier = 'v'.repeat(64);
const makeState = () => ({ nonce: randomVerifier(), challenge: challengeFor(verifier), verifier: randomVerifier(), expires: Date.now() + 60000 });
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('GOOGLE_CLIENT_ID', 'client'); vi.stubEnv('GOOGLE_CLIENT_SECRET', 'secret'); vi.stubEnv('SOCIAL_CRYPTO_KEY', 'key');
  m.verify.mockResolvedValue({ email: 'owner@example.com', sub: 'google-id' });
  m.find.mockResolvedValue({ id: 'u', email: 'owner@example.com', name: 'Owner', role: 'owner', isActive: true, workspaceId: 'bgos', authProvider: 'google', authProviderId: 'google-id' });
  m.resolve.mockResolvedValue({ user: { role: 'owner', tenantId: 'tenant', workspaceId: 'bgos' }, workspace: { id: 'bgos', productType: 'bgos' } });
  m.issue.mockResolvedValue({ accessToken: 'session', refreshToken: 'refresh' });
});
it('starts on canonical host and sets a cookie-bound state with PKCE', async () => {
  const url = `https://fieseros.com/api/bgos/mobile-auth/google?challenge=${challengeFor(verifier)}`;
  const res = await start(new NextRequest(url));
  const location = new URL(res.headers.get('location')!);
  expect(location.hostname).toBe('accounts.google.com');
  expect(location.searchParams.get('code_challenge_method')).toBe('S256');
  expect(res.cookies.get(MOBILE_COOKIE)?.value).toBeTruthy();
});
it('proceeds directly to Google OAuth when behind a reverse proxy with internal port/proto', async () => {
  const internalUrl = `http://127.0.0.1:3000/api/bgos/mobile-auth/google?challenge=${challengeFor(verifier)}`;
  const req = new NextRequest(internalUrl, {
    headers: {
      'host': '127.0.0.1:3000',
      'x-forwarded-host': 'fieseros.com',
      'x-forwarded-proto': 'https',
    },
  });
  const res = await start(req);
  const location = new URL(res.headers.get('location')!);
  expect(location.hostname).toBe('accounts.google.com');
});
it('redirects non-canonical host to canonical host', async () => {
  const url = `https://other-domain.com/api/bgos/mobile-auth/google?challenge=${challengeFor(verifier)}`;
  const res = await start(new NextRequest(url));
  expect(res.status).toBe(308);
  const location = new URL(res.headers.get('location')!);
  expect(location.hostname).toBe('fieseros.com');
  expect(location.searchParams.get('challenge')).toBe(challengeFor(verifier));
});
it('rejects unsolicited callback and never redirects session tokens', async () => {
  const res = await callback(new NextRequest('https://fieseros.com/api/bgos/mobile-auth/callback?code=abc&state=anything'));
  expect(res.headers.get('location')).toBe('bgos://auth-callback?error=invalid_state');
});
it('returns an encrypted ticket only when browser state matches', async () => {
  const state = makeState();
  const req = new NextRequest(`https://fieseros.com/api/bgos/mobile-auth/callback?code=abc&state=${state.nonce}`, { headers: { Cookie: `${MOBILE_COOKIE}=${sealMobileState(state)}` } });
  const res = await callback(req);
  const url = new URL(res.headers.get('location')!);
  expect(url.searchParams.has('ticket')).toBe(true);
  expect(url.searchParams.has('token')).toBe(false);
  expect(res.headers.get('referrer-policy')).toBe('no-referrer');
});
it('requires app proof before consuming a Google code and issues BGOS session once', async () => {
  const ticket = sealMobileState({ ...makeState(), code: 'code' });
  const req = (value: string) => new NextRequest('https://fieseros.com/api/bgos/mobile-auth/exchange', { method: 'POST', body: JSON.stringify({ ticket, verifier: value }), headers: { 'Content-Type': 'application/json' } });
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ id_token: 'verified-google-token' }))).mockResolvedValueOnce(new Response('{}', { status: 400 }));
  vi.stubGlobal('fetch', fetcher);
  expect((await exchange(req('x'.repeat(64)))).status).toBe(401);
  expect(fetcher).not.toHaveBeenCalled();
  const res = await exchange(req(verifier));
  expect(res.status).toBe(200);
  expect((await res.json()).workspace.productType).toBe('bgos');
  expect((await exchange(req(verifier))).status).toBe(401);
  expect(m.issue).toHaveBeenCalledOnce();
});
