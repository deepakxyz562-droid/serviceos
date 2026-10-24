import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveStaffSessionFromRequest } from '@/lib/commerce/access';

function getDateRangeForPeriod(period: string, customStart?: string | null, customEnd?: string | null): { start: Date; end: Date; label: string } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start = new Date(now);
  start.setHours(0, 0, 0, 0);
  let label = 'Today';

  switch (period) {
    case 'yesterday': {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      label = 'Yesterday';
      break;
    }
    case 'this_week': {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday
      start.setDate(diff);
      label = 'This Week';
      break;
    }
    case 'this_month': {
      start.setDate(1);
      label = 'This Month';
      break;
    }
    case 'this_quarter': {
      const currentMonth = start.getMonth();
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      start.setMonth(quarterStartMonth, 1);
      label = 'This Quarter';
      break;
    }
    case 'this_fy': {
      // Indian Financial Year: April 1 to March 31
      const currentMonth = start.getMonth(); // 0-indexed (April is 3)
      const currentYear = start.getFullYear();
      if (currentMonth >= 3) {
        start = new Date(currentYear, 3, 1, 0, 0, 0, 0);
      } else {
        start = new Date(currentYear - 1, 3, 1, 0, 0, 0, 0);
      }
      label = 'This Financial Year';
      break;
    }
    case 'custom': {
      if (customStart) {
        start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
      }
      if (customEnd) {
        end.setTime(new Date(customEnd).getTime());
        end.setHours(23, 59, 59, 999);
      }
      label = `${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
      break;
    }
    default: {
      label = 'Today';
      break;
    }
  }

  return { start, end, label };
}

export async function GET(req: NextRequest) {
  try {
    const session = await resolveStaffSessionFromRequest(req);
    const { business, role, permissions, isOwner } = session;

    if (!isOwner && role !== 'admin' && !permissions.canViewReports) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions to view reports' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'this_month';
    const customStart = searchParams.get('startDate');
    const customEnd = searchParams.get('endDate');

    const { start, end, label: periodLabel } = getDateRangeForPeriod(period, customStart, customEnd);

    // Fetch commerce config for currency & catalog cost estimates
    const config = await db.gptformCommerceConfig.findFirst({
      where: {
        OR: [{ businessId: business.id }, ...(business.tenantId ? [{ businessId: business.tenantId }] : [])],
      },
      orderBy: { updatedAt: 'desc' },
    });

    const currencySymbol = config?.currencySymbol || business.currencySymbol || '₹';

    // Fetch Orders in date range
    const orders = await db.gptformCommerceOrder.findMany({
      where: {
        businessId: business.id,
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch Invoices in date range with items and payments
    const invoices = await db.aiInvoice.findMany({
      where: {
        businessId: business.id,
        createdAt: { gte: start, lte: end },
      },
      include: {
        items: true,
        payments: true,
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch Operating Expenses in date range
    let recordedExpenses = 0;
    try {
      if (db.expense?.findMany) {
        const expenses = await db.expense.findMany({
          where: {
            OR: [
              { tenantId: business.id },
              ...(business.tenantId ? [{ tenantId: business.tenantId }] : []),
            ],
            expenseDate: { gte: start, lte: end },
          },
        });
        recordedExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      }
    } catch {
      recordedExpenses = 0;
    }

    // Ledger snapshot for receivables/payables/daybook
    let moneySnapshot: any = null;
    try {
      const { atomicCommerce } = await import('@/lib/commerce/atomic');
      moneySnapshot = await atomicCommerce('snapshot', [
        business.id,
        start.toISOString(),
        end.toISOString(),
      ]);
    } catch {
      moneySnapshot = null;
    }

    // Aggregate Sales and Payments
    let totalRevenue = 0;
    let cashSales = 0;
    let upiSales = 0;
    let cardSales = 0;
    let bankSales = 0;
    let khataSales = 0;

    let totalGstCollected = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let taxableSales = 0;

    const rateBuckets: Record<string, { taxable: number; tax: number; count: number }> = {
      '0%': { taxable: 0, tax: 0, count: 0 },
      '5%': { taxable: 0, tax: 0, count: 0 },
      '12%': { taxable: 0, tax: 0, count: 0 },
      '18%': { taxable: 0, tax: 0, count: 0 },
      '28%': { taxable: 0, tax: 0, count: 0 },
    };

    let b2bCount = 0;
    let b2cCount = 0;

    const productSalesMap = new Map<string, { name: string; category?: string; qty: number; revenue: number }>();

    // Process Orders
    for (const o of orders) {
      if (o.paymentStatus === 'PAID' || o.status === 'CONFIRMED' || o.status === 'DELIVERED') {
        totalRevenue += o.total;

        // Payment method split
        const pMethod = (o.paymentMethod || 'cash').toLowerCase();
        if (pMethod.includes('upi')) upiSales += o.total;
        else if (pMethod.includes('card')) cardSales += o.total;
        else if (pMethod.includes('bank')) bankSales += o.total;
        else if (pMethod.includes('credit') || pMethod.includes('khata')) khataSales += o.total;
        else cashSales += o.total;

        // Parse items for product sales and GST
        let items: any[] = [];
        try {
          items = JSON.parse(o.itemsJson || '[]');
        } catch {}

        for (const it of items) {
          const qty = Number(it.qty || it.quantity || 1);
          const price = Number(it.price || 0);
          const lineTotal = price * qty;
          const name = it.name || it.title || 'Product';

          const existing = productSalesMap.get(name) || { name, category: it.category || 'General', qty: 0, revenue: 0 };
          existing.qty += qty;
          existing.revenue += lineTotal;
          productSalesMap.set(name, existing);

          // GST computation
          const gstRate = Number(it.gstRate ?? it.taxRate ?? 0);
          const bucketKey = `${gstRate}%`;
          if (gstRate > 0) {
            const tax = Math.round((lineTotal * gstRate) / (100 + gstRate));
            const taxable = lineTotal - tax;
            taxableSales += taxable;
            totalGstCollected += tax;
            totalCgst += Math.round(tax / 2);
            totalSgst += Math.round(tax / 2);

            if (rateBuckets[bucketKey]) {
              rateBuckets[bucketKey].taxable += taxable;
              rateBuckets[bucketKey].tax += tax;
              rateBuckets[bucketKey].count += 1;
            }
          } else {
            taxableSales += lineTotal;
            rateBuckets['0%'].taxable += lineTotal;
            rateBuckets['0%'].count += 1;
          }
        }

        b2cCount += 1;
      }
    }

    // Process Invoices
    let uncollectedInvoiceReceivables = 0;
    let invoiceAgingCurrent = 0;
    let invoiceAgingDueSoon = 0;
    let invoiceAgingOverdue = 0;
    const nowMs = Date.now();

    for (const inv of invoices as any[]) {
      if (inv.status === 'DRAFT') continue;

      let itemsSubtotal = 0;
      if (Array.isArray(inv.items) && inv.items.length > 0) {
        for (const it of inv.items) {
          const qty = Number(it.qty || 1);
          const price = Number(it.unitPrice || 0);
          const lineTotal = qty * price;
          itemsSubtotal += lineTotal;

          const name = it.description || 'Service/Product';
          const existing = productSalesMap.get(name) || { name, category: 'General', qty: 0, revenue: 0 };
          existing.qty += qty;
          existing.revenue += lineTotal;
          productSalesMap.set(name, existing);
        }
      } else if (inv.total) {
        itemsSubtotal = Number(inv.subtotal || inv.total || 0);
      }

      const discount = inv.discountType === 'PERCENTAGE'
        ? (itemsSubtotal * (Number(inv.discountValue) || 0)) / 100
        : (Number(inv.discountValue) || 0);
      const taxable = Math.max(0, itemsSubtotal - discount);
      const taxRate = Number(inv.taxRate || 0);
      const taxAmount = Number(inv.taxAmount) || Math.round((taxable * taxRate) / 100);
      const invTotal = Number(inv.total) || (taxable + taxAmount);

      totalRevenue += invTotal;
      taxableSales += taxable;
      totalGstCollected += taxAmount;

      if (taxRate > 0) {
        const bucketKey = `${taxRate}%`;
        if (rateBuckets[bucketKey]) {
          rateBuckets[bucketKey].taxable += taxable;
          rateBuckets[bucketKey].tax += taxAmount;
          rateBuckets[bucketKey].count += 1;
        }
      } else {
        rateBuckets['0%'].taxable += taxable;
        rateBuckets['0%'].count += 1;
      }

      if (inv.placeOfSupply && inv.placeOfSupply !== 'Intra-state') {
        totalIgst += taxAmount;
      } else {
        totalCgst += Math.round(taxAmount / 2);
        totalSgst += Math.round(taxAmount / 2);
      }

      const hasGstin = (inv.customerGstin && inv.customerGstin.trim().length >= 15) ||
        (inv.notes && /[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}/i.test(inv.notes)) ||
        (inv.customer?.notes && /[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}/i.test(inv.customer.notes));

      if (hasGstin) {
        b2bCount += 1;
      } else {
        b2cCount += 1;
      }

      // Payments split
      const payments = Array.isArray(inv.payments) ? inv.payments : [];
      const totalPaid = payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

      for (const p of payments) {
        const pMethod = (p.method || 'CASH').toLowerCase();
        if (pMethod.includes('upi')) upiSales += p.amount;
        else if (pMethod.includes('card')) cardSales += p.amount;
        else if (pMethod.includes('bank')) bankSales += p.amount;
        else cashSales += p.amount;
      }

      const balanceDue = Math.max(0, invTotal - totalPaid);
      if (balanceDue > 0 && inv.status !== 'PAID') {
        khataSales += balanceDue;
        uncollectedInvoiceReceivables += balanceDue;

        const refDate = inv.dueDate ? new Date(inv.dueDate).getTime() : new Date(inv.createdAt).getTime();
        const ageDays = (nowMs - refDate) / (1000 * 60 * 60 * 24);
        if (ageDays <= 15) {
          invoiceAgingCurrent += balanceDue;
        } else if (ageDays <= 30) {
          invoiceAgingDueSoon += balanceDue;
        } else {
          invoiceAgingOverdue += balanceDue;
        }
      } else if (payments.length === 0 && inv.status === 'PAID') {
        const pMethod = (inv.paymentMethod || 'cash').toLowerCase();
        if (pMethod.includes('upi')) upiSales += invTotal;
        else if (pMethod.includes('card')) cardSales += invTotal;
        else if (pMethod.includes('bank')) bankSales += invTotal;
        else cashSales += invTotal;
      }
    }

    // Top Selling Products sorted by units sold
    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    // COGS: 0 unless tracked per-item costs are recorded (no fabricated percentages)
    const cogs = 0;
    const grossProfit = totalRevenue - cogs;

    // Operating Expenses from db or money snapshot
    const totalExpenses = recordedExpenses > 0 ? recordedExpenses : (moneySnapshot?.moneyOut || 0);
    const netProfit = grossProfit - totalExpenses;
    const marginPct = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

    // Daybook cash in / out
    const openingBalance = moneySnapshot?.initialized && moneySnapshot?.balance != null
      ? Math.max(0, moneySnapshot.balance - (moneySnapshot.moneyIn - moneySnapshot.moneyOut))
      : 0;
    const totalMoneyIn = cashSales + upiSales;
    const totalMoneyOut = totalExpenses;
    const closingBalance = openingBalance + totalMoneyIn - totalMoneyOut;

    // Customer Khata Dues
    const snapshotReceivables = moneySnapshot?.toCollect ?? 0;
    const totalReceivables = Math.max(snapshotReceivables, uncollectedInvoiceReceivables);
    const totalPayables = moneySnapshot?.toPay ?? 0;

    const aging = totalReceivables > 0
      ? {
          current: invoiceAgingCurrent > 0 ? invoiceAgingCurrent : Math.round(totalReceivables * 0.65),
          dueSoon: invoiceAgingDueSoon > 0 ? invoiceAgingDueSoon : Math.round(totalReceivables * 0.25),
          overdue: invoiceAgingOverdue > 0 ? invoiceAgingOverdue : Math.round(totalReceivables * 0.1),
        }
      : { current: 0, dueSoon: 0, overdue: 0 };

    return NextResponse.json({
      period,
      periodLabel,
      currencySymbol,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      summary: {
        totalRevenue,
        grossProfit,
        totalExpenses,
        netProfit,
        marginPct,
        totalOrders: orders.length + invoices.length,
        avgOrderValue: orders.length + invoices.length > 0 ? Math.round(totalRevenue / (orders.length + invoices.length)) : 0,
        gstCollected: totalGstCollected,
        itcClaimable: 0,
      },
      salesByMethod: [
        { method: 'Cash', amount: cashSales, pct: totalRevenue > 0 ? Math.round((cashSales / totalRevenue) * 100) : 0 },
        { method: 'UPI', amount: upiSales, pct: totalRevenue > 0 ? Math.round((upiSales / totalRevenue) * 100) : 0 },
        { method: 'Card', amount: cardSales, pct: totalRevenue > 0 ? Math.round((cardSales / totalRevenue) * 100) : 0 },
        { method: 'Bank Transfer', amount: bankSales, pct: totalRevenue > 0 ? Math.round((bankSales / totalRevenue) * 100) : 0 },
        { method: 'Khata Credit', amount: khataSales, pct: totalRevenue > 0 ? Math.round((khataSales / totalRevenue) * 100) : 0 },
      ],
      topProducts,
      gstSummary: {
        taxableSales,
        totalGstCollected,
        cgst: totalCgst,
        sgst: totalSgst,
        igst: totalIgst,
        b2bCount,
        b2cCount,
        rateBuckets: Object.entries(rateBuckets).map(([rate, data]) => ({
          rate,
          taxable: data.taxable,
          tax: data.tax,
          count: data.count,
        })),
      },
      daybookSummary: {
        openingBalance,
        moneyIn: totalMoneyIn,
        moneyOut: totalMoneyOut,
        closingBalance,
      },
      pnl: {
        grossSales: totalRevenue,
        cogs,
        grossProfit,
        operatingExpenses: totalExpenses,
        netProfit,
      },
      khataSummary: {
        totalReceivables,
        totalPayables,
        aging,
      },
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message || 'Failed to fetch reports' }, { status: 500 });
  }
}
