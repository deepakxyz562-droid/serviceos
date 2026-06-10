import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// GET /api/quotes — List quotes with filters
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');
    const leadId = searchParams.get('leadId');
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
    if (customerId) where.customerId = customerId;
    if (leadId) where.leadId = leadId;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { quoteNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [quotes, total] = await Promise.all([
      db.quote.findMany({
        where,
        orderBy: { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.quote.count({ where }),
    ]);

    return NextResponse.json({
      quotes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}

// POST /api/quotes — Create quote with line items, tax, discount calculations
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      itemsJson,
      tax,
      discount,
      customerId,
      leadId,
      validUntil,
      templateName,
      sentVia,
      currency,
      customerName,
      customerEmail,
      customerPhone,
      parentQuoteId,
      notesJson,
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Parse line items and calculate totals
    const items = typeof itemsJson === 'string' ? JSON.parse(itemsJson) : (itemsJson || []);
    const subtotal = items.reduce((sum: number, item: { quantity: number; unitPrice: number }) => {
      return sum + (item.quantity || 0) * (item.unitPrice || 0);
    }, 0);
    const taxAmount = tax !== undefined ? tax : 0;
    const discountAmount = discount !== undefined ? discount : 0;
    const total = subtotal + taxAmount - discountAmount;

    // Generate quote number
    const quoteCount = await db.quote.count({
      where: { tenantId: user.tenantId },
    });
    const quoteNumber = `QT-${String(quoteCount + 1).padStart(4, '0')}`;

    // Generate approval token
    const approvalToken = crypto.randomBytes(16).toString('hex');

    const quote = await db.quote.create({
      data: {
        title,
        description: description || null,
        itemsJson: JSON.stringify(items),
        subtotal,
        tax: taxAmount,
        discount: discountAmount,
        total: Math.max(0, total),
        status: 'draft',
        tenantId: user.tenantId,
        customerId: customerId || null,
        leadId: leadId || null,
        validUntil: validUntil ? new Date(validUntil) : null,
        quoteNumber,
        templateName: templateName || 'standard',
        approvalToken,
        sentVia: sentVia || null,
        currency: currency || 'USD',
        customerName: customerName || null,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        createdById: user.id,
        parentQuoteId: parentQuoteId || null,
        notesJson: notesJson || '[]',
      },
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error('Error creating quote:', error);
    return NextResponse.json(
      { error: 'Failed to create quote' },
      { status: 500 }
    );
  }
}
