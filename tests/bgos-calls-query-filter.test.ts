// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findManyCalls: vi.fn(),
  countCalls: vi.fn(),
  findManyLeads: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: mocks.auth,
}));

vi.mock('@/lib/db', () => ({
  db: {
    aiCall: {
      findMany: mocks.findManyCalls,
      count: mocks.countCalls,
    },
    lead: {
      findMany: mocks.findManyLeads,
    },
  },
}));

import { GET } from '@/app/api/calls/route';

describe('Call Tracker Query & Filter Engine (/api/calls)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ id: 'user_1', tenantId: 'tenant_1' });
    mocks.findManyCalls.mockResolvedValue([]);
    mocks.countCalls.mockResolvedValue(0);
    mocks.findManyLeads.mockResolvedValue([]);
  });

  it('combines search and missed filter into Prisma AND clauses without overwriting', async () => {
    const req = new NextRequest('https://serviceos.work/api/calls?search=5551234&filter=missed&limit=25');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const callArgs = mocks.findManyCalls.mock.calls[0][0];
    const where = callArgs.where;

    expect(where.AND).toBeDefined();
    expect(Array.isArray(where.AND)).toBe(true);

    // Clause 1: tenantId
    expect(where.AND[0]).toEqual({ tenantId: 'tenant_1' });

    // Clause 2: Search condition across phone & summary
    const searchClause = where.AND.find((c: any) => c.OR && c.OR.some((sub: any) => sub.customerPhone));
    expect(searchClause).toBeDefined();
    expect(searchClause.OR[0].customerPhone.contains).toBe('5551234');

    // Clause 3: Missed filter condition
    const missedClause = where.AND.find((c: any) => c.OR && c.OR.some((sub: any) => sub.status === 'missed'));
    expect(missedClause).toBeDefined();
    expect(missedClause.OR.some((sub: any) => sub.status === 'missed')).toBe(true);
  });

  it('filters follow-up queue cleanly with followup outcomes and callback notes', async () => {
    const req = new NextRequest('https://serviceos.work/api/calls?filter=followup');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const callArgs = mocks.findManyCalls.mock.calls[0][0];
    const where = callArgs.where;

    const followupClause = where.AND.find((c: any) => c.OR && c.OR.some((sub: any) => sub.outcomeType === 'followup'));
    expect(followupClause).toBeDefined();
    expect(followupClause.OR.some((sub: any) => sub.outcomeType === 'followup')).toBe(true);
  });

  it('attaches Caller ID lead details when calls contain leadIds', async () => {
    mocks.findManyCalls.mockResolvedValue([
      {
        id: 'call_1',
        customerPhone: '+15559876543',
        leadId: 'lead_abc',
        callType: 'inbound',
        status: 'ended',
        durationSec: 90,
        createdAt: new Date('2026-11-06T10:00:00Z'),
      },
    ]);
    mocks.countCalls.mockResolvedValue(1);
    mocks.findManyLeads.mockResolvedValue([
      {
        id: 'lead_abc',
        name: 'Alice Johnson',
        status: 'qualified',
        value: 750,
      },
    ]);

    const req = new NextRequest('https://serviceos.work/api/calls?limit=10');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.calls.length).toBe(1);
    expect(data.calls[0].lead).toEqual({
      id: 'lead_abc',
      name: 'Alice Johnson',
      status: 'qualified',
      value: 750,
    });
  });
});
