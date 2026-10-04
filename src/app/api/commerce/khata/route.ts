import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';

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
      const text = `${greeting}, a friendly reminder from *${business.name}*:\n\nYou have an outstanding balance of *₹${c.balance.toFixed(2)}* across ${c.unpaidOrdersCount} order(s).\n\nPlease tap here to clear your payment via UPI: upi://pay?pa=${encodeURIComponent(business.phone || '')}&pn=${encodeURIComponent(business.name)}&am=${c.balance.toFixed(2)}&cu=INR\n\nThank you for your business!`;

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

    return NextResponse.json({
      summary: {
        totalAapkoMilega: Number(totalAapkoMilega.toFixed(2)),
        customersWithDuesCount: customers.length,
        totalAapkoDenaHai: 0, // Supplier dues placeholder (can be expanded with Purchase Orders)
      },
      customers,
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
    const { customerPhone, customerName, type = 'GOT_PAYMENT', amount, note, paymentMethod = 'CASH' } = body;

    const parsedAmount = Number(amount);
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
      // GAVE_UDHAAR: Creates a manual Khata order record
      const order = await db.gptformCommerceOrder.create({
        data: {
          configId: 'khata-ledger',
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
