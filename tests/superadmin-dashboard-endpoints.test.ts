import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'cmt7no83z0001rkud1ifh81o5',
  email: 'admin@fieseros.com',
  name: 'Platform SuperAdmin',
  role: 'admin',
  isSuperAdmin: true,
  tenantId: null,
  workspaceId: null,
  avatar: null,
};

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/lib/admin-auth', () => ({
  isSuperAdminUser: vi.fn((user) => !!(user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin' || (user?.role?.toLowerCase() === 'admin' && !user?.tenantId))),
  isSuperAdminRequest: vi.fn(async () => true),
}));

vi.mock('@/lib/db', () => ({
  db: {
    appNotification: {
      count: vi.fn().mockResolvedValue(0),
    },
    form: {
      count: vi.fn().mockResolvedValue(3),
      findMany: vi.fn().mockResolvedValue([
        { id: 'form_1', name: 'Contact Form' },
        { id: 'form_2', name: 'Intake Form' },
      ]),
      aggregate: vi.fn().mockResolvedValue({ _avg: { conversionRate: 0.25 } }),
    },
    formResponse: {
      count: vi.fn().mockResolvedValue(15),
      findMany: vi.fn().mockResolvedValue([]),
    },
    aiReceptionist: {
      findFirst: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
    },
    aiKnowledgeDocument: {
      count: vi.fn().mockResolvedValue(4),
    },
    booking: {
      count: vi.fn().mockResolvedValue(2),
      findMany: vi.fn().mockResolvedValue([]),
    },
    publicChatSession: {
      count: vi.fn().mockResolvedValue(1),
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'chat_session_1',
          status: 'active',
          lastMessageAt: new Date(),
          messages: [{ body: 'Hello', senderType: 'visitor', createdAt: new Date() }],
        },
      ]),
    },
    user: {
      count: vi.fn().mockResolvedValue(10),
      findUnique: vi.fn().mockResolvedValue({ id: 'cmt7no83z0001rkud1ifh81o5', isSuperAdmin: true, role: 'admin' }),
    },
    workflowAutomation: {
      count: vi.fn().mockResolvedValue(5),
    },
    workspace: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    tenant: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    subscription: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    subscriptionPayment: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    subscriptionEvent: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
  },
}));

vi.mock('@/lib/billing-seed', () => ({
  seedPlans: vi.fn().mockResolvedValue(undefined),
  getActivePlans: vi.fn().mockResolvedValue([
    {
      code: 'starter',
      name: 'Starter',
      description: 'Starter plan',
      monthlyPrice: 29,
      yearlyPrice: 290,
      currency: 'USD',
      maxUsers: 5,
      maxJobs: 100,
      maxWorkflows: 10,
      featuresJson: '{}',
      popular: false,
      isAddon: false,
      sortOrder: 1,
    },
  ]),
  getPlanByCode: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/cache', () => ({
  cache: {
    get: vi.fn(() => undefined),
    set: vi.fn(),
  },
}));

vi.mock('@/lib/cache-headers', () => ({
  cachedJson: vi.fn((data) => new Response(JSON.stringify(data), { status: 200 })),
}));

// Import route handlers
import { getAuthUser } from '@/lib/auth';
import { requireAuth } from '@/lib/api-auth';
import { HEAD as healthHEAD } from '@/app/api/health/route';
import { GET as unreadCountGET } from '@/app/api/notifications/unread-count/route';
import { GET as dashboardStatsGET } from '@/app/api/forms/dashboard-stats/route';
import { GET as creatorProfileGET } from '@/app/api/creator/profile/route';
import { GET as chatSessionsGET } from '@/app/api/chat/sessions/route';
import { GET as subscriptionsGET } from '@/app/api/subscriptions/route';

describe('Superadmin Dashboard Endpoints', () => {
  beforeEach(() => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser);
    vi.mocked(requireAuth).mockResolvedValue({ ok: true, user: mockUser as any });
  });

  it('1. HEAD /api/health returns 200 with no-store headers', async () => {
    const res = await healthHEAD();
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toContain('no-store');
  });

  it('2. GET /api/notifications/unread-count allows superadmin with tenantId=null', async () => {
    const req = new NextRequest('https://fieseros.com/api/notifications/unread-count');
    const res = await unreadCountGET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('unreadCount');
    expect(body.unreadCount).toBe(0);
  });

  it('3. GET /api/forms/dashboard-stats allows superadmin without workspace access', async () => {
    const req = new NextRequest('https://fieseros.com/api/forms/dashboard-stats');
    const res = await dashboardStatsGET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalForms).toBe(3);
    expect(body.totalSubmissions).toBe(15);
    expect(body.aiAgentStatus).toBe('active');
  });

  it('4. GET /api/creator/profile returns default profile for superadmin without tenant', async () => {
    const res = await creatorProfileGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.profile).toBeDefined();
    expect(body.profile.handle).toBe('admin');
  });

  it('5. GET /api/chat/sessions?status=active lists sessions for superadmin without tenant/workspace query params', async () => {
    const req = new NextRequest('https://fieseros.com/api/chat/sessions?status=active');
    const res = await chatSessionsGET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessions).toBeDefined();
    expect(body.sessions.length).toBe(1);
    expect(body.sessions[0].id).toBe('chat_session_1');
  });

  it('6. GET /api/subscriptions returns platform admin enterprise subscription for superadmin', async () => {
    const res = await subscriptionsGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isSuperAdmin).toBe(true);
    expect(body.plan).toBe('enterprise');
    expect(body.status).toBe('active');
    expect(body.usage.jobs.limit).toBe(999999);
  });
});
