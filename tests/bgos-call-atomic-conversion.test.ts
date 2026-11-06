// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findFirstCall: vi.fn(),
  findUniqueLead: vi.fn(),
  createLead: vi.fn(),
  updateCall: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: mocks.auth,
}));

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: async (cb: any) => {
      const tx = {
        aiCall: {
          findFirst: mocks.findFirstCall,
          update: mocks.updateCall,
        },
        lead: {
          findUnique: mocks.findUniqueLead,
          create: mocks.createLead,
        },
      };
      return await cb(tx);
    },
    aiCall: {
      findFirst: mocks.findFirstCall,
      update: mocks.updateCall,
    },
    lead: {
      findUnique: mocks.findUniqueLead,
      create: mocks.createLead,
    },
  },
}));

import { POST } from '@/app/api/calls/convert/route';

const buildRequest = (body: object) =>
  new NextRequest('https://serviceos.work/api/calls/convert', {
    method: 'POST',
    body: JSON.stringify(body),
  });

describe('Atomic Lead Conversion (/api/calls/convert)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ id: 'user_1', tenantId: 'tenant_1', name: 'Agent Smith' });
  });

  it('rejects unauthenticated conversion requests', async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await POST(buildRequest({ callId: 'call_1' }));
    expect(res.status).toBe(401);
  });

  it('atomically creates a CRM lead and links leadId to the call record', async () => {
    mocks.findFirstCall.mockResolvedValue({
      id: 'call_1',
      tenantId: 'tenant_1',
      customerPhone: '+15551234567',
      callType: 'inbound',
      durationSec: 120,
      leadId: null,
    });

    mocks.createLead.mockResolvedValue({
      id: 'lead_new_1',
      name: 'John Doe',
      phone: '+15551234567',
      status: 'new',
    });

    mocks.updateCall.mockResolvedValue({
      id: 'call_1',
      leadId: 'lead_new_1',
    });

    const res = await POST(buildRequest({ callId: 'call_1', name: 'John Doe', notes: 'AC repair needed' }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.alreadyConverted).toBe(false);
    expect(data.lead.id).toBe('lead_new_1');

    expect(mocks.createLead).toHaveBeenCalledTimes(1);
    expect(mocks.updateCall).toHaveBeenCalledTimes(1);
    expect(mocks.updateCall).toHaveBeenCalledWith({
      where: { id: 'call_1' },
      data: { leadId: 'lead_new_1', outcomeType: 'lead_created' },
    });
  });

  it('is idempotent: returns existing lead if call was already converted without creating duplicates', async () => {
    mocks.findFirstCall.mockResolvedValue({
      id: 'call_1',
      tenantId: 'tenant_1',
      customerPhone: '+15551234567',
      leadId: 'existing_lead_99',
    });

    mocks.findUniqueLead.mockResolvedValue({
      id: 'existing_lead_99',
      name: 'Existing Customer',
      phone: '+15551234567',
    });

    const res = await POST(buildRequest({ callId: 'call_1' }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.alreadyConverted).toBe(true);
    expect(data.lead.id).toBe('existing_lead_99');

    // Crucial: createLead must NOT have been called!
    expect(mocks.createLead).not.toHaveBeenCalled();
    expect(mocks.updateCall).not.toHaveBeenCalled();
  });
});
