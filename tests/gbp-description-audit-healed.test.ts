import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    brandProfile: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({}),
    },
    review: {
      count: vi.fn().mockResolvedValue(5),
      findMany: vi.fn().mockResolvedValue([]),
    },
    socialPost: {
      count: vi.fn().mockResolvedValue(3),
      findMany: vi.fn().mockResolvedValue([]),
    },
    service: {
      count: vi.fn().mockResolvedValue(4),
      findMany: vi.fn().mockResolvedValue([
        { id: '1', slug: 's1', name: 'Service 1', description: 'Detailed localized description over 300 characters long for testing service SEO purposes.' },
      ]),
    },
    socialAccount: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn().mockResolvedValue({
    id: 'user-1',
    tenantId: 'tenant-123',
    email: 'user@example.com',
  }),
}));

vi.mock('@/lib/social/google-account-helper', () => ({
  prepareGoogleAccount: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/social/google-review-scope', () => ({
  googleReviewScope: vi.fn().mockResolvedValue({}),
}));

describe('GBP Description Audit & Resolution', () => {
  it('selects the longest candidate description and passes when length >= 150', async () => {
    const { db } = await import('@/lib/db');
    const { computeGbpAudit } = await import('@/lib/gbp/audit');

    const longDescription = 'Texture Paint Wala provides professional wall texture, stencil design, and exterior painting across Delhi NCR. Our experienced painters ensure top craftsmanship, clean execution, and premium finishes for homes and commercial offices.';

    (db.tenant.findUnique as any).mockResolvedValue({
      id: 'tenant-123',
      name: 'Texture Paint Wala',
      phone: '+919876543210',
      description: longDescription, // 238 chars
      settingsJson: JSON.stringify({
        businessHours: { monday: { open: '09:00', close: '18:00' } },
        activeGbpDescription: 'Slightly shorter description',
      }),
      brandProfile: {
        id: 'brand-123',
        businessName: 'Texture Paint Wala',
        aiGeneratedSummary: 'Short stub (30 chars)', // Would have shadowed earlier!
      },
    });

    const audit = await computeGbpAudit('tenant-123');
    const descCheck = audit.checks.find((c) => c.id === 'optimized_description');

    expect(descCheck).toBeDefined();
    expect(descCheck?.passed).toBe(true);
    expect(descCheck?.currentValue).toBe(`${longDescription.length} characters`);
  });

  it('selects settings.activeGbpDescription when tenant.description and brandProfile are empty', async () => {
    const { db } = await import('@/lib/db');
    const { computeGbpAudit } = await import('@/lib/gbp/audit');

    const gbpDescription = 'We are a premier digital marketing and local SEO agency based in Connaught Place, New Delhi. Helping local businesses rank #1 on Google Search & Maps with verified reviews and growth automation.';

    (db.tenant.findUnique as any).mockResolvedValue({
      id: 'tenant-456',
      name: 'Local SEO Pro',
      phone: '+919876543210',
      description: null,
      settingsJson: JSON.stringify({
        activeGbpDescription: gbpDescription,
        businessHours: { monday: { open: '09:00', close: '18:00' } },
      }),
      brandProfile: null,
    });

    const audit = await computeGbpAudit('tenant-456');
    const descCheck = audit.checks.find((c) => c.id === 'optimized_description');

    expect(descCheck).toBeDefined();
    expect(descCheck?.passed).toBe(true);
    expect(descCheck?.currentValue).toBe(`${gbpDescription.length} characters`);
  });

  it('allows dismissing business_description via POST and respects dismissal in GET', async () => {
    const { db } = await import('@/lib/db');
    const { POST, GET } = await import('@/app/api/gbp/growth-actions/route');

    (db.tenant.findUnique as any).mockResolvedValue({
      id: 'tenant-123',
      name: 'Texture Paint Wala',
      settingsJson: JSON.stringify({
        gbpGrowthActions: { dismissed: [], done: [] },
      }),
    });

    // 1. Send dismiss request
    const postReq = new NextRequest('http://localhost/api/gbp/growth-actions', {
      method: 'POST',
      body: JSON.stringify({ id: 'business_description', action: 'dismiss' }),
    });
    const postRes = await POST(postReq);
    expect(postRes.status).toBe(200);
    const postJson = await postRes.json();
    expect(postJson.success).toBe(true);
    expect(postJson.state.dismissed).toContain('business_description');

    // 2. In GET request with dismissed business_description, autopilotActions should not contain it
    (db.tenant.findUnique as any).mockResolvedValue({
      id: 'tenant-123',
      name: 'Texture Paint Wala',
      description: 'Too short',
      settingsJson: JSON.stringify({
        gbpGrowthActions: { dismissed: ['business_description'], done: [] },
      }),
      brandProfile: null,
    });

    const getReq = new NextRequest('http://localhost/api/gbp/growth-actions');
    const getRes = await GET(getReq);
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json();
    const hasBusinessDescAction = (getJson.autopilotActions || []).some(
      (a: any) => a.id === 'business_description',
    );
    expect(hasBusinessDescAction).toBe(false);
  });
});
