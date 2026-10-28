import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { ownerBusiness } from '@/lib/commerce/access';
import { computeTotals } from '@/lib/quote-flow-session';
import {
  extractGstStateCode,
  generateEWayBillPayload,
  generateEInvoicePayload,
} from '@/lib/billing/gst-invoice-helper';

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
      const totals = computeTotals(
        inv.items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice })),
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
      let existing = null;
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

    // 2. Generate Invoice sequence number
    let invoiceNumber = data.number;
    if (!invoiceNumber) {
      const updatedBusiness = await db.aiBusiness.update({
        where: { id: business.id },
        data: { invoiceSeq: { increment: 1 } },
        select: { invoiceSeq: true },
      });
      const year = new Date().getFullYear();
      invoiceNumber = `INV-${year}-${updatedBusiness.invoiceSeq}`;
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

    const storeGstin = configBilling.gstin || '';
    const storeStateCode = extractGstStateCode(storeGstin || business.address || '');
    const clientStateCode = extractGstStateCode(data.placeOfSupply || data.customerGstin || '');
    // No client state (B2C without GSTIN) defaults to intra-state supply (CGST+SGST).
    const isInterstate = Boolean(clientStateCode) && storeStateCode !== clientStateCode;

    let subtotal = 0;
    const computedItems = data.items.map((it) => {
      const rate = Number(it.unitPrice) || 0;
      const qty = Number(it.qty) || 1;
      const lineTaxable = rate * qty;
      const gstRate = Number(it.gstRate ?? data.taxRate ?? 18);
      subtotal += lineTaxable;

      const cgst = isInterstate ? 0 : lineTaxable * (gstRate / 200);
      const sgst = isInterstate ? 0 : lineTaxable * (gstRate / 200);
      const igst = isInterstate ? lineTaxable * (gstRate / 100) : 0;

      return {
        description: it.description,
        qty,
        unitPrice: rate,
        hsnCode: it.hsnCode || null,
        gstRate,
        unit: it.unit || 'pcs',
        taxableAmount: lineTaxable,
        cgst,
        sgst,
        igst,
      };
    });

    const discount =
      data.discountType === 'PERCENT'
        ? (subtotal * (data.discountValue || 0)) / 100
        : data.discountValue || 0;
    const taxableTotal = Math.max(0, subtotal - discount);

    const totalCgst = isInterstate ? 0 : (taxableTotal * (data.taxRate / 200));
    const totalSgst = isInterstate ? 0 : (taxableTotal * (data.taxRate / 200));
    const totalIgst = isInterstate ? (taxableTotal * (data.taxRate / 100)) : 0;
    const grandTotal = Math.round((taxableTotal + totalCgst + totalSgst + totalIgst) * 100) / 100;

    // 4. Create invoice record in database
    const createdInvoice = await db.aiInvoice.create({
      data: {
        businessId: business.id,
        customerId: customerId || null,
        number: invoiceNumber,
        status: data.status,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes || null,
        discountValue: data.discountValue,
        discountType: data.discountType,
        taxRate: data.taxRate,
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
      await db.aiPayment.create({
        data: {
          invoiceId: createdInvoice.id,
          amount: grandTotal,
          method: data.paymentMethod || 'CASH',
          notes: 'Recorded at invoice creation',
        },
      });
    }

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
      invoiceNumber,
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
      invoiceNumber,
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
