import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  ticketFindUnique: vi.fn(),
  ticketMessageFindMany: vi.fn(),
  ticketMessageCreate: vi.fn(),
  ticketUpdate: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: mocks.auth,
}));

vi.mock('@/lib/db', () => ({
  db: {
    supportTicket: {
      findUnique: mocks.ticketFindUnique,
      update: mocks.ticketUpdate,
    },
    ticketMessage: {
      findMany: mocks.ticketMessageFindMany,
      create: mocks.ticketMessageCreate,
    },
  },
}));

import { GET, POST } from '@/app/api/support/tickets/[id]/messages/route';

describe('Support Ticket Messages Authorization & Security', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const getReq = () =>
    new NextRequest('http://localhost/api/support/tickets/t-123/messages', {
      method: 'GET',
    });

  const postReq = (content = 'Test reply') =>
    new NextRequest('http://localhost/api/support/tickets/t-123/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

  it('rejects unauthenticated requests with 401', async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await GET(getReq(), { params: Promise.resolve({ id: 't-123' }) });
    expect(res.status).toBe(401);
  });

  it('rejects unrelated users from other tenants with 403 Forbidden', async () => {
    mocks.auth.mockResolvedValue({
      id: 'attacker-id',
      tenantId: 'attacker-tenant',
      role: 'agent',
    });
    mocks.ticketFindUnique.mockResolvedValue({
      id: 't-123',
      tenantId: 'victim-tenant',
      reporterId: 'victim-customer-id',
    });

    const res = await GET(getReq(), { params: Promise.resolve({ id: 't-123' }) });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Access denied');
    expect(mocks.ticketMessageFindMany).not.toHaveBeenCalled();
  });

  it('allows tenant operators to retrieve ticket messages including internal notes', async () => {
    mocks.auth.mockResolvedValue({
      id: 'operator-id',
      tenantId: 'victim-tenant',
      role: 'agent',
    });
    mocks.ticketFindUnique.mockResolvedValue({
      id: 't-123',
      tenantId: 'victim-tenant',
      reporterId: 'victim-customer-id',
    });
    mocks.ticketMessageFindMany.mockResolvedValue([
      { id: 'm-1', content: 'Public message', isInternal: false },
      { id: 'm-2', content: 'Staff only internal note', isInternal: true },
    ]);

    const res = await GET(getReq(), { params: Promise.resolve({ id: 't-123' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    // where clause does not exclude internal messages for tenant staff
    expect(mocks.ticketMessageFindMany.mock.calls[0][0].where.isInternal).toBeUndefined();
  });

  it('allows ticket reporter to retrieve non-internal messages only', async () => {
    mocks.auth.mockResolvedValue({
      id: 'victim-customer-id',
      tenantId: 'other-or-null-tenant',
      role: 'customer',
    });
    mocks.ticketFindUnique.mockResolvedValue({
      id: 't-123',
      tenantId: 'victim-tenant',
      reporterId: 'victim-customer-id',
    });
    mocks.ticketMessageFindMany.mockResolvedValue([
      { id: 'm-1', content: 'Public message', isInternal: false },
    ]);

    const res = await GET(getReq(), { params: Promise.resolve({ id: 't-123' }) });
    expect(res.status).toBe(200);
    expect(mocks.ticketMessageFindMany.mock.calls[0][0].where.isInternal).toBe(false);
  });

  it('allows super-admins full management access to any ticket', async () => {
    mocks.auth.mockResolvedValue({
      id: 'super-admin-id',
      role: 'superadmin',
      isSuperAdmin: true,
      tenantId: null,
    });
    mocks.ticketFindUnique.mockResolvedValue({
      id: 't-123',
      tenantId: 'any-tenant',
      reporterId: 'any-customer',
    });
    mocks.ticketMessageFindMany.mockResolvedValue([]);

    const res = await GET(getReq(), { params: Promise.resolve({ id: 't-123' }) });
    expect(res.status).toBe(200);
  });
});
