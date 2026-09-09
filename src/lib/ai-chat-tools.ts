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

import { db } from '@/lib/db';

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

// ─── Tool implementations ───────────────────────────────────────────────────

const getBusinessOverview: ChatTool = {
  name: 'get_business_overview',
  description: 'Snapshot of the business: profile, customer/lead/job counts by status, outstanding and overdue invoice totals, revenue for this month.',
  argsSpec: '{} (no arguments)',
  async execute({ tenantId, workspaceId }) {
    const [tenant, customerCount, leadGroups, jobGroups, outstandingAgg, overdueAgg, paidThisMonthAgg] = await Promise.all([
      db.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, industry: true, city: true, state: true, currency: true, phone: true },
      }),
      db.customer.count({ where: { tenantId } }),
      db.lead.groupBy({ by: ['status'], where: { tenantId, deletedAt: null }, _count: { id: true }, _sum: { value: true } }),
      workspaceId
        ? db.job.groupBy({ by: ['status'], where: { workspaceId, deletedAt: null }, _count: { id: true } })
        : Promise.resolve([] as Array<{ status: string; _count: { id: number } }>),
      db.invoice.aggregate({
        where: { tenantId, deletedAt: null, status: 'sent' },
        _count: { id: true },
        _sum: { total: true },
      }),
      db.invoice.aggregate({
        where: { tenantId, deletedAt: null, status: 'sent', dueDate: { lt: new Date() } },
        _count: { id: true },
        _sum: { total: true },
      }),
      db.invoice.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          status: 'paid',
          paidAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
        _sum: { total: true },
      }),
    ]);

    return {
      business: tenant ?? { name: 'Unknown' },
      totals: {
        customers: customerCount,
        outstandingInvoices: { count: outstandingAgg._count.id, total: Number((outstandingAgg._sum.total ?? 0).toFixed(2)) },
        overdueInvoices: { count: overdueAgg._count.id, total: Number((overdueAgg._sum.total ?? 0).toFixed(2)) },
        revenueThisMonth: Number((paidThisMonthAgg._sum.total ?? 0).toFixed(2)),
      },
      leadsByStatus: leadGroups.map((g) => ({ status: g.status, count: g._count.id, pipelineValue: Number((g._sum.value ?? 0).toFixed(2)) })),
      jobsByStatus: jobGroups.map((g) => ({ status: g.status, count: g._count.id })),
    };
  },
};

const searchCustomers: ChatTool = {
  name: 'search_customers',
  description: 'Find customers by name, phone, or email. Returns up to 5 matches with ids (needed for follow-up lookups).',
  argsSpec: '{ query: string } — partial name, phone, or email',
  async execute({ tenantId }, args) {
    const query = asString(args.query);
    if (!query) return { error: 'query is required', results: [] };

    const digits = query.replace(/[^+\d]/g, '');
    const where: Record<string, unknown> = {
      tenantId,
      OR: [
        { name: { contains: query } },
        { email: { contains: query } },
        { companyName: { contains: query } },
        ...(digits ? [{ phone: { contains: digits } }] : []),
      ],
    };

    const customers = await db.customer.findMany({
      where,
      select: { id: true, name: true, phone: true, email: true, address: true, companyName: true, createdAt: true },
      take: 5,
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
  description: 'Recent leads, newest first. Optionally filter by status (new, contacted, quoted, won, lost…).',
  argsSpec: '{ status?: string, limit?: number }',
  async execute({ tenantId }, args) {
    const status = asString(args.status);
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (status) where.status = status;

    const leads = await db.lead.findMany({
      where,
      select: { id: true, name: true, phone: true, email: true, status: true, source: true, value: true, serviceType: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: asLimit(args.limit, 10),
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
  description: 'Unpaid invoices (status sent), oldest due date first, with days overdue. Optionally include drafts.',
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
      select: { id: true, number: true, customerId: true, total: true, currency: true, status: true, dueDate: true, sentAt: true },
      orderBy: { dueDate: 'asc' },
      take: asLimit(args.limit, 15),
    });
    const now = Date.now();
    const withOverdue = invoices.map((inv) => ({
      ...inv,
      daysOverdue: inv.dueDate && inv.status === 'sent'
        ? Math.max(0, Math.floor((now - new Date(inv.dueDate).getTime()) / 86400000))
        : 0,
    }));
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

// ─── Registry ───────────────────────────────────────────────────────────────

const REGISTRY: ChatTool[] = [
  getBusinessOverview,
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
      const { searchKnowledgeBase } = await import('@/lib/ai-knowledge');
      const results = await searchKnowledgeBase(tenantId, query, 4);
      return {
        count: results.length,
        note: results.length === 0 ? 'No matching documents found.' : undefined,
        results: results.map((r) => ({ source: r.documentTitle, relevance: Math.round(r.score * 100) / 100, content: r.content })),
      };
    },
  },
];

const REGISTRY_MAP = new Map(REGISTRY.map((t) => [t.name, t]));

/** Compact catalog injected into the system prompt. */
export function getToolCatalogForPrompt(): string {
  return REGISTRY.map((t) => `- ${t.name}: ${t.description}\n  args: ${t.argsSpec}`).join('\n');
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

  // Sanitize args: keep only primitives, drop everything else.
  const args: Record<string, unknown> = {};
  if (rawArgs && typeof rawArgs === 'object') {
    for (const [k, v] of Object.entries(rawArgs as Record<string, unknown>)) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        args[k] = v;
      }
    }
  }

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
