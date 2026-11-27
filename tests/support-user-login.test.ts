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
    socialAccount: {
      count: vi.fn(async () => 1),
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

describe('Login security — hardcoded support backdoor removed', () => {
  beforeEach(() => {
    mockDb.reset();
    vi.stubEnv('JWT_SECRET', 'test-jwt-secret-key-for-testing-12345');
    vi.stubEnv('PRODUCT_WORKSPACES_ENABLED', 'false');
  });

  it('rejects legacy hardcoded support credentials when no seeded user exists', async () => {
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
    expect(response.status).toBe(401);
  });

  it('allows properly provisioned DB user to sign in on mobile with active BGOS workspace', async () => {
    const { hashPassword } = await import('@/lib/auth');
    const tenant = await mockDb.tenant.create({
      data: {
        name: 'FieserOS',
        slug: 'fieseros-tenant',
        email: 'owner@fieseros.com',
        plan: 'growth',
        planStatus: 'active',
        onboardingCompleted: true,
        onboardingStep: 5,
      },
    });
    const ws = await mockDb.workspace.create({
      data: {
        name: 'FieserOS Workspace',
        slug: 'fieseros-bgos',
        productType: 'bgos',
        tenantId: tenant.id,
        ownerId: 'u_seed',
      },
    });
    await mockDb.user.create({
      data: {
        email: 'owner@fieseros.com',
        name: 'Owner',
        passwordHash: await hashPassword('StrongPass!23'),
        role: 'owner',
        isActive: true,
        isSuperAdmin: false,
        emailVerified: true,
        tenantId: tenant.id,
        workspaceId: ws.id,
      },
    });

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'OWNER@fieseros.com',
        password: 'StrongPass!23',
        product: 'bgos',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.token).toBeDefined();
    expect(data.refreshToken).toBeDefined();
    expect(data.user.email).toBe('owner@fieseros.com');
    expect(data.workspace.productType).toBe('bgos');
  });

  it('rejects wrong password for account', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'owner@fieseros.com',
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
