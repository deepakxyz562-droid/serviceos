/**
 * AiChatTools — READ-ONLY tool registry for the conversational AI assistant.
 * ==========================================================================
 *
 * `/api/ai/chat` lets a tenant's staff ask questions like "How many leads do
 * I have?" or "Which invoices are overdue?" in plain language. The LLM cannot
 * query the database itself — it can only REQUEST one of the tools registered
 * here, and the route executes it server-side with the caller's tenantId
 * baked into every WHERE clause.
 *
 * SECURITY MODEL (read-only by construction):
 *   - Every tool executes only SELECT-shaped Prisma reads (findMany /
 *     findFirst / aggregate / count / groupBy). There is no write API surface
 *     in this module — writes stay in the voice path (AiToolDispatcher) which
 *     has its own idempotency + confirmation layers.
 *   - `tenantId` is provided by the route's authenticated session, never by
 *     the LLM. Every query below filters on it (Jobs filter on the tenant's
 *     workspace, mirroring `getTenantWorkspaceId()` in ai-tool-handlers.ts).
 *   - Arguments are validated + clamped by `executeChatTool` before they ever
 *     reach a query (limit ≤ 25, dates bounded, unknown keys dropped).
 *
 * PROTOCOL:
 *   The route asks the LLM to answer either with a final answer OR with a
 *   single JSON object: {"tool_call": {"name": "...", "arguments": {...}}}.
 *   `parseToolCall()` implements the tolerant side of that contract.
 */

import { db } from './db';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChatTool {
  name: string;
  /** One-line description shown to the LLM in the tool catalog. */
  description: string;
  /** Compact argument spec shown to the LLM, e.g. "{ query: string }". */
  argsSpec: string;
  execute: (ctx: { tenantId: string; workspaceId: string | null }, args: Record<string, unknown>) => Promise<unknown>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function asString(v: unknown, fallback = ''): string {
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return fallback;
}

function asLimit(v: unknown, fallback = 10, max = 25): number {
  const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
}

/** Start of local day, offset by N days (0 = today, -1 = yesterday). */
function startOfDay(dayOffset: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + Math.trunc(dayOffset));
  return d;
}

/** Inclusive [fromDays, toDays] window relative to today. */
function dayWindow(fromDays: number, toDays: number): { gte: Date; lte: Date } {
  const lte = startOfDay(Math.trunc(toDays) + 1);
  lte.setMilliseconds(-1);
  return { gte: startOfDay(fromDays), lte };
}

/**
 * Resolve the tenant's primary workspace. Jobs are workspace-scoped, not
 * tenant-scoped (mirrors getTenantWorkspaceId() in ai-tool-handlers.ts).
 */
async function resolveWorkspaceId(tenantId: string): Promise<string | null> {
  try {
    const ws = await db.workspace.findFirst({
      where: { tenantId },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    return ws?.id ?? null;
  } catch {
    return null;
  }
}

function getAggCount(agg: unknown): number {
  if (!agg) return 0;
  if (typeof agg === 'number') return agg;
  const a = agg as Record<string, unknown>;
  if (typeof a._count === 'number') return a._count;
  if (a._count && typeof (a._count as Record<string, unknown>).id === 'number') return (a._count as Record<string, unknown>).id as number;
  if (a._count && typeof (a._count as Record<string, unknown>)._all === 'number') return (a._count as Record<string, unknown>)._all as number;
  return 0;
}

function getAggSum(agg: unknown, field = 'total'): number {
  if (!agg) return 0;
  const a = agg as Record<string, unknown>;
  if (!a._sum || typeof a._sum !== 'object') return 0;
  const val = (a._sum as Record<string, unknown>)[field];
  return typeof val === 'number' && Number.isFinite(val) ? Number(val.toFixed(2)) : 0;
}

// ─── Tool implementations ───────────────────────────────────────────────────

const getBusinessOverview: ChatTool = {
  name: 'get_business_overview',
  description: 'Snapshot of the business: profile, customer/lead/job counts by status, lead conversion rate, outstanding and overdue invoice totals, revenue for this month.',
  argsSpec: '{} (no arguments)',
  async execute({ tenantId, workspaceId }) {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [
      tenant,
      customerCount,
      leadGroups,
      jobGroups,
      leadsThisMonthCount,
      convertedThisMonthCount,
      outstandingAgg,
      overdueAgg,
      paidThisMonthAgg,
    ] = await Promise.all([
      db.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, industry: true, city: true, state: true, currency: true, phone: true },
      }).catch(() => null),
      db.customer.count({ where: { tenantId } }).catch(() => 0),
      db.lead.groupBy({ by: ['status'], where: { tenantId, deletedAt: null }, _count: { id: true }, _sum: { value: true } }).catch(() => []),
      workspaceId
        ? db.job.groupBy({ by: ['status'], where: { workspaceId, deletedAt: null }, _count: { id: true } }).catch(() => [])
        : Promise.resolve([] as Array<{ status: string; _count: unknown }>),
      db.lead.count({ where: { tenantId, deletedAt: null, createdAt: { gte: startOfMonth } } }).catch(() => 0),
      db.lead.count({ where: { tenantId, deletedAt: null, OR: [{ status: 'won' }, { convertedAt: { not: null } }], createdAt: { gte: startOfMonth } } }).catch(() => 0),
      db.invoice.aggregate({
        where: { tenantId, deletedAt: null, status: 'sent' },
        _count: { id: true },
        _sum: { total: true },
      }).catch(() => ({ _count: 0, _sum: { total: 0 } })),
      db.invoice.aggregate({
        where: { tenantId, deletedAt: null, status: 'sent', dueDate: { lt: new Date() } },
        _count: { id: true },
        _sum: { total: true },
      }).catch(() => ({ _count: 0, _sum: { total: 0 } })),
      db.invoice.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          status: 'paid',
          paidAt: { gte: startOfMonth },
        },
        _sum: { total: true },
      }).catch(() => ({ _sum: { total: 0 } })),
    ]);

    const conversionRateThisMonth = leadsThisMonthCount > 0
      ? Number(((convertedThisMonthCount / leadsThisMonthCount) * 100).toFixed(1))
      : 0;

    return {
      business: tenant ?? { name: 'Unknown' },
      totals: {
        customers: typeof customerCount === 'number' ? customerCount : 0,
        leadsThisMonth: {
          totalCreated: leadsThisMonthCount,
          converted: convertedThisMonthCount,
          conversionRate: `${conversionRateThisMonth}%`,
        },
        outstandingInvoices: { count: getAggCount(outstandingAgg), total: getAggSum(outstandingAgg) },
        overdueInvoices: { count: getAggCount(overdueAgg), total: getAggSum(overdueAgg) },
        revenueThisMonth: getAggSum(paidThisMonthAgg),
      },
      leadsByStatus: Array.isArray(leadGroups) ? leadGroups.map((g: any) => ({
        status: g.status,
        count: typeof g._count === 'number' ? g._count : g._count?.id ?? g._count?._all ?? 0,
        pipelineValue: g._sum && typeof g._sum.value === 'number' ? Number(g._sum.value.toFixed(2)) : 0,
      })) : [],
      jobsByStatus: Array.isArray(jobGroups) ? jobGroups.map((g: any) => ({
        status: g.status,
        count: typeof g._count === 'number' ? g._count : g._count?.id ?? g._count?._all ?? 0,
      })) : [],
    };
  },
};

const getLeadAnalytics: ChatTool = {
  name: 'get_lead_analytics',
  description: 'Lead conversion metrics, funnel breakdown, win/loss rates, and pipeline values for this month, last month, or all-time.',
  argsSpec: '{ timeframe?: "this_month" | "last_month" | "all_time" }',
  async execute({ tenantId }, args) {
    const timeframe = asString(args.timeframe, 'this_month');
    let dateFilter: Record<string, unknown> | undefined = undefined;

    const now = new Date();
    if (timeframe === 'this_month') {
      dateFilter = { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    } else if (timeframe === 'last_month') {
      const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      dateFilter = { gte: startLastMonth, lte: endLastMonth };
    }

    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    };

    const [totalLeads, wonLeads, lostLeads, leadGroups, wonValueAgg, totalValueAgg] = await Promise.all([
      db.lead.count({ where }).catch(() => 0),
      db.lead.count({ where: { ...where, OR: [{ status: 'won' }, { convertedAt: { not: null } }] } }).catch(() => 0),
      db.lead.count({ where: { ...where, status: 'lost' } }).catch(() => 0),
      db.lead.groupBy({ by: ['status'], where, _count: { id: true }, _sum: { value: true } }).catch(() => []),
      db.lead.aggregate({ where: { ...where, status: 'won' }, _sum: { value: true } }).catch(() => ({ _sum: { value: 0 } })),
      db.lead.aggregate({ where, _sum: { value: true } }).catch(() => ({ _sum: { value: 0 } })),
    ]);

    const conversionRate = totalLeads > 0
      ? Number(((wonLeads / totalLeads) * 100).toFixed(1))
      : 0;

    return {
      timeframe,
      totalLeads,
      convertedLeads: wonLeads,
      lostLeads,
      pendingLeads: Math.max(0, totalLeads - wonLeads - lostLeads),
      conversionRatePercent: `${conversionRate}%`,
      totalPipelineValue: getAggSum(totalValueAgg, 'value'),
      wonRevenueValue: getAggSum(wonValueAgg, 'value'),
      breakdownByStatus: Array.isArray(leadGroups) ? leadGroups.map((g: any) => ({
        status: g.status,
        count: typeof g._count === 'number' ? g._count : g._count?.id ?? g._count?._all ?? 0,
        pipelineValue: g._sum && typeof g._sum.value === 'number' ? Number(g._sum.value.toFixed(2)) : 0,
      })) : [],
    };
  },
};

const searchCustomers: ChatTool = {
  name: 'search_customers',
  description: 'Search customers by name, phone, email, or list recently added customers (when query is empty/omitted or generic like "recent" / "all").',
  argsSpec: '{ query?: string, limit?: number } — partial name, phone, email, or leave empty for recent customers',
  async execute({ tenantId }, args) {
    const rawQuery = asString(args.query);
    const limit = asLimit(args.limit, 10, 25);

    // If query is empty, or generic words like "recent", "all", "new", "list", return recent customers
    const isGeneric = !rawQuery || /^(recent|all|new|latest|list|recently added|customers|added)$/i.test(rawQuery);

    let where: Record<string, unknown> = { tenantId };
    if (!isGeneric) {
      const digits = rawQuery.replace(/[^+\d]/g, '');
      where = {
        tenantId,
        OR: [
          { name: { contains: rawQuery } },
          { email: { contains: rawQuery } },
          { companyName: { contains: rawQuery } },
          ...(digits ? [{ phone: { contains: digits } }] : []),
        ],
      };
    }

    const customers = await db.customer.findMany({
      where,
      select: { id: true, name: true, phone: true, email: true, address: true, companyName: true, createdAt: true },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
    return { count: customers.length, results: customers };
  },
};

const getCustomerDetails: ChatTool = {
  name: 'get_customer_details',
  description: 'Full profile for one customer: contact info, their last 10 jobs, and last 5 invoices. Requires customerId from search_customers.',
  argsSpec: '{ customerId: string }',
  async execute({ tenantId, workspaceId }, args) {
    const customerId = asString(args.customerId);
    if (!customerId) return { error: 'customerId is required' };

    const customer = await db.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { id: true, name: true, phone: true, email: true, address: true, companyName: true, createdAt: true },
    });
    if (!customer) return { error: 'Customer not found in this tenant' };

    const [jobs, invoices] = await Promise.all([
      workspaceId
        ? db.job.findMany({
            where: { workspaceId, customerId, deletedAt: null },
            select: { id: true, jobNumber: true, title: true, status: true, scheduledAt: true, quotedAmount: true, completedAt: true },
            orderBy: { createdAt: 'desc' },
            take: 10,
          })
        : Promise.resolve([]),
      db.invoice.findMany({
        where: { tenantId, customerId, deletedAt: null },
        select: { id: true, number: true, total: true, status: true, dueDate: true, paidAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return { customer, jobs, invoices };
  },
};

const listRecentLeads: ChatTool = {
  name: 'list_recent_leads',
  description: 'List leads with optional filtering by status (new, contacted, quoted, qualified, won, lost, pending, active) and priority (high, urgent, medium, low).',
  argsSpec: '{ status?: string, priority?: string, query?: string, limit?: number }',
  async execute({ tenantId }, args) {
    const status = asString(args.status).toLowerCase();
    const priority = asString(args.priority).toLowerCase();
    const query = asString(args.query);

    const where: Record<string, unknown> = { tenantId, deletedAt: null };

    // Status filtering with smart aliases
    if (status) {
      if (status === 'pending' || status === 'waiting') {
        where.status = { in: ['new', 'contacted', 'quoted', 'qualified'] };
      } else if (status === 'active' || status === 'open') {
        where.status = { notIn: ['won', 'lost', 'cancelled'] };
      } else if (status === 'closed') {
        where.status = { in: ['won', 'lost', 'cancelled'] };
      } else if (status !== 'all') {
        where.status = status;
      }
    }

    // Priority filtering
    if (priority) {
      if (priority === 'high' || priority === 'high-priority' || priority === 'urgent') {
        where.priority = { in: ['high', 'urgent'] };
      } else if (priority !== 'all') {
        where.priority = priority;
      }
    }

    // Optional query search
    if (query) {
      const digits = query.replace(/[^+\d]/g, '');
      where.OR = [
        { name: { contains: query } },
        { email: { contains: query } },
        { serviceType: { contains: query } },
        ...(digits ? [{ phone: { contains: digits } }] : []),
      ];
    }

    const leads = await db.lead.findMany({
      where,
      select: { id: true, name: true, phone: true, email: true, status: true, priority: true, source: true, value: true, serviceType: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: asLimit(args.limit, 15),
    });
    return { count: leads.length, leads };
  },
};

const listJobs: ChatTool = {
  name: 'list_jobs',
  description: 'List jobs in a date window (default: today and the future), newest by scheduledAt. Filter by status (pending, scheduled, in_progress, completed, cancelled…).',
  argsSpec: '{ status?: string, fromDays?: number, toDays?: number, limit?: number } — fromDays/toDays relative to today (0=today, 7=next week, -7=last week)',
  async execute({ tenantId, workspaceId }, args) {
    if (!workspaceId) return { count: 0, jobs: [], note: 'No workspace configured for this tenant.' };

    const fromDays = typeof args.fromDays === 'number' ? args.fromDays : 0;
    const toDays = typeof args.toDays === 'number' ? args.toDays : 30;
    const window = dayWindow(fromDays, toDays);

    const status = asString(args.status);
    const where: Record<string, unknown> = { workspaceId, deletedAt: null, scheduledAt: { gte: window.gte, lte: window.lte } };
    if (status) where.status = status;

    const jobs = await db.job.findMany({
      where,
      select: { id: true, jobNumber: true, title: true, status: true, priority: true, scheduledAt: true, quotedAmount: true, customerName: true, assigneeName: true },
      orderBy: { scheduledAt: 'asc' },
      take: asLimit(args.limit, 15),
    });
    return { count: jobs.length, jobs };
  },
};

const getJobDetails: ChatTool = {
  name: 'get_job_details',
  description: 'Details for one job: status, schedule, customer, assignee, quoted amount, notes. Requires jobId or jobNumber from list_jobs.',
  argsSpec: '{ jobId?: string, jobNumber?: string }',
  async execute({ tenantId, workspaceId }, args) {
    if (!workspaceId) return { error: 'No workspace configured for this tenant.' };
    const jobId = asString(args.jobId);
    const jobNumber = asString(args.jobNumber);
    if (!jobId && !jobNumber) return { error: 'Provide jobId or jobNumber' };

    const job = await db.job.findFirst({
      where: {
        workspaceId,
        deletedAt: null,
        ...(jobId ? { id: jobId } : { jobNumber }),
      },
      select: {
        id: true, jobNumber: true, title: true, description: true, status: true, priority: true, type: true,
        scheduledAt: true, scheduledTime: true, estimatedDuration: true, quotedAmount: true, address: true,
        customerName: true, customerPhone: true, assigneeName: true, notes: true,
      },
    });
    if (!job) return { error: 'Job not found' };
    return { job };
  },
};

const listOutstandingInvoices: ChatTool = {
  name: 'list_outstanding_invoices',
  description: 'Unpaid invoices (status sent), oldest due date first, with customer name and days overdue. Optionally include drafts.',
  argsSpec: '{ includeDrafts?: boolean, limit?: number }',
  async execute({ tenantId }, args) {
    const includeDrafts = args.includeDrafts === true;
    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
      ...(includeDrafts ? { status: { in: ['sent', 'draft'] } } : { status: 'sent' }),
    };
    const invoices = await db.invoice.findMany({
      where,
      select: {
        id: true,
        number: true,
        customerId: true,
        total: true,
        currency: true,
        status: true,
        dueDate: true,
        sentAt: true,
        customer: { select: { id: true, name: true, companyName: true, phone: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: asLimit(args.limit, 15),
    });
    const now = Date.now();
    const withOverdue = invoices.map((inv) => {
      const isPastDue = inv.dueDate && inv.status === 'sent' && (now - new Date(inv.dueDate).getTime()) > 0;
      const daysOverdue = isPastDue
        ? Math.floor((now - new Date(inv.dueDate).getTime()) / 86400000)
        : 0;
      return {
        id: inv.id,
        invoiceNumber: inv.number,
        customerName: inv.customer?.name || inv.customer?.companyName || 'Unknown Customer',
        customerPhone: inv.customer?.phone || null,
        total: inv.total,
        currency: inv.currency,
        status: inv.status,
        dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : null,
        isOverdue: Boolean(isPastDue),
        daysOverdue,
      };
    });
    return { count: withOverdue.length, invoices: withOverdue };
  },
};

const getRevenueSummary: ChatTool = {
  name: 'get_revenue_summary',
  description: 'Monthly revenue from paid invoices for the last N months (default 3, max 12), plus the overall total.',
  argsSpec: '{ months?: number }',
  async execute({ tenantId }, args) {
    const months = Math.min(Math.max(asLimit(args.months, 3, 12), 1), 12);
    const since = new Date();
    since.setDate(1);
    since.setHours(0, 0, 0, 0);
    since.setMonth(since.getMonth() - (months - 1));

    const invoices = await db.invoice.findMany({
      where: { tenantId, deletedAt: null, status: 'paid', paidAt: { gte: since } },
      select: { total: true, paidAt: true, currency: true },
    });

    const byMonth = new Map<string, number>();
    let grand = 0;
    for (const inv of invoices) {
      const key = new Date(inv.paidAt!).toISOString().slice(0, 7);
      byMonth.set(key, (byMonth.get(key) ?? 0) + inv.total);
      grand += inv.total;
    }
    return {
      months,
      monthly: Array.from(byMonth.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, total]) => ({ month, total: Number(total.toFixed(2)) })),
      total: Number(grand.toFixed(2)),
      paidInvoiceCount: invoices.length,
    };
  },
};

const getServicesCatalog: ChatTool = {
  name: 'get_services_catalog',
  description: 'Services this business offers, with base price and duration. Use for pricing questions.',
  argsSpec: '{} (no arguments)',
  async execute({ tenantId }) {
    const services = await db.service.findMany({
      where: { tenantId, isActive: true },
      select: { name: true, description: true, category: true, basePrice: true, duration: true },
      orderBy: { name: 'asc' },
      take: 25,
    });
    return { count: services.length, services };
  },
};

// ─── Universal Tenant Query Engine (query_tenant_records) ───────────────────

export type TenantEntity =
  | 'customers'
  | 'leads'
  | 'jobs'
  | 'invoices'
  | 'quotes'
  | 'bookings'
  | 'employees'
  | 'expenses'
  | 'inventory'
  | 'services'
  | 'reviews'
  | 'timesheets';

export function normalizeEntity(name: string): TenantEntity | null {
  const n = (name || '').toLowerCase().trim().replace(/[-_\s]+/g, '_');
  if (['customer', 'customers', 'clients', 'client'].includes(n)) return 'customers';
  if (['lead', 'leads', 'prospect', 'prospects'].includes(n)) return 'leads';
  if (['job', 'jobs', 'work_order', 'work_orders', 'orders'].includes(n)) return 'jobs';
  if (['invoice', 'invoices', 'bill', 'bills'].includes(n)) return 'invoices';
  if (['quote', 'quotes', 'estimate', 'estimates', 'proposal', 'proposals'].includes(n)) return 'quotes';
  if (['booking', 'bookings', 'appointment', 'appointments', 'schedule', 'schedules'].includes(n)) return 'bookings';
  if (['employee', 'employees', 'staff', 'technician', 'technicians', 'workers', 'team'].includes(n)) return 'employees';
  if (['expense', 'expenses', 'spending', 'cost', 'costs'].includes(n)) return 'expenses';
  if (['inventory', 'inventory_items', 'inventory_item', 'stock', 'products', 'product', 'items', 'item'].includes(n)) return 'inventory';
  if (['service', 'services', 'catalog', 'offerings'].includes(n)) return 'services';
  if (['review', 'reviews', 'rating', 'ratings', 'feedback'].includes(n)) return 'reviews';
  if (['timesheet', 'timesheets', 'employee_shift', 'employee_shifts', 'shift', 'shifts', 'time_entries', 'time_entry', 'attendance'].includes(n)) return 'timesheets';
  return null;
}

export function parseDateFilter(
  dateWindow?: unknown,
  startDate?: unknown,
  endDate?: unknown
): { gte?: Date; lte?: Date } | undefined {
  const sDate = typeof startDate === 'string' ? startDate.trim() : '';
  const eDate = typeof endDate === 'string' ? endDate.trim() : '';

  if (sDate || eDate) {
    const res: { gte?: Date; lte?: Date } = {};
    if (sDate) {
      const d = new Date(sDate);
      if (!isNaN(d.getTime())) res.gte = d;
    }
    if (eDate) {
      const d = new Date(eDate);
      if (!isNaN(d.getTime())) {
        if (eDate.length <= 10) d.setHours(23, 59, 59, 999);
        res.lte = d;
      }
    }
    return Object.keys(res).length > 0 ? res : undefined;
  }

  const wStr = typeof dateWindow === 'string' ? dateWindow.toLowerCase().trim().replace(/[-_\s]+/g, '_') : '';
  if (!wStr || wStr === 'all' || wStr === 'all_time') return undefined;

  const now = new Date();
  if (wStr === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  if (wStr === 'yesterday') {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  if (wStr === 'this_week' || wStr === 'week') {
    const start = new Date(now);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  if (wStr === 'last_week') {
    const start = new Date(now);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1) - 7;
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  if (wStr === 'this_month' || wStr === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  if (wStr === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  if (wStr === 'this_year' || wStr === 'year') {
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  if (wStr === 'last_year') {
    const start = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    return { gte: start, lte: end };
  }
  return undefined;
}

const queryTenantRecords: ChatTool = {
  name: 'query_tenant_records',
  description:
    'Universal query engine for ALL business records: customers, leads, jobs, invoices, quotes, bookings, employees, expenses, inventory, services, reviews, timesheets. Use this whenever the user asks about quotes, expenses, inventory/stock, employees/staff, bookings, reviews, timesheets, or wants custom filters, aggregations (sums, averages), and breakdowns on any entity.',
  argsSpec:
    '{ entity: "customers"|"leads"|"jobs"|"invoices"|"quotes"|"bookings"|"employees"|"expenses"|"inventory"|"services"|"reviews"|"timesheets", operation?: "list"|"aggregate"|"grouped_summary", filters?: { status?, priority?, category?, role?, source?, search?, minAmount?, maxAmount?, lowStockOnly?, ... }, dateWindow?: "today"|"yesterday"|"this_week"|"last_week"|"this_month"|"last_month"|"this_year"|"all_time", aggregate?: { func: "count"|"sum"|"avg"|"min"|"max", field?: string }, groupBy?: string, sortBy?: string, sortOrder?: "asc"|"desc", limit?: number }',
  async execute({ tenantId, workspaceId }, rawArgs) {
    const args = (rawArgs ?? {}) as Record<string, unknown>;
    const entityParam = asString(args.entity || args.model || args.table);
    const entity = normalizeEntity(entityParam);
    if (!entity) {
      return {
        error: `Unknown entity "${entityParam}". Supported entities: customers, leads, jobs, invoices, quotes, bookings, employees, expenses, inventory, services, reviews, timesheets.`,
      };
    }

    const operation = (asString(args.operation) || 'list').toLowerCase();
    const rawFilters = (typeof args.filters === 'object' && args.filters !== null ? args.filters : args) as Record<string, unknown>;
    const dateWindow = args.dateWindow || rawFilters.dateWindow;
    const startDate = args.startDate || rawFilters.startDate;
    const endDate = args.endDate || rawFilters.endDate;
    const dateRange = parseDateFilter(dateWindow, startDate, endDate);

    const limit = asLimit(args.limit || rawFilters.limit, 10, 25);
    const sortBy = asString(args.sortBy || rawFilters.sortBy);
    const sortOrder = (asString(args.sortOrder || rawFilters.sortOrder) || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const search = asString(rawFilters.search || rawFilters.query || args.search || args.query);
    const status = rawFilters.status || args.status;
    const priority = rawFilters.priority || args.priority;
    const category = rawFilters.category || args.category;
    const role = rawFilters.role || args.role;
    const source = rawFilters.source || args.source;

    // Helper for number parsing
    const getNum = (v: unknown): number | undefined => {
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      if (typeof v === 'string') {
        const n = parseFloat(v);
        if (Number.isFinite(n)) return n;
      }
      return undefined;
    };

    const minAmount = getNum(rawFilters.minAmount ?? rawFilters.minValue ?? rawFilters.minTotal ?? args.minAmount);
    const maxAmount = getNum(rawFilters.maxAmount ?? rawFilters.maxValue ?? rawFilters.maxTotal ?? args.maxAmount);

    try {
      if (entity === 'quotes') {
        const where: Record<string, unknown> = { tenantId, deletedAt: null };
        if (status) {
          where.status = Array.isArray(status) ? { in: status } : asString(status);
        }
        if (minAmount !== undefined || maxAmount !== undefined) {
          where.total = {
            ...(minAmount !== undefined ? { gte: minAmount } : {}),
            ...(maxAmount !== undefined ? { lte: maxAmount } : {}),
          };
        }
        if (dateRange) where.createdAt = dateRange;
        if (search) {
          where.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { customer: { name: { contains: search, mode: 'insensitive' } } },
          ];
        }

        if (operation === 'aggregate') {
          const aggObj = (args.aggregate || rawFilters.aggregate || {}) as Record<string, unknown>;
          const func = (asString(aggObj.func) || 'count').toLowerCase();
          const field = asString(aggObj.field) || 'total';
          if (func === 'count') {
            const count = await db.quote.count({ where });
            return { entity, operation: 'aggregate', func: 'count', count };
          }
          const agg = await db.quote.aggregate({
            where,
            _count: { id: true },
            _sum: { total: true, subtotal: true },
            _avg: { total: true },
            _min: { total: true },
            _max: { total: true },
          });
          let result = 0;
          if (func === 'sum') result = field === 'subtotal' ? getAggSum(agg, 'subtotal') : getAggSum(agg, 'total');
          else if (func === 'avg') result = Number((agg._avg?.total ?? 0).toFixed(2));
          else if (func === 'min') result = Number((agg._min?.total ?? 0).toFixed(2));
          else if (func === 'max') result = Number((agg._max?.total ?? 0).toFixed(2));
          return { entity, operation: 'aggregate', func, field, result, count: agg._count.id };
        }

        if (operation === 'grouped_summary') {
          const groupByField = asString(args.groupBy || rawFilters.groupBy) || 'status';
          const quotes = await db.quote.findMany({
            where,
            select: { id: true, status: true, total: true, currency: true },
            take: 200,
          });
          const groupMap = new Map<string, { count: number; totalSum: number }>();
          for (const q of quotes) {
            const key = String((q as Record<string, unknown>)[groupByField] || 'unknown');
            const cur = groupMap.get(key) || { count: 0, totalSum: 0 };
            cur.count += 1;
            cur.totalSum += q.total || 0;
            groupMap.set(key, cur);
          }
          const groups = Array.from(groupMap.entries()).map(([key, data]) => ({
            key,
            count: data.count,
            totalValue: Number(data.totalSum.toFixed(2)),
          }));
          return { entity, operation: 'grouped_summary', groupBy: groupByField, totalRecords: quotes.length, groups };
        }

        const orderByObj: Record<string, string> = {};
        if (['total', 'subtotal', 'createdAt', 'validUntil'].includes(sortBy)) {
          orderByObj[sortBy] = sortOrder;
        } else {
          orderByObj.createdAt = 'desc';
        }

        const [quotes, totalMatches] = await Promise.all([
          db.quote.findMany({
            where,
            orderBy: orderByObj,
            take: limit,
            select: {
              id: true,
              title: true,
              description: true,
              subtotal: true,
              tax: true,
              discount: true,
              total: true,
              currency: true,
              status: true,
              validUntil: true,
              createdAt: true,
              customer: { select: { id: true, name: true, phone: true } },
              job: { select: { id: true, jobNumber: true, title: true } },
            },
          }),
          db.quote.count({ where }),
        ]);
        return { entity, operation: 'list', count: quotes.length, totalMatches, records: quotes };
      }

      if (entity === 'expenses') {
        const where: Record<string, unknown> = { tenantId };
        if (status) {
          where.status = Array.isArray(status) ? { in: status } : asString(status);
        }
        if (category) {
          where.category = { contains: asString(category), mode: 'insensitive' };
        }
        if (minAmount !== undefined || maxAmount !== undefined) {
          where.amount = {
            ...(minAmount !== undefined ? { gte: minAmount } : {}),
            ...(maxAmount !== undefined ? { lte: maxAmount } : {}),
          };
        }
        if (dateRange) where.expenseDate = dateRange;
        if (search) {
          where.OR = [
            { number: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { category: { contains: search, mode: 'insensitive' } },
            { employeeName: { contains: search, mode: 'insensitive' } },
            { submittedByName: { contains: search, mode: 'insensitive' } },
          ];
        }

        if (operation === 'aggregate') {
          const aggObj = (args.aggregate || rawFilters.aggregate || {}) as Record<string, unknown>;
          const func = (asString(aggObj.func) || 'sum').toLowerCase();
          const field = asString(aggObj.field) || 'amount';
          if (func === 'count') {
            const count = await db.expense.count({ where });
            return { entity, operation: 'aggregate', func: 'count', count };
          }
          const agg = await db.expense.aggregate({
            where,
            _count: { id: true },
            _sum: { amount: true },
            _avg: { amount: true },
            _min: { amount: true },
            _max: { amount: true },
          });
          let result = 0;
          if (func === 'sum') result = getAggSum(agg, 'amount');
          else if (func === 'avg') result = Number((agg._avg?.amount ?? 0).toFixed(2));
          else if (func === 'min') result = Number((agg._min?.amount ?? 0).toFixed(2));
          else if (func === 'max') result = Number((agg._max?.amount ?? 0).toFixed(2));
          return { entity, operation: 'aggregate', func, field, result, count: agg._count.id };
        }

        if (operation === 'grouped_summary') {
          const groupByField = asString(args.groupBy || rawFilters.groupBy) || 'category';
          const expenses = await db.expense.findMany({
            where,
            select: { id: true, category: true, status: true, employeeName: true, amount: true, currency: true },
            take: 200,
          });
          const groupMap = new Map<string, { count: number; totalSum: number }>();
          for (const exp of expenses) {
            const key = String((exp as Record<string, unknown>)[groupByField] || 'uncategorized');
            const cur = groupMap.get(key) || { count: 0, totalSum: 0 };
            cur.count += 1;
            cur.totalSum += exp.amount || 0;
            groupMap.set(key, cur);
          }
          const groups = Array.from(groupMap.entries()).map(([key, data]) => ({
            key,
            count: data.count,
            totalAmount: Number(data.totalSum.toFixed(2)),
          }));
          return { entity, operation: 'grouped_summary', groupBy: groupByField, totalRecords: expenses.length, groups };
        }

        const orderByObj: Record<string, string> = {};
        if (['amount', 'expenseDate', 'createdAt'].includes(sortBy)) {
          orderByObj[sortBy] = sortOrder;
        } else {
          orderByObj.expenseDate = 'desc';
        }

        const [expenses, totalMatches] = await Promise.all([
          db.expense.findMany({
            where,
            orderBy: orderByObj,
            take: limit,
            select: {
              id: true,
              number: true,
              employeeName: true,
              submittedByName: true,
              jobTitle: true,
              category: true,
              description: true,
              amount: true,
              currency: true,
              expenseDate: true,
              status: true,
              notes: true,
              approvedByName: true,
              approvedAt: true,
              createdAt: true,
            },
          }),
          db.expense.count({ where }),
        ]);
        return { entity, operation: 'list', count: expenses.length, totalMatches, records: expenses };
      }

      if (entity === 'inventory') {
        const where: Record<string, unknown> = { tenantId, isActive: true };
        if (category) {
          where.category = { contains: asString(category), mode: 'insensitive' };
        }
        const lowStockOnly = rawFilters.lowStockOnly === true || args.lowStockOnly === true;
        if (lowStockOnly) {
          where.availableStock = { lte: 10 };
        }
        if (minAmount !== undefined || maxAmount !== undefined) {
          where.availableStock = {
            ...(minAmount !== undefined ? { gte: minAmount } : {}),
            ...(maxAmount !== undefined ? { lte: maxAmount } : {}),
          };
        }
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { category: { contains: search, mode: 'insensitive' } },
          ];
        }

        if (operation === 'aggregate') {
          const aggObj = (args.aggregate || rawFilters.aggregate || {}) as Record<string, unknown>;
          const func = (asString(aggObj.func) || 'count').toLowerCase();
          const field = asString(aggObj.field) || 'totalStock';
          if (func === 'count') {
            const count = await db.inventoryItem.count({ where });
            return { entity, operation: 'aggregate', func: 'count', count };
          }
          const agg = await db.inventoryItem.aggregate({
            where,
            _count: { id: true },
            _sum: { totalStock: true, availableStock: true, costPrice: true, salePrice: true },
            _avg: { costPrice: true, salePrice: true },
          });
          let result = 0;
          if (func === 'sum') {
            result = getAggSum(agg, field === 'availableStock' ? 'availableStock' : (field === 'costPrice' ? 'costPrice' : 'totalStock'));
          } else if (func === 'avg') {
            result = Number(((agg._avg as Record<string, number | null>)?.[field] ?? 0).toFixed(2));
          }
          return { entity, operation: 'aggregate', func, field, result, count: agg._count.id };
        }

        if (operation === 'grouped_summary') {
          const groupByField = asString(args.groupBy || rawFilters.groupBy) || 'category';
          const items = await db.inventoryItem.findMany({
            where,
            select: { id: true, category: true, totalStock: true, availableStock: true, costPrice: true },
            take: 200,
          });
          const groupMap = new Map<string, { count: number; totalStock: number; totalValue: number }>();
          for (const it of items) {
            const key = String((it as Record<string, unknown>)[groupByField] || 'general');
            const cur = groupMap.get(key) || { count: 0, totalStock: 0, totalValue: 0 };
            cur.count += 1;
            cur.totalStock += it.totalStock || 0;
            cur.totalValue += (it.costPrice || 0) * (it.totalStock || 0);
            groupMap.set(key, cur);
          }
          const groups = Array.from(groupMap.entries()).map(([key, data]) => ({
            key,
            count: data.count,
            totalStock: data.totalStock,
            totalValuation: Number(data.totalValue.toFixed(2)),
          }));
          return { entity, operation: 'grouped_summary', groupBy: groupByField, totalRecords: items.length, groups };
        }

        const orderByObj: Record<string, string> = {};
        if (['name', 'totalStock', 'availableStock', 'salePrice', 'costPrice'].includes(sortBy)) {
          orderByObj[sortBy] = sortOrder;
        } else {
          orderByObj.name = 'asc';
        }

        const [items, totalMatches] = await Promise.all([
          db.inventoryItem.findMany({
            where,
            orderBy: orderByObj,
            take: limit,
            select: {
              id: true,
              sku: true,
              name: true,
              description: true,
              category: true,
              unit: true,
              costPrice: true,
              salePrice: true,
              currency: true,
              totalStock: true,
              reservedStock: true,
              availableStock: true,
              reorderLevel: true,
              reorderQty: true,
              barcode: true,
              isActive: true,
              createdAt: true,
            },
          }),
          db.inventoryItem.count({ where }),
        ]);
        return { entity, operation: 'list', count: items.length, totalMatches, records: items };
      }

      if (entity === 'employees') {
        const where: Record<string, unknown> = workspaceId ? { workspaceId } : { workspace: { tenantId } };
        if (role) where.role = asString(role);
        if (status) where.status = asString(status);
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { email: { contains: search, mode: 'insensitive' } },
            { location: { contains: search, mode: 'insensitive' } },
          ];
        }

        if (operation === 'aggregate') {
          const count = await db.employee.count({ where });
          return { entity, operation: 'aggregate', func: 'count', count };
        }

        if (operation === 'grouped_summary') {
          const groupByField = asString(args.groupBy || rawFilters.groupBy) || 'role';
          const emps = await db.employee.findMany({
            where,
            select: { id: true, role: true, status: true, rating: true, completedJobs: true },
            take: 200,
          });
          const groupMap = new Map<string, { count: number; completedJobs: number }>();
          for (const emp of emps) {
            const key = String((emp as Record<string, unknown>)[groupByField] || 'other');
            const cur = groupMap.get(key) || { count: 0, completedJobs: 0 };
            cur.count += 1;
            cur.completedJobs += emp.completedJobs || 0;
            groupMap.set(key, cur);
          }
          const groups = Array.from(groupMap.entries()).map(([key, data]) => ({
            key,
            count: data.count,
            totalCompletedJobs: data.completedJobs,
          }));
          return { entity, operation: 'grouped_summary', groupBy: groupByField, totalRecords: emps.length, groups };
        }

        const [employees, totalMatches] = await Promise.all([
          db.employee.findMany({
            where,
            orderBy: { name: 'asc' },
            take: limit,
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              role: true,
              skills: true,
              status: true,
              rating: true,
              completedJobs: true,
              location: true,
              hourlyRate: true,
              createdAt: true,
            },
          }),
          db.employee.count({ where }),
        ]);
        return { entity, operation: 'list', count: employees.length, totalMatches, records: employees };
      }

      if (entity === 'bookings') {
        const where: Record<string, unknown> = { tenantId, deletedAt: null };
        if (status) {
          where.status = Array.isArray(status) ? { in: status } : asString(status);
        }
        if (source) where.source = asString(source);
        if (dateRange) where.scheduledAt = dateRange;
        if (search) {
          where.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { customerName: { contains: search, mode: 'insensitive' } },
            { customerPhone: { contains: search } },
            { address: { contains: search, mode: 'insensitive' } },
          ];
        }

        if (operation === 'aggregate') {
          const count = await db.booking.count({ where });
          return { entity, operation: 'aggregate', func: 'count', count };
        }

        if (operation === 'grouped_summary') {
          const groupByField = asString(args.groupBy || rawFilters.groupBy) || 'status';
          const bookings = await db.booking.findMany({
            where,
            select: { id: true, status: true, bookingType: true, source: true },
            take: 200,
          });
          const groupMap = new Map<string, number>();
          for (const b of bookings) {
            const key = String((b as Record<string, unknown>)[groupByField] || 'other');
            groupMap.set(key, (groupMap.get(key) || 0) + 1);
          }
          const groups = Array.from(groupMap.entries()).map(([key, count]) => ({ key, count }));
          return { entity, operation: 'grouped_summary', groupBy: groupByField, totalRecords: bookings.length, groups };
        }

        const [bookings, totalMatches] = await Promise.all([
          db.booking.findMany({
            where,
            orderBy: { scheduledAt: 'desc' },
            take: limit,
            select: {
              id: true,
              title: true,
              description: true,
              bookingType: true,
              status: true,
              source: true,
              customerName: true,
              customerPhone: true,
              customerEmail: true,
              address: true,
              scheduledAt: true,
              scheduledEndTime: true,
              duration: true,
              notes: true,
              confirmedAt: true,
              completedAt: true,
              cancelledAt: true,
              cancellationReason: true,
              createdAt: true,
            },
          }),
          db.booking.count({ where }),
        ]);
        return { entity, operation: 'list', count: bookings.length, totalMatches, records: bookings };
      }

      if (entity === 'reviews') {
        const where: Record<string, unknown> = { tenantId };
        if (status) where.status = asString(status);
        if (source) where.source = asString(source);
        if (minAmount !== undefined) where.rating = { gte: Math.round(minAmount) };
        if (dateRange) where.createdAt = dateRange;
        if (search) {
          where.OR = [
            { authorName: { contains: search, mode: 'insensitive' } },
            { comment: { contains: search, mode: 'insensitive' } },
          ];
        }

        if (operation === 'aggregate') {
          const agg = await db.review.aggregate({
            where,
            _count: { id: true },
            _avg: { rating: true, npsScore: true },
          });
          return {
            entity,
            operation: 'aggregate',
            count: agg._count.id,
            avgRating: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0,
            avgNps: agg._avg.npsScore ? Number(agg._avg.npsScore.toFixed(1)) : null,
          };
        }

        const [reviews, totalMatches] = await Promise.all([
          db.review.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
              id: true,
              rating: true,
              comment: true,
              authorName: true,
              source: true,
              status: true,
              responseJson: true,
              npsScore: true,
              createdAt: true,
            },
          }),
          db.review.count({ where }),
        ]);
        return { entity, operation: 'list', count: reviews.length, totalMatches, records: reviews };
      }

      if (entity === 'timesheets') {
        const where: Record<string, unknown> = { tenantId };
        if (status) where.status = asString(status);
        if (category) where.category = asString(category);
        if (dateRange) where.shiftDate = dateRange;

        if (operation === 'aggregate') {
          const agg = await db.employeeShift.aggregate({
            where,
            _count: { id: true },
            _sum: { totalMinutes: true, workingMinutes: true, breakMinutes: true, travelMinutes: true },
          });
          const totalHours = Number(((agg._sum.totalMinutes || 0) / 60).toFixed(1));
          const workingHours = Number(((agg._sum.workingMinutes || 0) / 60).toFixed(1));
          return {
            entity,
            operation: 'aggregate',
            count: agg._count.id,
            totalHours,
            workingHours,
            totalMinutes: agg._sum.totalMinutes || 0,
          };
        }

        const [shifts, totalMatches] = await Promise.all([
          db.employeeShift.findMany({
            where,
            orderBy: { shiftDate: 'desc' },
            take: limit,
            select: {
              id: true,
              employeeId: true,
              shiftDate: true,
              clockIn: true,
              clockOut: true,
              totalMinutes: true,
              workingMinutes: true,
              breakMinutes: true,
              travelMinutes: true,
              status: true,
              notes: true,
              category: true,
              jobId: true,
              isManual: true,
              approvalStatus: true,
              approvedBy: true,
              approvedAt: true,
              createdAt: true,
            },
          }),
          db.employeeShift.count({ where }),
        ]);
        return { entity, operation: 'list', count: shifts.length, totalMatches, records: shifts };
      }

      if (entity === 'customers') {
        const where: Record<string, unknown> = { tenantId };
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { email: { contains: search, mode: 'insensitive' } },
            { companyName: { contains: search, mode: 'insensitive' } },
          ];
        }
        if (dateRange) where.createdAt = dateRange;

        if (operation === 'aggregate') {
          const count = await db.customer.count({ where });
          return { entity, operation: 'aggregate', func: 'count', count };
        }

        const [customers, totalMatches] = await Promise.all([
          db.customer.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              companyName: true,
              phone: true,
              email: true,
              address: true,
              leadSource: true,
              portalEnabled: true,
              invitationStatus: true,
              createdAt: true,
            },
          }),
          db.customer.count({ where }),
        ]);
        return { entity, operation: 'list', count: customers.length, totalMatches, records: customers };
      }

      if (entity === 'leads') {
        const where: Record<string, unknown> = { tenantId, deletedAt: null };
        if (status) where.status = Array.isArray(status) ? { in: status } : asString(status);
        if (priority) where.priority = asString(priority);
        if (source) where.source = asString(source);
        if (minAmount !== undefined || maxAmount !== undefined) {
          where.value = {
            ...(minAmount !== undefined ? { gte: minAmount } : {}),
            ...(maxAmount !== undefined ? { lte: maxAmount } : {}),
          };
        }
        if (dateRange) where.createdAt = dateRange;
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { title: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { serviceType: { contains: search, mode: 'insensitive' } },
          ];
        }

        if (operation === 'aggregate') {
          const agg = await db.lead.aggregate({
            where,
            _count: { id: true },
            _sum: { value: true },
            _avg: { value: true },
          });
          return {
            entity,
            operation: 'aggregate',
            count: agg._count.id,
            totalPipelineValue: getAggSum(agg, 'value'),
            avgValue: Number((agg._avg.value ?? 0).toFixed(2)),
          };
        }

        if (operation === 'grouped_summary') {
          const groupByField = asString(args.groupBy || rawFilters.groupBy) || 'status';
          const leads = await db.lead.findMany({
            where,
            select: { id: true, status: true, source: true, priority: true, value: true },
            take: 200,
          });
          const groupMap = new Map<string, { count: number; totalValue: number }>();
          for (const ld of leads) {
            const key = String((ld as Record<string, unknown>)[groupByField] || 'unknown');
            const cur = groupMap.get(key) || { count: 0, totalValue: 0 };
            cur.count += 1;
            cur.totalValue += ld.value || 0;
            groupMap.set(key, cur);
          }
          const groups = Array.from(groupMap.entries()).map(([key, data]) => ({
            key,
            count: data.count,
            totalValue: Number(data.totalValue.toFixed(2)),
          }));
          return { entity, operation: 'grouped_summary', groupBy: groupByField, totalRecords: leads.length, groups };
        }

        const [leads, totalMatches] = await Promise.all([
          db.lead.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
              id: true,
              title: true,
              name: true,
              phone: true,
              email: true,
              source: true,
              status: true,
              priority: true,
              value: true,
              serviceType: true,
              address: true,
              followUpAt: true,
              convertedAt: true,
              createdAt: true,
            },
          }),
          db.lead.count({ where }),
        ]);
        return { entity, operation: 'list', count: leads.length, totalMatches, records: leads };
      }

      if (entity === 'jobs') {
        const where: Record<string, unknown> = workspaceId ? { workspaceId, deletedAt: null } : { workspace: { tenantId }, deletedAt: null };
        if (status) where.status = Array.isArray(status) ? { in: status } : asString(status);
        if (priority) where.priority = asString(priority);
        if (dateRange) where.scheduledAt = dateRange;
        if (search) {
          where.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { jobNumber: { contains: search, mode: 'insensitive' } },
            { customerName: { contains: search, mode: 'insensitive' } },
            { assigneeName: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } },
          ];
        }

        if (operation === 'aggregate') {
          const agg = await db.job.aggregate({
            where,
            _count: { id: true },
            _sum: { quotedAmount: true, amountCollected: true },
          });
          return {
            entity,
            operation: 'aggregate',
            count: agg._count.id,
            totalQuoted: getAggSum(agg, 'quotedAmount'),
            totalCollected: getAggSum(agg, 'amountCollected'),
          };
        }

        if (operation === 'grouped_summary') {
          const groupByField = asString(args.groupBy || rawFilters.groupBy) || 'status';
          const jobs = await db.job.findMany({
            where,
            select: { id: true, status: true, priority: true, assigneeName: true, quotedAmount: true },
            take: 200,
          });
          const groupMap = new Map<string, { count: number; totalQuoted: number }>();
          for (const j of jobs) {
            const key = String((j as Record<string, unknown>)[groupByField] || 'unassigned');
            const cur = groupMap.get(key) || { count: 0, totalQuoted: 0 };
            cur.count += 1;
            cur.totalQuoted += j.quotedAmount || 0;
            groupMap.set(key, cur);
          }
          const groups = Array.from(groupMap.entries()).map(([key, data]) => ({
            key,
            count: data.count,
            totalQuoted: Number(data.totalQuoted.toFixed(2)),
          }));
          return { entity, operation: 'grouped_summary', groupBy: groupByField, totalRecords: jobs.length, groups };
        }

        const [jobs, totalMatches] = await Promise.all([
          db.job.findMany({
            where,
            orderBy: { scheduledAt: 'desc' },
            take: limit,
            select: {
              id: true,
              jobNumber: true,
              title: true,
              description: true,
              status: true,
              priority: true,
              type: true,
              address: true,
              scheduledAt: true,
              quotedAmount: true,
              actualStartTime: true,
              actualEndTime: true,
              customerName: true,
              customerPhone: true,
              assigneeName: true,
              paymentStatus: true,
              amountCollected: true,
              completedAt: true,
              createdAt: true,
            },
          }),
          db.job.count({ where }),
        ]);
        return { entity, operation: 'list', count: jobs.length, totalMatches, records: jobs };
      }

      if (entity === 'invoices') {
        const where: Record<string, unknown> = { tenantId, deletedAt: null };
        if (status) where.status = Array.isArray(status) ? { in: status } : asString(status);
        if (minAmount !== undefined || maxAmount !== undefined) {
          where.total = {
            ...(minAmount !== undefined ? { gte: minAmount } : {}),
            ...(maxAmount !== undefined ? { lte: maxAmount } : {}),
          };
        }
        if (dateRange) where.createdAt = dateRange;
        if (search) {
          where.OR = [
            { number: { contains: search, mode: 'insensitive' } },
            { customer: { name: { contains: search, mode: 'insensitive' } } },
          ];
        }

        if (operation === 'aggregate') {
          const agg = await db.invoice.aggregate({
            where,
            _count: { id: true },
            _sum: { total: true, amount: true, tax: true },
            _avg: { total: true },
          });
          return {
            entity,
            operation: 'aggregate',
            count: agg._count.id,
            totalAmount: getAggSum(agg, 'total'),
            avgInvoice: Number((agg._avg.total ?? 0).toFixed(2)),
          };
        }

        if (operation === 'grouped_summary') {
          const groupByField = asString(args.groupBy || rawFilters.groupBy) || 'status';
          const invoices = await db.invoice.findMany({
            where,
            select: { id: true, status: true, total: true, invoiceType: true, currency: true },
            take: 200,
          });
          const groupMap = new Map<string, { count: number; totalSum: number }>();
          for (const inv of invoices) {
            const key = String((inv as Record<string, unknown>)[groupByField] || 'standard');
            const cur = groupMap.get(key) || { count: 0, totalSum: 0 };
            cur.count += 1;
            cur.totalSum += inv.total || 0;
            groupMap.set(key, cur);
          }
          const groups = Array.from(groupMap.entries()).map(([key, data]) => ({
            key,
            count: data.count,
            totalValue: Number(data.totalSum.toFixed(2)),
          }));
          return { entity, operation: 'grouped_summary', groupBy: groupByField, totalRecords: invoices.length, groups };
        }

        const [invoices, totalMatches] = await Promise.all([
          db.invoice.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
              id: true,
              number: true,
              amount: true,
              tax: true,
              discount: true,
              total: true,
              currency: true,
              status: true,
              invoiceType: true,
              dueDate: true,
              sentAt: true,
              paidAt: true,
              createdAt: true,
              customer: { select: { id: true, name: true, phone: true } },
              job: { select: { id: true, jobNumber: true, title: true } },
            },
          }),
          db.invoice.count({ where }),
        ]);
        return { entity, operation: 'list', count: invoices.length, totalMatches, records: invoices };
      }

      if (entity === 'services') {
        const where: Record<string, unknown> = { tenantId };
        if (category) where.category = { contains: asString(category), mode: 'insensitive' };
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { category: { contains: search, mode: 'insensitive' } },
          ];
        }

        const [services, totalMatches] = await Promise.all([
          db.service.findMany({
            where,
            orderBy: { name: 'asc' },
            take: limit,
            select: {
              id: true,
              name: true,
              description: true,
              category: true,
              basePrice: true,
              duration: true,
              isActive: true,
              isPublic: true,
              costPrice: true,
              markup: true,
              isBookable: true,
              createdAt: true,
            },
          }),
          db.service.count({ where }),
        ]);
        return { entity, operation: 'list', count: services.length, totalMatches, records: services };
      }

      return { error: `Unsupported entity query for "${entity}"` };
    } catch (err) {
      console.error(`[query_tenant_records] failed for entity ${entity}:`, err);
      return { error: `Failed to query ${entity} records: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
};

// ─── Registry ───────────────────────────────────────────────────────────────

const REGISTRY: ChatTool[] = [
  queryTenantRecords,
  getBusinessOverview,
  getLeadAnalytics,
  searchCustomers,
  getCustomerDetails,
  listRecentLeads,
  listJobs,
  getJobDetails,
  listOutstandingInvoices,
  getRevenueSummary,
  getServicesCatalog,
  {
    name: 'search_knowledge_base',
    description: 'Search the business knowledge base (policies, FAQs, procedures). Use for "what is your policy / how do we handle X" questions.',
    argsSpec: '{ query: string }',
    async execute({ tenantId }, args) {
      const query = asString(args.query);
      if (!query) return { error: 'query is required', results: [] };
      const { searchKnowledgeBase } = await import('./ai-knowledge');
      const results = await searchKnowledgeBase(tenantId, query, 4);
      return {
        count: results.length,
        note: results.length === 0 ? 'No matching documents found.' : undefined,
        results: results.map((r) => ({ source: r.documentTitle, relevance: Math.round(r.score * 100) / 100, content: r.content })),
      };
    },
  },
  {
    name: 'create_job',
    description: 'Create and schedule a new job/work order for a customer. Auto-resolves customer and employee names, detects schedule conflicts, and assigns service details and price.',
    argsSpec: '{ customerName: string, serviceTitle?: string, scheduledDate?: string, scheduledTime?: string, employeeName?: string, amount?: number, description?: string, address?: string, priority?: "low"|"medium"|"high"|"urgent" }',
    async execute(ctx, args) {
      const { executeCreateJob } = await import('./ai/assistant/action-handlers');
      return executeCreateJob(ctx, {
        customerName: asString(args.customerName),
        serviceTitle: asString(args.serviceTitle),
        scheduledDate: asString(args.scheduledDate),
        scheduledTime: asString(args.scheduledTime),
        employeeName: asString(args.employeeName),
        amount: typeof args.amount === 'number' ? args.amount : undefined,
        description: asString(args.description),
        address: asString(args.address),
        priority: asString(args.priority),
      });
    },
  },
  {
    name: 'create_customer',
    description: 'Create a new customer profile with contact information.',
    argsSpec: '{ name: string, phone?: string, email?: string, address?: string, companyName?: string, notes?: string }',
    async execute(ctx, args) {
      const { executeCreateCustomer } = await import('./ai/assistant/action-handlers');
      return executeCreateCustomer(ctx, {
        name: asString(args.name),
        phone: asString(args.phone),
        email: asString(args.email),
        address: asString(args.address),
        companyName: asString(args.companyName),
        notes: asString(args.notes),
      });
    },
  },
  {
    name: 'create_lead',
    description: 'Create a new sales lead in the CRM pipeline.',
    argsSpec: '{ name: string, phone?: string, email?: string, serviceRequired?: string, estimatedValue?: number, source?: string, notes?: string }',
    async execute(ctx, args) {
      const { executeCreateLead } = await import('./ai/assistant/action-handlers');
      return executeCreateLead(ctx, {
        name: asString(args.name),
        phone: asString(args.phone),
        email: asString(args.email),
        serviceRequired: asString(args.serviceRequired),
        estimatedValue: typeof args.estimatedValue === 'number' ? args.estimatedValue : undefined,
        source: asString(args.source),
        notes: asString(args.notes),
      });
    },
  },
  {
    name: 'create_quote',
    description: 'Generate a new estimate/quote for a customer.',
    argsSpec: '{ customerName: string, title?: string, totalAmount?: number, notes?: string }',
    async execute(ctx, args) {
      const { executeCreateQuote } = await import('./ai/assistant/action-handlers');
      return executeCreateQuote(ctx, {
        customerName: asString(args.customerName),
        title: asString(args.title),
        totalAmount: typeof args.totalAmount === 'number' ? args.totalAmount : undefined,
        notes: asString(args.notes),
      });
    },
  },
  {
    name: 'create_invoice',
    description: 'Generate and record a new invoice for a customer or job.',
    argsSpec: '{ customerName: string, amount: number, description?: string, dueDate?: string, jobId?: string }',
    async execute(ctx, args) {
      const { executeCreateInvoice } = await import('./ai/assistant/action-handlers');
      return executeCreateInvoice(ctx, {
        customerName: asString(args.customerName),
        amount: typeof args.amount === 'number' ? args.amount : 0,
        description: asString(args.description),
        dueDate: asString(args.dueDate),
        jobId: asString(args.jobId),
      });
    },
  },
  {
    name: 'log_expense',
    description: 'Log and categorize a business expense receipt.',
    argsSpec: '{ amount: number, category: string, vendor?: string, description?: string, date?: string }',
    async execute(ctx, args) {
      const { executeLogExpense } = await import('./ai/assistant/action-handlers');
      return executeLogExpense(ctx, {
        amount: typeof args.amount === 'number' ? args.amount : 0,
        category: asString(args.category, 'General'),
        vendor: asString(args.vendor),
        description: asString(args.description),
        date: asString(args.date),
      });
    },
  },
  {
    name: 'create_ai_form',
    description: 'Instantly build and publish a new web form in the AI Form Studio.',
    argsSpec: '{ title: string, description?: string, industry?: string, fieldNames?: string[] }',
    async execute(ctx, args) {
      const { executeCreateAiForm } = await import('./ai/assistant/action-handlers');
      return executeCreateAiForm(ctx, {
        title: asString(args.title),
        description: asString(args.description),
        industry: asString(args.industry),
        fieldNames: Array.isArray(args.fieldNames) ? args.fieldNames.map(String) : undefined,
      });
    },
  },
  {
    name: 'send_customer_message',
    description: 'Trigger an outbound communication (WhatsApp, Email, or SMS) to a customer.',
    argsSpec: '{ customerName: string, channel: "whatsapp" | "email" | "sms", message: string, subject?: string }',
    async execute(ctx, args) {
      const { executeSendMessage } = await import('./ai/assistant/action-handlers');
      return executeSendMessage(ctx, {
        customerName: asString(args.customerName),
        channel: (asString(args.channel, 'whatsapp') as 'whatsapp' | 'email' | 'sms'),
        message: asString(args.message),
        subject: asString(args.subject),
      });
    },
  },
  {
    name: 'get_morning_briefing',
    description: 'Get a comprehensive morning briefing: today\'s scheduled jobs, overdue invoices, new leads, and technician workload.',
    argsSpec: '{} (no arguments)',
    async execute(ctx) {
      const { executeGetMorningBriefing } = await import('./ai/assistant/action-handlers');
      return executeGetMorningBriefing(ctx);
    },
  },
];

const REGISTRY_MAP = new Map(REGISTRY.map((t) => [t.name, t]));

/** Compact catalog injected into the system prompt. */
export function getToolCatalogForPrompt(): string {
  return REGISTRY.map((t) => `- ${t.name}: ${t.description}\n  args: ${t.argsSpec}`).join('\n');
}

function sanitizeToolArgs(val: unknown, depth = 0): unknown {
  if (depth > 5) return undefined;
  if (val === null || val === undefined) return val;
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return val;
  if (Array.isArray(val)) {
    return val.slice(0, 50).map((item) => sanitizeToolArgs(item, depth + 1)).filter((x) => x !== undefined);
  }
  if (typeof val === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      if (k.length > 60) continue;
      const cleaned = sanitizeToolArgs(v, depth + 1);
      if (cleaned !== undefined) {
        clean[k] = cleaned;
      }
    }
    return clean;
  }
  return undefined;
}

/**
 * Execute a tool requested by the LLM. The LLM-controlled `args` are parsed
 * defensively (strings/numbers/booleans only, clamped); tenant scoping comes
 * exclusively from the authenticated ctx. Never throws — errors become
 * `{ error }` results the LLM can reason about.
 */
export async function executeChatTool(
  tenantId: string,
  name: string,
  rawArgs: unknown,
): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  const tool = REGISTRY_MAP.get(name);
  if (!tool) return { ok: false, error: `Unknown tool "${name}"` };

  const args = (sanitizeToolArgs(rawArgs) as Record<string, unknown>) ?? {};

  try {
    const workspaceId = await resolveWorkspaceId(tenantId);
    const result = await tool.execute({ tenantId, workspaceId }, args);
    return { ok: true, result };
  } catch (err) {
    console.error(`[ai-chat-tools] tool "${name}" failed:`, err);
    return { ok: false, error: 'The data lookup failed. Please try again.' };
  }
}

// ─── LLM-side protocol parsing ──────────────────────────────────────────────

/**
 * Parse a possible tool call out of the model's reply.
 * Returns null when the reply is not a tool call (i.e. it's the final answer).
 */
export function parseToolCall(reply: string): { name: string; arguments: Record<string, unknown> } | null {
  if (!reply) return null;

  let candidate = reply.trim();
  const fence = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1].trim().startsWith('{')) candidate = fence[1].trim();

  // If the reply is prose that merely contains a JSON object, carve it out.
  if (!candidate.startsWith('{')) {
    const first = candidate.indexOf('{');
    const last = candidate.lastIndexOf('}');
    if (first === -1 || last <= first) return null;
    candidate = candidate.slice(first, last + 1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const obj = parsed as Record<string, unknown>;
  const inner = (obj.tool_call ?? obj.toolCall ?? obj) as Record<string, unknown> | undefined;
  if (!inner || typeof inner !== 'object') return null;

  const name = typeof inner.name === 'string' ? inner.name : '';
  if (!name) return null;

  const rawArgs = inner.arguments ?? inner.args;
  const args = rawArgs && typeof rawArgs === 'object' && !Array.isArray(rawArgs)
    ? (rawArgs as Record<string, unknown>)
    : {};

  return { name, arguments: args };
}

/** Truncate a tool result for the LLM context window. */
export function serializeToolResult(result: unknown, max = 6000): string {
  try {
    const json = JSON.stringify(result);
    return json.length > max ? json.slice(0, max - 1) + '…' : json;
  } catch {
    return '{}';
  }
}
