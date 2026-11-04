import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const m = vi.hoisted(() => ({
  findAuthUser: vi.fn(),
  findCred: vi.fn(),
  findSocialAccount: vi.fn(),
  upsertSocialAccount: vi.fn(),
  findTenant: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: m.findAuthUser,
  verifyToken: vi.fn(),
  COOKIE_OPTIONS: { name: 'sb-access-token', path: '/', httpOnly: true },
}));

vi.mock('@/lib/db', () => ({
  db: {
    integrationCredential: { findFirst: m.findCred },
    socialAccount: { findFirst: m.findSocialAccount, upsert: m.upsertSocialAccount },
    tenant: { findUnique: m.findTenant },
  },
}));

vi.mock('@/lib/audit', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

import { GET as startGbpConnect } from '@/app/api/oauth/googlebusiness/route';
import { GET as gbpCallback } from '@/app/api/oauth/googlebusiness/callback/route';

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('GOOGLE_BUSINESS_CLIENT_ID', 'test-gbp-client-id');
  vi.stubEnv('GOOGLE_BUSINESS_CLIENT_SECRET', 'test-gbp-client-secret');
  vi.stubEnv('NEXTAUTH_SECRET', 'test-secret');
  m.findAuthUser.mockResolvedValue({
    id: 'user-1',
    email: 'user@example.com',
    role: 'owner',
    tenantId: 'tenant-1',
  });
  m.findCred.mockResolvedValue({
    id: 'cred-1',
    clientId: 'test-gbp-client-id',
    clientSecret: 'test-gbp-client-secret',
    redirectUri: 'https://fieseros.com/api/oauth/googlebusiness/callback',
    scopes: 'https://www.googleapis.com/auth/business.manage',
  });
});

it('packs isMobile and mobileReturnUri into OAuth state when client=mobile is passed', async () => {
  const req = new NextRequest(
    'https://fieseros.com/api/oauth/googlebusiness?product=bgos&client=mobile&redirectUri=bgos%3A%2F%2Fgbp-callback',
  );
  const res = await startGbpConnect(req);
  expect(res.status).toBe(307);

  const location = new URL(res.headers.get('location')!);
  expect(location.hostname).toBe('accounts.google.com');

  const stateParam = location.searchParams.get('state');
  expect(stateParam).toBeTruthy();

  const state = JSON.parse(Buffer.from(stateParam!, 'base64url').toString());
  expect(state.isMobile).toBe(true);
  expect(state.mobileReturnUri).toBe('bgos://gbp-callback');
  expect(state.returnProduct).toBe('bgos');
  expect(state.tenantId).toBe('tenant-1');
});

it('redirects to bgos://gbp-callback?error=no_gbp_accounts when mobile user has 0 GBP accounts', async () => {
  const stateObj = {
    tenantId: 'tenant-1',
    userId: 'user-1',
    csrf: 'test-csrf-123',
    expires: Date.now() + 60000,
    isMobile: true,
    mobileReturnUri: 'bgos://gbp-callback',
    returnProduct: 'bgos',
  };
  const stateParam = Buffer.from(JSON.stringify(stateObj)).toString('base64url');

  // Mock token exchange fetch returning valid access_token, then listGbpAccounts returning 0 accounts
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (url.includes('oauth2.googleapis.com/token')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            access_token: 'valid-test-access-token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    }
    if (url.includes('oauth2/v3/userinfo')) {
      return Promise.resolve(
        new Response(JSON.stringify({ email: 'user@example.com', name: 'Test User' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }
    if (url.includes('mybusinessaccountmanagement.googleapis.com/v1/accounts')) {
      return Promise.resolve(
        new Response(JSON.stringify({ accounts: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }
    return Promise.resolve(new Response('Not Found', { status: 404 }));
  });
  vi.stubGlobal('fetch', fetchMock);

  const req = new NextRequest(
    `https://fieseros.com/api/oauth/googlebusiness/callback?code=mock-code&state=${stateParam}`,
    {
      headers: {
        Cookie: 'gbp_oauth_csrf=test-csrf-123',
      },
    },
  );

  const res = await gbpCallback(req);
  expect(res.status).toBe(307);

  const location = res.headers.get('location');
  expect(location).toBe('bgos://gbp-callback?error=no_gbp_accounts');
});

it('redirects to bgos://gbp-callback?google=connected when mobile user connects valid GBP account', async () => {
  const stateObj = {
    tenantId: 'tenant-1',
    userId: 'user-1',
    csrf: 'test-csrf-123',
    expires: Date.now() + 60000,
    isMobile: true,
    mobileReturnUri: 'bgos://gbp-callback',
    returnProduct: 'bgos',
  };
  const stateParam = Buffer.from(JSON.stringify(stateObj)).toString('base64url');

  m.upsertSocialAccount.mockResolvedValue({ id: 'social-1', accountName: 'My Business' });

  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (url.includes('oauth2.googleapis.com/token')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            access_token: 'valid-test-access-token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    }
    if (url.includes('oauth2/v3/userinfo')) {
      return Promise.resolve(
        new Response(JSON.stringify({ email: 'user@example.com', name: 'Test User' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }
    if (url.endsWith('/v1/accounts')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            accounts: [{ name: 'accounts/12345', accountName: 'Deepak Chandra Business' }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    }
    if (url.includes('/locations')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            locations: [
              {
                name: 'locations/67890',
                title: 'Deepak Chandra Business - Main',
                storefrontAddress: { addressLines: ['123 Main St'] },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    }
    return Promise.resolve(new Response('Not Found', { status: 404 }));
  });
  vi.stubGlobal('fetch', fetchMock);

  const req = new NextRequest(
    `https://fieseros.com/api/oauth/googlebusiness/callback?code=mock-code&state=${stateParam}`,
    {
      headers: {
        Cookie: 'gbp_oauth_csrf=test-csrf-123',
      },
    },
  );

  const res = await gbpCallback(req);
  expect(res.status).toBe(307);

  const location = res.headers.get('location');
  expect(location).toBe('bgos://gbp-callback?google=connected');
  expect(m.upsertSocialAccount).toHaveBeenCalled();
});

it('renders error page with "Return to BGOS App" linking to bgos://setup for mobile when unexpected error happens', async () => {
  const stateObj = {
    tenantId: 'tenant-1',
    userId: 'user-1',
    csrf: 'test-csrf-123',
    expires: Date.now() + 60000,
    isMobile: true,
    mobileReturnUri: 'bgos://gbp-callback',
    returnProduct: 'bgos',
  };
  const stateParam = Buffer.from(JSON.stringify(stateObj)).toString('base64url');

  // Trigger token exchange failure
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (url.includes('oauth2.googleapis.com/token')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            error: 'invalid_client',
            error_description: 'Client secret invalid',
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    }
    return Promise.resolve(new Response('Not Found', { status: 404 }));
  });
  vi.stubGlobal('fetch', fetchMock);

  const req = new NextRequest(
    `https://fieseros.com/api/oauth/googlebusiness/callback?code=bad-code&state=${stateParam}`,
    {
      headers: {
        Cookie: 'gbp_oauth_csrf=test-csrf-123',
      },
    },
  );

  const res = await gbpCallback(req);
  expect(res.status).toBe(200);

  const html = await res.text();
  expect(html).toContain('Return to BGOS App');
  expect(html).toContain('href="bgos://gbp-callback"');
  expect(html).not.toContain('href="https://fieseros.com/?view=reviews"');
});

it('sanitizes returnView=reviews to growth when starting connect from mobile', async () => {
  const req = new NextRequest(
    'https://fieseros.com/api/oauth/googlebusiness?product=bgos&client=mobile&returnView=reviews&redirectUri=bgos%3A%2F%2Fgbp-callback',
  );
  const res = await startGbpConnect(req);
  expect(res.status).toBe(307);

  const location = new URL(res.headers.get('location')!);
  const stateParam = location.searchParams.get('state');
  expect(stateParam).toBeTruthy();

  const state = JSON.parse(Buffer.from(stateParam!, 'base64url').toString());
  expect(state.isMobile).toBe(true);
  expect(state.returnView).toBe('growth');
  expect(state.returnView).not.toBe('reviews');
});

it('sanitizes returnView=reviews on web BGOS fallback to dashboard instead of reviews', async () => {
  const stateObj = {
    tenantId: 'tenant-1',
    userId: 'user-1',
    csrf: 'test-csrf-123',
    expires: Date.now() + 60000,
    isMobile: false,
    returnProduct: 'bgos',
    returnView: 'reviews',
    originHost: 'https://fieseros.com',
  };
  const stateParam = Buffer.from(JSON.stringify(stateObj)).toString('base64url');

  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (url.includes('oauth2.googleapis.com/token')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            error: 'invalid_client',
            error_description: 'Client secret invalid',
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    }
    return Promise.resolve(new Response('Not Found', { status: 404 }));
  });
  vi.stubGlobal('fetch', fetchMock);

  const req = new NextRequest(
    `https://fieseros.com/api/oauth/googlebusiness/callback?code=bad-code&state=${stateParam}`,
    {
      headers: {
        Cookie: 'gbp_oauth_csrf=test-csrf-123',
      },
    },
  );

  const res = await gbpCallback(req);
  const html = await res.text();
  expect(html).toContain('Back to Dashboard');
  expect(html).toContain('href="https://fieseros.com/?view=dashboard&product=bgos"');
  expect(html).not.toContain('view=reviews');
});

it('preserves returnView=select-profile and redirectUri=bgos://select-profile for select-profile mobile screen', async () => {
  const req = new NextRequest(
    'https://fieseros.com/api/oauth/googlebusiness?product=bgos&client=mobile&returnView=select-profile&redirectUri=bgos%3A%2F%2Fselect-profile',
  );
  const res = await startGbpConnect(req);
  expect(res.status).toBe(307);

  const location = new URL(res.headers.get('location')!);
  const stateParam = location.searchParams.get('state');
  expect(stateParam).toBeTruthy();

  const state = JSON.parse(Buffer.from(stateParam!, 'base64url').toString());
  expect(state.isMobile).toBe(true);
  expect(state.returnView).toBe('select-profile');
  expect(state.mobileReturnUri).toBe('bgos://select-profile');
});
