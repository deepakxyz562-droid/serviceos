import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/contacts — List customers with search, filter
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause — use workspaceId if authenticated, otherwise show all
    const where: Record<string, unknown> = {};

    if (authUser?.workspaceId) {
      where.workspaceId = authUser.workspaceId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        orderBy: { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              jobs: true,
              invoices: true,
              leads: true,
            },
          },
        },
      }),
      db.customer.count({ where }),
    ]);

    return NextResponse.json({
      contacts: customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

// POST /api/contacts — Create customer
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);

    const body = await request.json();
    const { name, phone, email, address, whatsappId } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone is required' },
        { status: 400 }
      );
    }

    // Check for duplicate phone in same workspace
    if (authUser?.workspaceId) {
      const existing = await db.customer.findFirst({
        where: {
          phone,
          workspaceId: authUser.workspaceId,
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'A customer with this phone number already exists', existing },
          { status: 409 }
        );
      }
    }

    const customer = await db.customer.create({
      data: {
        name,
        phone,
        email: email || null,
        address: address || null,
        whatsappId: whatsappId || null,
        workspaceId: authUser?.workspaceId || null,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    );
  }
}
