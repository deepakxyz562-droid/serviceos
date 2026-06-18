import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/bookings — List bookings with filters
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
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

    // Build where clause scoped to tenant
    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
    };

    // Customers can only see their own bookings
    if (user.role === 'customer') {
      where.customerId = user.id;
    } else if (searchParams.get('customerId')) {
      where.customerId = searchParams.get('customerId');
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

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
