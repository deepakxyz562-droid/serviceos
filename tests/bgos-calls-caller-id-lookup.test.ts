// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findFirstLead: vi.fn(),
  findFirstCustomer: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: mocks.auth,
}));

vi.mock('@/lib/db', () => ({
  db: {
    lead: {
      findFirst: mocks.findFirstLead,
    },
    customer: {
      findFirst: mocks.findFirstCustomer,
    },
  },
}));

import { GET } from '@/app/api/calls/lookup/route';

describe('SalesTrail Caller ID Resolver (/api/calls/lookup)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ id: 'user_1', tenantId: 'tenant_1' });
  });

  it('resolves existing CRM Lead from phone number', async () => {
    mocks.findFirstLead.mockResolvedValue({
      id: 'lead_1',
      name: 'Robert Miller',
      phone: '+1 (555) 345-6789',
      status: 'contacted',
      value: 1200,
      serviceType: 'HVAC Replacement',
      description: 'Interested in full system overhaul',
    });

    const req = new NextRequest('https://serviceos.work/api/calls/lookup?phone=%2B15553456789');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.matched).toBe(true);
    expect(data.type).toBe('lead');
    expect(data.caller.name).toBe('Robert Miller');
    expect(data.caller.value).toBe(1200);
    expect(data.caller.serviceType).toBe('HVAC Replacement');
  });

  it('resolves existing Customer when not in leads pipeline', async () => {
    mocks.findFirstLead.mockResolvedValue(null);
    mocks.findFirstCustomer.mockResolvedValue({
      id: 'cust_1',
      name: 'Acme Corp',
      companyName: 'Acme Corporation',
      phone: '5559871122',
      email: 'service@acme.com',
    });

    const req = new NextRequest('https://serviceos.work/api/calls/lookup?phone=555-987-1122');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.matched).toBe(true);
    expect(data.type).toBe('customer');
    expect(data.caller.name).toBe('Acme Corp');
    expect(data.caller.isCustomer).toBe(true);
  });

  it('returns matched: false when caller is not recognized', async () => {
    mocks.findFirstLead.mockResolvedValue(null);
    mocks.findFirstCustomer.mockResolvedValue(null);

    const req = new NextRequest('https://serviceos.work/api/calls/lookup?phone=5550009999');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.matched).toBe(false);
    expect(data.caller).toBeNull();
  });
});
