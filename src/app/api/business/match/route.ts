import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/business/match
 * -------------------------
 * Search for existing unclaimed marketplace listings that match the business
 * name + city the user entered during registration.
 *
 * Phase 11: This prevents the root cause of duplicate businesses. Instead of
 * creating a new Tenant unconditionally, registration checks for matches FIRST.
 * If found, the user can choose "This is my business" (→ claim flow) or
 * "Create a new business" (→ normal registration).
 *
 * Body: { name: string, city?: string, phone?: string, website?: string }
 * Returns: { matches: [{ tenantId, name, city, phone, website, matchScore }] }
 *
 * Only returns UNCLAIMED listings (claimed=false, listingTier='free').
 * Does NOT return claimed businesses (they're already owned).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, city, phone, website } = body as {
      name?: string;
      city?: string;
      phone?: string;
      website?: string;
    };

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ matches: [] });
    }

    const normalizedName = name.trim().toLowerCase();

    // Gate 1.9 fix: search unclaimed marketplace listings with similar names.
    // Previously used `contains: name.split(' ')[0]` (first word only) which
    // produced false positives ("ABC Plumbing" matched "ABC Electric").
    // Now: use the FULL name for the contains search, plus a Jaccard scoring
    // step that filters out weak matches.
    const candidates = await db.tenant.findMany({
      where: {
        claimed: false,
        listingTier: { in: ['free', 'none'] },
        // `contains` is already case-insensitive in the Supabase adapter
        // (PostgREST uses `ilike` internally). Don't pass `mode: 'insensitive'`
        // — the Supabase adapter doesn't recognize that Prisma-specific property.
        name: { contains: name.trim() },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        industry: true,
        city: true,
        phone: true,
        website: true,
        address: true,
      },
      take: 20, // cap the search
    });

    // Score each candidate
    const scored = candidates
      .map((tenant) => {
        let score = 0;
        const tenantName = tenant.name.toLowerCase();

        // Name similarity (Jaccard word overlap)
        const nameWords = new Set(normalizedName.split(/\s+/).filter(Boolean));
        const tenantWords = new Set(tenantName.split(/\s+/).filter(Boolean));
        const intersection = [...nameWords].filter((w) => tenantWords.has(w)).length;
        const union = new Set([...nameWords, ...tenantWords]).size;
        const nameScore = union > 0 ? intersection / union : 0;
        score += nameScore * 0.6; // name is 60% of the score

        // City match (exact or contains)
        if (city && tenant.city) {
          if (tenant.city.toLowerCase() === city.trim().toLowerCase()) {
            score += 0.2; // exact city match
          } else if (
            tenant.city.toLowerCase().includes(city.trim().toLowerCase()) ||
            city.trim().toLowerCase().includes(tenant.city.toLowerCase())
          ) {
            score += 0.1; // partial city match
          }
        }

        // Phone match (digits only)
        if (phone && tenant.phone) {
          const digits1 = phone.replace(/\D/g, '');
          const digits2 = tenant.phone.replace(/\D/g, '');
          if (digits1 && digits2 && digits1 === digits2) {
            score += 0.15; // exact phone match is strong
          }
        }

        // Website domain match
        if (website && tenant.website) {
          const domain1 = extractDomain(website);
          const domain2 = extractDomain(tenant.website);
          if (domain1 && domain2 && domain1 === domain2) {
            score += 0.15; // domain match
          }
        }

        return {
          tenantId: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          industry: tenant.industry,
          city: tenant.city,
          phone: tenant.phone,
          website: tenant.website,
          address: tenant.address,
          matchScore: Math.min(1, Math.round(score * 100) / 100),
        };
      })
      .filter((m) => m.matchScore >= 0.5) // Gate 1.9 fix: raised from 0.3 → 0.5 (30% was too low)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3); // top 3 matches

    return NextResponse.json({ matches: scored });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to search businesses';
    console.error('[business/match]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
  }
}
