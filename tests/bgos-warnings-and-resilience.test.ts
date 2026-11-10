// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const dbMock = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  tenantFindFirst: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    $queryRaw: dbMock.queryRaw,
    tenant: { findFirst: dbMock.tenantFindFirst },
  },
}));

describe('BGOS Mobile Warnings Elimination & Gateway Resilience', () => {
  const ROOT = process.cwd();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('keeps shared marketing design modules strictly acyclic (zero require cycles)', async () => {
    const sharedFiles = [
      'shared/marketing-design-core.ts',
      'shared/marketing-design.ts',
      'shared/business-template-design.ts',
      'shared/professional-posters.ts',
      'shared/poster-composition.ts',
      'shared/layered-templates-kit.ts',
      'shared/business-template-collection.ts',
    ];

    const edges = new Map<string, string[]>();
    const importRe = /(?:from|require)\s*\(?['"](\.[^'"]+)['"]\)?/g;

    for (const rel of sharedFiles) {
      const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      const deps: string[] = [];
      let match: RegExpExecArray | null;
      while ((match = importRe.exec(content)) !== null) {
        const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(rel), `${match[1]}.ts`));
        if (sharedFiles.includes(resolved)) {
          deps.push(resolved);
        }
      }
      edges.set(rel, deps);
    }

    // Core module must remain a leaf with zero sibling imports
    expect(edges.get('shared/marketing-design-core.ts')).toEqual([]);

    // DFS cycle detector across the shared dependency graph
    const state = new Map<string, 0 | 1 | 2>();
    const hasCycle = (node: string): boolean => {
      const s = state.get(node) ?? 0;
      if (s === 1) return true;
      if (s === 2) return false;
      state.set(node, 1);
      for (const dep of edges.get(node) ?? []) {
        if (hasCycle(dep)) return true;
      }
      state.set(node, 2);
      return false;
    };

    for (const node of sharedFiles) {
      expect(hasCycle(node)).toBe(false);
    }

    // Public re-exports from shared/marketing-design.ts stay intact
    const facade = await import('../shared/marketing-design');
    expect(typeof facade.createDesign).toBe('function');
    expect(typeof facade.validateDesign).toBe('function');
    expect(typeof facade.createCommercialPosterDesign).toBe('function');
    expect(Array.isArray(facade.POSTER_TEMPLATES)).toBe(true);
    expect(Array.isArray(facade.COMMERCIAL_THEME_KEYS)).toBe(true);
  });

  it('guards expo-notifications behind notifications-runtime so Expo Go never evaluates it', async () => {
    const guardedFiles = [
      'bgosmobile/app/_layout.tsx',
      'bgosmobile/src/lib/push.ts',
      'bgosmobile/src/stores/media-upload-store.ts',
    ];

    for (const rel of guardedFiles) {
      const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      const runtimeNotificationImport = /^(?!import\s+type\b).*['"]expo-notifications['"]/m;
      expect(runtimeNotificationImport.test(content)).toBe(false);
    }

    vi.resetModules();
    vi.doMock('expo-constants', () => ({
      default: { executionEnvironment: 'storeClient', appOwnership: 'expo', expoConfig: {} },
    }));
    vi.doMock('react-native', () => ({
      Platform: { OS: 'android' },
    }));

    const runtime = await import('../bgosmobile/src/lib/notifications-runtime');
    expect(runtime.isExpoGoRuntime).toBe(true);
    expect(runtime.getNotificationsModule()).toBeNull();
  });

  it('detects transient gateway status codes and retries idempotent apiRequest POST/GET on HTTP 502', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('<html><body>502 Bad Gateway</body></html>', {
        status: 502,
        headers: { 'content-type': 'text/html' },
      }))
      .mockResolvedValueOnce(new Response('<html><body>502 Bad Gateway</body></html>', {
        status: 502,
        headers: { 'content-type': 'text/html' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ jobId: 'job-123', status: 'queued' }), {
        status: 202,
        headers: { 'content-type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetchMock);

    const { apiRequest, isTransientGatewayStatus } = await import('../bgosmobile/src/lib/api');

    expect(isTransientGatewayStatus(0)).toBe(true);
    expect(isTransientGatewayStatus(408)).toBe(true);
    expect(isTransientGatewayStatus(502)).toBe(true);
    expect(isTransientGatewayStatus(503)).toBe(true);
    expect(isTransientGatewayStatus(504)).toBe(true);
    expect(isTransientGatewayStatus(400)).toBe(false);
    expect(isTransientGatewayStatus(500)).toBe(false);

    const res = await apiRequest<{ jobId: string; status: string }>('/api/social/designs/image', {
      method: 'POST',
      skipAuth: true,
      retryTransient: 2,
      body: { requestId: 'req-1234567890123456', prompt: 'Clean studio shot' },
    });
    expect(res).toEqual({ jobId: 'job-123', status: 'queued' });
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // Without retryTransient, HTTP 502 throws clean ApiError immediately
    fetchMock.mockResolvedValueOnce(new Response('<html><body>502 Bad Gateway</body></html>', {
      status: 502,
      headers: { 'content-type': 'text/html' },
    }));
    await expect(
      apiRequest('/api/social/posts', { method: 'POST', skipAuth: true, body: {} }),
    ).rejects.toMatchObject({
      statusCode: 502,
      message: 'Server gateway error (HTTP 502). Please try again in a moment.',
    });
  });

  it('reports db connected in GET /api/health via ORM fallback when $queryRaw fails (Supabase PostgREST)', async () => {
    dbMock.queryRaw.mockRejectedValue(new Error('$queryRaw not supported by PostgREST proxy'));
    dbMock.tenantFindFirst.mockResolvedValue({ id: 'tenant-1' });

    const { GET } = await import('@/app/api/health/route');
    const res = await GET(new NextRequest('http://localhost/api/health'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.db).toBe('connected');
    expect(dbMock.tenantFindFirst).toHaveBeenCalledTimes(1);
  });
});
