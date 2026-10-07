import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getQuoteFlowUser, computeTotals } from '@/lib/quote-flow-session';
import { resolveTenantBlueprint } from '@/lib/blueprint';
import { businessDayRange, postedOrderSales, readHomePages } from '@/lib/business-home-data';
import type { BusinessHomeSnapshot } from '../../../../../shared/business-home';
import type { MoneySnapshot } from '../../../../../shared/money';
import { atomicCommerce } from '@/lib/commerce/atomic';

export const dynamic = 'force-dynamic';

/** Read-only owner Home. Never create a business or invent missing ledger totals. */
export async function GET(req: Request) {
  try {
    const user = await getQuoteFlowUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const member = await db.user.findUnique({ where: { id: user.id }, select: { role: true, isActive: true } });
    if (!member?.isActive) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['owner', 'admin', 'standalone_user', 'superadmin', 'super_admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Owner Home access required' }, { status: 403 });
    }
    const business = await db.aiBusiness.findUnique({ where: { ownerId: user.id } });
    if (!business || (business.tenantId && business.tenantId !== user.tenantId)) {
      return NextResponse.json({ error: 'Business setup required' }, { status: 404 });
    }
    const tenant = business.tenantId ? await db.tenant.findUnique({ where: { id: business.tenantId } }) : null;
    const blueprint = resolveTenantBlueprint(tenant);
    const fallbackZones = { IN: 'Asia/Kolkata', US: 'America/New_York', CA: 'America/Toronto', AU: 'Australia/Sydney', GB: 'Europe/London', GLOBAL: 'UTC' };
    const timezone = blueprint.timezone || fallbackZones[blueprint.country] || 'UTC';
    const { start, end, date } = businessDayRange(timezone);
    const inDay = { gte: start, lt: end };
    const usesInvoices = ['services', 'freelancer', 'salon'].includes(blueprint.businessType);
    const metrics: BusinessHomeSnapshot['metrics'] = {
      // Commerce lacks payment events/partial-balance and supplier-payment records.
      // Reusing order.createdAt or a PO received flag here would be misleading.
      moneyIn: null, moneyOut: null, balance: null, toCollect: null, toPay: null,
      tables: null, production: null, materials: null,
    };
    const tasks: Array<Promise<void>> = [];
    tasks.push((async () => {
      const money = await atomicCommerce<MoneySnapshot>('snapshot', [business.id, start.toISOString(), end.toISOString()]);
      metrics.moneyIn = money.initialized ? Number(money.moneyIn) : null;
      metrics.moneyOut = money.initialized ? Number(money.moneyOut) : null;
      metrics.balance = money.balance == null ? null : Number(money.balance);
      metrics.toCollect = money.toCollect == null ? null : Number(money.toCollect);
      metrics.toPay = money.toPay == null ? null : Number(money.toPay);
    })());
    if (!usesInvoices) tasks.push((async () => {
      const orders = await readHomePages((skip, take) => db.gptformCommerceOrder.findMany({
        where: { businessId: business.id, createdAt: inDay },
        select: { status: true, paymentStatus: true, total: true },
        orderBy: { id: 'asc' }, skip, take,
      }));
      metrics.sales = postedOrderSales(orders);
    })());
    if (blueprint.capabilities.orders) tasks.push((async () => {
      const orders = await readHomePages((skip, take) => db.gptformCommerceOrder.findMany({ where: { businessId: business.id, status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] } }, select: { id: true, status: true }, orderBy: { id: 'asc' }, skip, take }));
      metrics.activeOrders = orders.length;
      if (blueprint.capabilities.kitchenKot) {
        metrics.kitchenWaiting = orders.filter((order) => ['CONFIRMED', 'PREPARING'].includes(order.status)).length;
      }
    })());
    if (blueprint.capabilities.invoicing) tasks.push((async () => {
      const invoices = await readHomePages((skip, take) => db.aiInvoice.findMany({
        where: { businessId: business.id, status: { in: ['SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'] } }, include: { items: true, payments: true },
        orderBy: { id: 'asc' }, skip, take,
      }));
      let invoiceSales = 0;
      let dueCount = 0;
      for (const invoice of invoices) {
        const total = computeTotals(invoice.items, invoice.discountValue, invoice.discountType, invoice.taxRate, business.currency).total;
        const createdAt = new Date(invoice.createdAt).getTime();
        if (createdAt >= start.getTime() && createdAt < end.getTime()) invoiceSales += total;
        if (total - invoice.payments.reduce((s, p) => s + p.amount, 0) > 0.005) dueCount++;
      }
      if (usesInvoices) metrics.sales = Math.round(invoiceSales * 100) / 100;
      metrics.invoiceDue = dueCount;
    })());
    if (blueprint.capabilities.quotes) tasks.push((async () => {
      const quotes = await readHomePages((skip, take) => db.aiQuote.findMany({ where: { businessId: business.id, status: 'SENT' }, select: { id: true }, orderBy: { id: 'asc' }, skip, take }));
      metrics.quotesDue = quotes.length;
    })());
    // Tenant-scoped operations are only queried for this owner's linked tenant.
    if (business.tenantId) {
      const tenantId = business.tenantId;
      if (blueprint.capabilities.inventory) tasks.push((async () => {
        const stock = await readHomePages((skip, take) => db.inventoryItem.findMany({ where: { tenantId, isActive: true }, select: { availableStock: true, reorderLevel: true }, orderBy: { id: 'asc' }, skip, take }));
        metrics.lowStock = stock.filter((item) => item.reorderLevel > 0 && item.availableStock <= item.reorderLevel).length;
      })());
      if (blueprint.capabilities.calendarBooking) tasks.push((async () => {
        const appointments = await readHomePages((skip, take) => db.booking.findMany({ where: { tenantId, deletedAt: null, scheduledAt: inDay, status: { notIn: ['cancelled', 'no_show'] } }, select: { id: true }, orderBy: { id: 'asc' }, skip, take }));
        metrics.appointments = appointments.length;
      })());
      if (blueprint.capabilities.jobs) tasks.push((async () => {
        const workspaces = await readHomePages((skip, take) => db.workspace.findMany({ where: { tenantId }, select: { id: true }, orderBy: { id: 'asc' }, skip, take }));
        if (!workspaces.length) { metrics.jobs = 0; return; }
        const jobs = await readHomePages((skip, take) => db.job.findMany({ where: { workspaceId: { in: workspaces.map((w) => w.id) }, deletedAt: null, scheduledAt: inDay, status: { notIn: ['cancelled'] } }, select: { id: true }, orderBy: { id: 'asc' }, skip, take }));
        metrics.jobs = jobs.length;
      })());
    }
    // An unavailable source stays unavailable; a failed query must not become zero.
    const results = await Promise.allSettled(tasks);
    for (const result of results) if (result.status === 'rejected') console.error('Home metric unavailable:', result.reason);
    const snapshot: BusinessHomeSnapshot = { businessId: business.id, currency: business.currency, timezone, date, generatedAt: new Date().toISOString(), salesSource: usesInvoices ? 'invoices' : 'orders', metrics };
    return NextResponse.json(snapshot, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Home snapshot failed:', error);
    return NextResponse.json({ error: 'Unable to load business home' }, { status: 500 });
  }
}
