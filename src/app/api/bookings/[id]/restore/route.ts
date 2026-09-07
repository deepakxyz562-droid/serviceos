import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bookings/[id]/restore — un-archive (restore) a Booking.
// Clears `deletedAt` so the booking re-appears in the Active tab.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { id } = await params;

    // Customer sessions can restore their own bookings only.
    if (authUser.role === 'customer' && authUser.id) {
      const existing = await db.booking.findFirst({
        where: { id, customerId: authUser.id },
        select: { id: true, deletedAt: true, title: true },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }
      if (!existing.deletedAt) {
        return NextResponse.json({ success: true, message: 'Booking already active' });
      }
      await db.booking.update({ where: { id }, data: { deletedAt: null } });
      return NextResponse.json({ success: true, message: 'Booking restored' });
    }

    if (!authUser.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 401 });
    }

    const existing = await db.booking.findFirst({
      where: { id, tenantId: authUser.tenantId },
      select: { id: true, deletedAt: true, title: true, tenantId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    if (!existing.deletedAt) {
      return NextResponse.json({ success: true, message: 'Booking already active' });
    }

    await db.booking.update({
      where: { id },
      data: { deletedAt: null },
    });

    try {
      await logActivity({
        tenantId: existing.tenantId || authUser.tenantId,
        actorId: authUser.id,
        actorName: authUser.name || authUser.email,
        actorType: 'user',
        action: 'restore',
        entityType: 'booking',
        entityId: id,
        entityName: existing.title || null,
        description: `Restored booking "${existing.title || id}"`,
        metadataJson: JSON.stringify({ bookingId: id }),
        severity: 'info',
      });
    } catch (logErr) {
      console.error('[Bookings Restore] Failed to log activity:', logErr);
    }

    return NextResponse.json({ success: true, message: 'Booking restored' });
  } catch (error) {
    console.error('Restore booking error:', error);
    return NextResponse.json({ error: 'Failed to restore booking' }, { status: 500 });
  }
}
