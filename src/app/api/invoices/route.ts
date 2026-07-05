import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getExchangeRate, convertCurrency } from '@/lib/currency';
import { generateInvoiceNumber } from '@/lib/invoice-automation';
import { logActivity } from '@/lib/activity-log';

/**
 * Resolves a tenant ID from the auth user, falling back to the first tenant
 * for demo / cookieless sessions.
 */
async function resolveTenantId(authUser: Awaited<ReturnType<typeof getAuthUser>>): Promise<string | null> {
  if (authUser?.tenantId) {
    return authUser.tenantId;
  }

  try {
    const firstTenant = await db.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
    if (firstTenant) {
      return firstTenant.id;
    }
  } catch {
    // DB lookup failed
  }

  return null;
}

/**
 * GET /api/invoices
 * List invoices for the authenticated user's tenant
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    const tenantId = await resolveTenantId(authUser);

    if (!tenantId) {
      return NextResponse.json({ invoices: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '200');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const customerId = searchParams.get('customerId');

    const where: Record<string, unknown> = { tenantId };
    if (status && status !== 'all') {
      where.status = status;
    }
    if (customerId) {
      where.customerId = customerId;
    }
    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
          job: { select: { id: true, title: true } },
          employee: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.invoice.count({ where }),
    ]);

    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invoices
 * Create a new invoice
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { customerId, jobId, employeeId, items, dueDate, notes, discount, taxPercent, currency: invoiceCurrency } = body;

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 });
    }

    const tenantId = await resolveTenantId(authUser);
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    // Resolve tenant's base currency
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { currency: true },
    });
    const baseCurrency = tenant?.currency || 'USD';
    const transactionCurrency = invoiceCurrency || baseCurrency;

    // Calculate amounts
    const subtotal = items.reduce((sum: number, item: { quantity: number; rate: number }) => sum + item.quantity * item.rate, 0);
    const taxPercentVal = taxPercent || 0;
    const tax = subtotal * (taxPercentVal / 100);
    const discountVal = discount || 0;
    const total = subtotal + tax - discountVal;

    // Calculate exchange rate and base amount for multi-currency
    const exchangeRate = transactionCurrency === baseCurrency ? 1 : getExchangeRate(transactionCurrency, baseCurrency);
    const baseAmount = transactionCurrency === baseCurrency ? total : convertCurrency(total, transactionCurrency, baseCurrency, exchangeRate);

    // Generate a globally-unique invoice number. The `number` column is
    // @unique globally (not per-tenant), so a naive per-tenant count would
    // collide across tenants on multi-tenant deployments (Supabase/Postgres
    // → P2002 unique constraint violation → 500). generateInvoiceNumber()
    // detects collisions and appends a timestamp suffix when needed.
    const number = await generateInvoiceNumber(tenantId);

    const invoice = await db.invoice.create({
      data: {
        number,
        tenantId,
        jobId: jobId || null,
        customerId,
        employeeId: employeeId || null,
        amount: subtotal,
        tax,
        discount: discountVal,
        total,
        currency: transactionCurrency,
        exchangeRate,
        baseCurrency,
        baseAmount,
        status: 'draft',
        dueDate: dueDate ? new Date(dueDate) : null,
        itemsJson: JSON.stringify(items),
        notes: notes || null,
      },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        job: { select: { id: true, title: true } },
        employee: { select: { id: true, name: true } },
      },
    });

    // ─── V1.5 Activity Log ──────────────────────────────────────────
    // Best-effort — never fails the invoice creation.
    try {
      await logActivity({
        tenantId,
        actorId: authUser.id,
        actorName: authUser.name || authUser.email,
        actorType: 'user',
        action: 'create',
        entityType: 'invoice',
        entityId: invoice.id,
        entityName: invoice.number,
        description: `Created invoice ${invoice.number} for ${invoice.customer?.name || 'customer'} (${transactionCurrency} ${total.toFixed(2)})`,
        metadataJson: JSON.stringify({
          number: invoice.number,
          customerId,
          jobId: jobId || null,
          employeeId: employeeId || null,
          total,
          currency: transactionCurrency,
          status: 'draft',
        }),
        severity: 'info',
      });
    } catch (logErr) {
      console.error('[Invoices POST] Failed to log activity:', logErr);
    }

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    // Surface the underlying Prisma error code so the client can distinguish
    // unique-constraint collisions (P2002) from FK violations (P2003) etc.
    const code = (error as { code?: string })?.code;
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to create invoice', code, message: process.env.NODE_ENV === 'production' ? undefined : message },
      { status: 500 }
    );
  }
}
