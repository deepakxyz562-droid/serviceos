import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({ auth: vi.fn(), credential: vi.fn(), cookieGet: vi.fn(), cookieDelete: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getAuthUser: m.auth }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: m.cookieGet, delete: m.cookieDelete }) }));
vi.mock('@/lib/db', () => ({ db: { integrationCredential: { findFirst: m.credential } } }));
import { GET as connect } from '@/app/api/oauth/[provider]/connect/route';
import { GET as callback } from '@/app/api/oauth/[provider]/callback/route';
const context = { params: Promise.resolve({ provider: 'instagram' }) };
describe('channel OAuth session binding', () => {
  beforeEach(() => { vi.resetAllMocks(); m.auth.mockResolvedValue({ id: 'owner', tenantId: 'mine', role: 'owner' }); m.credential.mockResolvedValue({ clientId: 'app', clientSecret: 'secret' }); });
  it('starts a messaging-specific callback with an unpredictable HTTP-only state cookie', async () => {
    const res = await connect(new NextRequest('https://fieseros.com/api/oauth/instagram/connect'), context);
    const location = new URL(res.headers.get('location')!);
    expect(location.searchParams.get('redirect_uri')).toContain('/instagram/messaging-callback');
    const state = JSON.parse(Buffer.from(location.searchParams.get('state')!, 'base64url').toString());
    expect(state).toMatchObject({ tenantId: 'mine', userId: 'owner', provider: 'instagram' });
    expect(state.nonce).toHaveLength(64);
    expect(res.headers.get('set-cookie')).toContain('HttpOnly');
  });
  it('rejects forged state even if tenant and timestamp look valid', async () => {
    const state = Buffer.from(JSON.stringify({ tenantId: 'mine', userId: 'owner', provider: 'instagram', ts: Date.now() })).toString('base64url');
    const res = await callback(new NextRequest(`https://fieseros.com/api/oauth/instagram/messaging-callback?code=fake&state=${state}`), context);
    expect(await res.text()).toContain('Connection session is invalid');
    expect(m.credential).not.toHaveBeenCalled();
  });
  it('rejects a callback from a different signed-in business even with the cookie', async () => {
    const state = Buffer.from(JSON.stringify({ tenantId: 'other', userId: 'owner', provider: 'instagram', ts: Date.now() })).toString('base64url');
    m.cookieGet.mockReturnValue({ value: state });
    const res = await callback(new NextRequest(`https://fieseros.com/api/oauth/instagram/messaging-callback?code=fake&state=${state}`), context);
    expect(await res.text()).toContain('Provider mismatch'); expect(m.credential).not.toHaveBeenCalled(); expect(m.cookieDelete).toHaveBeenCalled();
  });
  it('escapes provider error text in HTML', async () => {
    const res = await callback(new NextRequest('https://fieseros.com/api/oauth/instagram/messaging-callback?error=%3Cscript%3Ebad%3C%2Fscript%3E'), context);
    const body = await res.text(); expect(body).not.toContain('<script>bad</script>'); expect(body).toContain('&lt;script&gt;');
  });
});
