import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

const hoisted = vi.hoisted(() => ({
  tenant: {
    id: 't-studio-1',
    name: "10x sde 007's Business",
    slug: '10x-sde-007s-business',
    publicSlug: '10x-sde-007s-business',
    publicProfileEnabled: true,
    industry: 'Local Services',
    city: 'Delhi',
    address: 'Delhi, India',
    country: 'IN',
    currency: 'INR',
    signupMode: 'free',
    settingsJson: JSON.stringify({
      activeGbpCategory: 'Swimming pool',
      bookingPageConfig: {
        businessName: 'Delhi Farm',
        publicSlug: '10x-sde-007s-business',
      },
    }),
    brandProfile: { businessName: 'Delhi Farm', industry: 'Swimming pool', location: 'Delhi' },
  },
  callAiMock: vi.fn(async () => ({
    content: JSON.stringify(['Pool Day Pass', 'Private Night Pool Booking', 'Weekend Family Package']),
  })),
  identityAiMock: vi.fn(async () => ({
    content: JSON.stringify({
      tagline: 'Private luxury farmhouse & pool retreats in Delhi',
      headline: 'Book a Private Swimming Pool & Farmhouse Today',
    }),
  })),
  updateGbpMock: vi.fn(async () => ({
    appliedMasks: ['serviceItems'],
    warnings: [],
  })),
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(async () => ({
    id: 'u-studio-1',
    tenantId: 't-studio-1',
    workspaceId: 'w-studio-1',
    role: 'owner',
    email: 'owner@example.com',
  })),
}));

vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findUnique: vi.fn(async () => hoisted.tenant),
      findFirst: vi.fn(async () => hoisted.tenant),
      update: vi.fn(async ({ data }: any) => {
        if (typeof data?.settingsJson === 'string') hoisted.tenant.settingsJson = data.settingsJson;
        return hoisted.tenant;
      }),
      updateMany: vi.fn(async ({ data }: any) => {
        if (typeof data?.settingsJson === 'string') hoisted.tenant.settingsJson = data.settingsJson;
        return { count: 1 };
      }),
    },
    workspace: {
      findFirst: vi.fn(async () => null),
    },
    productWorkspace: {
      findMany: vi.fn(async () => [{ productType: 'bgos' }]),
    },
    brandProfile: {
      findUnique: vi.fn(async () => null),
      update: vi.fn(async () => null),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    service: {
      findMany: vi.fn(async () => []),
      create: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    review: {
      findMany: vi.fn(async () => []),
    },
    form: {
      findFirst: vi.fn(async () => null),
    },
    user: {
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
  },
}));

vi.mock('@/lib/social/google-account-helper', () => ({
  prepareGoogleAccount: vi.fn(async () => ({ accessToken: 'tok-test', accountId: 'acc-1', locationId: 'loc-1' })),
}));

vi.mock('@/lib/social/adapters/googlebusiness', () => ({
  fetchGoogleBusinessPlaceDetails: vi.fn(async () => null),
  fetchGoogleBusinessPerformanceMetrics: vi.fn(async () => null),
  listGooglePlaceActions: vi.fn(async () => []),
  listGoogleBusinessMedia: vi.fn(async () => ({ mediaItems: [] })),
  updateGoogleBusinessProfile: hoisted.updateGbpMock,
}));

vi.mock('@/lib/gbp/place-actions-sync', () => ({
  resolveTenantPublicUrls: vi.fn(() => ({
    profileUrl: 'https://bgos.site/10x-sde-007s-business',
    bookingUrl: 'https://bgos.site/10x-sde-007s-business/book',
  })),
  syncGooglePlaceActionsForTenant: vi.fn(async () => ({ syncedActions: [], warnings: [] })),
}));

vi.mock('@/lib/emails/bgos/sender', () => ({
  sendBgosGbpUpdatePendingEmail: vi.fn(async () => {}),
}));

vi.mock('@/lib/ai-client', () => ({
  callAI: vi.fn(async (opts: any) => {
    const prompt = String(opts?.messages?.[0]?.content || '');
    if (prompt.includes('"tagline"')) {
      return hoisted.identityAiMock();
    }
    return hoisted.callAiMock();
  }),
}));

describe('BGOS Outreach removal, Business URLs, Identity AI, & Services fixes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PATCH /api/gbp/place with pushToGoogle=true never throws currentSettings ReferenceError', async () => {
    const { PATCH } = await import('@/app/api/gbp/place/route');
    const req = new NextRequest('http://localhost:3000/api/gbp/place', {
      method: 'PATCH',
      body: JSON.stringify({
        services: ['Service A', 'Service B', 'Service C', 'Service D', 'Service E'],
        seoServices: [
          { name: 'Service A', description: 'Great local service in Delhi covering all neighborhoods.' },
        ],
        pushToGoogle: true,
        forceOverride: true,
      }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.googleWarnings).toEqual([]);
    expect(json.syncedToGoogle).toBe(true);
  });

  it('POST /api/gbp/services/suggest bypasses static catalog when refresh=true and excludes old items', async () => {
    const { POST } = await import('@/app/api/gbp/services/suggest/route');
    const req = new NextRequest('http://localhost:3000/api/gbp/services/suggest', {
      method: 'POST',
      body: JSON.stringify({
        category: 'Software company',
        businessName: 'Apex Tech',
        refresh: true,
        exclude: ['Custom Software Development', 'Pool Day Pass'],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.source).toBe('ai_refresh');
    expect(json.services).not.toContain('Pool Day Pass');
    expect(json.services).toContain('Private Night Pool Booking');
  });

  it('POST /api/bgos/business-identity/ai generates tailored tagline & headline', async () => {
    const { POST } = await import('@/app/api/bgos/business-identity/ai/route');
    const req = new NextRequest('http://localhost:3000/api/bgos/business-identity/ai', {
      method: 'POST',
      body: JSON.stringify({ field: 'tagline', businessName: 'Delhi Farm' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.tagline).toContain('Delhi');
    expect(json.headline).toContain('Swimming Pool');
  });

  it('Mobile removes Outreach screen & routes, uses single canonical bgos.site URL, and audits bgos.site dynamically', () => {
    const outreachExists = fs.existsSync(path.join(process.cwd(), 'bgosmobile/app/outreach.tsx'));
    expect(outreachExists).toBe(false);

    const homeSrc = fs.readFileSync(path.join(process.cwd(), 'bgosmobile/app/(tabs)/index.tsx'), 'utf8');
    const toolsSrc = fs.readFileSync(path.join(process.cwd(), 'bgosmobile/app/(tabs)/tools.tsx'), 'utf8');
    const drawerSrc = fs.readFileSync(
      path.join(process.cwd(), 'bgosmobile/src/components/navigation/sidebar-drawer.tsx'),
      'utf8',
    );
    expect(homeSrc).not.toContain("route: '/outreach'");
    expect(toolsSrc).not.toContain("'/outreach'");
    expect(drawerSrc).not.toContain("'/outreach'");

    const studioSrc = fs.readFileSync(path.join(process.cwd(), 'bgosmobile/app/booking-page.tsx'), 'utf8');
    expect(studioSrc).not.toContain('.bgos.site');
    expect(studioSrc).toContain('Auto-fill tagline with AI');
    expect(studioSrc).toContain('Auto-fill headline with AI');
  });

  it('getBgosPublicBusinessProfileUncached resolves BGOS profile cleanly for 10x-sde-007s-business', async () => {
    const { getBgosPublicBusinessProfileUncached } = await import('@/lib/bgos-public-business');
    const profile = await getBgosPublicBusinessProfileUncached('10x-sde-007s-business');
    expect(profile).not.toBeNull();
    expect(profile?.canonicalUrl).toBe('https://bgos.site/10x-sde-007s-business');
  });
});
