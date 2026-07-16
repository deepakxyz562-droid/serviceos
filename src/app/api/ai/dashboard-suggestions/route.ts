import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * AI Dashboard Suggestions (ServiceOS — Signature Feature)
 * --------------------------------------------------------
 * GET /api/ai/dashboard-suggestions
 *
 * Gathers a unified business snapshot (today's jobs, today's quotes,
 * overdue invoices, stale leads, assets due for service, churn-risk
 * customers) from the DB, asks the z-ai LLM to produce 5–8 prioritized
 * actionable suggestions as JSON, and returns them.
 *
 * The LLM call is cached in-memory per tenant for 5 minutes so we don't
 * burn tokens on every dashboard refresh. If the LLM call fails (missing
 * API key, network error, malformed JSON), we transparently fall back to
 * a deterministic rule-based suggestion generator so the dashboard never
 * shows an empty/broken panel.
 *
 * Pattern copied from /api/ai/field-assistant/route.ts:
 *   const ZAI = (await import('z-ai-web-dev-sdk')).default;
 *   const zai = await ZAI.create();
 *   zai.chat.completions.create({ messages, ... });
 */

// ─── Types ─────────────────────────────────────────────────────────────────

type SuggestionType =
  | 'follow_up'
  | 'schedule_maintenance'
  | 'churn_risk'
  | 'overdue_invoice'
  | 'opportunity';

type Priority = 'high' | 'medium' | 'low';

interface Suggestion {
  type: SuggestionType;
  priority: Priority;
  title: string;
  description: string;
  customerName?: string;
  actionLabel: string;
  actionData: Record<string, string>;
}

interface CachedPayload {
  suggestions: Suggestion[];
  generatedAt: string;
  source: 'ai' | 'rules';
}

// ─── In-memory cache (5-minute TTL, per tenant) ────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: CachedPayload; expiresAt: number }>();

// ─── Date helpers ──────────────────────────────────────────────────────────

function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Rule-based fallback ───────────────────────────────────────────────────
// Used when the LLM is unavailable or returns no valid suggestions.

interface FallbackContext {
  overdueInvoices: Array<{
    id: string;
    number: string;
    total: number;
    currency: string;
    daysOverdue: number;
    customerId: string | null;
  }>;
  staleLeads: Array<{
    id: string;
    name: string;
    source: string;
    status: string;
    value: number;
    daysSinceUpdate: number;
    serviceType: string | null;
    customerId: string | null;
  }>;
  assetsDue: Array<{
    assetId: string;
    assetName: string | null;
    assetType: string | null;
    customerName: string | null;
    customerId: string | null;
    daysUntilService: number;
  }>;
  churnCustomers: Array<{ id: string; name: string; phone: string | null }>;
  overdueJobs: Array<{
    id: string;
    title: string;
    customerName: string | null;
    customerId: string | null;
    assigneeName: string | null;
  }>;
}

function generateRuleBasedSuggestions(ctx: FallbackContext): Suggestion[] {
  const out: Suggestion[] = [];

  // 1. Highest-value overdue invoices → revenue recovery
  const topOverdue = [...ctx.overdueInvoices]
    .sort((a, b) => b.total - a.total)
    .slice(0, 2);
  for (const inv of topOverdue) {
    out.push({
      type: 'overdue_invoice',
      priority: inv.daysOverdue > 30 ? 'high' : 'medium',
      title: `Invoice ${inv.number} is ${inv.daysOverdue} days overdue`,
      description: `A ${inv.currency} ${inv.total.toFixed(2)} invoice is ${inv.daysOverdue} days past due. Send a payment reminder to recover this revenue.`,
      actionLabel: 'Send Reminder',
      actionData: { invoiceId: inv.id, customerId: inv.customerId ?? '' },
    });
  }

  // 2. Stalest leads → follow-up
  const topStale = [...ctx.staleLeads]
    .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate)
    .slice(0, 2);
  for (const lead of topStale) {
    out.push({
      type: 'follow_up',
      priority: lead.daysSinceUpdate > 21 ? 'high' : 'medium',
      title: `Follow up with ${lead.name}`,
      description: `Lead has been inactive for ${lead.daysSinceUpdate} days${
        lead.serviceType ? ` (interested in ${lead.serviceType})` : ''
      }. Re-engaging now could recover $${lead.value.toFixed(2)} in pipeline value.`,
      actionLabel: 'Contact Now',
      actionData: { leadId: lead.id, customerId: lead.customerId ?? '' },
    });
  }

  // 3. Most overdue assets → schedule maintenance
  const topAssets = [...ctx.assetsDue]
    .sort((a, b) => a.daysUntilService - b.daysUntilService)
    .slice(0, 2);
  for (const asset of topAssets) {
    const overdue = asset.daysUntilService < 0;
    out.push({
      type: 'schedule_maintenance',
      priority: overdue ? 'high' : 'medium',
      title: `${overdue ? 'Service overdue' : 'Service due'}: ${asset.assetName || 'Asset'}`,
      description: `${asset.assetName || 'Asset'}${
        asset.assetType ? ` (${asset.assetType})` : ''
      }${
        asset.customerName ? ` for ${asset.customerName}` : ''
      } is ${
        overdue
          ? `${Math.abs(asset.daysUntilService)} days past due`
          : `due in ${asset.daysUntilService} days`
      } for service. Schedule a maintenance visit to prevent breakdowns.`,
      actionLabel: 'Schedule Service',
      actionData: { assetId: asset.assetId, customerId: asset.customerId ?? '' },
    });
  }

  // 4. Churn-risk customers
  const topChurn = ctx.churnCustomers.slice(0, 2);
  for (const c of topChurn) {
    out.push({
      type: 'churn_risk',
      priority: 'high',
      title: `Re-engage ${c.name}`,
      description: `${c.name} hasn't had a job in 90+ days. Reach out with a seasonal service offer or maintenance reminder to win them back.`,
      actionLabel: 'View Customer',
      actionData: { customerId: c.id },
    });
  }

  // 5. Overdue/at-risk jobs (operational efficiency)
  const topJobs = ctx.overdueJobs.slice(0, 1);
  for (const job of topJobs) {
    out.push({
      type: 'opportunity',
      priority: 'high',
      title: `Catch up: ${job.title}`,
      description: `Job${job.customerName ? ` for ${job.customerName}` : ''} is running overdue${
        job.assigneeName ? ` (assigned to ${job.assigneeName})` : ''
      }. Reassign or follow up to keep today's schedule on track.`,
      actionLabel: 'View Job',
      actionData: { jobId: job.id, customerId: job.customerId ?? '' },
    });
  }

  return out.slice(0, 8);
}

// ─── Main handler ──────────────────────────────────────────────────────────

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }
    const tenantId = user.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Could not resolve tenant for this user.' },
        { status: 400 },
      );
    }

    // ── 1. Cache check ────────────────────────────────────────────────────
    const cacheKey = `ai-dash-suggestions:${tenantId}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json(cached.data);
    }

    // ── 2. Resolve workspaces (Jobs are workspace-scoped; Lead/Invoice/Quote are tenant-scoped) ─
    const tenantWorkspaces = await db.workspace.findMany({
      where: { tenantId },
      select: { id: true },
    });
    const workspaceIds = tenantWorkspaces.map((w: { id: string }) => w.id);
    const workspaceFilter =
      workspaceIds.length > 0
        ? { workspaceId: { in: workspaceIds } }
        : { id: '__none__' };
    const tenantFilter = { tenantId };

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // ── 3. Gather all business data in parallel ───────────────────────────
    const [
      todaysJobsRaw,
      todaysQuotesRaw,
      overdueInvoicesRaw,
      staleLeadsRaw,
      assetServiceDueRaw,
      oldJobsRaw,
      recentJobsRaw,
    ] = await Promise.all([
      // Today's jobs (scheduled today)
      db.job.findMany({
        where: {
          ...workspaceFilter,
          scheduledAt: { gte: todayStart, lte: todayEnd },
        },
        select: {
          id: true,
          title: true,
          status: true,
          scheduledAt: true,
          assigneeName: true,
          customerId: true,
          customerName: true,
          priority: true,
        },
        take: 50,
        orderBy: { scheduledAt: 'asc' },
      }),
      // Today's quotes
      db.quote.findMany({
        where: { ...tenantFilter, createdAt: { gte: todayStart, lte: todayEnd } },
        select: {
          id: true,
          title: true,
          status: true,
          total: true,
          currency: true,
          customerId: true,
          createdAt: true,
        },
        take: 30,
        orderBy: { createdAt: 'desc' },
      }),
      // Overdue invoices (not paid/cancelled, dueDate in the past)
      db.invoice.findMany({
        where: {
          ...tenantFilter,
          status: { notIn: ['paid', 'cancelled'] },
          dueDate: { lt: now },
        },
        select: {
          id: true,
          number: true,
          total: true,
          currency: true,
          dueDate: true,
          customerId: true,
          status: true,
        },
        take: 30,
        orderBy: { dueDate: 'asc' },
      }),
      // Stale leads (no activity in 7+ days, not won/lost)
      db.lead.findMany({
        where: {
          ...tenantFilter,
          updatedAt: { lt: sevenDaysAgo },
          status: { notIn: ['won', 'lost'] },
        },
        select: {
          id: true,
          name: true,
          source: true,
          status: true,
          value: true,
          phone: true,
          serviceType: true,
          updatedAt: true,
          customerId: true,
          description: true,
        },
        take: 30,
        orderBy: { updatedAt: 'asc' },
      }),
      // Asset service history rows whose nextServiceDate is within 30 days (or overdue)
      db.assetServiceHistory.findMany({
        where: {
          tenantId,
          nextServiceDate: { lte: thirtyDaysFromNow },
        },
        select: {
          id: true,
          assetId: true,
          nextServiceDate: true,
          serviceType: true,
        },
        orderBy: { nextServiceDate: 'asc' },
        take: 60,
      }),
      // Jobs older than 90 days (for churn-risk detection)
      db.job.findMany({
        where: {
          ...workspaceFilter,
          customerId: { not: null },
          createdAt: { lt: ninetyDaysAgo },
        },
        select: { customerId: true },
        take: 1000,
      }),
      // Jobs in the last 90 days (for churn-risk detection)
      db.job.findMany({
        where: {
          ...workspaceFilter,
          customerId: { not: null },
          createdAt: { gte: ninetyDaysAgo },
        },
        select: { customerId: true },
        take: 1000,
      }),
    ]);

    // ── 4. Post-process: churn-risk customers ─────────────────────────────
    const oldCustIds = new Set(
      (oldJobsRaw as Array<{ customerId: string | null }>)
        .map((j) => j.customerId)
        .filter((id): id is string => !!id),
    );
    const recentCustIds = new Set(
      (recentJobsRaw as Array<{ customerId: string | null }>)
        .map((j) => j.customerId)
        .filter((id): id is string => !!id),
    );
    const churnCustIds = [...oldCustIds].filter((id) => !recentCustIds.has(id));

    // Fetch churn-risk customer names (cap at 20 to keep prompt small)
    const churnCustomers: Array<{
      id: string;
      name: string;
      phone: string | null;
    }> =
      churnCustIds.length > 0
        ? await db.customer.findMany({
            where: { id: { in: churnCustIds.slice(0, 20) } },
            select: { id: true, name: true, phone: true },
          })
        : [];

    // ── 5. Post-process: asset service due (join asset + customer info) ───
    // Dedupe by assetId, keeping the earliest nextServiceDate.
    const assetMap = new Map<
      string,
      { assetId: string; nextServiceDate: Date; serviceType: string | null }
    >();
    for (const h of assetServiceDueRaw as Array<{
      assetId: string;
      nextServiceDate: Date | null;
      serviceType: string | null;
    }>) {
      if (!h.nextServiceDate) continue;
      const existing = assetMap.get(h.assetId);
      if (
        !existing ||
        new Date(h.nextServiceDate) < new Date(existing.nextServiceDate)
      ) {
        assetMap.set(h.assetId, {
          assetId: h.assetId,
          nextServiceDate: new Date(h.nextServiceDate),
          serviceType: h.serviceType,
        });
      }
    }
    const assetIds = [...assetMap.keys()];
    const assetRows: Array<{
      id: string;
      name: string;
      assetType: string;
      customerId: string | null;
    }> =
      assetIds.length > 0
        ? await db.customerAsset.findMany({
            where: { id: { in: assetIds }, status: { not: 'disposed' } },
            select: { id: true, name: true, assetType: true, customerId: true },
          })
        : [];
    const assetById = new Map(assetRows.map((a) => [a.id, a]));
    const assetCustomerIds = [
      ...new Set(
        assetRows
          .map((a) => a.customerId)
          .filter((id): id is string => !!id),
      ),
    ];
    const assetCustomers: Array<{ id: string; name: string }> =
      assetCustomerIds.length > 0
        ? await db.customer.findMany({
            where: { id: { in: assetCustomerIds } },
            select: { id: true, name: true },
          })
        : [];
    const customerNameById = new Map(
      assetCustomers.map((c: { id: string; name: string }) => [c.id, c.name]),
    );

    const assetsDueList = [...assetMap.values()]
      .map((a) => {
        const row = assetById.get(a.assetId);
        return {
          assetId: a.assetId,
          assetName: row?.name ?? null,
          assetType: row?.assetType ?? null,
          customerName: row?.customerId
            ? customerNameById.get(row.customerId) ?? null
            : null,
          customerId: row?.customerId ?? null,
          daysUntilService: daysBetween(now, a.nextServiceDate),
        };
      })
      .sort((a, b) => a.daysUntilService - b.daysUntilService)
      .slice(0, 15);

    // ── 6. Build derived lists for the prompt + fallback ──────────────────
    const todaysJobs = todaysJobsRaw as Array<{
      id: string;
      title: string;
      status: string;
      scheduledAt: Date | null;
      assigneeName: string | null;
      customerId: string | null;
      customerName: string | null;
      priority: string;
    }>;
    const overdueJobs = todaysJobs.filter(
      (j) =>
        ['pending', 'in_progress', 'on_hold'].includes(j.status) &&
        j.scheduledAt &&
        new Date(j.scheduledAt) < now,
    );

    const todaysQuotes = todaysQuotesRaw as Array<{
      id: string;
      title: string;
      status: string;
      total: number;
      currency: string;
      customerId: string | null;
      createdAt: Date;
    }>;
    const pendingQuotes = todaysQuotes.filter((q) =>
      ['draft', 'sent'].includes(q.status),
    );

    const overdueInvoicesList = (overdueInvoicesRaw as Array<{
      id: string;
      number: string;
      total: number;
      currency: string;
      dueDate: Date | null;
      customerId: string | null;
      status: string;
    }>).map((inv) => ({
      id: inv.id,
      number: inv.number,
      total: inv.total,
      currency: inv.currency,
      daysOverdue: inv.dueDate ? daysBetween(new Date(inv.dueDate), now) : 0,
      customerId: inv.customerId,
    }));

    const staleLeadsList = (staleLeadsRaw as Array<{
      id: string;
      name: string;
      source: string;
      status: string;
      value: number;
      phone: string | null;
      serviceType: string | null;
      updatedAt: Date;
      customerId: string | null;
      description: string | null;
    }>).map((l) => ({
      id: l.id,
      name: l.name,
      source: l.source,
      status: l.status,
      value: l.value,
      daysSinceUpdate: daysBetween(new Date(l.updatedAt), now),
      serviceType: l.serviceType,
      customerId: l.customerId,
    }));

    // ── 7. Call the LLM ───────────────────────────────────────────────────
    let suggestions: Suggestion[] = [];
    let source: 'ai' | 'rules' = 'ai';

    const systemPrompt =
      'You are a field service business advisor. Analyze the following business data and return 5-8 prioritized, actionable suggestions as JSON. ' +
      'Each suggestion should have: type (follow_up/schedule_maintenance/churn_risk/overdue_invoice/opportunity), priority (high/medium/low), ' +
      'title, description, customerName (if applicable), actionLabel, and actionData (e.g. customerId, jobId, invoiceId, leadId, assetId). ' +
      'Focus on revenue recovery, customer retention, and operational efficiency. ' +
      'Return a JSON object with the shape: {"suggestions": [...]}';

    const overdueInvoiceTotal = overdueInvoicesList.reduce(
      (s, i) => s + (i.total || 0),
      0,
    );

    const userPrompt = `TODAY'S DATE: ${now.toISOString()}

BUSINESS SNAPSHOT:
- Today's jobs: ${todaysJobs.length} (assigned/overdue: ${overdueJobs.length})
- Today's quotes: ${todaysQuotes.length} (pending: ${pendingQuotes.length})
- Overdue invoices: ${overdueInvoicesList.length} (total outstanding: $${overdueInvoiceTotal.toFixed(2)})
- Stale leads (no activity in 7+ days): ${staleLeadsList.length}
- Assets due for service (next 30 days): ${assetsDueList.length}
- Churn-risk customers (no jobs in 90+ days): ${churnCustomers.length}

OVERDUE INVOICES (top 10):
${
  overdueInvoicesList
    .slice(0, 10)
    .map(
      (i) =>
        `- ${i.number}: $${i.total.toFixed(2)} ${i.currency}, ${i.daysOverdue} days overdue, customerId: ${i.customerId || '—'}`,
    )
    .join('\n') || '(none)'
}

STALE LEADS (top 10):
${
  staleLeadsList
    .slice(0, 10)
    .map(
      (l) =>
        `- ${l.name} [source: ${l.source}, status: ${l.status}]: $${l.value.toFixed(2)}, inactive ${l.daysSinceUpdate} days${
          l.serviceType ? `, interested in: ${l.serviceType}` : ''
        }, leadId: ${l.id}, customerId: ${l.customerId || '—'}`,
    )
    .join('\n') || '(none)'
}

ASSETS DUE FOR SERVICE (top 10):
${
  assetsDueList
    .slice(0, 10)
    .map(
      (a) =>
        `- ${a.assetName || 'Unnamed asset'} (${a.assetType || 'unknown'})${
          a.customerName ? ` for ${a.customerName}` : ''
        }: ${a.daysUntilService >= 0 ? `due in ${a.daysUntilService} days` : `${Math.abs(a.daysUntilService)} days overdue`}, assetId: ${a.assetId}, customerId: ${a.customerId || '—'}`,
    )
    .join('\n') || '(none)'
}

CHURN-RISK CUSTOMERS (top 10):
${
  churnCustomers
    .slice(0, 10)
    .map(
      (c) =>
        `- ${c.name} (customerId: ${c.id})${c.phone ? `, phone: ${c.phone}` : ''}`,
    )
    .join('\n') || '(none)'
}

TODAY'S OVERDUE / AT-RISK JOBS (top 8):
${
  overdueJobs
    .slice(0, 8)
    .map(
      (j) =>
        `- ${j.title} [status: ${j.status}]${j.assigneeName ? ` — assigned to ${j.assigneeName}` : ''}${
          j.customerName ? `, customer: ${j.customerName}` : ''
        }, jobId: ${j.id}, customerId: ${j.customerId || '—'}`,
    )
    .join('\n') || '(none)'
}

PENDING QUOTES (top 5):
${
  pendingQuotes
    .slice(0, 5)
    .map(
      (q) =>
        `- ${q.title} [status: ${q.status}]: $${q.total.toFixed(2)} ${q.currency}, quoteId: ${q.id}, customerId: ${q.customerId || '—'}`,
    )
    .join('\n') || '(none)'
}

Based on the data above, return 5-8 prioritized actionable suggestions as JSON: {"suggestions": [{"type": "follow_up|schedule_maintenance|churn_risk|overdue_invoice|opportunity", "priority": "high|medium|low", "title": "...", "description": "...", "customerName": "...", "actionLabel": "...", "actionData": {"invoiceId|leadId|jobId|assetId|customerId": "..."}}]}.`;

    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();
      const response = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' },
      });

      const text = response?.choices?.[0]?.message?.content;
      if (text && typeof text === 'string') {
        // Defensive parse — strip markdown fences if present
        const cleaned = text
          .trim()
          .replace(/^```(?:json)?/i, '')
          .replace(/```$/, '')
          .trim();
        const parsed = JSON.parse(cleaned);
        const rawList = Array.isArray(parsed) ? parsed : parsed.suggestions;
        if (Array.isArray(rawList)) {
          suggestions = rawList.slice(0, 8).map(
            (s: Record<string, unknown>) => {
              const type = String(s.type ?? 'opportunity');
              const priority = String(s.priority ?? 'medium');
              return {
                type: (
                  [
                    'follow_up',
                    'schedule_maintenance',
                    'churn_risk',
                    'overdue_invoice',
                    'opportunity',
                  ].includes(type)
                    ? type
                    : 'opportunity'
                ) as SuggestionType,
                priority: (['high', 'medium', 'low'].includes(priority)
                  ? priority
                  : 'medium') as Priority,
                title: String(s.title ?? 'Suggestion').slice(0, 200),
                description: String(s.description ?? '').slice(0, 600),
                customerName: s.customerName
                  ? String(s.customerName).slice(0, 120)
                  : undefined,
                actionLabel: String(s.actionLabel ?? 'View').slice(0, 40),
                actionData:
                  s.actionData &&
                  typeof s.actionData === 'object' &&
                  !Array.isArray(s.actionData)
                    ? Object.fromEntries(
                        Object.entries(
                          s.actionData as Record<string, unknown>,
                        ).map(([k, v]) => [k, String(v ?? '')]),
                      )
                    : {},
              };
            },
          );
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[ai/dashboard-suggestions] LLM call failed:', msg);
      // Fall through to rule-based fallback
    }

    // ── 8. Fallback: rule-based suggestions if AI returned nothing ────────
    if (suggestions.length === 0) {
      source = 'rules';
      suggestions = generateRuleBasedSuggestions({
        overdueInvoices: overdueInvoicesList,
        staleLeads: staleLeadsList,
        assetsDue: assetsDueList,
        churnCustomers: churnCustomers.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
        })),
        overdueJobs: overdueJobs.map((j) => ({
          id: j.id,
          title: j.title,
          customerName: j.customerName,
          customerId: j.customerId,
          assigneeName: j.assigneeName,
        })),
      });
    }

    // ── 9. Cache & return ─────────────────────────────────────────────────
    const payload: CachedPayload = {
      suggestions,
      generatedAt: now.toISOString(),
      source,
    };
    cache.set(cacheKey, {
      data: payload,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json(payload);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to fetch AI dashboard suggestions';
    console.error('[/api/ai/dashboard-suggestions] error:', error);
    return NextResponse.json(
      {
        error: message,
        suggestions: [],
        generatedAt: new Date().toISOString(),
        source: 'rules',
      },
      { status: 500 },
    );
  }
}
