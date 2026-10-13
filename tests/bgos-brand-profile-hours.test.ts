import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  profileUpsert: vi.fn(),
  tenantFindUnique: vi.fn(),
  tenantUpdate: vi.fn(),
  brandContextRaw: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: mocks.auth,
}));

vi.mock('@/lib/brand-context', () => ({
  getBrandContextRaw: mocks.brandContextRaw,
  getBrandContext: vi.fn().mockResolvedValue('Brand Context'),
}));

vi.mock('@/lib/db', () => ({
  db: {
    brandProfile: {
      upsert: mocks.profileUpsert,
    },
    tenant: {
      findUnique: mocks.tenantFindUnique,
      update: mocks.tenantUpdate,
    },
  },
}));

import { GET, PUT } from '@/app/api/brand-profile/route';

describe('Brand Profile Business Operating Hours Persistence', () => {
  const sampleHours = [
    { day: 'Monday', open: true, start: '08:00', end: '18:00' },
    { day: 'Tuesday', open: true, start: '08:00', end: '18:00' },
    { day: 'Wednesday', open: true, start: '08:00', end: '18:00' },
    { day: 'Thursday', open: true, start: '08:00', end: '18:00' },
    { day: 'Friday', open: true, start: '08:00', end: '18:00' },
    { day: 'Saturday', open: true, start: '09:00', end: '15:00' },
    { day: 'Sunday', open: false, start: '09:00', end: '15:00' },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({
      id: 'owner-1',
      tenantId: 'tenant-123',
      role: 'owner',
    });
  });

  it('hydrates business hours along with brand profile on GET', async () => {
    mocks.brandContextRaw.mockResolvedValue({
      businessName: 'Apex Cleaning Services',
      industry: 'Commercial Cleaning',
    });
    mocks.tenantFindUnique.mockResolvedValue({
      businessHoursJson: JSON.stringify(sampleHours),
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.profile.businessName).toBe('Apex Cleaning Services');
    expect(data.hours).toEqual(sampleHours);
  });

  it('persists business hours to tenant.businessHoursJson on PUT', async () => {
    mocks.profileUpsert.mockResolvedValue({
      businessName: 'Apex Cleaning Services',
      industry: 'Commercial Cleaning',
    });
    mocks.tenantUpdate.mockResolvedValue({
      id: 'tenant-123',
      businessHoursJson: JSON.stringify(sampleHours),
    });

    const req = new NextRequest('http://localhost/api/brand-profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: 'Apex Cleaning Services',
        industry: 'Commercial Cleaning',
        skipAiSummary: true,
        hours: sampleHours,
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);
    expect(mocks.tenantUpdate).toHaveBeenCalledOnce();
    expect(mocks.tenantUpdate).toHaveBeenCalledWith({
      where: { id: 'tenant-123' },
      data: { businessHoursJson: JSON.stringify(sampleHours) },
    });
  });
});
