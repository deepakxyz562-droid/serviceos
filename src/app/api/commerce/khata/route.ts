import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';

export const runtime = 'nodejs';

/**
 * GET /api/commerce/khata
 * Customer Udhaar & Receivables Ledger
 * Calculates "Aapko Milega" (Customer Dues) and "Aapko Dena Hai" (Supplier Dues)
 */
export async function GET(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase().trim();

    // 0. Fetch the commerce config to resolve the merchant's configured UPI ID
    // (used for WhatsApp payment reminders). Falls back to business.phone only
    // when the merchant hasn't configured a UPI ID.
    const commerceConfig = await db.gptformCommerceConfig.findFirst({
      where: {
        OR: [
          { businessId: business.id },
          ...(business.tenantId ? [{ businessId: business.tenantId }] : []),
        ],
      },
      select: { upiId: true },
    });
    const merchantUpiId = commerceConfig?.upiId || business.phone || '';

    // 1. Fetch all orders for this business
    const orders = await db.gptformCommerceOrder.findMany({
      where: {
        businessId: business.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    // 2. Fetch AI Invoices with balance
    const invoices = await db.aiInvoice.findMany({
      where: {
        businessId: business.id,
      },
      include: {
        customer: true,
        items: true,
        payments: true,
      },
    });

    // 3. Map Customer Udhaar
    interface CustomerUdhaar {
      phone: string;
      name: string;
      balance: number;
      oldestPendingDate: Date;
      daysPending: number;
      unpaidOrdersCount: number;
      unpaidOrders: Array<{ id: string; number: string; total: number; date: Date }>;
      whatsappReminderText: string;
      whatsappReminderUrl: string;
    }

    const udhaarMap = new Map<string, CustomerUdhaar>();

    for (const ord of orders) {
      if (ord.paymentStatus === 'PAID') continue; // Only unpaid / detection pending

      const cleanPhone = (ord.customerPhone || '').replace(/\D/g, '');
      if (!cleanPhone) continue;

      let entry = udhaarMap.get(cleanPhone);
      if (!entry) {
        entry = {
          phone: cleanPhone,
          name: ord.customerName || 'Customer',
          balance: 0,
          oldestPendingDate: ord.createdAt,
          daysPending: 0,
          unpaidOrdersCount: 0,
          unpaidOrders: [],
          whatsappReminderText: '',
          whatsappReminderUrl: '',
        };
        udhaarMap.set(cleanPhone, entry);
      }

      entry.balance += Number(ord.total) || 0;
      entry.unpaidOrdersCount += 1;
      entry.unpaidOrders.push({
        id: ord.id,
        number: ord.id.slice(-6).toUpperCase(),
        total: ord.total,
        date: ord.createdAt,
      });

      if (new Date(ord.createdAt) < new Date(entry.oldestPendingDate)) {
        entry.oldestPendingDate = ord.createdAt;
      }
    }

    // Process balances & generate WhatsApp reminders
    const now = Date.now();
    let totalAapkoMilega = 0;

    let customers = Array.from(udhaarMap.values()).map((c) => {
      totalAapkoMilega += c.balance;
      const diffMs = now - new Date(c.oldestPendingDate).getTime();
      c.daysPending = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      const greeting = c.name !== 'Customer' ? `Dear ${c.name}` : 'Hello';
      const upiLink = merchantUpiId
        ? `upi://pay?pa=${encodeURIComponent(merchantUpiId)}&pn=${encodeURIComponent(business.name)}&am=${c.balance.toFixed(2)}&cu=INR`
        : '';
      const paymentLine = upiLink
        ? `Please tap here to clear your payment via UPI: ${upiLink}`
        : `Please contact us to clear your outstanding balance.`;
      const text = `${greeting}, a friendly reminder from *${business.name}*:\n\nYou have an outstanding balance of *₹${c.balance.toFixed(2)}* across ${c.unpaidOrdersCount} order(s).\n\n${paymentLine}\n\nThank you for your business!`;

      c.whatsappReminderText = text;
      c.whatsappReminderUrl = `https://wa.me/${c.phone}?text=${encodeURIComponent(text)}`;

      return {
        ...c,
        balance: Number(c.balance.toFixed(2)),
      };
    });

    if (search) {
      customers = customers.filter(
        (c) => c.name.toLowerCase().includes(search) || c.phone.includes(search)
      );
    }

    // Sort by largest balance descending
    customers.sort((a, b) => b.balance - a.balance);

    // ── Supplier side ("Aapko Dena Hai" — Payables) ───────────────────────
    // Outstanding purchase orders (draft/sent/partial) represent money the
    // merchant owes suppliers. Received/cancelled POs are settled.
    const outstandingPurchaseOrders = await db.purchaseOrder.findMany({
      where: {
        OR: [
          { tenantId: business.id },
          ...(business.tenantId ? [{ tenantId: business.tenantId }] : []),
        ],
        status: { in: ['draft', 'sent', 'partial'] },
      },
      include: {
        supplier: { select: { id: true, name: true, phone: true, email: true } },
      },
      orderBy: { orderDate: 'asc' },
      take: 500,
    }).catch(() => []);

    interface SupplierDue {
      supplierId: string;
      supplierName: string;
      supplierPhone?: string | null;
      supplierEmail?: string | null;
      balance: number;
      outstandingOrdersCount: number;
      outstandingOrders: Array<{ id: string; poNumber: string | null; total: number; orderDate: Date }>;
      oldestPendingDate: Date;
      daysPending: number;
      whatsappReminderText: string;
      whatsappReminderUrl: string;
    }

    const supplierMap = new Map<string, SupplierDue>();
    let totalAapkoDenaHai = 0;

    for (const po of outstandingPurchaseOrders) {
      const supplierKey = po.supplierId || po.supplier?.id || 'unknown';
      const supplierName = po.supplier?.name || 'Unknown Supplier';
      if (!supplierMap.has(supplierKey)) {
        supplierMap.set(supplierKey, {
          supplierId: supplierKey,
          supplierName,
          supplierPhone: po.supplier?.phone || null,
          supplierEmail: po.supplier?.email || null,
          balance: 0,
          outstandingOrdersCount: 0,
          outstandingOrders: [],
          oldestPendingDate: po.orderDate,
          daysPending: 0,
          whatsappReminderText: '',
          whatsappReminderUrl: '',
        });
      }
      const entry = supplierMap.get(supplierKey)!;
      entry.balance += Number(po.totalAmount) || 0;
      entry.outstandingOrdersCount += 1;
      entry.outstandingOrders.push({
        id: po.id,
        poNumber: po.poNumber,
        total: Number(po.totalAmount) || 0,
        orderDate: po.orderDate,
      });
      if (new Date(po.orderDate) < new Date(entry.oldestPendingDate)) {
        entry.oldestPendingDate = po.orderDate;
      }
    }

    const suppliers = Array.from(supplierMap.values()).map((s) => {
      totalAapkoDenaHai += s.balance;
      const diffMsSup = now - new Date(s.oldestPendingDate).getTime();
      s.daysPending = Math.max(0, Math.floor(diffMsSup / (1000 * 60 * 60 * 24)));

      const cleanSupPhone = (s.supplierPhone || '').replace(/\D/g, '');
      const supGreeting = s.supplierName !== 'Unknown Supplier' ? `Dear ${s.supplierName}` : 'Hello';
      const supText = `${supGreeting}, a reminder from *${business.name}*:\n\nWe have an outstanding payable of *₹${s.balance.toFixed(2)}* across ${s.outstandingOrdersCount} purchase order(s).\n\nWe will process your payment shortly. Thank you for your continued supply.`;
      s.whatsappReminderText = supText;
      s.whatsappReminderUrl = cleanSupPhone
        ? `https://wa.me/${cleanSupPhone}?text=${encodeURIComponent(supText)}`
        : '';

      return { ...s, balance: Number(s.balance.toFixed(2)) };
    });

    suppliers.sort((a, b) => b.balance - a.balance);

    return NextResponse.json({
      summary: {
        totalAapkoMilega: Number(totalAapkoMilega.toFixed(2)),
        customersWithDuesCount: customers.length,
        totalAapkoDenaHai: Number(totalAapkoDenaHai.toFixed(2)),
        suppliersWithDuesCount: suppliers.length,
      },
      customers,
      suppliers,
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to fetch khata:', e);
    return NextResponse.json({ error: e.message || 'Failed to fetch khata' }, { status: 500 });
  }
}

/**
 * POST /api/commerce/khata
 * Record payment received or new Udhaar entry
 */
export async function POST(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const body = await req.json();
    const { customerPhone, customerName, type = 'GOT_PAYMENT', amount, note, paymentMethod = 'CASH', supplierId, purchaseOrderId } = body;

    const parsedAmount = Number(amount);

    // Supplier payment: marks a purchase order as received/paid.
    // Required: supplierId (or purchaseOrderId) + positive amount.
    if (type === 'PAID_SUPPLIER') {
      if (!parsedAmount || parsedAmount <= 0) {
        return NextResponse.json({ error: 'A positive amount is required' }, { status: 400 });
      }
      const poId = purchaseOrderId || supplierId; // if supplierId is actually a PO id
      if (!poId) {
        return NextResponse.json({ error: 'purchaseOrderId is required to record a supplier payment' }, { status: 400 });
      }

      // Find the oldest outstanding PO for this tenant that belongs to the
      // supplier (or matches the id directly).
      const outstandingPOs = await db.purchaseOrder.findMany({
        where: {
          OR: [
            { tenantId: business.id },
            ...(business.tenantId ? [{ tenantId: business.tenantId }] : []),
          ],
          ...(supplierId && !purchaseOrderId ? { supplierId } : {}),
          ...(purchaseOrderId ? { id: purchaseOrderId } : {}),
          status: { in: ['draft', 'sent', 'partial'] },
        },
        orderBy: { orderDate: 'asc' },
      }).catch(() => []);

      if (outstandingPOs.length === 0) {
        return NextResponse.json({ error: 'No outstanding purchase orders found for this supplier' }, { status: 404 });
      }

      let remainingSup = parsedAmount;
      const settledPOIds: string[] = [];

      for (const po of outstandingPOs) {
        if (remainingSup <= 0) break;
        if (remainingSup >= Number(po.totalAmount)) {
          await db.purchaseOrder.update({
            where: { id: po.id },
            data: {
              status: 'received',
              receivedDate: new Date(),
              notes: `${po.notes || ''} • [Paid via Khata: ₹${po.totalAmount} on ${new Date().toLocaleDateString()}]`.trim(),
            },
          }).catch(() => {});
          remainingSup -= Number(po.totalAmount);
          settledPOIds.push(po.id);
        } else {
          // Partial payment — keep status as 'partial'
          await db.purchaseOrder.update({
            where: { id: po.id },
            data: {
              status: 'partial',
              notes: `${po.notes || ''} • [Partial Khata Payment: ₹${remainingSup} via ${paymentMethod}]`.trim(),
            },
          }).catch(() => {});
          remainingSup = 0;
          settledPOIds.push(po.id);
        }
      }

      return NextResponse.json({
        success: true,
        type: 'PAID_SUPPLIER',
        amount: parsedAmount,
        settledPOsCount: settledPOIds.length,
        message: `Successfully recorded supplier payment of ₹${parsedAmount.toFixed(2)}.`,
      });
    }

    if (!customerPhone || !parsedAmount || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Customer phone and positive amount are required' }, { status: 400 });
    }

    const cleanPhone = String(customerPhone).replace(/\D/g, '');

    if (type === 'GOT_PAYMENT') {
      // Find customer's unpaid orders and mark oldest paid first
      const unpaidOrders = await db.gptformCommerceOrder.findMany({
        where: {
          businessId: business.id,
          customerPhone: cleanPhone,
          paymentStatus: { in: ['UNPAID', 'DETECTION_PENDING'] },
        },
        orderBy: { createdAt: 'asc' },
      });

      let remaining = parsedAmount;
      const updatedOrderIds: string[] = [];

      for (const ord of unpaidOrders) {
        if (remaining <= 0) break;
        if (remaining >= ord.total) {
          await db.gptformCommerceOrder.update({
            where: { id: ord.id },
            data: {
              paymentStatus: 'PAID',
              paymentMethod,
              notes: `${ord.notes || ''} • [Cleared via Khata: ₹${ord.total} on ${new Date().toLocaleDateString()}]`.trim(),
            },
          });
          remaining -= ord.total;
          updatedOrderIds.push(ord.id);
        } else {
          // Partial clearance
          await db.gptformCommerceOrder.update({
            where: { id: ord.id },
            data: {
              notes: `${ord.notes || ''} • [Partial Khata Payment: ₹${remaining} via ${paymentMethod}]`.trim(),
            },
          });
          remaining = 0;
          updatedOrderIds.push(ord.id);
        }
      }

      return NextResponse.json({
        success: true,
        type: 'GOT_PAYMENT',
        amount: parsedAmount,
        clearedOrdersCount: updatedOrderIds.length,
        message: `Successfully recorded payment of ₹${parsedAmount.toFixed(2)} from ${cleanPhone}.`,
      });
    } else {
      // GAVE_UDHAAR: Creates a manual Khata order record.
      //
      // `configId` is a real FK to `GptformCommerceConfig.id` (Cascade). The
      // legacy `'khata-ledger'` literal violated that FK in Postgres. Resolve
      // the merchant's real commerce config here, creating a fresh one if the
      // merchant has none yet, and use its id.
      let config = await db.gptformCommerceConfig.findFirst({
        where: { businessId: business.id },
      });
      if (!config) {
        config = await db.gptformCommerceConfig.create({
          data: {
            businessId: business.id,
            catalogJson: '[]',
            fieldsJson: '[]',
            currency: 'INR',
            currencySymbol: '₹',
          },
        });
      }

      const order = await db.gptformCommerceOrder.create({
        data: {
          configId: config.id,
          businessId: business.id,
          customerPhone: cleanPhone,
          customerName: customerName || 'Udhaar Customer',
          status: 'CONFIRMED',
          itemsJson: JSON.stringify([{ name: note || 'Udhaar / Credit Sale', qty: 1, price: parsedAmount, amount: parsedAmount }]),
          total: parsedAmount,
          deliveryType: 'takeout',
          notes: `[Gave Udhaar: ${note || 'Credit Sale'}]`,
          paymentStatus: 'UNPAID',
          paymentMethod: 'UDHAAR_CREDIT',
        },
      });

      return NextResponse.json({
        success: true,
        type: 'GAVE_UDHAAR',
        orderId: order.id,
        amount: parsedAmount,
        message: `Recorded ₹${parsedAmount.toFixed(2)} Udhaar for ${customerName || cleanPhone}.`,
      });
    }
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to record khata entry:', e);
    return NextResponse.json({ error: e.message || 'Failed to record khata entry' }, { status: 500 });
  }
}
