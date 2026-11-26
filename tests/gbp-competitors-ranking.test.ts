import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

const mockState = vi.hoisted(() => ({
  tenant: {
    id: 't-comp-rank',
    name: 'Delhi Farm',
    city: 'Delhi',
    country: 'India',
    industry: 'Farmhouse',
    settingsJson: JSON.stringify({
      competitorSpyCache: {
        updatedAt: new Date().toISOString(),
        searchQuery: 'Farmhouse in Delhi',
        selfMapsRank: 1.6,
        byKey: {
          'place-asoda': { mapsRank: 3.9, address: 'Asoda' },
          'place-tomar': { mapsRank: 4.3, address: 'Tomar Rd' },
        },
      },
    }),
    brandProfile: { businessName: 'Delhi Farm', industry: 'Farmhouse' },
  },
  competitors: [
    { id: 'c1', placeId: 'place-tomar', name: 'Tomar Farmhouse', rating: 4.1, reviewCount: 44, distanceKm: 1.2, category: 'Farmhouse' },
    { id: 'c2', placeId: 'place-asoda', name: 'Asoda swimming pool', rating: 4.7, reviewCount: 34, distanceKm: 3.5, category: 'Swimming pool' },
    { id: 'c3', placeId: 'place-unmeasured', name: 'Local Unscanned Pool', rating: null, reviewCount: null, distanceKm: 0.4, category: 'Swimming pool' },
  ],
  scanAvgRank: null as number | null,
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(async () => ({
    id: 'usr-comp-rank',
    tenantId: 't-comp-rank',
    email: 'comp@example.com',
  })),
}));

vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findUnique: vi.fn(async () => mockState.tenant),
    },
    competitor: {
      findMany: vi.fn(async () => mockState.competitors),
    },
    review: {
      count: vi.fn(async () => 3),
      findMany: vi.fn(async () => [{ rating: 5 }, { rating: 5 }, { rating: 4.4 }]),
    },
    trackedKeyword: {
      findMany: vi.fn(async () => []),
    },
    rankGridScan: {
      findFirst: vi.fn(async () =>
        mockState.scanAvgRank != null ? { avgRank: mockState.scanAvgRank } : null,
      ),
    },
  },
}));

vi.mock('@/lib/social/google-account-helper', () => ({
  prepareGoogleAccount: vi.fn(async () => null),
}));

describe('GBP Competitor Ranking & Home UI safeguards', () => {
  beforeEach(() => {
    mockState.scanAvgRank = null;
  });

  it('GET /api/gbp/competitors orders by Google Maps prominence rank, keeps 1-decimal ranks, and returns null when unmeasured', async () => {
    const { GET } = await import('@/app/api/gbp/competitors/route');
    const req = new NextRequest('http://localhost:3000/api/gbp/competitors');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(Array.isArray(json.competitors)).toBe(true);
    expect(json.competitors.map((c: any) => c.name)).toEqual([
      'Delhi Farm',
      'Asoda swimming pool',
      'Tomar Farmhouse',
      'Local Unscanned Pool',
    ]);

    expect(json.competitors[0].rank).toBe(1.6);
    expect(json.competitors[1].rank).toBe(3.9);
    expect(json.competitors[2].rank).toBe(4.3);
    // Unmeasured competitor must never be assigned a synthetic integer rank
    expect(json.competitors[3].rank).toBeNull();
  });

  it('Home screen removes "Visit Competitor Website" and displays decimal rank & Pending Scan fallback', () => {
    const homeSource = fs.readFileSync(
      path.join(process.cwd(), 'bgosmobile/app/(tabs)/index.tsx'),
      'utf8',
    );
    expect(homeSource).not.toContain('Visit Competitor Website');
    expect(homeSource).toContain('Overall Reviews');
    expect(homeSource).toContain('Rank: Pending Scan');
  });
});
