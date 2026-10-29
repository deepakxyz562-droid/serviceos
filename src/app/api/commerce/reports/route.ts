import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveStaffSessionFromRequest } from '@/lib/commerce/access';
import { computeInvoiceTotals, round2 } from '@/lib/quote-flow-calc';
import { extractGstStateCode } from '@/lib/billing/gst-invoice-helper';

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

/** RFC-4180-safe CSV serializer: quotes cells containing commas, quotes or newlines. */
function toCsvString(rows: Array<Array<string | number | null | undefined>>): string {
  const escapeCell = (cell: string | number | null | undefined): string => {
    const raw = cell === null || cell === undefined ? '' : String(cell);
    if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
    return raw;
  };
  return rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');
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
    // Custom range aliases: web sends startDate/endDate, mobile sends
    // customStart/customEnd — accept both (startDate wins when both present).
    const customStart = searchParams.get('startDate') || searchParams.get('customStart');
    const customEnd = searchParams.get('endDate') || searchParams.get('customEnd');

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

    // Fetch Operating Expenses in date range.
    // Link honesty: Expense.tenantId is the established commerce↔expense link
    // (same scoping used by /api/commerce/expenses) — it stores the AiBusiness
    // id or the AiBusiness.tenantId. No other link is invented, so if this
    // query fails we report expensesTracked=false rather than guessing.
    let recordedExpenses = 0;
    let expensesTracked = false;
    let expensesByCategory: Array<{ category: string; amount: number }> = [];
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
        expensesTracked = true;
        recordedExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const catMap = new Map<string, number>();
        for (const e of expenses) {
          const cat = e.category || 'General';
          catMap.set(cat, (catMap.get(cat) || 0) + (Number(e.amount) || 0));
        }
        expensesByCategory = Array.from(catMap.entries())
          .map(([category, amount]) => ({ category, amount: Math.round(amount * 100) / 100 }))
          .sort((a, b) => b.amount - a.amount);
      }
    } catch {
      expensesTracked = false;
      recordedExpenses = 0;
      expensesByCategory = [];
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

    // Merchant GST state (leading 2-digit state code of the business GSTIN or
    // its stateCode column) — used for the per-invoice IGST/CGST+SGST split.
    const merchantState =
      extractGstStateCode(business.gstin, '') || extractGstStateCode(business.stateCode, '');

    for (const inv of invoices as any[]) {
      if (inv.status === 'DRAFT') continue;

      // ONE canonical math (computeInvoiceTotals): discount applied BEFORE
      // tax, GST per-line on the pro-rata discounted base, per-line rate with
      // the invoice-level rate as fallback.
      const invItems: any[] = Array.isArray(inv.items) ? inv.items : [];
      const totals = computeInvoiceTotals({
        items: invItems.map((it) => ({
          qty: Number(it.qty) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          taxRate: it.gstRate ?? inv.taxRate,
        })),
        discountValue: Number(inv.discountValue) || 0,
        discountType: inv.discountType,
        globalTaxRate: Number(inv.taxRate) || 0,
      });
      const taxable = round2(totals.subtotal - totals.discount); // post-discount GST base
      const taxAmount = totals.gstAmount;
      const invTotal = totals.total;

      // Product sales still use raw pre-discount line totals (unchanged output).
      for (const it of invItems) {
        const qty = Number(it.qty || 1);
        const price = Number(it.unitPrice || 0);
        const lineTotal = qty * price;
        const name = it.description || 'Service/Product';
        const existing = productSalesMap.get(name) || { name, category: 'General', qty: 0, revenue: 0 };
        existing.qty += qty;
        existing.revenue += lineTotal;
        productSalesMap.set(name, existing);
      }

      totalRevenue += invTotal;
      taxableSales += taxable;
      totalGstCollected += taxAmount;

      // Rate buckets are per LINE rate (like the orders loop), pro-rata on the
      // discounted base — not the invoice-level taxRate.
      const factor = totals.subtotal > 0 ? (totals.subtotal - totals.discount) / totals.subtotal : 0;
      const bucketLines = invItems.length > 0
        ? invItems
        : [{ qty: 1, unitPrice: totals.subtotal, gstRate: inv.taxRate }];
      for (const it of bucketLines) {
        const lineRate = Number(it.gstRate ?? inv.taxRate ?? 0);
        const lineTaxable = round2((Number(it.qty) || 1) * (Number(it.unitPrice) || 0) * factor);
        const bucketKey = `${lineRate}%`;
        if (lineRate > 0 && rateBuckets[bucketKey]) {
          rateBuckets[bucketKey].taxable += lineTaxable;
          rateBuckets[bucketKey].tax += round2(lineTaxable * (lineRate / 100));
          rateBuckets[bucketKey].count += 1;
        } else {
          rateBuckets['0%'].taxable += lineTaxable;
          rateBuckets['0%'].count += 1;
        }
      }

      // IGST vs CGST+SGST: merchant state vs customer state (leading 2-digit
      // code of the persisted customerGstin/placeOfSupply). Falls back to the
      // legacy placeOfSupply text check when neither state is known.
      const customerState =
        extractGstStateCode(inv.customerGstin, '') || extractGstStateCode(inv.placeOfSupply, '');
      const isInterstate =
        merchantState && customerState
          ? merchantState !== customerState
          : Boolean(inv.placeOfSupply && inv.placeOfSupply !== 'Intra-state');

      if (isInterstate) {
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

      // Payments split (filtered by payment date within period when available)
      const rawPayments = Array.isArray(inv.payments) ? inv.payments : [];
      const payments = rawPayments.filter((p: any) => {
        if (!p.paidAt && !p.createdAt) return true;
        const pTime = new Date(p.paidAt || p.createdAt).getTime();
        return pTime >= start.getTime() && pTime <= end.getTime();
      });
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

    // COGS: 0 unless tracked per-item costs are recorded (no fabricated percentages).
    // The commerce item models (AiInvoiceItem / AiItem / catalogJson) carry no
    // cost-price column, so there is no dependable per-item cost link yet —
    // we therefore report cogsTracked=false instead of estimating margins.
    const cogs = 0;
    const cogsTracked = false;
    const grossProfit = totalRevenue - cogs;

    // Operating Expenses from the expense ledger (when linked) else money snapshot.
    const totalExpenses = recordedExpenses > 0 ? recordedExpenses : (moneySnapshot?.moneyOut || 0);
    const expensesSource = recordedExpenses > 0
      ? 'expense_ledger'
      : (moneySnapshot?.moneyOut || 0) > 0
        ? 'daybook_money'
        : 'none';
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

    const totalInvoiceAging = invoiceAgingCurrent + invoiceAgingDueSoon + invoiceAgingOverdue;
    const aging = totalInvoiceAging > 0
      ? {
          current: invoiceAgingCurrent,
          dueSoon: invoiceAgingDueSoon,
          overdue: invoiceAgingOverdue,
        }
      : totalReceivables > 0
      ? {
          current: totalReceivables,
          dueSoon: 0,
          overdue: 0,
        }
      : { current: 0, dueSoon: 0, overdue: 0 };

    // ── CSV export (format=csv&report=pnl|gst|receivables) ────────────────
    const formatParam = searchParams.get('format')?.toLowerCase().trim();
    if (formatParam === 'csv') {
      const reportKind = (searchParams.get('report') || 'pnl').toLowerCase().trim();
      const today = new Date().toISOString().slice(0, 10);
      let filename = `report-${today}.csv`;
      let rows: Array<Array<string | number | null | undefined>> = [];

      if (reportKind === 'gst') {
        filename = `gst-summary-${today}.csv`;
        rows = [
          ['GST Summary', periodLabel, `Generated ${today}`],
          [],
          ['Metric', `Amount (${currencySymbol})`],
          ['Taxable Sales', Math.round(taxableSales)],
          ['Output GST Collected', Math.round(totalGstCollected)],
          ['CGST', Math.round(totalCgst)],
          ['SGST', Math.round(totalSgst)],
          ['IGST', Math.round(totalIgst)],
          ['B2B Invoices', b2bCount],
          ['B2C Invoices', b2cCount],
          [],
          ['Rate Slab', 'Taxable Turnover', 'Tax Amount', 'Line Count'],
          ...Object.entries(rateBuckets).map(([rate, data]) => [
            rate,
            Math.round(data.taxable),
            Math.round(data.tax),
            data.count,
          ]),
        ];
      } else if (reportKind === 'receivables') {
        filename = `receivables-${today}.csv`;
        rows = [
          ['Receivables & Payables', periodLabel, `Generated ${today}`],
          [],
          ['Metric', `Amount (${currencySymbol})`],
          ['Total Receivables (Khata + Invoice Dues)', Math.round(totalReceivables)],
          ['Supplier Payables', Math.round(totalPayables)],
          ['Net Pending Dues', Math.round(totalReceivables - totalPayables)],
          [],
          ['Invoice Aging Bucket', `Amount (${currencySymbol})`],
          ['0-15 Days (Current)', Math.round(aging.current)],
          ['16-30 Days (Due Soon)', Math.round(aging.dueSoon)],
          ['30+ Days (Overdue)', Math.round(aging.overdue)],
        ];
      } else {
        // Default: Profit & Loss statement
        filename = `pl-${today}.csv`;
        rows = [
          ['Profit & Loss Statement', periodLabel, `Generated ${today}`],
          [],
          ['Section', 'Line Item', `Amount (${currencySymbol})`],
          ['REVENUE', 'Gross Sales Revenue', Math.round(totalRevenue)],
          ['COGS', `Cost of Goods Sold (tracked: ${cogsTracked ? 'Yes' : 'No'})`, Math.round(cogs)],
          ['GROSS PROFIT', 'Gross Profit', Math.round(grossProfit)],
        ];
        if (expensesByCategory.length > 0) {
          for (const exp of expensesByCategory) {
            rows.push(['OPERATING EXPENSES', exp.category, Math.round(exp.amount)]);
          }
        } else {
          rows.push(['OPERATING EXPENSES', `Total (source: ${expensesSource})`, Math.round(totalExpenses)]);
        }
        rows.push(
          ['TOTAL OPERATING EXPENSES', `Tracked: ${expensesTracked ? 'Yes' : 'No'}`, Math.round(totalExpenses)],
          ['NET', netProfit >= 0 ? 'Net Profit' : 'Net Loss', Math.round(netProfit)],
          ['MARGIN', 'Net Margin %', `${marginPct}%`],
        );
      }

      return new NextResponse(toCsvString(rows), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'private, no-store',
        },
      });
    }

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
        cogsTracked,
        grossProfit,
        operatingExpenses: totalExpenses,
        expensesTracked,
        expensesSource,
        expensesByCategory,
        netProfit,
        marginPct,
        netProfitLabel: netProfit >= 0 ? 'Net Profit' : 'Net Loss',
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
