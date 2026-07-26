import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger, withRequestId } from '@/lib/logger';

/**
 * Customer 360 AI Summary (ServiceOS V1.5 — P8-ai-layer)
 * ------------------------------------------------------------
 * POST /api/ai/customer-360
 *
 * Loads the customer's full history (jobs, invoices, quotes, payments,
 * conversations, reviews, timeline events) and uses the LLM to generate:
 *
 *   - Lifetime Value: total spent, average job value, payment history
 *   - Sentiment: positive | neutral | negative (from comms + reviews)
 *   - Next Best Action: 3-5 concrete recommendations
 *   - Risk Assessment: churn risk + payment risk (with rationale)
 *   - Summary: 2-3 sentence customer overview
 *
 * Body: { customerId: string }
 *
 * Returns: {
 *   customerId,
 *   aiSummary: { lifetimeValue, sentiment, nextBestActions, riskAssessment, summary },
 *   rawStats: { ... },         // the underlying numbers fed to the LLM
 *   aiModel: string,
 *   fallback: boolean,
 * }
 *
 * Auth: required. The customer must belong to the caller's tenant
 * (resolved via Workspace → tenantId). Super-admins can query any customer.
 *
 * AI failure handling:
 *   - If the LLM is unavailable, we still compute the raw stats and return
 *     a rule-based summary (sentiment from review ratings, churn risk from
 *     recency-of-last-job, payment risk from overdue invoices, etc.).
 *     `fallback: true` is set so the UI can flag the response.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

interface RequestBody {
  customerId: string;
}

type Sentiment = 'positive' | 'neutral' | 'negative';
type RiskLevel = 'low' | 'medium' | 'high';

interface LifetimeValue {
  totalSpent: number;
  totalInvoiced: number;
  averageJobValue: number;
  jobCount: number;
  paidInvoices: number;
  overdueInvoices: number;
  currency: string;
  paymentRate: number; // 0..1 — share of invoiced $ that's been paid
}

interface AISummary {
  lifetimeValue: {
    totalSpent: number;
    averageJobValue: number;
    paymentHistory: string; // human-readable summary
  };
  sentiment: Sentiment;
  sentimentReason: string;
  nextBestActions: string[];
  riskAssessment: {
    churnRisk: RiskLevel;
    churnReason: string;
    paymentRisk: RiskLevel;
    paymentReason: string;
  };
  summary: string;
}

interface RawStats {
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    createdAt: string;
  };
  counts: {
    jobs: number;
    invoices: number;
    quotes: number;
    conversations: number;
    reviews: number;
    timelineEvents: number;
  };
  jobsByStatus: Record<string, number>;
  invoiceStatus: {
    paid: number;
    sent: number;
    draft: number;
    overdue: number;
    cancelled: number;
  };
  lifetimeValue: LifetimeValue;
  recentJobs: Array<{
    id: string;
    title: string;
    status: string;
    scheduledAt: string | null;
    quotedAmount: number | null;
  }>;
  recentInvoices: Array<{
    id: string;
    number: string;
    total: number;
    status: string;
    createdAt: string;
    paidAt: string | null;
  }>;
  recentReviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
  }>;
  recentConversations: Array<{
    id: string;
    channel: string;
    lastMessageBody: string | null;
    lastDirection: string | null;
    lastMessageAt: string;
  }>;
  recentTimeline: Array<{
    id: string;
    entryType: string;
    title: string;
    description: string | null;
    eventDate: string;
  }>;
}

interface Customer360Response {
  customerId: string;
  aiSummary: AISummary;
  rawStats: RawStats;
  aiModel: string;
  fallback: boolean;
}

const AI_MODEL_TAG = 'z-ai-web-dev-sdk';
const FALLBACK_MODEL_TAG = 'rule-based-fallback';

// Configurable lookups
const MAX_RECENT = 10;
const RECENT_JOB_DAYS = 180; // churn-risk window
const OVERDUE_DAYS = 30;

// ─── Helpers ───────────────────────────────────────────────────────────────

function toISO(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  try {
    return new Date(d).toISOString();
  } catch {
    return null;
  }
}

function daysSince(d: Date | string | null | undefined): number | null {
  if (!d) return null;
  try {
    const ms = Date.now() - new Date(d).getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

function sum(nums: Array<number | null | undefined>): number {
  return nums.reduce<number>((acc, n) => acc + (typeof n === 'number' && Number.isFinite(n) ? n : 0), 0);
}

/**
 * Lazily import + initialize the z-ai-web-dev-sdk.
 */
async function getZai(): Promise<any | null> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    return await ZAI.create();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[ai/customer-360] ZAI SDK unavailable, using fallback:', msg);
    return null;
  }
}

// ─── Customer + history loaders ────────────────────────────────────────────

/**
 * Resolve the customer with tenant scoping. Customer has no tenantId column
 * (it links via workspaceId), so we resolve the caller's workspace IDs first.
 * Super-admins (tenantId=null + isSuperAdmin=true) bypass scoping.
 */
async function loadCustomerScoped(
  customerId: string,
  tenantId: string | null,
  isSuperAdmin: boolean,
): Promise<{
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  preferredCurrency: string;
  workspaceId: string | null;
  createdAt: Date;
} | null> {
  try {
    if (isSuperAdmin && !tenantId) {
      return await db.customer.findUnique({
        where: { id: customerId },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          preferredCurrency: true,
          workspaceId: true,
          createdAt: true,
        },
      });
    }
    // Resolve tenant workspaces.
    const workspaces = tenantId
      ? await db.workspace.findMany({
          where: { tenantId },
          select: { id: true },
        })
      : [];
    const workspaceIds = workspaces.map((w) => w.id);
    return await db.customer.findFirst({
      where: {
        id: customerId,
        OR: [
          ...(workspaceIds.length > 0 ? [{ workspaceId: { in: workspaceIds } }] : []),
          // Single-tenant dev fallback when no workspaces exist.
          ...(workspaceIds.length === 0 ? [{}] : []),
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        preferredCurrency: true,
        workspaceId: true,
        createdAt: true,
      },
    });
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err), customerId, tenantId },
      'ai/customer-360: loadCustomerScoped failed',
    );
    return null;
  }
}

/**
 * Load all the customer-history slices in parallel. Each slice is
 * independently try/caught so a failure on one (e.g. missing table)
 * doesn't break the whole 360 view.
 */
async function loadCustomerHistory(customerId: string, tenantId: string | null) {
  const [
    jobsResult,
    invoicesResult,
    quotesResult,
    conversationsResult,
    reviewsResult,
    timelineResult,
  ] = await Promise.all([
    loadJobs(customerId),
    loadInvoices(customerId),
    loadQuotes(customerId),
    loadConversations(customerId),
    loadReviews(customerId, tenantId),
    loadTimeline(customerId, tenantId),
  ]);

  return {
    jobs: jobsResult,
    invoices: invoicesResult,
    quotes: quotesResult,
    conversations: conversationsResult,
    reviews: reviewsResult,
    timeline: timelineResult,
  };
}

async function loadJobs(customerId: string) {
  try {
    return await db.job.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        scheduledAt: true,
        completedAt: true,
        quotedAmount: true,
        assigneeName: true,
      },
    });
  } catch {
    return [];
  }
}

async function loadInvoices(customerId: string) {
  try {
    return await db.invoice.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        number: true,
        amount: true,
        tax: true,
        total: true,
        status: true,
        currency: true,
        createdAt: true,
        paidAt: true,
        dueDate: true,
      },
    });
  } catch {
    return [];
  }
}

async function loadQuotes(customerId: string) {
  try {
    return await db.quote.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        total: true,
        status: true,
        currency: true,
        createdAt: true,
      },
    });
  } catch {
    return [];
  }
}

async function loadConversations(customerId: string) {
  try {
    return await db.conversation.findMany({
      where: { customerId },
      orderBy: { lastMessageAt: 'desc' },
      take: 20,
      select: {
        id: true,
        channel: true,
        lastMessageBody: true,
        lastDirection: true,
        lastMessageAt: true,
        messagesJson: true,
      },
    });
  } catch {
    return [];
  }
}

async function loadReviews(customerId: string, tenantId: string | null) {
  try {
    // Review has both customerId and tenantId columns. We scope to the
    // caller's tenant (so a customer shared across tenants doesn't leak
    // another tenant's reviews). Super-admins (tenantId=null) bypass.
    const where: Record<string, unknown> = { customerId };
    if (tenantId) where.tenantId = tenantId;
    return await db.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    });
  } catch {
    return [];
  }
}

async function loadTimeline(customerId: string, tenantId: string | null) {
  try {
    // CustomerTimelineEntry is the V1.5 canonical timeline table.
    const where: Record<string, unknown> = { customerId };
    if (tenantId) where.tenantId = tenantId;
    return await db.customerTimelineEntry.findMany({
      where,
      orderBy: { eventDate: 'desc' },
      take: 30,
      select: {
        id: true,
        entryType: true,
        title: true,
        description: true,
        eventDate: true,
      },
    });
  } catch {
    return [];
  }
}

// ─── Stats computation ─────────────────────────────────────────────────────

function computeLifetimeValue(
  customer: { preferredCurrency: string },
  jobs: Array<{ quotedAmount: number | null; status: string }>,
  invoices: Array<{
    total: number;
    status: string;
    createdAt: Date;
    paidAt: Date | null;
    dueDate: Date | null;
  }>,
): LifetimeValue {
  const currency = customer.preferredCurrency || 'USD';

  // Total spent = sum of invoices marked 'paid' (use .total).
  const paidInvoices = invoices.filter((i) => i.status === 'paid');
  const totalSpent = sum(paidInvoices.map((i) => i.total));

  const totalInvoiced = sum(invoices.map((i) => i.total));

  // Average job value = sum of quotedAmount on completed jobs / count.
  const completedJobs = jobs.filter((j) =>
    ['completed', 'done', 'finished', 'closed'].includes(j.status),
  );
  const quotedTotal = sum(completedJobs.map((j) => j.quotedAmount));
  const averageJobValue =
    completedJobs.length > 0 ? quotedTotal / completedJobs.length : 0;

  // Overdue = invoices that are 'sent' or 'pending_approval' past dueDate
  // by OVERDUE_DAYS, OR have no paidAt and are older than OVERDUE_DAYS.
  const now = Date.now();
  const overdueInvoices = invoices.filter((i) => {
    if (i.status === 'paid' || i.status === 'cancelled' || i.status === 'draft') {
      return false;
    }
    const ref = i.dueDate ?? i.createdAt;
    const ageDays = (now - new Date(ref).getTime()) / (1000 * 60 * 60 * 24);
    return ageDays > OVERDUE_DAYS;
  });

  const paymentRate = totalInvoiced > 0 ? totalSpent / totalInvoiced : 0;

  return {
    totalSpent,
    totalInvoiced,
    averageJobValue,
    jobCount: jobs.length,
    paidInvoices: paidInvoices.length,
    overdueInvoices: overdueInvoices.length,
    currency,
    paymentRate,
  };
}

/**
 * Build a compact text digest of the customer's history for the LLM prompt.
 * Capped to ~6000 chars to stay within the model's context window.
 */
function buildUserPrompt(
  customer: { name: string; phone: string; email: string | null; address: string | null; createdAt: Date },
  history: Awaited<ReturnType<typeof loadCustomerHistory>>,
  ltv: LifetimeValue,
): string {
  const since = customer.createdAt
    ? new Date(customer.createdAt).toLocaleDateString('en-US')
    : '—';

  const jobsByStatus: Record<string, number> = {};
  for (const j of history.jobs) {
    jobsByStatus[j.status] = (jobsByStatus[j.status] ?? 0) + 1;
  }

  const invoiceStatus = { paid: 0, sent: 0, draft: 0, overdue: 0, cancelled: 0 };
  for (const i of history.invoices) {
    if (i.status === 'paid') invoiceStatus.paid++;
    else if (i.status === 'sent') invoiceStatus.sent++;
    else if (i.status === 'draft') invoiceStatus.draft++;
    else if (i.status === 'cancelled') invoiceStatus.cancelled++;
    else if (i.status === 'pending_approval' || i.status === 'pending') {
      // overdue check
      const ref = i.dueDate ?? i.createdAt;
      const ageDays = (Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays > OVERDUE_DAYS) invoiceStatus.overdue++;
      else invoiceStatus.sent++;
    }
  }

  const recentJobs = history.jobs.slice(0, 8).map((j) =>
    `- [${j.status}] ${j.title}${j.quotedAmount ? ` · ${ltv.currency}${j.quotedAmount}` : ''}${j.scheduledAt ? ` · sched ${new Date(j.scheduledAt).toLocaleDateString()}` : ''}${j.completedAt ? ` · done ${new Date(j.completedAt).toLocaleDateString()}` : ''}`,
  ).join('\n');

  const recentInvoices = history.invoices.slice(0, 8).map((i) =>
    `- ${i.number} [${i.status}] ${i.currency}${i.total}${i.paidAt ? ` · paid ${new Date(i.paidAt).toLocaleDateString()}` : ''}`,
  ).join('\n');

  const recentReviews = history.reviews.slice(0, 5).map((r) =>
    `- ${r.rating}★${r.comment ? ` "${r.comment.slice(0, 200)}"` : ''} (${new Date(r.createdAt).toLocaleDateString()})`,
  ).join('\n');

  const recentConvos = history.conversations.slice(0, 5).map((c) =>
    `- [${c.channel}] ${c.lastDirection ?? '?'}: ${(c.lastMessageBody ?? '').slice(0, 200)} (${new Date(c.lastMessageAt).toLocaleDateString()})`,
  ).join('\n');

  const recentTimeline = history.timeline.slice(0, 12).map((t) =>
    `- [${t.entryType}] ${t.title}${t.description ? ` — ${t.description.slice(0, 160)}` : ''} (${new Date(t.eventDate).toLocaleDateString()})`,
  ).join('\n');

  return `CUSTOMER:
Name: ${customer.name}
Phone: ${customer.phone}
Email: ${customer.email || '—'}
Address: ${customer.address || '—'}
Customer since: ${since}

LIFETIME VALUE:
- Total spent (paid invoices): ${ltv.currency}${ltv.totalSpent.toFixed(2)}
- Total invoiced: ${ltv.currency}${ltv.totalInvoiced.toFixed(2)}
- Average job value: ${ltv.currency}${ltv.averageJobValue.toFixed(2)}
- Jobs total: ${ltv.jobCount}
- Paid invoices: ${ltv.paidInvoices}
- Overdue invoices: ${ltv.overdueInvoices}
- Payment rate: ${(ltv.paymentRate * 100).toFixed(0)}%

JOB STATUS BREAKDOWN:
${Object.entries(jobsByStatus).map(([s, n]) => `- ${s}: ${n}`).join('\n') || '(none)'}

INVOICE STATUS:
- paid: ${invoiceStatus.paid}
- sent (open): ${invoiceStatus.sent}
- draft: ${invoiceStatus.draft}
- overdue: ${invoiceStatus.overdue}
- cancelled: ${invoiceStatus.cancelled}

QUOTES: ${history.quotes.length} total
${history.quotes.slice(0, 5).map((q) => `- [${q.status}] ${q.title} · ${q.currency}${q.total}`).join('\n') || '(none)'}

RECENT JOBS (most recent ${Math.min(8, history.jobs.length)}):
${recentJobs || '(none)'}

RECENT INVOICES (most recent ${Math.min(8, history.invoices.length)}):
${recentInvoices || '(none)'}

REVIEWS (${history.reviews.length} total):
${recentReviews || '(none)'}

RECENT CONVERSATIONS (most recent ${Math.min(5, history.conversations.length)}):
${recentConvos || '(none)'}

RECENT TIMELINE EVENTS (most recent ${Math.min(12, history.timeline.length)}):
${recentTimeline || '(none)'}

Please generate the 360-degree customer summary as a JSON object with the structure described in the system prompt.`;
}

const SYSTEM_PROMPT = `You are a customer-success analyst for a field-service business. Given the customer's full history, produce a structured 360-degree summary.

Return a JSON object with EXACTLY these fields:

{
  "lifetimeValue": {
    "totalSpent": number,            // total paid by customer (USD)
    "averageJobValue": number,       // average revenue per completed job
    "paymentHistory": string         // 1-2 sentence description of payment reliability
  },
  "sentiment": "positive | neutral | negative",
  "sentimentReason": string,         // 1 sentence citing review ratings / message tone
  "nextBestActions": [               // 3-5 concrete, specific recommendations
    "e.g. 'Due for AC maintenance — last HVAC job was 8 months ago.'",
    "e.g. 'Left a 5-star review — ask for a Google review + referral.'"
  ],
  "riskAssessment": {
    "churnRisk": "low | medium | high",
    "churnReason": string,           // 1 sentence — recency, complaints, drop-off
    "paymentRisk": "low | medium | high",
    "paymentReason": string          // 1 sentence — overdue invoices, payment rate
  },
  "summary": string                  // 2-3 sentence customer overview
}

Rules:
- Be specific and actionable — reference actual numbers, dates, and job types.
- "Next best actions" must reference the customer's actual history (recent jobs, reviews, invoices). Generic platitudes are not useful.
- churnRisk → low if they've booked in the last 90 days; medium if 90-180 days; high if >180 days.
- paymentRisk → low if paymentRate ≥ 0.9 and 0 overdue; medium if 0.6-0.9 or 1 overdue; high if <0.6 or 2+ overdue.
- Sentiment is derived from review ratings AND the tone of recent conversations. A single 1-star review flips it to negative; otherwise weigh the average.
- Respond with a single JSON object only — no markdown, no prose, no code fences.`;

/**
 * Call the LLM with JSON-mode + the customer-history prompt.
 */
async function callLLMJson(
  zai: any,
  userPrompt: string,
): Promise<string | null> {
  try {
    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt.slice(0, 8000) },
      ],
      temperature: 0.5,
      response_format: { type: 'json_object' },
    });
    const text = response?.choices?.[0]?.message?.content;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return null;
    }
    return text;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[ai/customer-360] LLM call failed:', msg);
    return null;
  }
}

function normalizeLLMOutput(
  raw: string,
  ltv: LifetimeValue,
): AISummary {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        parsed = {};
      }
    }
  }

  // Lifetime value: prefer LLM numbers, fall back to computed stats.
  const ltvRaw =
    (parsed.lifetimeValue as Record<string, unknown> | undefined) ?? {};
  const llmTotalSpent = Number(ltvRaw.totalSpent);
  const llmAvgJob = Number(ltvRaw.averageJobValue);
  const totalSpent =
    Number.isFinite(llmTotalSpent) && llmTotalSpent >= 0
      ? llmTotalSpent
      : ltv.totalSpent;
  const averageJobValue =
    Number.isFinite(llmAvgJob) && llmAvgJob >= 0
      ? llmAvgJob
      : ltv.averageJobValue;
  const paymentHistory =
    typeof ltvRaw.paymentHistory === 'string' &&
    ltvRaw.paymentHistory.trim().length > 0
      ? ltvRaw.paymentHistory.trim().slice(0, 300)
      : `Paid ${ltv.paidInvoices} of ${ltv.paidInvoices + ltv.overdueInvoices} invoices; payment rate ${(ltv.paymentRate * 100).toFixed(0)}%.`;

  // Sentiment.
  let sentiment: Sentiment = 'neutral';
  const sRaw = typeof parsed.sentiment === 'string' ? parsed.sentiment.toLowerCase().trim() : '';
  if (sRaw === 'positive' || sRaw === 'negative' || sRaw === 'neutral') {
    sentiment = sRaw;
  }
  const sentimentReason =
    typeof parsed.sentimentReason === 'string'
      ? parsed.sentimentReason.trim().slice(0, 300)
      : '';

  // Next best actions.
  const nextBestActions = Array.isArray(parsed.nextBestActions)
    ? parsed.nextBestActions
        .filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
        .map((a) => a.trim().slice(0, 300))
        .slice(0, 6)
    : [];

  // Risk assessment.
  const riskRaw = (parsed.riskAssessment as Record<string, unknown> | undefined) ?? {};
  let churnRisk: RiskLevel = 'low';
  let paymentRisk: RiskLevel = 'low';
  const cRaw = typeof riskRaw.churnRisk === 'string' ? riskRaw.churnRisk.toLowerCase().trim() : '';
  const pRaw = typeof riskRaw.paymentRisk === 'string' ? riskRaw.paymentRisk.toLowerCase().trim() : '';
  if (cRaw === 'low' || cRaw === 'medium' || cRaw === 'high') churnRisk = cRaw;
  if (pRaw === 'low' || pRaw === 'medium' || pRaw === 'high') paymentRisk = pRaw;
  const churnReason =
    typeof riskRaw.churnReason === 'string'
      ? riskRaw.churnReason.trim().slice(0, 300)
      : '';
  const paymentReason =
    typeof riskRaw.paymentReason === 'string'
      ? riskRaw.paymentReason.trim().slice(0, 300)
      : '';

  // Summary.
  const summary =
    typeof parsed.summary === 'string'
      ? parsed.summary.trim().slice(0, 600)
      : '';

  return {
    lifetimeValue: {
      totalSpent,
      averageJobValue,
      paymentHistory,
    },
    sentiment,
    sentimentReason,
    nextBestActions,
    riskAssessment: {
      churnRisk,
      churnReason,
      paymentRisk,
      paymentReason,
    },
    summary,
  };
}

/**
 * Deterministic rule-based fallback used when the LLM is unavailable.
 * Derives sentiment from review ratings, churn risk from recency of last
 * job, payment risk from overdue invoices + payment rate, and surfaces
 * concrete next-best-actions from the actual history.
 */
function fallbackSummary(
  customer: { name: string; createdAt: Date },
  history: Awaited<ReturnType<typeof loadCustomerHistory>>,
  ltv: LifetimeValue,
): AISummary {
  // Sentiment: average review rating.
  let sentiment: Sentiment = 'neutral';
  let sentimentReason = 'No reviews on file — sentiment inferred from activity level.';
  if (history.reviews.length > 0) {
    const avg =
      history.reviews.reduce((s, r) => s + r.rating, 0) /
      history.reviews.length;
    if (avg >= 4.5) {
      sentiment = 'positive';
      sentimentReason = `Average review rating ${avg.toFixed(1)}/5 across ${history.reviews.length} reviews.`;
    } else if (avg >= 3.5) {
      sentiment = 'neutral';
      sentimentReason = `Average review rating ${avg.toFixed(1)}/5 — mixed feedback.`;
    } else {
      sentiment = 'negative';
      sentimentReason = `Average review rating ${avg.toFixed(1)}/5 — at-risk customer.`;
    }
  } else if (history.conversations.length > 0) {
    sentiment = 'neutral';
    sentimentReason = `${history.conversations.length} conversation(s) on file, no complaints flagged.`;
  }

  // Churn risk: based on recency of last job.
  let churnRisk: RiskLevel = 'low';
  let churnReason = 'Recent activity present.';
  const lastJobAt = history.jobs[0]?.scheduledAt ?? history.jobs[0]?.createdAt ?? null;
  const daysSinceLastJob = daysSince(lastJobAt);
  if (daysSinceLastJob == null) {
    churnRisk = 'medium';
    churnReason = 'No jobs on record — relationship not yet established.';
  } else if (daysSinceLastJob > RECENT_JOB_DAYS) {
    churnRisk = 'high';
    churnReason = `Last job was ${daysSinceLastJob} days ago — beyond the ${RECENT_JOB_DAYS}-day churn window.`;
  } else if (daysSinceLastJob > 90) {
    churnRisk = 'medium';
    churnReason = `Last job was ${daysSinceLastJob} days ago — entering the re-engagement window.`;
  } else {
    churnReason = `Last job was ${daysSinceLastJob} days ago — active customer.`;
  }

  // Payment risk: from overdue invoices + payment rate.
  let paymentRisk: RiskLevel = 'low';
  let paymentReason = 'No overdue invoices.';
  if (ltv.overdueInvoices >= 2 || ltv.paymentRate < 0.6) {
    paymentRisk = 'high';
    paymentReason = `${ltv.overdueInvoices} overdue invoice(s); payment rate ${(ltv.paymentRate * 100).toFixed(0)}%.`;
  } else if (ltv.overdueInvoices === 1 || ltv.paymentRate < 0.9) {
    paymentRisk = 'medium';
    paymentReason = `1 overdue invoice; payment rate ${(ltv.paymentRate * 100).toFixed(0)}%.`;
  } else if (ltv.paidInvoices > 0) {
    paymentReason = `${ltv.paidInvoices} paid invoice(s); payment rate ${(ltv.paymentRate * 100).toFixed(0)}%.`;
  }

  // Next best actions: rule-based, concrete.
  const nextBestActions: string[] = [];
  if (churnRisk === 'high') {
    nextBestActions.push(
      `Re-engagement needed — send a "we miss you" offer; last job was ${daysSinceLastJob} days ago.`,
    );
  } else if (churnRisk === 'medium') {
    nextBestActions.push(
      `Schedule a check-in call — last job was ${daysSinceLastJob} days ago.`,
    );
  }
  if (sentiment === 'positive') {
    nextBestActions.push(
      'Customer left positive reviews — ask for a Google review + referral.',
    );
  } else if (sentiment === 'negative') {
    nextBestActions.push(
      'Customer has negative reviews — owner follow-up call recommended to resolve.',
    );
  }
  if (paymentRisk === 'high') {
    nextBestActions.push(
      `Outstanding ${ltv.overdueInvoices} overdue invoice(s) — escalate to collections / payment plan.`,
    );
  }
  if (ltv.jobCount >= 3 && ltv.paymentRate >= 0.9) {
    nextBestActions.push(
      'Consider enrolling the customer in a recurring Service Plan (loyal customer).',
    );
  }
  if (history.quotes.some((q) => q.status === 'sent')) {
    nextBestActions.push(
      'Open quote awaiting customer decision — follow up to close.',
    );
  }
  if (nextBestActions.length === 0) {
    nextBestActions.push(
      'Continue regular service — no urgent action required.',
    );
  }

  const summary =
    `${customer.name} has been a customer since ${new Date(customer.createdAt).toLocaleDateString()}. ` +
    `${ltv.jobCount} job(s), ${ltv.paidInvoices} paid invoice(s) totaling ${ltv.currency}${ltv.totalSpent.toFixed(2)}, ` +
    `with ${(ltv.paymentRate * 100).toFixed(0)}% payment rate. ` +
    `Sentiment is ${sentiment}; churn risk is ${churnRisk}; payment risk is ${paymentRisk}.`;

  return {
    lifetimeValue: {
      totalSpent: ltv.totalSpent,
      averageJobValue: ltv.averageJobValue,
      paymentHistory: `Paid ${ltv.paidInvoices} of ${ltv.paidInvoices + ltv.overdueInvoices} tracked invoice(s); payment rate ${(ltv.paymentRate * 100).toFixed(0)}%.`,
    },
    sentiment,
    sentimentReason,
    nextBestActions: nextBestActions.slice(0, 5),
    riskAssessment: {
      churnRisk,
      churnReason,
      paymentRisk,
      paymentReason,
    },
    summary,
  };
}

// ─── Main route handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const log = withRequestId(request);

  // ── 1. Auth ──────────────────────────────────────────────────────────
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    );
  }

  // ── 2. Parse + validate body ─────────────────────────────────────────
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body.customerId !== 'string' || body.customerId.trim().length === 0) {
    return NextResponse.json(
      { error: '`customerId` is required.' },
      { status: 400 },
    );
  }
  const customerId = body.customerId.trim();

  // ── 3. Load customer (tenant-scoped) ─────────────────────────────────
  const customer = await loadCustomerScoped(
    customerId,
    authUser.tenantId,
    !!authUser.isSuperAdmin,
  );
  if (!customer) {
    return NextResponse.json(
      { error: 'Customer not found (or not in your tenant).' },
      { status: 404 },
    );
  }

  // ── 4. Load full history + compute LTV ───────────────────────────────
  const history = await loadCustomerHistory(customerId, authUser.tenantId);
  const ltv = computeLifetimeValue(customer, history.jobs, history.invoices);

  // ── 5. Build raw stats object (always returned, even on LLM failure) ─
  const jobsByStatus: Record<string, number> = {};
  for (const j of history.jobs) {
    jobsByStatus[j.status] = (jobsByStatus[j.status] ?? 0) + 1;
  }
  const invoiceStatus = { paid: 0, sent: 0, draft: 0, overdue: 0, cancelled: 0 };
  for (const i of history.invoices) {
    if (i.status === 'paid') invoiceStatus.paid++;
    else if (i.status === 'sent') invoiceStatus.sent++;
    else if (i.status === 'draft') invoiceStatus.draft++;
    else if (i.status === 'cancelled') invoiceStatus.cancelled++;
    else if (i.status === 'pending_approval' || i.status === 'pending') {
      const ref = i.dueDate ?? i.createdAt;
      const ageDays = (Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays > OVERDUE_DAYS) invoiceStatus.overdue++;
      else invoiceStatus.sent++;
    }
  }

  const rawStats: RawStats = {
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      createdAt: toISO(customer.createdAt) ?? new Date().toISOString(),
    },
    counts: {
      jobs: history.jobs.length,
      invoices: history.invoices.length,
      quotes: history.quotes.length,
      conversations: history.conversations.length,
      reviews: history.reviews.length,
      timelineEvents: history.timeline.length,
    },
    jobsByStatus,
    invoiceStatus,
    lifetimeValue: ltv,
    recentJobs: history.jobs.slice(0, MAX_RECENT).map((j) => ({
      id: j.id,
      title: j.title,
      status: j.status,
      scheduledAt: toISO(j.scheduledAt),
      quotedAmount: j.quotedAmount,
    })),
    recentInvoices: history.invoices.slice(0, MAX_RECENT).map((i) => ({
      id: i.id,
      number: i.number,
      total: i.total,
      status: i.status,
      createdAt: toISO(i.createdAt) ?? new Date().toISOString(),
      paidAt: toISO(i.paidAt),
    })),
    recentReviews: history.reviews.slice(0, MAX_RECENT).map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: toISO(r.createdAt) ?? new Date().toISOString(),
    })),
    recentConversations: history.conversations.slice(0, MAX_RECENT).map((c) => ({
      id: c.id,
      channel: c.channel,
      lastMessageBody: c.lastMessageBody,
      lastDirection: c.lastDirection,
      lastMessageAt: toISO(c.lastMessageAt) ?? new Date().toISOString(),
    })),
    recentTimeline: history.timeline.slice(0, MAX_RECENT).map((t) => ({
      id: t.id,
      entryType: t.entryType,
      title: t.title,
      description: t.description,
      eventDate: toISO(t.eventDate) ?? new Date().toISOString(),
    })),
  };

  // ── 6. Run LLM (with fallback) ───────────────────────────────────────
  let aiSummary: AISummary;
  let aiModel: string;
  let fallback: boolean;

  const zai = await getZai();
  if (zai) {
    const userPrompt = buildUserPrompt(customer, history, ltv);
    const llmText = await callLLMJson(zai, userPrompt);
    if (llmText) {
      aiSummary = normalizeLLMOutput(llmText, ltv);
      aiModel = AI_MODEL_TAG;
      fallback = false;
    } else {
      aiSummary = fallbackSummary(customer, history, ltv);
      aiModel = `${FALLBACK_MODEL_TAG} (llm-empty)`;
      fallback = true;
    }
  } else {
    aiSummary = fallbackSummary(customer, history, ltv);
    aiModel = FALLBACK_MODEL_TAG;
    fallback = true;
  }

  log.info(
    {
      userId: authUser.id,
      tenantId: authUser.tenantId,
      customerId,
      aiModel,
      fallback,
      sentiment: aiSummary.sentiment,
      churnRisk: aiSummary.riskAssessment.churnRisk,
      paymentRisk: aiSummary.riskAssessment.paymentRisk,
      totalSpent: ltv.totalSpent,
      jobCount: ltv.jobCount,
    },
    'ai/customer-360: completed',
  );

  const resp: Customer360Response = {
    customerId,
    aiSummary,
    rawStats,
    aiModel,
    fallback,
  };
  return NextResponse.json(resp);
}
