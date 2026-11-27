import crypto from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetAuthUser = vi.fn();
const mockDb = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  tenant: {
    findUnique: vi.fn(),
  },
  invoice: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  formResponse: {
    deleteMany: vi.fn(),
  },
  formAgent: {
    findFirst: vi.fn(),
  },
  booking: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  socialAccount: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  subscription: {
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  billingEvent: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/activity-log', () => ({ logActivity: vi.fn(async () => {}) }));
vi.mock('@/lib/social/google-connection-state', () => ({
  invalidatePlacePayloadCacheForTenant: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({
  getAuthUser: (...args: any[]) => mockGetAuthUser(...args),
  hashPassword: vi.fn(async () => 'hashed'),
  issueAuthTokens: vi.fn(async () => ({ accessToken: 'a', refreshToken: 'r' })),
  getRefreshSessionMetadata: vi.fn(() => ({})),
  setAuthCookies: vi.fn(),
  getAppUrl: () => 'https://bgos.site',
}));
vi.mock('@/lib/creem', () => ({
  BGOS_CREEM_PLANS: {},
  getCreemConfig: vi.fn(async () => null),
  verifyCreemWebhookSignature: vi.fn(() => false),
}));
vi.mock('@/lib/rate-limit', () => ({
  oauthLimiter: {},
  applyRateLimit: () => null,
  rateLimitResponse: () => new Response('Rate limited', { status: 429 }),
  getClientIp: () => '127.0.0.1',
}));
vi.mock('@/lib/email-send', () => ({ sendEmail: vi.fn(async () => ({ ok: true })) }));

describe('P0 Security & Tenant Isolation Regression Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('SEC-01: verifies Apple JWKS RS256 signature and rejects unsigned/forged tokens', async () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwk = publicKey.export({ format: 'jwk' });
    (jwk as any).kid = 'apple-test-kid';
    (jwk as any).use = 'sig';
    (jwk as any).alg = 'RS256';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ keys: [jwk] }), { status: 200 }),
    );
    vi.stubEnv('APPLE_CLIENT_ID', 'com.bgos.app');

    const { verifyAppleIdentityToken } = await import('@/lib/bgos-apple-auth');

    const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'apple-test-kid' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        iss: 'https://appleid.apple.com',
        aud: 'com.bgos.app',
        sub: 'apple.sub.1',
        email: 'user@example.com',
        exp: Math.floor(Date.now() / 1000) + 600,
      }),
    ).toString('base64url');

    // Unsigned / forged signature must be rejected
    expect(await verifyAppleIdentityToken(`${header}.${payload}.forgedsig`)).toBeNull();

    // Properly signed RS256 token passes
    const sig = crypto
      .sign('RSA-SHA256', Buffer.from(`${header}.${payload}`, 'utf8'), privateKey)
      .toString('base64url');
    const verified = await verifyAppleIdentityToken(`${header}.${payload}.${sig}`);
    expect(verified).toEqual({ sub: 'apple.sub.1', email: 'user@example.com' });

    fetchSpy.mockRestore();
  });

  it('SEC-04: rejects Razorpay CRM invoice webhook without valid signature', async () => {
    const { POST } = await import('@/app/api/payments/webhook/razorpay/route');
    const req = new NextRequest('http://localhost:3000/api/payments/webhook/razorpay', {
      method: 'POST',
      body: JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_1',
              notes: { invoiceId: 'inv_1', tenantId: 'tenant_1' },
            },
          },
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(mockDb.invoice.update).not.toHaveBeenCalled();
  });

  it('SEC-05: blocks cross-tenant user overwrite in POST /api/users', async () => {
    mockGetAuthUser.mockResolvedValue({
      id: 'u_admin',
      tenantId: 'tenant_a',
      workspaceId: 'ws_a',
      role: 'owner',
    });
    mockDb.user.findUnique.mockResolvedValue({
      id: 'u_victim',
      email: 'victim@tenantb.com',
      tenantId: 'tenant_b',
      workspaceId: 'ws_b',
    });

    const { POST } = await import('@/app/api/users/route');
    const res = await POST(
      new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({ name: 'Hijacked', email: 'victim@tenantb.com', role: 'admin' }),
      }),
    );

    expect(res.status).toBe(409);
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });

  it('SEC-06: scopes DELETE /api/forms/responses strictly to caller tenant', async () => {
    mockGetAuthUser.mockResolvedValue({
      id: 'u_a',
      tenantId: 'tenant_a',
      role: 'owner',
      isSuperAdmin: false,
    });
    mockDb.formResponse.deleteMany.mockResolvedValue({ count: 0 });

    const { DELETE } = await import('@/app/api/forms/responses/route');
    const res = await DELETE(
      new NextRequest('http://localhost:3000/api/forms/responses?id=resp_other_tenant', {
        method: 'DELETE',
      }),
    );

    expect(res.status).toBe(404);
    expect(mockDb.formResponse.deleteMany).toHaveBeenCalledWith({
      where: {
        id: 'resp_other_tenant',
        OR: [{ tenantId: 'tenant_a' }, { form: { tenantId: 'tenant_a' } }],
      },
    });
  });

  it('SEC-07: isolates GET /api/forms/agents?id= by tenant and strips secrets for public slug', async () => {
    mockGetAuthUser.mockResolvedValue({
      id: 'u_a',
      tenantId: 'tenant_a',
      role: 'owner',
      isSuperAdmin: false,
    });
    mockDb.formAgent.findFirst.mockResolvedValue(null);

    const { GET } = await import('@/app/api/forms/agents/route');
    const byIdRes = await GET(
      new NextRequest('http://localhost:3000/api/forms/agents?id=agent_b'),
    );
    expect(byIdRes.status).toBe(404);
    expect(mockDb.formAgent.findFirst).toHaveBeenCalledWith({
      where: { id: 'agent_b', tenantId: 'tenant_a' },
    });

    // Public slug request without matching owner must strip tenantId & config secrets
    mockGetAuthUser.mockResolvedValue(null);
    mockDb.formAgent.findFirst.mockResolvedValue({
      id: 'agent_b',
      tenantId: 'tenant_b',
      slug: 'public-bot',
      name: 'Public Bot',
      roleTitle: 'Concierge',
      avatarUrl: 'https://bgos.site/a.png',
      statusText: 'Online',
      brandColor: '#009F50',
      voiceTone: 'friendly',
      welcomeGreeting: 'Hi!',
      greetingSubtitle: null,
      configJson: JSON.stringify({ internalApiSecret: 'secret-val', style: {} }),
      updatedAt: new Date('2026-11-27T00:00:00Z'),
    });
    const bySlugRes = await GET(
      new NextRequest('http://localhost:3000/api/forms/agents?slug=public-bot'),
    );
    expect(bySlugRes.status).toBe(200);
    const body = await bySlugRes.json();
    expect(body.agent.tenantId).toBeUndefined();
    expect(body.agent.internalApiSecret).toBeUndefined();
  });

  it('SEC-08: GET /api/bookings does not leak preview tenant records', async () => {
    mockGetAuthUser.mockResolvedValue({
      id: 'u_a',
      tenantId: 'tenant_a',
      workspaceId: 'ws_a',
      role: 'owner',
    });
    mockDb.booking.findMany.mockResolvedValue([]);
    mockDb.booking.count.mockResolvedValue(0);

    const { GET } = await import('@/app/api/bookings/route');
    const res = await GET(new NextRequest('http://localhost:3000/api/bookings'));
    expect(res.status).toBe(200);

    const callArg = mockDb.booking.findMany.mock.calls[0][0];
    expect(JSON.stringify(callArg.where)).not.toContain('preview');
  });

  it('P1-02: throws in production if social crypto key env vars are missing', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VITEST', '');
    vi.stubEnv('SOCIAL_CRYPTO_KEY', '');
    vi.stubEnv('ENCRYPTION_KEY', '');
    vi.stubEnv('NEXTAUTH_SECRET', '');

    const { encryptToken } = await import('@/lib/social/crypto');
    expect(() => encryptToken('secret-token')).toThrow(/must be set in production/i);

    vi.unstubAllEnvs();
  });

  it('P1-03: activateBgosSubscription skips duplicate captures by providerPaymentId', async () => {
    const existingEnd = new Date('2026-12-27T00:00:00Z');
    mockDb.subscription.findFirst.mockResolvedValue({
      id: 'sub_1',
      plan: 'growth',
      status: 'active',
      endDate: existingEnd,
    });
    mockDb.billingEvent.findFirst.mockResolvedValue({ id: 'be_existing' });

    const { activateBgosSubscription } = await import('@/lib/bgos-entitlement');
    const result = await activateBgosSubscription({
      tenantId: 'tenant_a',
      planCode: 'growth',
      provider: 'razorpay',
      providerPaymentId: 'pay_dup_123',
    });

    expect(result.plan).toBe('growth');
    expect(result.endDate).toEqual(existingEnd);
    expect(mockDb.subscription.update).not.toHaveBeenCalled();
    expect(mockDb.billingEvent.create).not.toHaveBeenCalled();
  });

  it('P1-04: DELETE /api/social/accounts revokes upstream Google token and clears stored credentials', async () => {
    vi.stubEnv('SOCIAL_CRYPTO_KEY', 'unit-test-crypto-key-32bytes-minimum');
    const { encryptToken } = await import('@/lib/social/crypto');
    const encryptedRefresh = encryptToken('google-refresh-secret');

    mockGetAuthUser.mockResolvedValue({
      id: 'u_a',
      tenantId: 'tenant_a',
      role: 'owner',
    });
    mockDb.socialAccount.findFirst.mockResolvedValue({
      id: 'sa_1',
      platform: 'googlebusiness',
      accountName: 'Test Store',
      accessToken: '',
      refreshToken: encryptedRefresh,
    });
    mockDb.socialAccount.update.mockResolvedValue({ id: 'sa_1' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 200 }));

    const { DELETE } = await import('@/app/api/social/accounts/route');
    const res = await DELETE(new NextRequest('http://localhost:3000/api/social/accounts?id=sa_1', { method: 'DELETE' }));
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('https://oauth2.googleapis.com/revoke?token=google-refresh-secret'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(mockDb.socialAccount.update).toHaveBeenCalledWith({
      where: { id: 'sa_1' },
      data: { isActive: false, accessToken: '', refreshToken: null },
    });

    fetchSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it('P1-01: PUT /api/bgos/mobile-auth/handoff exchanges valid 60s ticket and rejects forged ticket', async () => {
    vi.stubEnv('SOCIAL_CRYPTO_KEY', 'unit-test-crypto-key-32bytes-minimum');
    const { sealHandoffTicket } = await import('@/lib/bgos-mobile-auth');
    const ticket = sealHandoffTicket({
      userId: 'u_1',
      tenantId: 'tenant_1',
      role: 'owner',
      email: 'owner@example.com',
    });

    const { PUT } = await import('@/app/api/bgos/mobile-auth/handoff/route');
    const invalidRes = await PUT(
      new NextRequest('http://localhost:3000/api/bgos/mobile-auth/handoff', {
        method: 'PUT',
        body: JSON.stringify({ ticket: 'tampered.ticket' }),
      }),
    );
    expect(invalidRes.status).toBe(401);

    const validRes = await PUT(
      new NextRequest('http://localhost:3000/api/bgos/mobile-auth/handoff', {
        method: 'PUT',
        body: JSON.stringify({ ticket }),
      }),
    );
    expect(validRes.status).toBe(200);
    vi.unstubAllEnvs();
  });

  it('P1-02b: Creem webhook fails closed with 401 when webhook secret is not configured', async () => {
    const { POST } = await import('@/app/api/creem/webhook/route');
    const res = await POST(
      new NextRequest('http://localhost:3000/api/creem/webhook', {
        method: 'POST',
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      }),
    );
    expect(res.status).toBe(401);
  });
});
