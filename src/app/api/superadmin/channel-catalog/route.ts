import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/superadmin/channel-catalog
 * ─────────────────────────────────────────────────────────────────────────
 * Returns all ChannelCatalog rows (platform-level channel availability).
 *
 * Superadmin uses this to control which channels Fieseros offers:
 *   - enabled=true,  comingSoon=false → tenant can connect
 *   - enabled=false, comingSoon=true  → tenant sees "Coming soon"
 *   - enabled=false, comingSoon=false → hidden from tenant entirely
 *
 * Auth: superadmin only.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const catalog = await db.channelCatalog.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ catalog });
  } catch (error) {
    console.error('[GET /api/superadmin/channel-catalog]', error);
    return NextResponse.json({ error: 'Failed to fetch channel catalog' }, { status: 500 });
  }
}

/**
 * PATCH /api/superadmin/channel-catalog
 * ─────────────────────────────────────────────────────────────────────────
 * Update a single ChannelCatalog row (by channel).
 *
 * Body: { channel: string, updates: { enabled?, comingSoon?, displayName?, description?, sortOrder?, connectionMethod? } }
 *
 * Superadmin only. Returns the updated row.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { channel, updates } = body as {
      channel: string;
      updates: {
        enabled?: boolean;
        comingSoon?: boolean;
        displayName?: string;
        description?: string;
        sortOrder?: number;
        connectionMethod?: string;
      };
    };

    if (!channel || !updates) {
      return NextResponse.json({ error: 'channel and updates are required' }, { status: 400 });
    }

    const existing = await db.channelCatalog.findUnique({
      where: { channel },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Channel not found in catalog' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
    if (updates.comingSoon !== undefined) updateData.comingSoon = updates.comingSoon;
    if (updates.displayName !== undefined) updateData.displayName = updates.displayName;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.sortOrder !== undefined) updateData.sortOrder = updates.sortOrder;
    if (updates.connectionMethod !== undefined) updateData.connectionMethod = updates.connectionMethod;

    const updated = await db.channelCatalog.update({
      where: { channel },
      data: updateData,
    });

    console.log(`[superadmin/channel-catalog] ${channel} updated by ${user.email}:`, updateData);

    return NextResponse.json({ catalog: updated });
  } catch (error) {
    console.error('[PATCH /api/superadmin/channel-catalog]', error);
    return NextResponse.json({ error: 'Failed to update channel catalog' }, { status: 500 });
  }
}
