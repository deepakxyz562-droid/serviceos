import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/social/designs/business-images/generate/route';
import { GET as getSuggestions } from '@/app/api/social/designs/business-images/suggestions/route';
import { getMultiSourceCategoryVisuals } from '@/lib/designs/multi-source-creative-engine';
import { getCategoryVisualPool } from '@/lib/designs/dynamic-visual-resolver';

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn().mockResolvedValue({
    id: 'user_fieseros',
    email: 'admin@fieseros.com',
    tenantId: 'tenant_fieseros_saas',
    role: 'ADMIN',
  }),
}));

vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'tenant_fieseros_saas',
        name: 'Fieseros',
        industry: 'Software & Technology',
        city: 'Indore',
      }),
    },
    brandProfile: {
      findUnique: vi.fn().mockImplementation((args: any) => {
        if (args?.where?.tenantId === 'tenant_fieseros_saas') {
          return Promise.resolve({
            id: 'bp_fieseros_1',
            tenantId: 'tenant_fieseros_saas',
            businessName: 'Fieseros OS',
            industry: 'IT, Software & Digital Services',
            location: 'Indore',
          });
        }
        return Promise.resolve(null);
      }),
    },
    socialAccount: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    service: {
      findMany: vi.fn().mockResolvedValue([
        { name: 'SaaS Platform Development' },
        { name: 'Mobile App Architecture' },
      ]),
    },
    imageLibrary: {
      create: vi.fn().mockResolvedValue({ id: 'img_new_1' }),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

describe('Business Image Generation & Visual Pool Resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries brandProfile by tenantId and returns curated commercial photography when AI generation is invoked', async () => {
    const req = new NextRequest('http://localhost:3000/api/social/designs/business-images/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suggestionId: 'scene-tech-dashboard',
        sceneTitle: 'Cloud Dashboard & Analytics',
        promptBlueprint: 'Modern dual-screen software engineering workstation displaying elegant real-time cloud analytics and operational dashboards.',
        category: 'IT, Software & Digital Services',
        aspectRatio: '4:5',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.businessName).toBe('Fieseros OS');
    expect(data.urls.length).toBeGreaterThan(0);
    expect(data.url).toBeTruthy();
    expect(data.seo).toBeTruthy();
    expect(data.seo.title).toBeTruthy();
  });

  it('guarantees suggestions endpoint uses brandProfile.tenantId and returns tech scenes for Fieseros OS', async () => {
    const req = new NextRequest('http://localhost:3000/api/social/designs/business-images/suggestions?category=IT%2C%20Software%20%26%20Digital%20Services');
    const res = await getSuggestions(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.businessName).toBe('Fieseros OS');
    expect(data.suggestions.length).toBeGreaterThanOrEqual(3);

    // Verify scenes are relevant to tech/SaaS and contain zero produce
    const allText = data.suggestions.map((s: any) => `${s.title} ${s.promptBlueprint}`).join(' ').toLowerCase();
    expect(allText).not.toContain('vegetable');
    expect(allText).not.toContain('fruit');
    expect(allText).not.toContain('grocery');
    expect(allText).toMatch(/cloud|dashboard|workspace|software|engineering|mobile/i);
  });

  it('guarantees it_software category pool has multiple distinct visuals and no visual repetition across adjacent templates', async () => {
    const pool = getCategoryVisualPool('IT, Software & Digital Services');
    expect(pool.length).toBeGreaterThanOrEqual(10);

    // Verify none of the visuals in it_software are produce or fruits
    for (const url of pool) {
      expect(url).not.toContain('1542838132-92c53300491e'); // The vegetable stall photo
    }

    // Verify getMultiSourceCategoryVisuals distributes visuals without adjacent repetition
    const visuals = await getMultiSourceCategoryVisuals({
      industryText: 'IT, Software & Digital Services',
      requestedCount: 20,
    });

    expect(visuals.length).toBe(20);

    // Verify no adjacent slots have the exact same photo URL
    for (let i = 0; i < visuals.length - 1; i++) {
      expect(visuals[i].url).not.toBe(visuals[i + 1].url);
    }
  });

  it('returns structured 502 error with support contact when generation produces no assets without using silent fallbacks', async () => {
    const originalVitest = process.env.VITEST;
    const originalNodeEnv = process.env.NODE_ENV;
    delete process.env.VITEST;
    (process.env as any).NODE_ENV = 'production';

    try {
      const req = new NextRequest('http://localhost:3000/api/social/designs/business-images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneTitle: 'Test Scene',
          promptBlueprint: 'Prompt blueprint',
          category: 'IT, Software & Digital Services',
          aspectRatio: '4:5',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(502);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeTruthy();
      expect(data.message).toBeTruthy();
      expect(data.supportEmail).toBe('support@fieseros.com');
      expect(data.supportMailto).toContain('mailto:support@fieseros.com');
    } finally {
      process.env.VITEST = originalVitest;
      process.env.NODE_ENV = originalNodeEnv;
    }
  });
});
