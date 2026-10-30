import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { ownerBusiness } from '@/lib/commerce/access';
import { computeTotals, computeInvoiceTotals, round2 } from '@/lib/quote-flow-calc';
import {
  extractGstStateCode,
  generateEWayBillPayload,
  generateEInvoicePayload,
} from '@/lib/billing/gst-invoice-helper';
import { auditAmountLabel, logCommerceActivity, resolveCommerceActor } from '@/lib/commerce/audit';

const createInvoiceSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().optional(),
  customerAddress: z.string().optional(),
  customerGstin: z.string().optional(),
  number: z.string().optional(),
  date: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'UNPAID', 'PARTIALLY_PAID']).default('DRAFT'),
  notes: z.string().optional().nullable(),
  discountValue: z.number().min(0).default(0),
  discountType: z.enum(['AMOUNT', 'PERCENT']).default('AMOUNT'),
  taxRate: z.number().min(0).max(100).default(18),
  placeOfSupply: z.string().optional(),
  paymentMethod: z.string().optional(),
  items: z.array(
    z.object({
      description: z.string().min(1),
      qty: z.number().positive(),
      unitPrice: z.number().min(0),
      hsnCode: z.string().optional().nullable(),
      gstRate: z.number().optional(),
      unit: z.string().optional(),
    })
  ).min(1, 'Invoice must have at least one line item'),
  transport: z.object({
    transporterId: z.string().optional(),
    transporterName: z.string().optional(),
    vehicleNo: z.string().optional(),
    distanceKm: z.number().optional(),
    mode: z.string().optional(),
  }).optional(),
  generateEWayBill: z.boolean().optional(),
  generateEInvoice: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    const business = await ownerBusiness(req);
    const { searchParams } = new URL(req.url);

    // Optional list filters. The `overview` stats below are ALWAYS computed
    // over the full book (all invoices of the business) so header metrics
    // never shrink when the merchant filters the list (Vyapar behavior).
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const statusParam = searchParams.get('status')?.toUpperCase().trim();
    const qParam = searchParams.get('q')?.toLowerCase().trim();

    const fromMs = fromParam ? new Date(`${fromParam}T00:00:00`).getTime() : null;
    const toMs = toParam ? new Date(`${toParam}T23:59:59.999`).getTime() : null;
    const VALID_STATUSES = ['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'UNPAID'] as const;
    const statusFilter =
      statusParam && (VALID_STATUSES as readonly string[]).includes(statusParam)
        ? statusParam
        : null;

    const invoices = await db.aiInvoice.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        items: true,
        payments: true,
      },
    });

    const now = new Date();
    let totalPaid = 0;
    let totalUnpaid = 0;
    let totalOverdue = 0;
    let totalInvoiced = 0;

    const enriched = invoices.map((inv) => {
      // Canonical math (computeInvoiceTotals): per-line GST rate with the
      // invoice-level rate as fallback — mirrors how the rows were persisted.
      const totals = computeTotals(
        inv.items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice, taxRate: i.gstRate ?? inv.taxRate })),
        inv.discountValue,
        inv.discountType,
        inv.taxRate,
        business.currency
      );
      const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
      const effectivePaid = Math.min(paid, totals.total);
      const balance = Math.max(0, totals.total - paid);

      totalInvoiced += totals.total;
      totalPaid += effectivePaid;
      if (balance > 0) {
        const isOverdue = inv.status === 'OVERDUE' || (inv.dueDate && new Date(inv.dueDate) < now);
        if (isOverdue) {
          totalOverdue += balance;
        } else {
          totalUnpaid += balance;
        }
      }

      return {
        id: inv.id,
        invoiceNumber: inv.number,
        number: inv.number,
        date: new Date(inv.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        dueDate: inv.dueDate
          ? new Date(inv.dueDate).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : '',
        customerName: inv.customer?.name || 'Walk-in Customer',
        customerPhone: inv.customer?.phone || '',
        customerGstin: inv.customer?.gstin || '',
        customerAddress: inv.customer?.address || '',
        customerId: inv.customerId,
        status: inv.status === 'PAID' ? 'Paid' : balance === 0 ? 'Paid' : inv.status === 'DRAFT' ? 'Draft' : 'Unpaid',
        rawStatus: inv.status,
        totalAmount: totals.total,
        subtotalAmount: totals.subtotal,
        taxAmount: totals.tax,
        paidAmount: effectivePaid,
        balance,
        items: inv.items.map((it) => ({
          id: it.id,
          name: it.description,
          description: it.description,
          qty: it.qty,
          unitPrice: it.unitPrice,
          rate: it.unitPrice,
          hsnSac: it.hsnCode || '',
          gstRate: it.gstRate ?? null,
          amount: it.qty * it.unitPrice,
        })),
        payments: inv.payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          method: p.method,
          paidAt: p.paidAt,
          reference: p.reference || '',
        })),
        createdAt: inv.createdAt,
      };
    });

    // Book-wide overview (never affected by the list filters).
    const overview = {
      totalInvoiced: Math.round(totalInvoiced),
      totalPaid: Math.round(totalPaid),
      totalUnpaid: Math.round(totalUnpaid),
      totalOverdue: Math.round(totalOverdue),
      count: invoices.length,
    };

    // Apply list filters AFTER the overview is computed.
    const filtered = enriched.filter((row) => {
      if (statusFilter && row.rawStatus !== statusFilter) return false;

      const createdMs = new Date(row.createdAt).getTime();
      if (fromMs !== null && createdMs < fromMs) return false;
      if (toMs !== null && createdMs > toMs) return false;

      if (qParam) {
        const haystack = `${row.customerName} ${row.invoiceNumber} ${row.customerPhone}`.toLowerCase();
        if (!haystack.includes(qParam)) return false;
      }

      return true;
    });

    return NextResponse.json({
      invoices: filtered,
      overview,
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const business = await ownerBusiness(req, 'canCreateInvoices');
    const body = await req.json();
    const parsed = createInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid invoice input', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // 1. Resolve or create customer (with strict tenant/business ownership validation)
    let customerId = data.customerId;
    if (customerId) {
      const validCustomer = await db.aiCustomer.findFirst({
        where: { id: customerId, businessId: business.id },
      });
      if (!validCustomer) {
        customerId = undefined;
      }
    }
    if (!customerId && (data.customerName || data.customerPhone)) {
      const cleanPhone = (data.customerPhone || '').replace(/\D/g, '');
      let existing: any = null;
      if (cleanPhone) {
        existing = await db.aiCustomer.findFirst({
          where: { businessId: business.id, phone: { contains: cleanPhone.slice(-10) } },
        });
      }
      if (existing) {
        customerId = existing.id;
        if (data.customerGstin && !existing.gstin) {
          await db.aiCustomer.update({
            where: { id: existing.id },
            data: { gstin: data.customerGstin },
          });
        }
      } else {
        const createdCust = await db.aiCustomer.create({
          data: {
            businessId: business.id,
            name: data.customerName || 'Walk-in Customer',
            phone: data.customerPhone || null,
            email: data.customerEmail || null,
            address: data.customerAddress || null,
            gstin: data.customerGstin || null,
          },
        });
        customerId = createdCust.id;
      }
    }

    // 3. Tax computations
    const config = await db.gptformCommerceConfig.findFirst({
      where: { businessId: business.id },
    });
    let configBilling: any = {};
    try {
      if (config?.fieldsJson) {
        const raw = JSON.parse(config.fieldsJson);
        configBilling = raw.billing || {};
      }
    } catch {}

    const storeGstin = configBilling.gstin || business.gstin || '';
    // Inter-state determination: merchant state = leading 2-digit state code of
    // the store GSTIN (or business.stateCode); customer state = leading code of
    // placeOfSupply/customerGstin. IGST only when BOTH are known and differ;
    // unknown → intra-state (CGST+SGST).
    const merchantState =
      extractGstStateCode(storeGstin, '') || extractGstStateCode(business.stateCode, '');
    const customerState =
      extractGstStateCode(data.placeOfSupply, '') || extractGstStateCode(data.customerGstin, '');
    const isInterstate = Boolean(merchantState && customerState) && merchantState !== customerState;

    // ONE canonical math (computeInvoiceTotals): discount applied BEFORE tax,
    // GST computed per-line on the pro-rata discounted base.
    const totals = computeInvoiceTotals({
      items: data.items.map((it) => ({
        qty: Number(it.qty) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        taxRate: it.gstRate ?? data.taxRate,
      })),
      discountValue: data.discountValue,
      discountType: data.discountType,
      globalTaxRate: data.taxRate,
    });

    // subtotal (tax-EXCLUSIVE, pre-discount) and discount live inside `totals`.
    const taxableTotal = round2(totals.subtotal - totals.discount); // post-discount GST base
    const totalCgst = isInterstate ? 0 : totals.cgstAmount;
    const totalSgst = isInterstate ? 0 : totals.sgstAmount;
    const totalIgst = isInterstate ? totals.gstAmount : 0;
    const grandTotal = totals.total;

    // Per-line amounts for the e-Way/e-invoice payloads — same pro-rata discount
    // factor as computeInvoiceTotals so the payload reconciles with the totals.
    const factor = totals.subtotal > 0 ? (totals.subtotal - totals.discount) / totals.subtotal : 0;
    const computedItems = data.items.map((it) => {
      const rate = Number(it.unitPrice) || 0;
      const qty = Number(it.qty) || 1;
      const gstRate = Number(it.gstRate ?? data.taxRate ?? 18);
      const lineTaxable = round2(rate * qty * factor);
      const lineTax = round2(rate * qty * factor * (gstRate / 100));

      return {
        description: it.description,
        qty,
        unitPrice: rate,
        hsnCode: it.hsnCode || null,
        gstRate,
        unit: it.unit || 'pcs',
        taxableAmount: lineTaxable,
        cgst: isInterstate ? 0 : round2(lineTax / 2),
        sgst: isInterstate ? 0 : round2(lineTax / 2),
        igst: isInterstate ? lineTax : 0,
      };
    });

    // 4. Create the invoice + items + (optional) opening payment ATOMICALLY.
    // The sequence-based number assignment, the invoice+items create and the
    // PAID auto-payment all run in ONE db.$transaction (mirrors
    // quote-flow/invoices), so a caller never sees a half-created invoice.
    // P2002 retry: the (businessId, number) unique constraint can reject a
    // sequence number consumed by a concurrent creation — retry with a fresh
    // invoiceSeq increment (max 3 attempts), then give up with 409.
    const createInvoiceTx = () =>
      db.$transaction(async (tx) => {
        let invoiceNumber = data.number;
        if (!invoiceNumber) {
          const updatedBusiness = await tx.aiBusiness.update({
            where: { id: business.id },
            data: { invoiceSeq: { increment: 1 } },
            select: { invoiceSeq: true },
          });
          const year = new Date().getFullYear();
          invoiceNumber = `INV-${year}-${updatedBusiness.invoiceSeq}`;
        }

        const inv = await tx.aiInvoice.create({
          data: {
            businessId: business.id,
            customerId: customerId || undefined,
            number: invoiceNumber,
            status: data.status,
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            notes: data.notes || null,
            discountValue: data.discountValue,
            discountType: data.discountType,
            taxRate: data.taxRate,
            // GST context snapshot (Phase 1) — used downstream for IGST/CGST
            // decisions (reports, PDFs) and e-way/e-invoice payloads.
            placeOfSupply: data.placeOfSupply?.trim().slice(0, 60) || null,
            customerGstin: data.customerGstin?.trim().toUpperCase().slice(0, 15) || null,
            items: {
              create: computedItems.map((it) => ({
                description: it.description,
                qty: it.qty,
                unitPrice: it.unitPrice,
                hsnCode: it.hsnCode,
                gstRate: it.gstRate, // persist the per-line GST rate snapshot (was silently dropped before)
              })),
            },
          },
          include: {
            customer: true,
            items: true,
            payments: true,
          },
        });

        if (data.status === 'PAID') {
          await tx.aiPayment.create({
            data: {
              invoiceId: inv.id,
              amount: grandTotal,
              method: data.paymentMethod || 'CASH',
              notes: 'Recorded at invoice creation',
            },
          });
        }

        return inv;
      });

    let createdInvoice: Awaited<ReturnType<typeof createInvoiceTx>> | null = null;
    for (let attempt = 0; attempt < 3 && !createdInvoice; attempt++) {
      try {
        createdInvoice = await createInvoiceTx();
      } catch (err: any) {
        // P2002 = unique constraint violation on (businessId, number). A
        // sequence-generated number is retried (each attempt re-increments
        // invoiceSeq inside the rolled-back transaction); a caller-provided
        // number is a hard conflict.
        if (err?.code === 'P2002' && !data.number) continue;
        if (err?.code === 'P2002') break;
        throw err;
      }
    }
    if (!createdInvoice) {
      return NextResponse.json({ error: 'Invoice number conflict, please retry' }, { status: 409 });
    }

    // Commerce audit trail — fire-and-forget; a logging failure can never
    // fail the invoice that was just created (logCommerceActivity swallows).
    const invoiceActor = await resolveCommerceActor(req);
    await logCommerceActivity({
      business,
      actorId: invoiceActor.actorId,
      actorName: invoiceActor.actorName,
      action: 'create',
      entityType: 'invoice',
      entityId: createdInvoice.id,
      entityName: createdInvoice.number,
      description: `Invoice ${createdInvoice.number} created for ${data.customerName || 'Walk-in Customer'} — ${auditAmountLabel(business, grandTotal)}`,
      metadata: {
        invoiceId: createdInvoice.id,
        number: createdInvoice.number,
        total: grandTotal,
        status: createdInvoice.status,
        itemCount: computedItems.length,
        customerId: customerId || null,
      },
    });

    // 5. Generate compliant E-Way Bill & E-Invoice payloads if requested or applicable
    const storeMeta = {
      businessName: business.name || 'Store',
      gstin: storeGstin,
      address: business.address || '',
      city: '',
      state: business.address || '',
      pincode: '',
      phone: business.phone || '',
    };

    const customerMeta = {
      name: data.customerName || 'Walk-in Client',
      gstin: data.customerGstin || '',
      address: data.customerAddress || '',
      city: '',
      state: data.placeOfSupply || '',
      pincode: '',
    };

    const totalsMeta = {
      taxableAmount: taxableTotal,
      cgst: totalCgst,
      sgst: totalSgst,
      igst: totalIgst,
      totalAmount: grandTotal,
    };

    const eWayBill = generateEWayBillPayload({
      invoiceNumber: createdInvoice.number,
      invoiceDate: data.date || new Date().toISOString(),
      store: storeMeta,
      customer: customerMeta,
      items: computedItems.map((it) => ({
        name: it.description,
        hsnSac: it.hsnCode || '19023090',
        qty: it.qty,
        unit: it.unit,
        rate: it.unitPrice,
        gstRate: it.gstRate,
        taxableAmount: it.taxableAmount,
        cgst: it.cgst,
        sgst: it.sgst,
        igst: it.igst,
      })),
      transport: data.transport,
      totals: totalsMeta,
    });

    const eInvoice = generateEInvoicePayload({
      invoiceNumber: createdInvoice.number,
      invoiceDate: data.date || new Date().toISOString(),
      store: storeMeta,
      customer: customerMeta,
      items: computedItems.map((it) => ({
        name: it.description,
        hsnSac: it.hsnCode || '19023090',
        qty: it.qty,
        unit: it.unit,
        rate: it.unitPrice,
        gstRate: it.gstRate,
        taxableAmount: it.taxableAmount,
        cgst: it.cgst,
        sgst: it.sgst,
        igst: it.igst,
      })),
      totals: totalsMeta,
    });

    return NextResponse.json({
      success: true,
      invoice: {
        id: createdInvoice.id,
        number: createdInvoice.number,
        invoiceNumber: createdInvoice.number,
        totalAmount: grandTotal,
        subtotalAmount: taxableTotal,
        taxAmount: totalCgst + totalSgst + totalIgst,
        status: createdInvoice.status,
        createdAt: createdInvoice.createdAt,
      },
      eWayBill,
      eInvoice,
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (e.message === 'FORBIDDEN' || e.message === 'FORBIDDEN_INSUFFICIENT_ROLE') {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to create invoices' }, { status: 403 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
