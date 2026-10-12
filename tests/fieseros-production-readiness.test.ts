import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const mocks = vi.hoisted(() => ({
  issueAuthTokens: vi.fn(),
  userFindUnique: vi.fn(),
  userCreate: vi.fn(),
  userUpdate: vi.fn(),
  tenantFindUnique: vi.fn(),
  tenantFindFirst: vi.fn(),
  tenantCreate: vi.fn(),
  workspaceFindFirst: vi.fn(),
  mcFindUnique: vi.fn(),
  mcCreate: vi.fn(),
  mcUpdate: vi.fn(),
  customerFindFirst: vi.fn(),
  customerCreate: vi.fn(),
  customerUpdate: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getAppUrl: () => 'https://fieseros.com',
  issueAuthTokens: mocks.issueAuthTokens,
  getRefreshSessionMetadata: () => ({ ipAddress: '127.0.0.1', userAgent: 'vitest' }),
  setAuthCookies: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: mocks.userFindUnique,
      create: mocks.userCreate,
      update: mocks.userUpdate,
    },
    tenant: {
      findUnique: mocks.tenantFindUnique,
      findFirst: mocks.tenantFindFirst,
      create: mocks.tenantCreate,
    },
    workspace: {
      findFirst: mocks.workspaceFindFirst,
    },
    marketplaceCustomer: {
      findUnique: mocks.mcFindUnique,
      create: mocks.mcCreate,
      update: mocks.mcUpdate,
    },
    customer: {
      findFirst: mocks.customerFindFirst,
      create: mocks.customerCreate,
      update: mocks.customerUpdate,
    },
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  applyRateLimit: () => null,
  authLimiter: {},
  oauthLimiter: { reset: vi.fn() },
  getClientIp: () => '127.0.0.1',
  rateLimitResponse: vi.fn(),
}));

import { GET as googleStart } from '@/app/api/auth/google/route';
import { GET as googleCallback } from '@/app/api/auth/google/callback/route';
import { productForHostname } from '../shared/product-context';

describe('Fieseros Production Readiness — Subdomain, Google OAuth, and Mobile Apps', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('GOOGLE_CLIENT_ID', 'test-google-client-id');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-google-client-secret');
    mocks.issueAuthTokens.mockResolvedValue({
      accessToken: 'jwt-access-token-123',
      refreshToken: 'jwt-refresh-token-456',
    });
  });

  describe('1. 5-Subdomain Routing (productForHostname)', () => {
    it('routes fieseros.com, app.fieseros.com, pro.fieseros.com, business.fieseros.com, and admin.fieseros.com accurately', () => {
      expect(productForHostname('fieseros.com')).toBe('marketing');
      expect(productForHostname('app.fieseros.com')).toBe('customer');
      expect(productForHostname('pro.fieseros.com')).toBe('pro');
      expect(productForHostname('business.fieseros.com')).toBe('crm');
      expect(productForHostname('admin.fieseros.com')).toBe('admin');
    });
  });

  describe('2. Google OAuth Initiation (/api/auth/google)', () => {
    it('encodes app=customer and mobile deep link redirect fieseros://auth-callback in OAuth state', async () => {
      const req = new NextRequest(
        'https://fieseros.com/api/auth/google?app=customer&redirect=fieseros://auth-callback'
      );
      const res = await googleStart(req);
      const location = new URL(res.headers.get('location')!);
      expect(location.hostname).toBe('accounts.google.com');

      const stateRaw = location.searchParams.get('state')!;
      const decodedState = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8'));
      expect(decodedState.app).toBe('customer');
      expect(decodedState.redirect).toBe('fieseros://auth-callback');
    });

    it('encodes app=pro and mobile deep link redirect fieserospro://auth-callback in OAuth state', async () => {
      const req = new NextRequest(
        'https://fieseros.com/api/auth/google?app=pro&redirect=fieserospro://auth-callback'
      );
      const res = await googleStart(req);
      const location = new URL(res.headers.get('location')!);
      const stateRaw = location.searchParams.get('state')!;
      const decodedState = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8'));
      expect(decodedState.app).toBe('pro');
      expect(decodedState.redirect).toBe('fieserospro://auth-callback');
    });
  });

  describe('3. Google OAuth Callback (/api/auth/google/callback)', () => {
    it('creates a MarketplaceCustomer (no fake CRM workspace) and redirects to fieseros://auth-callback for mobile-customer', async () => {
      const statePayload = Buffer.from(
        JSON.stringify({
          csrf: 'csrf-token-1',
          redirect: 'fieseros://auth-callback',
          app: 'customer',
        })
      ).toString('base64url');

      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ access_token: 'google-access-token' }), { status: 200 })
          )
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify({
                id: 'google-sub-1',
                email: 'rahul.customer@example.com',
                verified_email: true,
                name: 'Rahul Customer',
                picture: 'https://example.com/pic.jpg',
              }),
              { status: 200 }
            )
          )
      );

      mocks.mcFindUnique.mockResolvedValue(null);
      mocks.mcCreate.mockResolvedValue({
        id: 'mc-customer-1',
        email: 'rahul.customer@example.com',
        name: 'Rahul Customer',
        sessionToken: 'mc-session-xyz',
      });
      mocks.customerFindFirst.mockResolvedValue(null);
      mocks.customerCreate.mockResolvedValue({
        id: 'mc-customer-1',
        email: 'rahul.customer@example.com',
        name: 'Rahul Customer',
      });

      const req = new NextRequest(
        `https://fieseros.com/api/auth/google/callback?code=valid-code&state=${statePayload}`,
        {
          headers: {
            Cookie: 'google_oauth_state=csrf-token-1',
          },
        }
      );

      const res = await googleCallback(req);
      const redirectLocation = res.headers.get('location')!;
      expect(redirectLocation.startsWith('fieseros://auth-callback?')).toBe(true);
      const redirectUrl = new URL(redirectLocation);
      expect(redirectUrl.searchParams.get('token')).toBe('jwt-access-token-123');
      expect(redirectUrl.searchParams.get('role')).toBe('customer');
      expect(mocks.tenantCreate).not.toHaveBeenCalled();
    });

    it('redirects web customer Google login back to /app?google_login=success and sets mc_session cookie', async () => {
      const statePayload = Buffer.from(
        JSON.stringify({
          csrf: 'csrf-token-2',
          redirect: '/app',
          app: 'customer',
        })
      ).toString('base64url');

      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ access_token: 'google-access-token' }), { status: 200 })
          )
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify({
                id: 'google-sub-2',
                email: 'priya.customer@example.com',
                verified_email: true,
                name: 'Priya Sharma',
              }),
              { status: 200 }
            )
          )
      );

      mocks.mcFindUnique.mockResolvedValue({
        id: 'mc-customer-2',
        email: 'priya.customer@example.com',
        name: 'Priya Sharma',
      });
      mocks.mcUpdate.mockResolvedValue({
        id: 'mc-customer-2',
        email: 'priya.customer@example.com',
        name: 'Priya Sharma',
      });
      mocks.customerFindFirst.mockResolvedValue({
        id: 'mc-customer-2',
        email: 'priya.customer@example.com',
        name: 'Priya Sharma',
      });

      const req = new NextRequest(
        `https://fieseros.com/api/auth/google/callback?code=valid-code&state=${statePayload}`,
        {
          headers: {
            Cookie: 'google_oauth_state=csrf-token-2',
          },
        }
      );

      const res = await googleCallback(req);
      const redirectLocation = res.headers.get('location')!;
      expect(redirectLocation).toBe('https://fieseros.com/app?google_login=success');
      expect(res.cookies.get('mc_session')?.value).toBeTruthy();
    });

    it('redirects mobile-pro Google login to fieserospro://auth-callback with token and role', async () => {
      const statePayload = Buffer.from(
        JSON.stringify({
          csrf: 'csrf-token-3',
          redirect: 'fieserospro://auth-callback',
          app: 'pro',
        })
      ).toString('base64url');

      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ access_token: 'google-access-token' }), { status: 200 })
          )
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify({
                id: 'google-sub-3',
                email: 'amit.pro@example.com',
                verified_email: true,
                name: 'Amit Pro',
              }),
              { status: 200 }
            )
          )
      );

      mocks.userFindUnique.mockResolvedValue({
        id: 'pro-user-1',
        email: 'amit.pro@example.com',
        name: 'Amit Pro',
        role: 'owner',
        tenantId: 'tenant-pro-1',
        isActive: true,
        authProvider: 'google',
        authProviderId: 'google-sub-3',
        tenant: { id: 'tenant-pro-1', onboardingCompleted: false },
      });

      const req = new NextRequest(
        `https://fieseros.com/api/auth/google/callback?code=valid-code&state=${statePayload}`,
        {
          headers: {
            Cookie: 'google_oauth_state=csrf-token-3',
          },
        }
      );

      const res = await googleCallback(req);
      const redirectLocation = res.headers.get('location')!;
      expect(redirectLocation.startsWith('fieserospro://auth-callback?')).toBe(true);
      const redirectUrl = new URL(redirectLocation);
      expect(redirectUrl.searchParams.get('token')).toBe('jwt-access-token-123');
      expect(redirectUrl.searchParams.get('role')).toBe('owner');
    });
  });

  describe('4. Standalone Mobile App Separation (mobile-customer & mobile-pro)', () => {
    const rootDir = process.cwd();

    it('verifies mobile-customer has isolated package name, scheme, google-services.json, and auth-callback route', () => {
      const appConfig = readFileSync(join(rootDir, 'mobile-customer/app.config.ts'), 'utf8');
      expect(appConfig).toContain("const SCHEME = 'fieseros'");
      expect(appConfig).toContain('com.fieseros.customer');

      const googleServices = JSON.parse(
        readFileSync(join(rootDir, 'mobile-customer/google-services.json'), 'utf8')
      );
      const pkgNames = googleServices.client.map(
        (c: any) => c.client_info?.android_client_info?.package_name
      );
      expect(pkgNames).toContain('com.fieseros.customer');
      expect(existsSync(join(rootDir, 'mobile-customer/app/auth-callback.tsx'))).toBe(true);
    });

    it('verifies mobile-pro has isolated package name, scheme, google-services.json, and auth-callback route', () => {
      const appConfig = readFileSync(join(rootDir, 'mobile-pro/app.config.ts'), 'utf8');
      expect(appConfig).toContain("const SCHEME = 'fieserospro'");
      expect(appConfig).toContain('com.fieseros.pro');

      const googleServices = JSON.parse(
        readFileSync(join(rootDir, 'mobile-pro/google-services.json'), 'utf8')
      );
      const pkgNames = googleServices.client.map(
        (c: any) => c.client_info?.android_client_info?.package_name
      );
      expect(pkgNames).toContain('com.fieseros.pro');
      expect(existsSync(join(rootDir, 'mobile-pro/app/auth-callback.tsx'))).toBe(true);
    });
  });
});
