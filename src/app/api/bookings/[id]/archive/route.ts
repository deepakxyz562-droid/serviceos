import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bookings/[id]/archive — soft-delete (archive) a Booking.
// Sets `deletedAt = now()` so the booking disappears from the Active tab and
// appears in the Archived tab. Reversible via POST .../restore.
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

    // Customer sessions can archive their own bookings only.
    if (authUser.role === 'customer' && authUser.id) {
      const existing = await db.booking.findFirst({
        where: { id, customerId: authUser.id },
        select: { id: true, deletedAt: true, title: true },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }
      if (existing.deletedAt) {
        return NextResponse.json({ success: true, message: 'Booking already archived' });
      }
      await db.booking.update({ where: { id }, data: { deletedAt: new Date() } });
      return NextResponse.json({ success: true, message: 'Booking archived' });
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
    if (existing.deletedAt) {
      return NextResponse.json({ success: true, message: 'Booking already archived' });
    }

    await db.booking.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    try {
      await logActivity({
        tenantId: existing.tenantId || authUser.tenantId,
        actorId: authUser.id,
        actorName: authUser.name || authUser.email,
        actorType: 'user',
        action: 'archive',
        entityType: 'booking',
        entityId: id,
        entityName: existing.title || null,
        description: `Archived booking "${existing.title || id}"`,
        metadataJson: JSON.stringify({ bookingId: id }),
        severity: 'info',
      });
    } catch (logErr) {
      console.error('[Bookings Archive] Failed to log activity:', logErr);
    }

    return NextResponse.json({ success: true, message: 'Booking archived' });
  } catch (error) {
    console.error('Archive booking error:', error);
    return NextResponse.json({ error: 'Failed to archive booking' }, { status: 500 });
  }
}
