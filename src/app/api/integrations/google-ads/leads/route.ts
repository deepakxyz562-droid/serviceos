import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CI } from '@/lib/db-utils';
import { getAuthUser } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// Note: `mode: 'insensitive'` is PostgreSQL-only and throws on SQLite. We use
// the `CI` helper from @/lib/db-utils which spreads `{ mode: 'insensitive' }`
// on PostgreSQL (Supabase/Neon) and `{}` on SQLite (already case-insensitive).

/**
 * GET /api/integrations/google-ads/leads
 * Lists GoogleAdsLead records for the current tenant.
 * Query params:
 *   - status: filter on leadStatus (new | contacted | qualified | converted | lost)
 *   - q: free-text search on contactName / email / phone
 * Ordered by receivedAt desc, limit 200.
 * Returns the array directly (not wrapped). rawDataJson + customFieldsJson
 * are included — they're useful for the UI / debugging.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const q = searchParams.get('q');

    const where: Record<string, unknown> = { tenantId };
    if (status) {
      where.leadStatus = status;
    }
    if (q && q.trim()) {
      where.OR = [
        { contactName: { contains: q, ...CI } },
        { email: { contains: q, ...CI } },
        { phone: { contains: q, ...CI } },
      ];
    }

    const leads = await db.googleAdsLead.findMany({
      where: where as Prisma.GoogleAdsLeadWhereInput,
      orderBy: { receivedAt: 'desc' },
      take: 200,
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error('Error fetching Google Ads leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Google Ads leads' },
      { status: 500 }
    );
  }
}
