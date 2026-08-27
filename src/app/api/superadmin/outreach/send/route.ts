import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { sendEmail } from '@/lib/email-send';
import {
  preflightSend,
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
  type PreflightResult,
} from '@/lib/outreach';

export const dynamic = 'force-dynamic';

/**
 * POST /api/superadmin/outreach/send
 * -------------------------------
 * Send a one-to-one outreach email to a tenant.
 *
 * Auth: superadmin only (`isSuperAdminRequest()` + `getAuthUser()`).
 *
 * Body:
 *   {
 *     tenantId:         string,                 // required
 *     templateId?:      string | null,          // optional — if null, subject+htmlBody must be supplied
 *     recipientEmail?:  string | null,          // optional override for tenant.email
 *     subject?:         string | null,          // required when templateId is null (ad-hoc email)
 *     htmlBody?:        string | null,          // required when templateId is null (ad-hoc email)
 *     textBody?:        string | null,          // optional plain-text fallback
 *     customVariables?: Record<string, string>  // optional extra merge vars
 *   }
 *
 * Flow:
 *   1. Auth check.
 *   2. Load tenant (select id, name, slug, email, industry, city, country, claimed, outreachDisabled).
 *   3. Resolve recipient email (body override or tenant.email). 400 if neither present.
 *   4. Resolve template: if templateId provided, load it and extract the
 *      sub-category ('claim' | 'outreach') from tagsJson. Otherwise require
 *      subject + htmlBody in the body (ad-hoc email, category 'outreach').
 *   5. Pre-flight check via `preflightSend` (outreach lib). On failure,
 *      return 400 with { error, code, stats } so the UI can show why.
 *   6. If templateCategory === 'claim', generate a fresh claim token +
 *      build the claim URL (one active token per tenant, replaces prior).
 *   7. Build merge variables via `buildVariables`, merge customVariables on top.
 *   8. Render subject/html/text (template or ad-hoc) for variable substitution.
 *   9. Insert EmailCommunication row with status='queued'.
 *  10. Call `sendEmail({ to, subject, html, text, usageType: 'transactional' })`.
 *  11. Update EmailCommunication based on result:
 *        success → status='sent', sentAt=now(), providerMessageId=result.messageId
 *        failure → status='failed' (does NOT count toward daily limit)
 *  12. If a claim token was generated, link it to the email communication row.
 *  13. Return 200 with { ok, communication, stats } — re-fetch stats so the
 *      UI sees the freshly-incremented sentToday count.
 *
 * Error policy:
 *   - 401 / 403 — auth
 *   - 400 — body parse error, missing fields, or pre-flight blocked
 *   - 404 — tenant not found
 *   - 502 — sendEmail threw OR returned success=false
 *   - 500 — unexpected DB error
 *
 * The EmailCommunication row is NEVER left in 'queued' state — on any send
 * failure it's flipped to 'failed' so it won't count toward the daily limit
 * and won't appear as a "pending" send in the UI.
 */

interface SendRequestBody {
  tenantId?: string;
  templateId?: string | null;
  recipientEmail?: string | null;
  subject?: string | null;
  htmlBody?: string | null;
  textBody?: string | null;
  customVariables?: Record<string, string>;
}

// Extract the sub-category ('claim' | 'outreach') from an EmailTemplate's
// tagsJson array. Falls back to 'outreach' when not found.
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
    // ignore malformed JSON
  }
  return 'outreach';
}

// Re-fetch fresh stats after a send so the UI sees the updated counts.
async function refreshStats(
  tenantId: string,
  recipientEmail: string,
  outreachDisabled: boolean,
): Promise<OutreachStats> {
  const [dailyLimit, sentToday, lastSentAt, supp] = await Promise.all([
    getDailyLimit(),
    countSentToday(),
    getLastSentAt(tenantId),
    isEmailSuppressed(recipientEmail, tenantId),
  ]);
  const cooldownUntil = getCooldownUntil(lastSentAt);
  return {
    dailyLimit,
    sentToday,
    remaining: Math.max(0, dailyLimit - sentToday),
    lastSentAt,
    cooldownUntil,
    isSuppressed: supp.suppressed,
    suppressionReason: supp.reason,
    outreachDisabled,
  };
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
  let body: SendRequestBody;
  try {
    body = (await request.json()) as SendRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { tenantId } = body;
  if (!tenantId || typeof tenantId !== 'string') {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
  }

  // ── 3. Load tenant ─────────────────────────────────────────────────────
  let tenant: {
    id: string;
    name: string;
    slug: string;
    email: string | null;
    industry: string | null;
    city: string | null;
    country: string;
    claimed: boolean;
    outreachDisabled: boolean;
  } | null;
  try {
    tenant = await db.tenant.findUnique({
      where: { id: tenantId },
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
    console.error('[outreach/send] DB error loading tenant:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  // ── 4. Resolve recipient email ─────────────────────────────────────────
  const recipientEmailRaw = body.recipientEmail || tenant.email;
  if (!recipientEmailRaw || !recipientEmailRaw.includes('@')) {
    return NextResponse.json(
      { error: 'No valid recipient email address (provide recipientEmail or set tenant.email).' },
      { status: 400 },
    );
  }
  const recipientEmail = recipientEmailRaw.toLowerCase().trim();

  // ── 5. Resolve template / ad-hoc content ───────────────────────────────
  let templateId: string | null = null;
  let templateCategory: 'claim' | 'outreach' = 'outreach';
  let rawSubject: string;
  let rawHtmlBody: string;
  let rawTextBody: string | null = null;

  if (body.templateId) {
    templateId = body.templateId;
    let template: {
      id: string;
      subject: string;
      htmlBody: string;
      textBody: string | null;
      tagsJson: string;
    } | null;
    try {
      template = await db.emailTemplate.findUnique({
        where: { id: body.templateId },
        select: { id: true, subject: true, htmlBody: true, textBody: true, tagsJson: true },
      });
    } catch (err) {
      console.error('[outreach/send] DB error loading template:', err);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    templateCategory = extractTemplateCategory(template.tagsJson);
    rawSubject = template.subject;
    rawHtmlBody = template.htmlBody;
    rawTextBody = template.textBody;
  } else {
    // Ad-hoc email — require subject + htmlBody in body
    if (!body.subject || !body.htmlBody) {
      return NextResponse.json(
        { error: 'subject and htmlBody are required when templateId is not provided.' },
        { status: 400 },
      );
    }
    rawSubject = body.subject;
    rawHtmlBody = body.htmlBody;
    rawTextBody = body.textBody ?? null;
  }

  // ── 6. Pre-flight check ────────────────────────────────────────────────
  let preflight: PreflightResult & { stats: OutreachStats };
  try {
    preflight = await preflightSend({
      tenantId: tenant.id,
      recipientEmail,
      templateCategory,
      tenantClaimed: tenant.claimed,
      tenantOutreachDisabled: tenant.outreachDisabled,
    });
  } catch (err) {
    console.error('[outreach/send] preflight error:', err);
    return NextResponse.json({ error: 'Pre-flight check failed' }, { status: 500 });
  }

  if (!preflight.ok) {
    return NextResponse.json(
      {
        error: preflight.reason ?? 'Pre-flight check failed.',
        code: preflight.code,
        stats: preflight.stats,
      },
      { status: 400 },
    );
  }

  // ── 7. Claim token (only for 'claim' templates) ────────────────────────
  let claimLink: string | undefined;
  let claimToken: string | undefined;
  if (templateCategory === 'claim') {
    try {
      const generated = await generateClaimToken(tenant.id);
      claimToken = generated.token;
      claimLink = buildClaimUrl(claimToken);
    } catch (err) {
      console.error('[outreach/send] claim token generation failed:', err);
      return NextResponse.json({ error: 'Failed to generate claim token' }, { status: 500 });
    }
  }

  // ── 8. Build + merge variables ─────────────────────────────────────────
  const vars = await buildVariables({
    tenant: {
      name: tenant.name,
      slug: tenant.slug,
      industry: tenant.industry,
      city: tenant.city,
      country: tenant.country,
    },
    claimLink,
    claimToken,
  });
  if (body.customVariables && typeof body.customVariables === 'object') {
    for (const [k, v] of Object.entries(body.customVariables)) {
      if (typeof v === 'string') {
        vars[k] = v;
      }
    }
  }

  // ── 9. Render subject / html / text ────────────────────────────────────
  const renderedSubject = renderTemplate(rawSubject, vars);
  const renderedHtml = renderTemplate(rawHtmlBody, vars);
  const renderedText = rawTextBody ? renderTemplate(rawTextBody, vars) : null;

  // ── 10. Insert EmailCommunication (status='queued') ────────────────────
  let emailComm: { id: string };
  try {
    emailComm = await db.emailCommunication.create({
      data: {
        tenantId: tenant.id,
        recipientEmail,
        recipientName: tenant.name,
        templateId,
        subject: renderedSubject,
        htmlBody: renderedHtml,
        textBody: renderedText,
        category: 'outreach',
        variablesJson: JSON.stringify(vars),
        status: 'queued',
        sentByUserId: user.id,
      },
      select: { id: true },
    });
  } catch (err) {
    console.error('[outreach/send] DB error inserting EmailCommunication:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  // ── 11. Send email ─────────────────────────────────────────────────────
  let sendOk = false;
  let providerMessageId: string | null = null;
  let sendError: string | undefined;
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
    } else {
      sendError = result.error ?? 'Unknown send failure';
    }
  } catch (err) {
    sendError = err instanceof Error ? err.message : 'sendEmail threw';
    console.error('[outreach/send] sendEmail threw:', err);
  }

  // ── 12. Update EmailCommunication based on send result ─────────────────
  try {
    if (sendOk) {
      await db.emailCommunication.update({
        where: { id: emailComm.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
          providerMessageId,
        },
      });
    } else {
      await db.emailCommunication.update({
        where: { id: emailComm.id },
        data: { status: 'failed' },
      });
    }
  } catch (err) {
    // Non-fatal — the send itself may have succeeded; we just couldn't
    // update the row. Log and continue so the response still reflects truth.
    console.error('[outreach/send] DB error updating EmailCommunication status:', err);
  }

  // ── 13. Link claim token to the email communication ────────────────────
  if (claimToken && sendOk) {
    try {
      await db.outreachClaimToken.update({
        where: { tenantId: tenant.id },
        data: { emailCommunicationId: emailComm.id },
      });
    } catch (err) {
      // Non-fatal — token still works for the recipient to claim, we just
      // lose the audit link.
      console.error('[outreach/send] failed to link claim token to email:', err);
    }
  }

  // ── 14. Handle send failure → 502 ──────────────────────────────────────
  if (!sendOk) {
    return NextResponse.json(
      {
        ok: false,
        error: sendError ?? 'Email send failed',
        communication: {
          id: emailComm.id,
          status: 'failed' as const,
          providerMessageId: null,
          sentAt: null,
        },
      },
      { status: 502 },
    );
  }

  // ── 15. Refresh stats + return 200 ─────────────────────────────────────
  let stats: OutreachStats;
  try {
    stats = await refreshStats(tenant.id, recipientEmail, tenant.outreachDisabled);
  } catch (err) {
    console.error('[outreach/send] failed to refresh stats:', err);
    // Don't fail the response — return null stats. The UI can refetch.
    stats = preflight.stats;
  }

  return NextResponse.json({
    ok: true,
    communication: {
      id: emailComm.id,
      status: 'sent' as const,
      providerMessageId,
      sentAt: new Date().toISOString(),
    },
    stats,
  });
}
