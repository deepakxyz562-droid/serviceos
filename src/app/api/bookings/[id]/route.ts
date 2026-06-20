import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { EventBus } from '@/lib/event-bus';
import { createDepositInvoiceFromBooking, getInvoiceSettings } from '@/lib/invoice-automation';

// GET /api/bookings/[id] — Get booking by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    const booking = await db.booking.findUnique({
      where: { id },
      include: {
        employee: {
          select: { id: true, name: true, phone: true, avatar: true },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify tenant isolation
    if (booking.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}

// PUT /api/bookings/[id] — Update booking (status changes, reschedule, cancel)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify the booking exists and belongs to the same tenant
    const existingBooking = await db.booking.findUnique({ where: { id } });

    if (!existingBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (existingBooking.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    // Basic field updates
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.customerId !== undefined) updateData.customerId = body.customerId || null;
    if (body.customerName !== undefined) updateData.customerName = body.customerName || null;
    if (body.customerPhone !== undefined) updateData.customerPhone = body.customerPhone || null;
    if (body.customerEmail !== undefined) updateData.customerEmail = body.customerEmail || null;
    if (body.employeeId !== undefined) updateData.employeeId = body.employeeId || null;
    if (body.serviceId !== undefined) updateData.serviceId = body.serviceId || null;
    if (body.branchId !== undefined) updateData.branchId = body.branchId || null;
    if (body.address !== undefined) updateData.address = body.address || null;
    if (body.duration !== undefined) updateData.duration = body.duration;
    if (body.notes !== undefined) updateData.notes = body.notes || null;
    if (body.metadataJson !== undefined) updateData.metadataJson = body.metadataJson;

    // Handle reschedule
    if (body.scheduledAt !== undefined) {
      updateData.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
      if (existingBooking.id) {
        updateData.rescheduledFrom = existingBooking.id;
      }
    }
    if (body.scheduledEndTime !== undefined) {
      updateData.scheduledEndTime = body.scheduledEndTime ? new Date(body.scheduledEndTime) : null;
    }

    // Handle status changes
    if (body.status !== undefined) {
      updateData.status = body.status;

      // Set timestamps based on status
      if (body.status === 'confirmed' && !existingBooking.confirmedAt) {
        updateData.confirmedAt = new Date();
      }
      if (body.status === 'completed' && !existingBooking.completedAt) {
        updateData.completedAt = new Date();
      }
      if (body.status === 'cancelled') {
        updateData.cancelledAt = new Date();
        if (body.cancellationReason) {
          updateData.cancellationReason = body.cancellationReason;
        }
      }
    }

    const booking = await db.booking.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: { id: true, name: true, phone: true, avatar: true },
        },
      },
    });

    // ─── If status flipped to confirmed, emit event + create deposit invoice ──
    const wasConfirmed = existingBooking.status !== 'confirmed' && body.status === 'confirmed'
    if (wasConfirmed) {
      try {
        await EventBus.emit('booking.confirmed', {
          booking: { id: booking.id, title: booking.title, status: booking.status, customerName: booking.customerName, customerPhone: booking.customerPhone, scheduledAt: booking.scheduledAt?.toISOString() || null },
          resourceType: 'booking', resourceId: booking.id,
          tenantId: user.tenantId,
          workspaceId: booking.workspaceId || undefined,
        }, { tenantId: user.tenantId })
      } catch (evtErr) {
        console.error('[BookingsUpdate] booking.confirmed emit failed:', evtErr)
      }

      try {
        const invSettings = await getInvoiceSettings(user.tenantId)
        if (invSettings.createDepositOnBooking) {
          const dep = await createDepositInvoiceFromBooking(booking.id)
          if (dep.success) {
            console.log(`[BookingsUpdate] Auto-created deposit invoice ${dep.number} on booking confirmation`)
          } else if (!dep.skipped) {
            console.error(`[BookingsUpdate] Deposit invoice failed: ${dep.error}`)
          }
        }
      } catch (depErr) {
        console.error('[BookingsUpdate] Deposit invoice error:', depErr)
      }
    }

    // ─── Emit booking.rescheduled when the scheduled date changes ─────────────
    if (body.scheduledAt !== undefined && existingBooking.scheduledAt?.toISOString() !== booking.scheduledAt?.toISOString()) {
      try {
        await EventBus.emit('booking.rescheduled', {
          booking: { id: booking.id, title: booking.title, scheduledAt: booking.scheduledAt?.toISOString() || null },
          resourceType: 'booking', resourceId: booking.id,
          tenantId: user.tenantId,
          workspaceId: booking.workspaceId || undefined,
        }, { tenantId: user.tenantId })
      } catch (evtErr) {
        console.error('[BookingsUpdate] booking.rescheduled emit failed:', evtErr)
      }
    }

    // ─── Emit booking.cancelled when status flips to cancelled ────────────────
    if (existingBooking.status !== 'cancelled' && body.status === 'cancelled') {
      try {
        await EventBus.emit('booking.cancelled', {
          booking: { id: booking.id, title: booking.title, reason: body.cancellationReason || null },
          resourceType: 'booking', resourceId: booking.id,
          tenantId: user.tenantId,
          workspaceId: booking.workspaceId || undefined,
        }, { tenantId: user.tenantId })
      } catch (evtErr) {
        console.error('[BookingsUpdate] booking.cancelled emit failed:', evtErr)
      }
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}

// DELETE /api/bookings/[id] — Delete booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    // Verify the booking exists and belongs to the same tenant
    const existingBooking = await db.booking.findUnique({ where: { id } });

    if (!existingBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (existingBooking.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await db.booking.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Booking deleted' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    return NextResponse.json(
      { error: 'Failed to delete booking' },
      { status: 500 }
    );
  }
}
