import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockDb = vi.hoisted(() => {
  let tenant: any = null;
  let workspace: any = null;
  let user: any = null;
  let employee: any = null;

  return {
    reset: () => {
      tenant = null;
      workspace = null;
      user = null;
      employee = null;
    },
    tenant: {
      findFirst: vi.fn(async () => tenant),
      create: vi.fn(async (args: any) => {
        tenant = { id: 't_support', ...args.data };
        return tenant;
      }),
      update: vi.fn(async (args: any) => {
        tenant = { ...tenant, ...args.data };
        return tenant;
      }),
    },
    workspace: {
      findFirst: vi.fn(async () => workspace),
      create: vi.fn(async (args: any) => {
        workspace = { id: 'w_support', ...args.data };
        return workspace;
      }),
      update: vi.fn(async (args: any) => {
        workspace = { ...workspace, ...args.data };
        return workspace;
      }),
    },
    user: {
      findFirst: vi.fn(async () => {
        if (!user) return null;
        return { ...user, tenant, workspace };
      }),
      findUnique: vi.fn(async () => {
        if (!user) return null;
        return { ...user, tenant, workspace };
      }),
      create: vi.fn(async (args: any) => {
        user = { id: 'u_support', ...args.data };
        return { ...user, tenant, workspace };
      }),
      update: vi.fn(async (args: any) => {
        user = { ...user, ...args.data };
        return { ...user, tenant, workspace };
      }),
    },
    employee: {
      findFirst: vi.fn(async () => employee),
      create: vi.fn(async (args: any) => {
        employee = { id: 'e_support', ...args.data };
        return employee;
      }),
      update: vi.fn(async (args: any) => {
        employee = { ...employee, ...args.data };
        return employee;
      }),
    },
    authRefreshSession: {
      create: vi.fn(async () => ({ id: 'rs_support' })),
    },
  };
});

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/rate-limit', () => ({
  authLimiter: {},
  applyRateLimit: () => null,
  rateLimitResponse: () => new Response('Rate limited', { status: 429 }),
}));

import { POST } from '@/app/api/auth/login/route';

describe('Support Account Login (support@fieseros.com / #Mahadev12)', () => {
  beforeEach(() => {
    mockDb.reset();
    vi.stubEnv('JWT_SECRET', 'test-jwt-secret-key-for-testing-12345');
    vi.stubEnv('PRODUCT_WORKSPACES_ENABLED', 'false');
  });

  it('allows support@fieseros.com to log in on mobile with active BGOS workspace', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'support@fieseros.com',
        password: '#Mahadev12',
        product: 'bgos',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.token).toBeDefined();
    expect(data.refreshToken).toBeDefined();
    expect(data.user.email).toBe('support@fieseros.com');
    expect(data.user.role).toBe('owner');
    expect(data.user.isSuperAdmin).toBe(false);
    expect(data.workspace.productType).toBe('bgos');
    expect(data.onboardingRequired).toBe(false);
  });

  it('supports Support@fieseros.com (capitalized) seamlessly', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'Support@fieseros.com',
        password: '#Mahadev12',
        product: 'bgos',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.user.email).toBe('support@fieseros.com');
  });

  it('rejects wrong password for support account', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'support@fieseros.com',
        password: 'WrongPassword',
        product: 'bgos',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBe('Invalid email or password');
  });
});
