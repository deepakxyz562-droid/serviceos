import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { buildHighQualityImagePrompt } from '@/lib/designs/image-provider';

// ─── Hoisted Mocks ────────────────────────────────────────────────────────────

const { mockTenant, mockServices, mockDb } = vi.hoisted(() => {
  const tenant: any = {
    id: 'tenant-plumb-1',
    name: 'Metro Fast Plumbing',
    slug: 'metro-fast-plumbing',
    phone: '+919876543210',
    email: 'help@metroplumbing.com',
    city: 'Hyderabad',
    brandProfile: {
      businessName: 'Metro Fast Plumbing',
      industry: 'Plumbing',
    },
    settingsJson: JSON.stringify({}),
  };

  const services: any[] = [
    {
      id: 'svc-1',
      name: 'Emergency Pipe Leak Repair',
      description: 'Rapid repair for burst pipes and urgent leaks.',
      duration: 45,
      basePrice: 1500,
      category: 'Plumbing',
      isActive: true,
      tenantId: 'tenant-plumb-1',
    },
    {
      id: 'svc-2',
      name: 'Bathroom Drain Cleaning',
      description: 'Complete unblocking and high-pressure jetting.',
      duration: 60,
      basePrice: 1200,
      category: 'Plumbing',
      isActive: true,
      tenantId: 'tenant-plumb-1',
    },
  ];

  const dbObj: any = {
    tenant: {
      findFirst: vi.fn(async () => tenant),
      findUnique: vi.fn(async () => tenant),
    },
    service: {
      findMany: vi.fn(async () => services),
    },
    form: {
      findFirst: vi.fn(async () => ({ slug: 'intake-form' })),
    },
    productSubscription: {
      findUnique: vi.fn(async () => null),
    },
  };

  return { mockTenant: tenant, mockServices: services, mockDb: dbObj };
});

vi.mock('@/lib/db', () => ({
  db: mockDb,
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(async () => ({
    id: 'user-plumber',
    email: 'admin@metroplumbing.com',
    tenantId: 'tenant-plumb-1',
    role: 'owner',
  })),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('High Quality Image Prompt & Public Booking Services Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Prompt Quality Enhancer', () => {
    it('enriches photo prompts with commercial photography and realism directives', () => {
      const prompt = buildHighQualityImagePrompt('smiling plumber fixing kitchen sink');
      expect(prompt).toContain('Award-winning commercial promotional photography');
      expect(prompt).toContain('35mm f/1.8 lens');
      expect(prompt).toContain('8k UHD resolution');
      expect(prompt).toContain('no watermarks');
      expect(prompt).toContain('smiling plumber fixing kitchen sink');
    });

    it('enriches poster prompts with bold typographic and advertising agency directives', () => {
      const prompt = buildHighQualityImagePrompt('50% off holiday discount sale', true);
      expect(prompt).toContain('Ultra-high quality modern commercial promotional poster design');
      expect(prompt).toContain('1080x1350 vertical format');
      expect(prompt).toContain('bold visual hierarchy');
      expect(prompt).toContain('50% off holiday discount sale');
    });
  });

  describe('Public Business Services Endpoint (/api/public/business/[slug]/services)', () => {
    it('returns tenant info and active services for the booking page', async () => {
      const { GET } = await import('@/app/api/public/business/[slug]/services/route');
      const req = new NextRequest('http://localhost/api/public/business/metro-fast-plumbing/services');

      const res = await GET(req, { params: Promise.resolve({ slug: 'metro-fast-plumbing' }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.tenantId).toBe('tenant-plumb-1');
      expect(json.tenantName).toBe('Metro Fast Plumbing');
      expect(json.services).toHaveLength(2);
      expect(json.services[0].name).toBe('Emergency Pipe Leak Repair');
    });
  });

  describe('Workspace Canonical Booking Links', () => {
    it('always provides an active booking link fallback even without custom event types', async () => {
      const { GET } = await import('@/app/api/bgos/workspace/route');
      const res = await GET();
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.links.booking).toBe('/book/metro-fast-plumbing');
      expect(json.links.profile).toBe('/b/metro-fast-plumbing');
    });
  });
});
