import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/channel-catalog
 * ─────────────────────────────────────────────────────────────────────────
 * Returns the platform-available channels for the current tenant.
 *
 * Filters the ChannelCatalog to only show channels the platform makes
 * available to tenants:
 *   - enabled=true,  comingSoon=false → "available" (tenant can connect)
 *   - enabled=false, comingSoon=true  → "coming_soon" (tenant sees badge)
 *   - enabled=false, comingSoon=false → EXCLUDED (hidden from tenant entirely)
 *
 * The tenant UI uses this to decide which channels to render in the channel
 * configuration page + which channels to show in the inbox filter bar.
 *
 * Auth: any authenticated tenant user (read-only).
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const catalog = await db.channelCatalog.findMany({
      where: {
        OR: [
          { enabled: true },      // available
          { comingSoon: true },   // coming soon (even if enabled=false)
        ],
      },
      orderBy: { sortOrder: 'asc' },
    });

    const channels = catalog.map((c) => ({
      channel: c.channel,
      displayName: c.displayName,
      description: c.description,
      icon: c.icon,
      color: c.color,
      connectionMethod: c.connectionMethod,
      sortOrder: c.sortOrder,
      provider: c.provider,
      status: c.enabled ? 'available' : 'coming_soon',
      comingSoon: c.comingSoon,
    }));

    return NextResponse.json({ channels });
  } catch (error) {
    console.error('[GET /api/channel-catalog]', error);
    return NextResponse.json({ error: 'Failed to fetch channel catalog' }, { status: 500 });
  }
}
