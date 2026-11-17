// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  tenantFindFirst: vi.fn(),
  tenantFindMany: vi.fn(),
  serviceFindMany: vi.fn().mockResolvedValue([]),
  reviewFindMany: vi.fn().mockResolvedValue([]),
  gbpReviewFindMany: vi.fn().mockResolvedValue([]),
  formFindFirst: vi.fn().mockResolvedValue(null),
  socialAccountFindFirst: vi.fn().mockResolvedValue(null),
  socialPostFindMany: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findFirst: mocks.tenantFindFirst,
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: mocks.tenantFindMany,
    },
    service: {
      count: vi.fn().mockResolvedValue(0),
      findMany: mocks.serviceFindMany,
    },
    review: {
      count: vi.fn().mockResolvedValue(0),
      findMany: mocks.reviewFindMany,
    },
    gBPReview: {
      findMany: mocks.gbpReviewFindMany,
    },
    form: {
      findFirst: mocks.formFindFirst,
    },
    socialAccount: {
      findFirst: mocks.socialAccountFindFirst,
    },
    socialPost: {
      findMany: mocks.socialPostFindMany,
    },
  },
}));

import { buildProviderWhereClause } from '@/lib/marketplace-pagination';
import { getPublicBusinessByUrl, getCanonicalUrlBySlug } from '@/lib/public-business';
import { getBgosPublicBusinessProfileUncached } from '@/lib/bgos-public-business';
import { resolveBusinessPresenceMode } from '@/lib/seo/presence-mode';
import { getProductTrialDurationDays } from '../shared/products';

describe('Strict Product Boundary: BGOS vs Fieseros Marketplace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Fieseros Marketplace Query Gates (No BGOS Leakage)', () => {
    it('buildProviderWhereClause strictly filters out BGOS signupMode, listingTier none, and BGOS workspaces', () => {
      const where = buildProviderWhereClause({});
      expect(where.publicProfileEnabled).toBe(true);
      expect(where.marketplaceOptIn).toBe(true);
      expect(where.suspendedAt).toBeNull();

      expect(where.NOT).toEqual(
        expect.arrayContaining([
          { signupMode: 'bgos' },
          { listingTier: 'none' },
          { workspaces: { some: { productType: 'bgos' } } },
        ]),
      );
    });

    it('getPublicBusinessByUrl refuses to serve BGOS merchants on Fieseros marketplace routes', async () => {
      mocks.tenantFindFirst.mockResolvedValueOnce({
        id: 't_bgos_1',
        name: 'Sweet Delights Mithai',
        slug: 'sweet-delights-mithai',
        industry: 'indian_sweets',
        city: 'Patna',
        state: 'BR',
        country: 'IN',
        signupMode: 'bgos',
        workspaces: [{ productType: 'bgos' }],
      });

      const result = await getPublicBusinessByUrl('indian-sweets', 'patna', 'sweet-delights-mithai');
      expect(result.business).toBeNull();
      expect(result.needsRedirect).toBe(false);
      expect(result.canonicalUrl).toBeNull();
    });

    it('getCanonicalUrlBySlug returns null for BGOS merchants so they are not indexed as Fieseros providers', async () => {
      mocks.tenantFindFirst.mockResolvedValueOnce({
        id: 't_bgos_2',
        name: 'Vogue Boutique',
        slug: 'vogue-boutique',
        industry: 'fashion_boutique',
        city: 'Mumbai',
        signupMode: 'bgos',
        workspaces: [{ productType: 'bgos' }],
      });

      const url = await getCanonicalUrlBySlug('vogue-boutique');
      expect(url).toBeNull();
    });

    it('getCanonicalUrlBySlug resolves Fieseros contractors to fieseros.com', async () => {
      mocks.tenantFindFirst.mockResolvedValueOnce({
        id: 't_crm_1',
        name: 'Apex Plumbing',
        slug: 'apex-plumbing',
        industry: 'plumber',
        city: 'Dallas',
        signupMode: 'crm_trial',
        workspaces: [{ productType: 'crm' }],
      });

      const url = await getCanonicalUrlBySlug('apex-plumbing');
      expect(url).toContain('https://fieseros.com/plumbers/dallas/apex-plumbing');
    });
  });

  describe('BGOS Public Pages Isolation (/b/[slug])', () => {
    it('getBgosPublicBusinessProfileUncached refuses to create a BGOS profile for Fieseros CRM contractors', async () => {
      mocks.tenantFindFirst.mockResolvedValueOnce({
        id: 't_crm_2',
        name: 'Rapid AC Repair',
        slug: 'rapid-ac-repair',
        industry: 'hvac',
        city: 'Houston',
        signupMode: 'crm_trial',
        workspaces: [{ productType: 'crm' }],
        settingsJson: '{}',
      });

      const profile = await getBgosPublicBusinessProfileUncached('rapid-ac-repair');
      expect(profile).toBeNull();
    });

    it('getBgosPublicBusinessProfileUncached serves valid BGOS merchants', async () => {
      mocks.tenantFindFirst.mockResolvedValueOnce({
        id: 't_bgos_3',
        name: 'Apex Dental Care',
        slug: 'apex-dental-care',
        industry: 'dental_clinic',
        city: 'Delhi',
        signupMode: 'bgos',
        workspaces: [{ productType: 'bgos' }],
        settingsJson: '{}',
        brandProfile: null,
      });

      const profile = await getBgosPublicBusinessProfileUncached('apex-dental-care');
      expect(profile).not.toBeNull();
      expect(profile?.businessName).toBe('Apex Dental Care');
      expect(profile?.canonicalUrl).toBe('https://bgos.site/apex-dental-care');
    });
  });

  describe('Presence Mode Isolation', () => {
    it('anchors Fieseros CRM contractors canonically to fieseros.com, never bgos.site', () => {
      const presence = resolveBusinessPresenceMode({
        tenant: {
          id: 't_crm_3',
          name: 'Pro Electrician',
          slug: 'pro-electrician',
          industry: 'electrician',
          city: 'Austin',
          signupMode: 'crm_trial',
          productType: 'crm',
          publicProfileEnabled: true,
          marketplaceOptIn: false,
        },
      });

      expect(presence.domain).toBe('fieseros.com');
      expect(presence.canonicalUrl).toBe('https://fieseros.com/electricians/austin/pro-electrician');
      expect(presence.canonicalUrl).not.toContain('bgos.site');
    });

    it('anchors BGOS merchants canonically to bgos.site', () => {
      const presence = resolveBusinessPresenceMode({
        tenant: {
          id: 't_bgos_4',
          name: 'Sweet Delights',
          slug: 'sweet-delights',
          industry: 'indian_sweets',
          city: 'Patna',
          signupMode: 'bgos',
          productType: 'bgos',
          publicProfileEnabled: true,
          marketplaceOptIn: false,
        },
      });

      expect(presence.domain).toBe('bgos.site');
      expect(presence.canonicalUrl).toBe('https://bgos.site/sweet-delights');
    });
  });

  describe('Product-Aware Trial Duration', () => {
    it('grants a 7-day trial exclusively to BGOS', () => {
      expect(getProductTrialDurationDays('bgos')).toBe(7);
      expect(getProductTrialDurationDays('chatbotly')).toBe(7);
      expect(getProductTrialDurationDays('forms')).toBe(7);
    });

    it('preserves the full 14-day trial for Fieseros CRM, BOS, and QuoteFlow', () => {
      expect(getProductTrialDurationDays('crm')).toBe(14);
      expect(getProductTrialDurationDays('business')).toBe(14);
      expect(getProductTrialDurationDays('bos')).toBe(14);
      expect(getProductTrialDurationDays('quoteflow')).toBe(14);
      expect(getProductTrialDurationDays('marketplace')).toBe(14);
      expect(getProductTrialDurationDays(null)).toBe(14);
      expect(getProductTrialDurationDays(undefined)).toBe(14);
    });
  });
});
