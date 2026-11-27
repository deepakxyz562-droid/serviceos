import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  user: {
    id: 'u-ws-1',
    email: 'owner@texturepaint.test',
    name: 'Texture Owner',
    role: 'owner',
    tenantId: 't-texture',
    workspaceId: 'ws-texture',
  },
  tenant: {
    id: 't-texture',
    name: 'Texture Paint Wala',
    slug: 'texture-paint-wala',
    phone: '+919999999999',
    industry: 'Paint Shop',
    city: 'Delhi',
    description: '',
    settingsJson: JSON.stringify({
      activeGbpLocationId: 'loc-texture-1',
    }),
    brandProfile: {
      businessName: 'Texture Paint Wala',
      industry: 'Paint Shop',
      location: 'Delhi',
    },
  },
  createdTenant: null as any,
  createdSub: null as any,
  chatbotSyncedTenant: null as string | null,
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(async () => hoisted.user),
  generateToken: vi.fn(() => 'tok-123'),
}));

vi.mock('@/lib/auth-refresh-session', () => ({
  issueRefreshSession: vi.fn(async () => ({ token: 'ref-123' })),
}));

vi.mock('@/lib/rate-limit', () => ({
  applyTenantRateLimit: vi.fn(async () => ({ success: true, resetAtMs: Date.now() + 60_000 })),
  rateLimitResponse: vi.fn(),
  tenantAiLimiter: {},
}));

vi.mock('@/lib/ai-client', () => ({
  callAI: vi.fn(async () => ({
    content: JSON.stringify({
      tagline: 'Premium Texture & Wall Finishes in Delhi',
      headline: 'Transform Your Walls With Texture Paint Wala',
      description:
        'Texture Paint Wala specializes in durable architectural coatings and textured wall finishes across Delhi. Request color consultations and fast quotes online.',
    }),
  })),
}));

vi.mock('@/lib/bgos-business-chatbot', () => ({
  ensureAndSyncBusinessChatbot: vi.fn(async (tenantId: string) => {
    hoisted.chatbotSyncedTenant = tenantId;
  }),
}));

vi.mock('@/lib/designs/business-image-suggestions', () => ({
  prewarmTenantSceneSuggestions: vi.fn(async () => undefined),
}));

vi.mock('@/app/api/gbp/place/route', () => ({
  invalidatePlacePayloadCache: vi.fn(),
}));

vi.mock('@/lib/db', () => {
  const tx = {
    tenant: {
      create: vi.fn(async ({ data }: any) => {
        hoisted.createdTenant = { id: 't-new-amplar', ...data };
        return hoisted.createdTenant;
      }),
    },
    workspace: {
      create: vi.fn(async ({ data }: any) => ({ id: 'ws-new-amplar', ...data })),
    },
    productWorkspace: {
      create: vi.fn(async ({ data }: any) => ({ id: 'pw-new', ...data })),
    },
    productMembership: {
      create: vi.fn(async ({ data }: any) => data),
    },
    productSubscription: {
      create: vi.fn(async ({ data }: any) => {
        hoisted.createdSub = data;
        return data;
      }),
    },
    user: {
      update: vi.fn(async ({ data }: any) => data),
    },
  };

  return {
    db: {
      $transaction: vi.fn(async (cb: any) => cb(tx)),
      tenant: {
        findUnique: vi.fn(async () => hoisted.tenant),
        findFirst: vi.fn(async () => null),
      },
      workspace: {
        findMany: vi.fn(async () => [
          {
            id: 'ws-texture',
            tenantId: 't-texture',
            name: 'Texture Paint Wala',
            slug: 'texture-paint-wala',
            industry: 'Paint Shop',
            productType: 'bgos',
            tenant: {
              id: 't-texture',
              name: 'Texture Paint Wala',
              slug: 'texture-paint-wala',
              industry: 'Paint Shop',
              logo: null,
              settingsJson: hoisted.tenant.settingsJson,
              plan: 'starter',
              planStatus: 'active',
              trialEndsAt: null,
              suspendedAt: null,
            },
          },
        ]),
        findFirst: vi.fn(async () => null),
      },
      user: {
        findUnique: vi.fn(async () => ({ workspaceId: 'ws-texture', tenantId: 't-texture', role: 'owner' })),
      },
      productMembership: {
        findMany: vi.fn(async () => []),
      },
      productWorkspace: {
        findMany: vi.fn(async () => []),
      },
      productSubscription: {
        findMany: vi.fn(async () => [
          {
            workspaceId: 'ws-texture',
            plan: 'starter',
            status: 'active',
            trialEndsAt: null,
          },
        ]),
      },
      socialAccount: {
        findMany: vi.fn(async () => [
          {
            id: 'sa-1',
            accountId: 'loc-texture-1',
            accountName: 'Texture Paint Wala',
            metadata: JSON.stringify({
              locationTitle: 'Texture Paint Wala',
              category: 'Paint Store',
              googleEmail: 'owner@texturepaint.test',
            }),
          },
          {
            id: 'sa-2',
            accountId: 'loc-amplar-2',
            accountName: 'Amplar Sales & Marketing LLP',
            metadata: JSON.stringify({
              locationTitle: 'Amplar Sales & Marketing LLP',
              category: 'Paint Manufacturer',
              address: 'Sector 18, Gurugram, Haryana',
            }),
          },
        ]),
        findFirst: vi.fn(async () => ({
          accountId: 'loc-amplar-2',
          accountName: 'Amplar Sales & Marketing LLP',
          accessToken: 'enc-a',
          refreshToken: 'enc-r',
          tokenExpiry: new Date(),
          scopes: 'business.manage',
          metadata: JSON.stringify({
            locationTitle: 'Amplar Sales & Marketing LLP',
            category: 'Paint Manufacturer',
            address: 'Sector 18, Gurugram, Haryana',
            phone: '+919811111111',
          }),
        })),
        upsert: vi.fn(async () => ({})),
      },
      brandProfile: {
        upsert: vi.fn(async () => ({})),
      },
      service: {
        create: vi.fn(async () => ({})),
      },
      lead: { count: vi.fn(async () => 0) },
      customer: { count: vi.fn(async () => 0) },
      booking: { count: vi.fn(async () => 0) },
      conversation: { count: vi.fn(async () => 0) },
      publicChatSession: { count: vi.fn(async () => 0) },
      review: { count: vi.fn(async () => 0) },
      socialPost: { count: vi.fn(async () => 32) },
    },
  };
});

function readRel(relPath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');
}

describe('Workspace Switching, Post-Trial Switcher, & Business Studio Description AI', () => {
  beforeEach(() => {
    hoisted.createdTenant = null;
    hoisted.createdSub = null;
    hoisted.chatbotSyncedTenant = null;
  });

  it('GET /api/gbp/accounts/discover falls back boundProfileId to activeGbpLocationId for legacy workspaces', async () => {
    const { GET } = await import('@/app/api/gbp/accounts/discover/route');
    const req = new NextRequest('https://api.bgos.test/api/gbp/accounts/discover');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.boundProfileId).toBe('loc-texture-1');
    expect(json.hasWorkspaceActivity).toBe(true);
    expect(json.workspaces).toHaveLength(1);
    expect(json.workspaces[0].entitled).toBe(true);
  });

  it('POST /api/bgos/business-identity/ai generates tailored tagline, headline, and description', async () => {
    const { POST } = await import('@/app/api/bgos/business-identity/ai/route');
    const req = new NextRequest('https://api.bgos.test/api/bgos/business-identity/ai', {
      method: 'POST',
      body: JSON.stringify({
        field: 'description',
        businessName: 'Texture Paint Wala',
      }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.tagline).toBeTruthy();
    expect(json.headline).toBeTruthy();
    expect(json.description).toContain('Texture Paint Wala');
  });

  it('createBgosBusinessWorkspace starts new business on a 7-day Starter trial & syncs GBP metadata + AI bot', async () => {
    const { createBgosBusinessWorkspace } = await import('@/lib/bgos-workspaces');
    const out = await createBgosBusinessWorkspace({
      userId: 'u-ws-1',
      businessName: 'Amplar Sales & Marketing LLP',
      profileId: 'loc-amplar-2',
    });

    expect(out.alreadyExisted).toBe(false);
    expect(out.workspace.planTier).toBe('starter');
    expect(out.workspace.subscriptionStatus).toBe('trial');
    expect(out.workspace.entitled).toBe(true);
    expect(out.workspace.trialExpired).toBe(false);
    expect(out.workspace.trialDaysLeft).toBe(7);

    expect(hoisted.createdTenant?.plan).toBe('starter');
    expect(hoisted.createdTenant?.planStatus).toBe('trial');
    expect(hoisted.createdTenant?.address).toContain('Gurugram');
    expect(hoisted.createdSub?.plan).toBe('starter');
    expect(hoisted.createdSub?.status).toBe('trial');
    expect(hoisted.chatbotSyncedTenant).toBe('t-new-amplar');
  });

  it('PaywallGate, SidebarDrawer, SelectProfile, BookingPage Studio & Web Switcher wire switching & Description AI', () => {
    const paywall = readRel('bgosmobile/src/components/billing/paywall-gate.tsx');
    const drawer = readRel('bgosmobile/src/components/navigation/sidebar-drawer.tsx');
    const tabsLayout = readRel('bgosmobile/app/(tabs)/_layout.tsx');
    const selectProfile = readRel('bgosmobile/app/select-profile.tsx');
    const studio = readRel('bgosmobile/app/booking-page.tsx');
    const webSwitcher = readRel('src/components/bgos/profile-switcher.tsx');

    // Users stuck on trial-expired workspace can always switch to their paid business workspace
    expect(paywall).toContain('<WorkspaceSwitcherSection');
    expect(paywall).toContain('SWITCH TO ANOTHER BUSINESS WORKSPACE');

    // Sidebar Drawer exposes WorkspaceSwitcherSection directly & tabs reset per tenantId
    expect(drawer).toContain('<WorkspaceSwitcherSection onClose={onClose} />');
    expect(tabsLayout).toContain('<View key={tenantId}');

    // Mobile Select Profile auto-recovers 409 lock into switch/create without dead-ending on Update Failed
    expect(selectProfile).toContain('WORKSPACE_BOUND_TO_OTHER_BUSINESS');
    expect(selectProfile).toContain('handleCreateSeparateWorkspace');

    // Business Page Studio About/Description has AI sparkle button
    expect(studio).toContain("generateIdentityField('description')");
    expect(studio).toContain('Auto-fill About description with AI');

    // Web header switcher supports /api/bgos/workspaces/switch & workspace creation
    expect(webSwitcher).toContain('/api/bgos/workspaces/switch');
    expect(webSwitcher).toContain('/api/bgos/workspaces');
  });
});
