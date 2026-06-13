import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/review-requests — List review requests with filters
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const jobId = searchParams.get('jobId');
    const customerId = searchParams.get('customerId');
    const employeeId = searchParams.get('employeeId');
    const channel = searchParams.get('channel');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause scoped to tenant
    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
    };

    if (status) {
      const statuses = status.split(',');
      if (statuses.length === 1) {
        where.status = statuses[0];
      } else {
        where.status = { in: statuses };
      }
    }
    if (jobId) where.jobId = jobId;
    if (customerId) where.customerId = customerId;
    if (employeeId) where.employeeId = employeeId;
    if (channel) where.channel = channel;

    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [reviewRequests, total] = await Promise.all([
      db.reviewRequest.findMany({
        where,
        orderBy: { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.reviewRequest.count({ where }),
    ]);

    return NextResponse.json({
      reviewRequests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching review requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review requests' },
      { status: 500 }
    );
  }
}

// POST /api/review-requests — Create review request
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      jobId,
      customerId,
      employeeId,
      customerName,
      customerPhone,
      customerEmail,
      channel,
    } = body;

    if (!customerId && !customerPhone && !customerEmail) {
      return NextResponse.json(
        { error: 'Customer ID, phone, or email is required' },
        { status: 400 }
      );
    }

    // Look up customer details if customerId provided but name/phone missing
    let resolvedCustomerName = customerName;
    let resolvedCustomerPhone = customerPhone;
    let resolvedCustomerEmail = customerEmail;

    if (customerId && (!customerName || !customerPhone)) {
      const customer = await db.customer.findUnique({
        where: { id: customerId },
      });
      if (customer) {
        if (!resolvedCustomerName) resolvedCustomerName = customer.name;
        if (!resolvedCustomerPhone) resolvedCustomerPhone = customer.phone;
        if (!resolvedCustomerEmail) resolvedCustomerEmail = customer.email;
      }
    }

    const reviewRequest = await db.reviewRequest.create({
      data: {
        jobId: jobId || null,
        customerId: customerId || null,
        employeeId: employeeId || null,
        customerName: resolvedCustomerName || null,
        customerPhone: resolvedCustomerPhone || null,
        customerEmail: resolvedCustomerEmail || null,
        status: 'pending',
        channel: channel || 'whatsapp',
        tenantId: user.tenantId,
      },
    });

    return NextResponse.json(reviewRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating review request:', error);
    return NextResponse.json(
      { error: 'Failed to create review request' },
      { status: 500 }
    );
  }
}
