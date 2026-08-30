import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { toISOString } from '@/lib/utils';
import { getExchangeRate, convertCurrency } from '@/lib/currency';
import { getAuthUser } from '@/lib/auth';
import { resolveTenantId } from '@/lib/api-auth';
import { EventBus } from '@/lib/event-bus';
import { requireCrmTenant } from '@/lib/require-crm-tenant';
import { resolveFallbackTenantCurrency } from '@/lib/tenant-resolver';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const crmGuard = await requireCrmTenant(req);
    if (crmGuard) return crmGuard;
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const customerIdParam = searchParams.get('customerId');
    const dealIdParam = searchParams.get('dealId');

    const where: Record<string, unknown> = {};
    // SECURITY: non-super-admins MUST have a tenantId. If they don't (edge
    // case: stale JWT), return 401 instead of leaving `where` empty (which
    // would return ALL quotes across ALL tenants).
    if (!user.isSuperAdmin) {
      if (!user.tenantId) {
        return NextResponse.json({ error: 'Tenant context required' }, { status: 401 });
      }
      where.tenantId = user.tenantId;
    }

    // Customers can only see their own quotes.
    // getAuthUser() already strips the `cust_` prefix, so user.id is the
    // raw Customer.id that matches Quote.customerId.
    // For admin/employee sessions, honour the optional customerId query param.
    if (user.role === 'customer') {
      where.customerId = user.id;
    } else if (customerIdParam) {
      where.customerId = customerIdParam;
    }

    // Optional filter by linked Deal — used by the Sales Pipeline view
    // to fetch the just-created draft Quote after a Deal moves to the
    // `quote_draft` stage.
    if (dealIdParam) {
      where.dealId = dealIdParam;
    }

    // C-2C: only name + phone are read from the linked customer (below), so
    // select just those instead of `customer: true` which pulled every column
    // — including passwordHash / activationToken — into server memory.
    const quotes = await db.quote.findMany({
      where,
      include: { customer: { select: { name: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = quotes.map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      customerName: q.customer?.name || 'Unknown',
      customerId: q.customerId || '',
      customerPhone: q.customer?.phone,
      services: JSON.parse(q.itemsJson || '[]'),
      addOns: JSON.parse(q.addOnsJson || '[]'),
      subtotal: q.subtotal,
      discountType: q.discountType,
      discountValue: q.discountType === 'percentage'
        ? q.subtotal > 0 ? Math.round((q.discount / q.subtotal) * 100) : 0
        : q.discount,
      discount: q.discount,
      taxRate: q.taxRate,
      tax: q.tax,
      total: q.total,
      currency: q.currency || 'USD',
      exchangeRate: q.exchangeRate || 1,
      baseCurrency: q.baseCurrency || 'USD',
      baseAmount: q.baseAmount || q.total,
      status: q.status,
      validUntil: q.validUntil ? toISOString(q.validUntil as Date | string | null)?.split('T')[0] ?? null : null,
      whatsappSent: q.whatsappSent,
      createdAt: toISOString(q.createdAt as Date | string)?.split('T')[0] ?? '',
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to fetch quotes:', error);
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const crmGuard = await requireCrmTenant(req);
    if (crmGuard) return crmGuard;
    // SECURITY: previously this handler had NO auth check — requireCrmTenant
    // returns null for unauthenticated users (it's a 403-only guard), so
    // anyone could create quotes in any tenant via body.tenantId.
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (!user.isSuperAdmin && !user.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 401 });
    }
    const body = await req.json();
    const {
      title, description, customerId,
      services, addOns, discountType, discountValue, taxRate, validUntil,
      currency: quoteCurrency,
      dealId,
    } = body;
    // SECURITY: derive tenantId from the session, never from the body
    const sessionTenantId = resolveTenantId(user, body.tenantId);

    // ─── Pre-fill from linked Deal (optional) ────────────────────────────
    // When `dealId` is provided (e.g. the user clicked "Create Quote" on
    // a Deal in the Sales Pipeline), look up the Deal so we can pre-fill
    // `customerId` / `leadId` / `currency` / `value` if the caller didn't
    // supply them. This makes the Quote ↔ Deal link bi-directional:
    //   - Deal → Quote: `ensureQuoteForDeal` (auto-create on stage change)
    //   - Quote → Deal: this lookup + the `dealId` field on the new row
    let resolvedCustomerId = customerId || null;
    let resolvedLeadId: string | null = null;
    let dealCurrency: string | null = null;
    if (dealId) {
      try {
        // SECURITY: tenant-scope the deal lookup so a user can't reference
        // another tenant's deal by ID.
        const dealWhere: Record<string, unknown> = { id: dealId };
        if (sessionTenantId) dealWhere.tenantId = sessionTenantId;
        const deal = await db.deal.findFirst({
          where: dealWhere,
          select: {
            id: true,
            currency: true,
            customerId: true,
            leadId: true,
            tenantId: true,
          },
        });
        if (deal) {
          resolvedCustomerId = resolvedCustomerId || deal.customerId || null;
          resolvedLeadId = deal.leadId || null;
          dealCurrency = deal.currency || null;
        }
      } catch (dealErr) {
        // Non-fatal — continue with whatever fields the caller supplied.
        console.error('[Quotes POST] Failed to look up Deal for dealId:', dealId, dealErr);
      }
    }

    if (!title || !resolvedCustomerId) {
      return NextResponse.json({ error: 'Title and customer are required' }, { status: 400 });
    }

    const servicesList = services || [];
    const addOnsList = addOns || [];

    const servicesTotal = servicesList.reduce((s: number, item: any) => s + (item.price || 0) * (item.quantity || 1), 0);
    const addOnsTotal = addOnsList.reduce((s: number, a: any) => s + (a.price || 0), 0);
    const subtotal = servicesTotal + addOnsTotal;

    const discount = discountType === 'percentage'
      ? subtotal * ((discountValue || 0) / 100)
      : (discountValue || 0);
    const afterDiscount = subtotal - discount;
    const tax = afterDiscount * ((taxRate || 0) / 100);
    const total = afterDiscount + tax;

    // Resolve base currency from tenant (C-2C + cache: uses shared cached helper)
    const baseCurrency = await resolveFallbackTenantCurrency();

    // Prefer the caller-supplied currency; fall back to the Deal's
    // currency (when a Deal is linked); finally fall back to the
    // tenant base currency.
    const transactionCurrency = quoteCurrency || dealCurrency || baseCurrency;
    const exchangeRate = transactionCurrency === baseCurrency ? 1 : getExchangeRate(transactionCurrency, baseCurrency);
    const baseAmount = transactionCurrency === baseCurrency ? total : convertCurrency(total, transactionCurrency, baseCurrency, exchangeRate);

    const quote = await db.quote.create({
      data: {
        title,
        description: description || null,
        customerId: resolvedCustomerId,
        leadId: resolvedLeadId,
        dealId: dealId || null, // ← soft FK -> Deal.id
        itemsJson: JSON.stringify(servicesList),
        addOnsJson: JSON.stringify(addOnsList),
        subtotal,
        discount,
        discountType: discountType || 'fixed',
        taxRate: taxRate || 0,
        tax,
        total,
        currency: transactionCurrency,
        exchangeRate,
        baseCurrency,
        baseAmount,
        status: 'draft',
        validUntil: validUntil ? new Date(validUntil) : null,
        tenantId: sessionTenantId,
      },
    });

    // ─── Emit quote.created event ───────────────────────────────────────
    // Best-effort — never fails the quote creation. Triggers workflow
    // automations like "1 hour after quote created" follow-ups.
    try {
      await EventBus.emit(
        'quote.created',
        {
          quoteId: quote.id,
          customerId: quote.customerId || null,
          tenantId: quote.tenantId || null,
          resourceType: 'quote',
          resourceId: quote.id,
        },
        { tenantId: quote.tenantId || undefined }
      );
    } catch (eventErr) {
      console.error('[Quotes POST] quote.created event failed:', eventErr);
    }

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error('Failed to create quote:', error);
    return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
  }
}
