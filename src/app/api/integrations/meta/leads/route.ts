import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/integrations/meta/leads
 * Lists MetaLead records for the current tenant.
 * Query params:
 *   - status: filter on leadStatus (new | contacted | qualified | converted | lost)
 *   - platform: filter on platform (facebook | instagram)
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
    const platform = searchParams.get('platform');
    const q = searchParams.get('q');

    const where: Record<string, unknown> = { tenantId };
    if (status) {
      where.leadStatus = status;
    }
    if (platform && ['facebook', 'instagram'].includes(platform)) {
      where.platform = platform;
    }
    if (q && q.trim()) {
      where.OR = [
        { contactName: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
      ];
    }

    const leads = await db.metaLead.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      take: 200,
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error('Error fetching Meta leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Meta leads' },
      { status: 500 }
    );
  }
}
