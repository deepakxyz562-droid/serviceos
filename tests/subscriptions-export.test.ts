import { describe, it, expect } from 'vitest';
import { buildCsv, escapeCsv, withBom, exportFilename } from '@/lib/csv-export';
import type { Subscription } from '@/components/views/superadmin/types';

describe('Subscriber Export & CSV Generation', () => {
  it('escapes special characters properly in CSV cells', () => {
    expect(escapeCsv('Simple Text')).toBe('Simple Text');
    expect(escapeCsv('Acme, Inc.')).toBe('"Acme, Inc."');
    expect(escapeCsv('He said "Hello"')).toBe('"He said ""Hello"""');
    expect(escapeCsv('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
    expect(escapeCsv(null)).toBe('');
    expect(escapeCsv(undefined)).toBe('');
  });

  it('builds RFC-4180 CSV with UTF-8 BOM for Excel compatibility', () => {
    const headers = ['Subscription ID', 'Business / Tenant Name', 'Email', 'Plan', 'Public Profile URL'];
    const rows = [
      [
        'sub_123',
        'Acme Plumbing, LLC',
        'contact@acme.com',
        'growth',
        'https://fieseros.com/b/acme-plumbing',
      ],
      [
        'sub_456',
        'Elite HVAC "Best in Town"',
        'info@elitehvac.com',
        'enterprise',
        'https://fieseros.com/b/elite-hvac',
      ],
    ];

    const rawCsv = buildCsv(headers, rows);
    const bomCsv = withBom(rawCsv);

    expect(bomCsv.startsWith('\uFEFF')).toBe(true);
    expect(rawCsv).toContain('Subscription ID,Business / Tenant Name,Email,Plan,Public Profile URL');
    expect(rawCsv).toContain('"Acme Plumbing, LLC"');
    expect(rawCsv).toContain('"Elite HVAC ""Best in Town"""');
    expect(rawCsv).toContain('https://fieseros.com/b/acme-plumbing');
  });

  it('correctly maps full subscriber details including phones, emails, and fieseros links', () => {
    const mockSub: Subscription = {
      id: 'sub_test_999',
      tenantId: 'tenant_abc_123',
      tenantName: 'Apex Roofing & Solar',
      tenantSlug: 'apex-roofing',
      tenantEmail: 'admin@apexroofing.com',
      tenantPhone: '+1-555-0199',
      tenantWhatsappPhone: '+1-555-0188',
      tenantAddress: '123 Main St, Suite 400',
      tenantCountry: 'US',
      tenantCurrency: 'USD',
      tenantIndustry: 'Roofing',
      tenantPlanStatus: 'active',
      formsPlan: 'starter',
      formsPlanStatus: 'active',
      lifetimeJobsCreated: 142,
      ownerName: 'John Doe',
      ownerEmail: 'john@apexroofing.com',
      ownerPhone: '+1-555-0100',
      publicProfileUrl: 'https://fieseros.com/b/apex-roofing',
      marketplaceUrl: 'https://fieseros.com/marketplace/apex-roofing',
      adminDetailUrl: 'https://fieseros.com/dashboard/superadmin/tenants/tenant_abc_123',
      plan: 'pro',
      status: 'active',
      amount: 199,
      currency: 'USD',
      billingCycle: 'monthly',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2027-01-01T00:00:00.000Z',
      pausedDate: null,
      pauseReason: null,
      seatCount: 5,
      aiQuota: 1000,
      aiUsageCount: 230,
      whatsappQuota: 500,
      whatsappUsageCount: 45,
      emailQuota: 5000,
      emailUsageCount: 1200,
      smsQuota: 200,
      smsUsageCount: 10,
      storageQuotaMb: 10240,
      storageUsageMb: 512,
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const headers = [
      'Subscription ID',
      'Business / Tenant Name',
      'Business Email',
      'Business Phone Number',
      'WhatsApp Number',
      'Owner / Primary Contact Name',
      'Owner Email',
      'Owner Phone',
      'Subscription Plan',
      'Subscription Status',
      'Billing Cycle',
      'Amount / Price',
      'Currency',
      'Tenant Plan Status',
      'Forms Plan',
      'Forms Plan Status',
      'Lifetime Jobs Created',
      'Industry',
      'Address',
      'Country',
      'Fieseros Provider Public Page Link',
      'Fieseros Marketplace Page Link',
      'Superadmin Tenant Detail Link',
      'Seat Count',
      'AI Quota',
      'AI Usage',
      'WhatsApp Quota',
      'WhatsApp Usage',
      'Email Quota',
      'Email Usage',
      'SMS Quota',
      'SMS Usage',
      'Storage Quota (MB)',
      'Storage Usage (MB)',
      'Start Date',
      'End Date',
      'Paused Date',
      'Pause Reason',
      'Created At',
    ];

    const row = [
      mockSub.id,
      mockSub.tenantName,
      mockSub.tenantEmail,
      mockSub.tenantPhone,
      mockSub.tenantWhatsappPhone,
      mockSub.ownerName,
      mockSub.ownerEmail,
      mockSub.ownerPhone,
      mockSub.plan,
      mockSub.status,
      mockSub.billingCycle,
      mockSub.amount,
      mockSub.currency,
      mockSub.tenantPlanStatus,
      mockSub.formsPlan,
      mockSub.formsPlanStatus,
      mockSub.lifetimeJobsCreated,
      mockSub.tenantIndustry,
      mockSub.tenantAddress,
      mockSub.tenantCountry,
      mockSub.publicProfileUrl,
      mockSub.marketplaceUrl,
      mockSub.adminDetailUrl,
      mockSub.seatCount,
      mockSub.aiQuota,
      mockSub.aiUsageCount,
      mockSub.whatsappQuota,
      mockSub.whatsappUsageCount,
      mockSub.emailQuota,
      mockSub.emailUsageCount,
      mockSub.smsQuota,
      mockSub.smsUsageCount,
      mockSub.storageQuotaMb,
      mockSub.storageUsageMb,
      mockSub.startDate,
      mockSub.endDate,
      mockSub.pausedDate,
      mockSub.pauseReason,
      mockSub.createdAt,
    ];

    const csvOutput = buildCsv(headers, [row]);

    expect(csvOutput).toContain('Apex Roofing & Solar');
    expect(csvOutput).toContain('+1-555-0199');
    expect(csvOutput).toContain('+1-555-0188');
    expect(csvOutput).toContain('john@apexroofing.com');
    expect(csvOutput).toContain('https://fieseros.com/b/apex-roofing');
    expect(csvOutput).toContain('https://fieseros.com/marketplace/apex-roofing');
    expect(csvOutput).toContain('https://fieseros.com/dashboard/superadmin/tenants/tenant_abc_123');
    expect(csvOutput).toContain('142');
    expect(csvOutput).toContain('Roofing');
    expect(csvOutput).toContain('123 Main St, Suite 400');
  });

  it('generates a valid filename timestamp', () => {
    const filename = exportFilename('fieseros-subscribers', 'csv');
    expect(filename).toMatch(/^fieseros-subscribers-\d{4}-\d{2}-\d{2}-\d{6}\.csv$/);
  });
});
