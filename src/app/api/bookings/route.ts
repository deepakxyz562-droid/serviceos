import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { notifyOwner } from '@/lib/owner-notifications';
import { createDepositInvoiceFromBooking, getInvoiceSettings } from '@/lib/invoice-automation';
import { EventBus } from '@/lib/event-bus';

// GET /api/bookings — List bookings with filters
//
// Customer sessions: scoped to the logged-in customer's own bookings
// (where.customerId = user.id). The tenantId filter is intentionally
// skipped for customers — if Customer.workspaceId is null (broken
// Customer→Workspace→Tenant chain), tenantId can't be resolved and the
// booking list would return empty. Filtering by customerId alone is both
// sufficient (privacy) and resilient (no workspace dependency).
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Customers don't need a tenantId — they're scoped by customerId.
    // Admins/employees DO need a tenantId (their bookings are tenant-scoped).
    if (user.role !== 'customer' && !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employeeId');
    const serviceId = searchParams.get('serviceId');
    const source = searchParams.get('source');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'scheduledAt';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Build where clause. Customers are scoped by customerId; admins/employees
    // are scoped by tenantId (+ optional customerId filter).
    const where: Record<string, unknown> = {};

    // Customers can only see their own bookings.
    // getAuthUser() already strips the `cust_` prefix, so user.id is the
    // raw Customer.id that matches Booking.customerId.
    if (user.role === 'customer') {
      where.customerId = user.id;
    } else {
      where.tenantId = user.tenantId;
      if (searchParams.get('customerId')) {
        where.customerId = searchParams.get('customerId');
      }
    }

    if (status) {
      const statuses = status.split(',');
      if (statuses.length === 1) {
        where.status = statuses[0];
      } else {
        where.status = { in: statuses };
      }
    }
    if (employeeId) where.employeeId = employeeId;
    if (serviceId) where.serviceId = serviceId;
    if (source) where.source = source;

    if (dateFrom || dateTo) {
      const scheduledAt: Record<string, unknown> = {};
      if (dateFrom) scheduledAt.gte = new Date(dateFrom);
      if (dateTo) scheduledAt.lte = new Date(dateTo);
      where.scheduledAt = scheduledAt;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [bookings, total] = await Promise.all([
      db.booking.findMany({
        where,
        orderBy: { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          employee: {
            select: { id: true, name: true, phone: true, avatar: true },
          },
        },
      }),
      db.booking.count({ where }),
    ]);

    return NextResponse.json({
      bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// POST /api/bookings — Create booking
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      source,
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      employeeId,
      serviceId,
      branchId,
      address,
      scheduledAt,
      scheduledEndTime,
      duration,
      notes,
      workspaceId,
      metadataJson,
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Customers can only create bookings for themselves
    let finalCustomerId = customerId || null;
    let finalCustomerName = customerName || null;
    let finalCustomerPhone = customerPhone || null;
    let finalCustomerEmail = customerEmail || null;
    let finalSource = source || 'manual';

    if (user.role === 'customer') {
      // Lock to the customer's own record
      const customer = await db.customer.findUnique({
        where: { id: user.id },
        select: { id: true, name: true, phone: true, email: true },
      });
      if (!customer) {
        return NextResponse.json(
          { error: 'Customer profile not found' },
          { status: 404 }
        );
      }
      finalCustomerId = customer.id;
      finalCustomerName = customer.name;
      finalCustomerPhone = customer.phone;
      finalCustomerEmail = customer.email || null;
      finalSource = 'website'; // customers always create website-source bookings
    }

    // Auto-confirm if source is manual
    const initialStatus = finalSource === 'manual' ? 'confirmed' : 'pending';

    const booking = await db.booking.create({
      data: {
        title,
        description: description || null,
        status: initialStatus,
        source: finalSource,
        customerId: finalCustomerId,
        customerName: finalCustomerName,
        customerPhone: finalCustomerPhone,
        customerEmail: finalCustomerEmail,
        employeeId: employeeId || null,
        serviceId: serviceId || null,
        branchId: branchId || null,
        address: address || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        scheduledEndTime: scheduledEndTime ? new Date(scheduledEndTime) : null,
        duration: duration || 60,
        notes: notes || null,
        confirmedAt: initialStatus === 'confirmed' ? new Date() : null,
        tenantId: user.tenantId,
        workspaceId: workspaceId || user.workspaceId,
        metadataJson: metadataJson || '{}',
      },
      include: {
        employee: {
          select: { id: true, name: true, phone: true, avatar: true },
        },
      },
    });

    // ─── Notify the tenant owner via Email + WhatsApp ──────────────
    try {
      const scheduledStr = booking.scheduledAt
        ? new Date(booking.scheduledAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
        : 'TBD'

      const waMessage = [
        '📅 *New Booking Created*',
        '',
        `*Title:* ${booking.title}`,
        `*Customer:* ${finalCustomerName || 'N/A'}`,
        finalCustomerPhone ? `*Phone:* ${finalCustomerPhone}` : '',
        finalCustomerEmail ? `*Email:* ${finalCustomerEmail}` : '',
        booking.address ? `*Address:* ${booking.address}` : '',
        `*Scheduled:* ${scheduledStr}`,
        `*Source:* ${finalSource}`,
        `*Status:* ${booking.status}`,
        booking.description ? `*Notes:* ${booking.description.slice(0, 120)}` : '',
      ].filter(Boolean).join('\n')

      const emailSubject = `📅 New Booking: ${booking.title}`
      const emailHtml = [
        `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px">`,
        `<h2 style="color:#0f172a">📅 New Booking Created</h2>`,
        `<p>A new booking has been created. Here are the details:</p>`,
        `<table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">`,
        `<tr><td style="padding:10px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb;width:35%">Title</td><td style="padding:10px;border:1px solid #e5e7eb">${booking.title}</td></tr>`,
        `<tr><td style="padding:10px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb">Customer</td><td style="padding:10px;border:1px solid #e5e7eb">${finalCustomerName || 'N/A'}</td></tr>`,
        finalCustomerPhone ? `<tr><td style="padding:10px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb">Phone</td><td style="padding:10px;border:1px solid #e5e7eb">${finalCustomerPhone}</td></tr>` : '',
        finalCustomerEmail ? `<tr><td style="padding:10px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb">Email</td><td style="padding:10px;border:1px solid #e5e7eb">${finalCustomerEmail}</td></tr>` : '',
        booking.address ? `<tr><td style="padding:10px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb">Address</td><td style="padding:10px;border:1px solid #e5e7eb">${booking.address}</td></tr>` : '',
        `<tr><td style="padding:10px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb">Scheduled</td><td style="padding:10px;border:1px solid #e5e7eb">${scheduledStr}</td></tr>`,
        `<tr><td style="padding:10px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb">Source</td><td style="padding:10px;border:1px solid #e5e7eb">${finalSource}</td></tr>`,
        `<tr><td style="padding:10px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb">Status</td><td style="padding:10px;border:1px solid #e5e7eb">${booking.status}</td></tr>`,
        `</table>`,
        `<p style="font-size:12px;color:#9ca3af">— Sent from ServiceOS</p>`,
        `</div>`,
      ].filter(Boolean).join('\n')
      const emailText = `New Booking Created\n\nTitle: ${booking.title}\nCustomer: ${finalCustomerName || 'N/A'}\n${finalCustomerPhone ? `Phone: ${finalCustomerPhone}\n` : ''}${finalCustomerEmail ? `Email: ${finalCustomerEmail}\n` : ''}${booking.address ? `Address: ${booking.address}\n` : ''}Scheduled: ${scheduledStr}\nSource: ${finalSource}\nStatus: ${booking.status}\n\n— Sent from ServiceOS`

      await notifyOwner(user.tenantId, {
        eventType: 'booking.created',
        eventLabel: 'New Booking',
        whatsappMessage: waMessage,
        emailSubject,
        emailHtml,
        emailText,
        bookingId: booking.id,
        customerId: finalCustomerId || undefined,
      })
    } catch (ownerErr) {
      console.error('[BookingsCreate] Owner notification failed:', ownerErr)
    }

    // ─── Send WhatsApp confirmation to customer ────────────────────
    if (booking.status === 'confirmed' && finalCustomerPhone) {
      try {
        const { notifyCustomerBookingConfirmed } = await import('@/lib/whatsapp-notifications');
        await notifyCustomerBookingConfirmed({
          id: booking.id,
          title: booking.title,
          customerName: finalCustomerName,
          customerPhone: finalCustomerPhone,
          scheduledAt: booking.scheduledAt?.toISOString() || null,
          tenantId: booking.tenantId,
          customerId: finalCustomerId || undefined,
        });
      } catch (custNotifyErr) {
        console.error('[BookingsCreate] Customer WhatsApp notification failed:', custNotifyErr);
      }
    }

    // ─── Auto-create deposit invoice if setting enabled ───────────
    try {
      const invSettings = await getInvoiceSettings(user.tenantId)
      if (invSettings.createDepositOnBooking && booking.status === 'confirmed') {
        const dep = await createDepositInvoiceFromBooking(booking.id)
        if (dep.success) {
          console.log(`[BookingsCreate] Auto-created deposit invoice ${dep.number}`)
        } else if (!dep.skipped) {
          console.error(`[BookingsCreate] Deposit invoice failed: ${dep.error}`)
        }
      }
    } catch (depErr) {
      console.error('[BookingsCreate] Deposit invoice error:', depErr)
    }

    // ─── Emit booking events via EventBus (for workflow automations) ──
    try {
      await EventBus.emit('booking.created', {
        booking: { id: booking.id, title: booking.title, status: booking.status, source: booking.source, customerName: booking.customerName, customerPhone: booking.customerPhone, scheduledAt: booking.scheduledAt?.toISOString() || null },
        resourceType: 'booking', resourceId: booking.id,
        tenantId: user.tenantId,
        workspaceId: booking.workspaceId || undefined,
      }, { tenantId: user.tenantId })
      // If the booking was created already-confirmed (manual source), also emit booking.confirmed
      if (booking.status === 'confirmed') {
        await EventBus.emit('booking.confirmed', {
          booking: { id: booking.id, title: booking.title, status: booking.status, customerName: booking.customerName, customerPhone: booking.customerPhone, scheduledAt: booking.scheduledAt?.toISOString() || null },
          resourceType: 'booking', resourceId: booking.id,
          tenantId: user.tenantId,
          workspaceId: booking.workspaceId || undefined,
        }, { tenantId: user.tenantId })
      }
    } catch (evtErr) {
      console.error('[BookingsCreate] EventBus emit failed:', evtErr)
    }

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
