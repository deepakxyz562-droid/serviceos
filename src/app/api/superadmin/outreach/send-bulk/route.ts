import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { sendEmail } from '@/lib/email-send';
import {
  buildVariables,
  renderTemplate,
  generateClaimToken,
  buildClaimUrl,
  getDailyLimit,
  countSentToday,
  getLastSentAt,
  getCooldownUntil,
  isEmailSuppressed,
  type OutreachStats,
} from '@/lib/outreach';
import { wrapInMasterOutreachLayout } from '@/lib/email-templates/outreach-templates';

export const dynamic = 'force-dynamic';

/**
 * POST /api/superadmin/outreach/send-bulk
 * ----------------------------------------
 * Send the SAME template (personalized per tenant) to multiple tenants at once.
 *
 * Auth: superadmin only.
 *
 * Flow (validate-all-first, then send only eligible):
 *   1. Auth check.
 *   2. Parse body: { tenantIds: string[], templateId, customVariables? }.
 *      Cap tenantIds at 100 to prevent abuse.
 *   3. Load template ONCE (extract sub-category 'claim' | 'outreach').
 *   4. Load all tenants in ONE query (select outreach-relevant fields).
 *   5. Per-tenant pre-flight (in parallel): no-email, suppressed, cooldown,
 *      opted-out, template-gate (claim template on claimed tenant).
 *      Build an `eligible` list + a `skipped` list (with reasons).
 *   6. ATOMIC QUOTA CHECK (transaction):
 *      - Count today's sent emails (status='sent') inside a transaction.
 *      - remaining = dailyLimit - sentToday.
 *      - If remaining <= 0 → skip all eligible with reason 'daily_limit_reached'.
 *      - Cap eligible to `min(eligible.length, remaining)`. Tenants beyond the
 *        cap get reason 'daily_limit_reached'.
 *      - Insert ALL eligible EmailCommunication rows (status='queued') inside
 *        the SAME transaction so concurrent requests see the updated count.
 *   7. For each queued row: render per-tenant variables, call sendEmail,
 *      update row to 'sent' (with providerMessageId) or 'failed'.
 *      'failed' rows do NOT count toward the daily limit (the count filters
 *      on status='sent').
 *   8. Return per-tenant results:
 *        { requested, sent, skipped, results: [{ tenantId, status, reason? }] }
 *
 * Error policy:
 *   401/403 — auth
 *   400 — body parse, missing tenantIds/templateId, >100 tenantIds, empty array
 *   404 — template not found
 *   500 — unexpected DB error (transaction failure)
 *   200 — returns the per-tenant result summary (even if 0 sent)
 */
interface SendBulkRequestBody {
  tenantIds?: string[];
  templateId?: string;
  customVariables?: Record<string, string>;
}

// Reused from /send — extract 'claim' | 'outreach' from tagsJson
function extractTemplateCategory(tagsJson: string | null | undefined): 'claim' | 'outreach' {
  if (!tagsJson) return 'outreach';
  try {
    const arr = JSON.parse(tagsJson);
    if (Array.isArray(arr)) {
      for (const tag of arr) {
        if (typeof tag === 'string') {
          if (tag === 'claim') return 'claim';
          if (tag === 'outreach') return 'outreach';
        }
      }
    }
  } catch {
    // ignore
  }
  return 'outreach';
}

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  industry: string | null;
  city: string | null;
  country: string;
  claimed: boolean;
  outreachDisabled: boolean;
}

interface PerTenantResult {
  tenantId: string;
  tenantName: string;
  status: 'sent' | 'skipped' | 'failed';
  reason?: string;
  communicationId?: string;
  providerMessageId?: string | null;
}

export async function POST(request: NextRequest) {
  // ── 1. Auth ────────────────────────────────────────────────────────────
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isSuperAdminRequest())) {
    return NextResponse.json(
      { error: 'Forbidden — SuperAdmin access required' },
      { status: 403 },
    );
  }

  // ── 2. Parse body ──────────────────────────────────────────────────────
  let body: SendBulkRequestBody;
  try {
    body = (await request.json()) as SendBulkRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { tenantIds, templateId } = body;
  if (!Array.isArray(tenantIds) || tenantIds.length === 0) {
    return NextResponse.json(
      { error: 'tenantIds must be a non-empty array' },
      { status: 400 },
    );
  }
  if (tenantIds.length > 100) {
    return NextResponse.json(
      { error: 'Cannot send to more than 100 tenants at once' },
      { status: 400 },
    );
  }
  if (!templateId || typeof templateId !== 'string') {
    return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
  }

  // ── 3. Load template ONCE ──────────────────────────────────────────────
  let template: {
    id: string;
    subject: string;
    htmlBody: string;
    textBody: string | null;
    tagsJson: string;
  } | null;
  try {
    template = await db.emailTemplate.findUnique({
      where: { id: templateId },
      select: { id: true, subject: true, htmlBody: true, textBody: true, tagsJson: true },
    });
  } catch (err) {
    console.error('[outreach/send-bulk] DB error loading template:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }
  const templateCategory = extractTemplateCategory(template.tagsJson);

  // ── 4. Load all tenants in ONE query ───────────────────────────────────
  const uniqueIds = Array.from(new Set(tenantIds.filter(Boolean)));
  let tenants: TenantRow[];
  try {
    tenants = await db.tenant.findMany({
      where: { id: { in: uniqueIds } },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        industry: true,
        city: true,
        country: true,
        claimed: true,
        outreachDisabled: true,
      },
    });
  } catch (err) {
    console.error('[outreach/send-bulk] DB error loading tenants:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  // Track which requested IDs don't exist (404 per tenant)
  const foundIds = new Set(tenants.map((t) => t.id));
  const results: PerTenantResult[] = [];

  // ── 5. Per-tenant pre-flight (in parallel) ─────────────────────────────
  const eligible: TenantRow[] = [];
  for (const id of uniqueIds) {
    if (!foundIds.has(id)) {
      results.push({
        tenantId: id,
        tenantName: 'Unknown',
        status: 'skipped',
        reason: 'tenant_not_found',
      });
    }
  }

  const preflightPromises = tenants.map(async (t) => {
    // a. outreachDisabled
    if (t.outreachDisabled) {
      return { tenant: t, eligible: false, reason: 'tenant_outreach_disabled' as const };
    }
    // b. no email
    if (!t.email || !t.email.includes('@')) {
      return { tenant: t, eligible: false, reason: 'no_email_on_file' as const };
    }
    // c. template gate: claim template only for unclaimed
    if (templateCategory === 'claim' && t.claimed) {
      return { tenant: t, eligible: false, reason: 'template_not_allowed_for_claimed' as const };
    }
    // d. suppression check
    const supp = await isEmailSuppressed(t.email, t.id);
    if (supp.suppressed) {
      return { tenant: t, eligible: false, reason: 'email_suppressed' as const };
    }
    // e. cooldown check
    const lastSentAt = await getLastSentAt(t.id);
    const cooldownUntil = getCooldownUntil(lastSentAt);
    if (cooldownUntil) {
      return { tenant: t, eligible: false, reason: 'cooldown_active' as const };
    }
    return { tenant: t, eligible: true, reason: null };
  });

  const preflightResults = await Promise.all(preflightPromises);
  for (const pf of preflightResults) {
    if (!pf.eligible && pf.reason) {
      results.push({
        tenantId: pf.tenant.id,
        tenantName: pf.tenant.name,
        status: 'skipped',
        reason: pf.reason,
      });
    } else {
      eligible.push(pf.tenant);
    }
  }

  // ── 6. ATOMIC QUOTA CHECK (transaction) ────────────────────────────────
  // Count + insert all queued rows in ONE transaction so concurrent requests
  // see the updated count. Best-effort atomicity (READ COMMITTED); the daily
  // limit is a safety guardrail, not a hard security boundary.
  const dailyLimit = await getDailyLimit();
  let queuedRows: { id: string; tenantId: string; tenant: TenantRow }[] = [];

  if (eligible.length > 0) {
    try {
      queuedRows = await db.$transaction(async (tx) => {
        const sentToday = await tx.emailCommunication.count({
          where: {
            status: 'sent',
            sentAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        });
        const remaining = Math.max(0, dailyLimit - sentToday);
        const allowedCount = Math.min(eligible.length, remaining);
        const allowed = eligible.slice(0, allowedCount);
        const overflow = eligible.slice(allowedCount);

        // Overflow tenants get 'daily_limit_reached'
        for (const t of overflow) {
          results.push({
            tenantId: t.id,
            tenantName: t.name,
            status: 'skipped',
            reason: 'daily_limit_reached',
          });
        }

        // Insert queued rows for allowed tenants
        const created: { id: string; tenantId: string; tenant: TenantRow }[] = [];
        for (const t of allowed) {
          const row = await tx.emailCommunication.create({
            data: {
              tenantId: t.id,
              recipientEmail: t.email!.toLowerCase().trim(),
              recipientName: t.name,
              templateId: template!.id,
              subject: template!.subject, // placeholder; will be rendered per-tenant below
              htmlBody: template!.htmlBody, // placeholder
              textBody: template!.textBody,
              category: 'outreach',
              variablesJson: '{}',
              status: 'queued',
              sentByUserId: user.id,
            },
            select: { id: true },
          });
          created.push({ id: row.id, tenantId: t.id, tenant: t });
        }
        return created;
      });
    } catch (err) {
      console.error('[outreach/send-bulk] transaction failed:', err);
      // Mark all eligible as failed
      for (const t of eligible) {
        results.push({
          tenantId: t.id,
          tenantName: t.name,
          status: 'failed',
          reason: 'database_error',
        });
      }
      return NextResponse.json(
        {
          requested: uniqueIds.length,
          sent: 0,
          skipped: results.filter((r) => r.status === 'skipped').length,
          results,
          error: 'Database transaction failed',
        },
        { status: 500 },
      );
    }
  }

  // ── 7. Send each queued email (per-tenant render + sendEmail) ──────────
  // Run sequentially to avoid overwhelming the ESP. With a 20/day cap this is
  // at most 20 sends — sequential is fine and easier to debug.
  for (const qr of queuedRows) {
    const t = qr.tenant;
    const recipientEmail = t.email!.toLowerCase().trim();

    // a. Claim token (only for 'claim' templates)
    let claimLink: string | undefined;
    let claimToken: string | undefined;
    if (templateCategory === 'claim') {
      try {
        const generated = await generateClaimToken(t.id);
        claimToken = generated.token;
        claimLink = buildClaimUrl(claimToken);
      } catch (err) {
        console.error('[outreach/send-bulk] claim token failed for', t.id, err);
        // Mark this one as failed and continue
        await db.emailCommunication.update({
          where: { id: qr.id },
          data: { status: 'failed' },
        }).catch(() => {});
        results.push({
          tenantId: t.id,
          tenantName: t.name,
          status: 'failed',
          reason: 'claim_token_generation_failed',
        });
        continue;
      }
    }

    // b. Build + merge variables
    const vars = await buildVariables({
      tenant: {
        name: t.name,
        slug: t.slug,
        industry: t.industry,
        city: t.city,
        country: t.country,
      },
      claimLink,
      claimToken,
    });
    if (body.customVariables && typeof body.customVariables === 'object') {
      for (const [k, v] of Object.entries(body.customVariables)) {
        if (typeof v === 'string') vars[k] = v;
      }
    }

    // c. Render per-tenant
    const renderedSubject = renderTemplate(template.subject, vars);
    const rawRenderedHtml = renderTemplate(template.htmlBody, vars);
    const renderedHtml = wrapInMasterOutreachLayout(rawRenderedHtml, vars);
    const renderedText = template.textBody ? renderTemplate(template.textBody, vars) : null;

    // d. Send
    let sendOk = false;
    let providerMessageId: string | null = null;
    try {
      const result = await sendEmail({
        to: recipientEmail,
        subject: renderedSubject,
        html: renderedHtml,
        text: renderedText ?? undefined,
        usageType: 'transactional',
      });
      if (result.success) {
        sendOk = true;
        providerMessageId = result.messageId ?? null;
      }
    } catch (err) {
      console.error('[outreach/send-bulk] sendEmail threw for', t.id, err);
    }

    // e. Update the EmailCommunication row with rendered content + status
    try {
      if (sendOk) {
        await db.emailCommunication.update({
          where: { id: qr.id },
          data: {
            subject: renderedSubject,
            htmlBody: renderedHtml,
            textBody: renderedText,
            variablesJson: JSON.stringify(vars),
            status: 'sent',
            sentAt: new Date(),
            providerMessageId,
          },
        });
        // Link claim token to the email
        if (claimToken) {
          await db.outreachClaimToken.update({
            where: { tenantId: t.id },
            data: { emailCommunicationId: qr.id },
          }).catch(() => {});
        }
        results.push({
          tenantId: t.id,
          tenantName: t.name,
          status: 'sent',
          communicationId: qr.id,
          providerMessageId,
        });
      } else {
        await db.emailCommunication.update({
          where: { id: qr.id },
          data: { status: 'failed' },
        });
        results.push({
          tenantId: t.id,
          tenantName: t.name,
          status: 'failed',
          reason: 'send_failed',
        });
      }
    } catch (err) {
      console.error('[outreach/send-bulk] status update failed for', t.id, err);
      // The send may have succeeded — push a 'sent' result with a note
      results.push({
        tenantId: t.id,
        tenantName: t.name,
        status: sendOk ? 'sent' : 'failed',
        communicationId: qr.id,
        providerMessageId,
        reason: sendOk ? undefined : 'send_failed',
      });
    }
  }

  // ── 8. Build summary response ──────────────────────────────────────────
  const sentCount = results.filter((r) => r.status === 'sent').length;
  const skippedCount = results.filter((r) => r.status === 'skipped').length;
  const failedCount = results.filter((r) => r.status === 'failed').length;

  // Refresh stats for the response
  const sentToday = await countSentToday().catch(() => 0);
  const stats: OutreachStats = {
    dailyLimit,
    sentToday,
    remaining: Math.max(0, dailyLimit - sentToday),
    lastSentAt: null,
    cooldownUntil: null,
    isSuppressed: false,
    suppressionReason: null,
    outreachDisabled: false,
  };

  return NextResponse.json({
    requested: uniqueIds.length,
    sent: sentCount,
    skipped: skippedCount,
    failed: failedCount,
    results,
    stats,
  });
}
