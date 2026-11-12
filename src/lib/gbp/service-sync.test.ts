import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockDb,
  mockGetAuthUser,
  mockPrepareGoogleAccount,
  mockUpdateGoogleBusinessProfile,
  mockInvalidateCache,
  mockEnsureChatbot,
} = vi.hoisted(() => ({
  mockDb: {
    service: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    brandProfile: {
      updateMany: vi.fn(),
    },
  },
  mockGetAuthUser: vi.fn(),
  mockPrepareGoogleAccount: vi.fn(),
  mockUpdateGoogleBusinessProfile: vi.fn(),
  mockInvalidateCache: vi.fn(),
  mockEnsureChatbot: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/auth', () => ({ getAuthUser: mockGetAuthUser }));
vi.mock('@/lib/social/google-account-helper', () => ({
  prepareGoogleAccount: mockPrepareGoogleAccount,
}));
vi.mock('@/lib/social/adapters/googlebusiness', () => ({
  updateGoogleBusinessProfile: mockUpdateGoogleBusinessProfile,
}));
vi.mock('@/lib/social/google-connection-state', () => ({
  invalidatePlacePayloadCacheForTenant: mockInvalidateCache,
}));
vi.mock('@/lib/bgos-business-chatbot', () => ({
  ensureAndSyncBusinessChatbot: mockEnsureChatbot,
}));

import { GET as getServices, POST as createService } from '@/app/api/services/route';
import { DELETE as deleteService } from '@/app/api/services/[id]/route';
import { mergeStructuredServices } from '@/lib/gbp/seo-context';

describe('unified service sync & dummy filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockResolvedValue({ id: 'u1', tenantId: 't1', role: 'owner' });
    mockDb.tenant.update.mockResolvedValue({});
    mockDb.brandProfile.updateMany.mockResolvedValue({ count: 1 });
  });

  it('filters seeded dummy rows in GET /api/services and keeps custom services', async () => {
    mockDb.service.findMany.mockResolvedValue([
      {
        id: 'dummy_1',
        slug: 'emergency-service',
        name: 'Emergency Service',
        description: 'When your critical systems fail, FieserOS provides rapid Emergency Service across Patna and the Downtown area.',
        longDescription: null,
        basePrice: 150,
        duration: 90,
        isActive: true,
      },
      {
        id: 'real_1',
        slug: 'website-development',
        name: 'Website Development',
        description: 'Custom websites for growing businesses.',
        longDescription: null,
        basePrice: 15000,
        duration: 120,
        isActive: true,
      },
    ]);
    mockDb.service.count.mockResolvedValue(2);

    const res = await getServices(new NextRequest('http://localhost/api/services?limit=20'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.hasSeededDummyServices).toBe(true);
    expect(body.services).toHaveLength(1);
    expect(body.services[0].name).toBe('Website Development');
    expect(body.pagination.total).toBe(1);
  });

  it('POST /api/services syncs Tenant.settingsJson, chatbot & Google Business Profile', async () => {
    mockDb.service.create.mockResolvedValue({
      id: 'svc_new',
      slug: 'software-development',
      name: 'Software Development',
      description: 'End-to-end web and mobile software development.',
      longDescription: 'End-to-end web and mobile software development.',
      basePrice: 25000,
      duration: 60,
      category: 'IT',
      isActive: true,
      isPublic: true,
    });
    mockDb.service.findMany.mockResolvedValue([
      {
        id: 'svc_new',
        slug: 'software-development',
        name: 'Software Development',
        description: 'End-to-end web and mobile software development.',
        longDescription: 'End-to-end web and mobile software development.',
        category: 'IT',
        basePrice: 25000,
        duration: 60,
      },
    ]);
    mockDb.tenant.findUnique.mockResolvedValue({
      settingsJson: JSON.stringify({
        seoServices: [{ name: 'Software Development', targetKeyword: 'software developer patna' }],
      }),
    });
    mockPrepareGoogleAccount.mockResolvedValue({ accessToken: 'tok_123', accountId: 'loc_1' });
    mockUpdateGoogleBusinessProfile.mockResolvedValue({
      appliedMasks: ['serviceItems'],
      warnings: [],
    });

    const req = new NextRequest('http://localhost/api/services', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Software Development',
        basePrice: 25000,
        duration: 60,
        longDescription: 'End-to-end web and mobile software development.',
        syncToGoogle: true,
      }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await createService(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.googleSync.synced).toBe(true);
    expect(mockUpdateGoogleBusinessProfile).toHaveBeenCalledWith(
      { accessToken: 'tok_123', accountId: 'loc_1' },
      {
        serviceItems: [
          {
            name: 'Software Development',
            description: 'End-to-end web and mobile software development.',
          },
        ],
      },
    );
    expect(mockDb.tenant.update).toHaveBeenCalled();
    const savedSettings = JSON.parse(mockDb.tenant.update.mock.calls[0][0].data.settingsJson);
    expect(savedSettings.activeGbpServices).toEqual(['Software Development']);
    expect(savedSettings.seoServices[0].targetKeyword).toBe('software developer patna');
    expect(savedSettings.seoServices[0].syncedToGoogle).toBe(true);
    expect(mockEnsureChatbot).toHaveBeenCalledWith('t1', { triggerSource: 'service_create' });
  });

  it('DELETE /api/services/[id] deletes service and removes it from GBP settings', async () => {
    mockDb.service.findFirst.mockResolvedValue({ id: 'svc_old', tenantId: 't1', name: 'Old Service' });
    mockDb.service.delete.mockResolvedValue({ id: 'svc_old' });
    mockDb.service.findMany.mockResolvedValue([
      {
        id: 'svc_keep',
        slug: 'ai-automation',
        name: 'AI Automation',
        description: 'Workflow automation.',
        longDescription: null,
        category: 'IT',
        basePrice: 5000,
        duration: 60,
      },
    ]);
    mockDb.tenant.findUnique.mockResolvedValue({
      settingsJson: JSON.stringify({
        activeGbpServices: ['Old Service', 'AI Automation'],
        services: ['Old Service', 'AI Automation'],
      }),
    });
    mockPrepareGoogleAccount.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/services/svc_old?syncToGoogle=true', {
      method: 'DELETE',
    });
    const res = await deleteService(req, { params: Promise.resolve({ id: 'svc_old' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockDb.service.delete).toHaveBeenCalledWith({ where: { id: 'svc_old' } });
    const savedSettings = JSON.parse(mockDb.tenant.update.mock.calls[0][0].data.settingsJson);
    expect(savedSettings.activeGbpServices).toEqual(['AI Automation']);
    expect(savedSettings.services).toEqual(['AI Automation']);
    expect(mockInvalidateCache).toHaveBeenCalledWith('t1');
  });

  it('mergeStructuredServices excludes seeded dummy entries from all sources', () => {
    const merged = mergeStructuredServices(
      {
        services: ['Emergency Service', 'Custom App Dev'],
        seoServices: [{ name: 'Inspection & Maintenance', description: '' }],
      },
      [
        {
          id: 'd1',
          slug: 'installation',
          name: 'Installation',
          description: 'Professional Installation is the foundation of a robust digital infrastructure.',
          longDescription: null,
          category: 'general',
          basePrice: 1200,
          duration: 240,
        },
        {
          id: 'r1',
          slug: 'seo-growth',
          name: 'SEO Growth',
          description: 'Local Google Maps ranking optimization.',
          longDescription: null,
          category: 'Marketing',
          basePrice: 9999,
          duration: 60,
        },
      ],
    );

    expect(merged.map((s) => s.name)).toEqual(['SEO Growth', 'Custom App Dev']);
  });
});
