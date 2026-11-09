import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import {
  loadBgosTenantSnapshots,
  type BgosTenantSnapshot,
} from '@/lib/emails/bgos/lifecycle';
import { dispatchBgosEmail, isEmailSuppressed, parseBgosEmailPrefs } from '@/lib/emails/bgos/sender';
import { isDeliverableEmail, renderBgosPromoEmail, resolveBgosBaseUrl } from '@/lib/emails/bgos/templates';

export type PromoSegment =
  | 'all'
  | 'unpaid_or_expired'
  | 'zero_or_low_reviews'
  | 'inactive';

function matchesSegment(snap: BgosTenantSnapshot, segment: PromoSegment, nowMs: number): boolean {
  if (snap.suspendedAt) return false;
  switch (segment) {
    case 'unpaid_or_expired':
      return !snap.isPaidActive;
    case 'zero_or_low_reviews':
      return snap.totalReviewsCount < 5;
    case 'inactive': {
      const inactiveDays = Math.floor((nowMs - snap.lastActivityAt.getTime()) / (24 * 60 * 60 * 1000));
      return !snap.isPaidActive && inactiveDays >= 3;
    }
    case 'all':
    default:
      return true;
  }
}

/**
 * POST /api/superadmin/bgos-promo/send
 *
 * SuperAdmin endpoint to send or dry-run/preview a promotional or product
 * announcement email to registered BGOS business owners.
 *
 * Body:
 * {
 *   subject: string,
 *   headline: string,
 *   subheadline?: string,
 *   badgeText?: string,
 *   bodyParagraphs: string[],
 *   highlights?: string[],
 *   ctaLabel: string,
 *   ctaUrl?: string,
 *   segment?: 'all' | 'unpaid_or_expired' | 'zero_or_low_reviews' | 'inactive',
 *   campaignKey?: string,
 *   previewEmail?: string, // if provided, sends ONLY 1 test email to previewEmail (does not blast tenants)
 *   dryRun?: boolean,
 *   limit?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json(
        { error: 'Forbidden - SuperAdmin access required' },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const headline = typeof body.headline === 'string' ? body.headline.trim() : '';
    const subheadline = typeof body.subheadline === 'string' ? body.subheadline.trim() : undefined;
    const badgeText = typeof body.badgeText === 'string' ? body.badgeText.trim() : undefined;
    const bodyParagraphs = Array.isArray(body.bodyParagraphs)
      ? body.bodyParagraphs.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
      : [];
    const highlights = Array.isArray(body.highlights)
      ? body.highlights.filter((h): h is string => typeof h === 'string' && h.trim().length > 0)
      : undefined;
    const ctaLabel = typeof body.ctaLabel === 'string' && body.ctaLabel.trim()
      ? body.ctaLabel.trim()
      : 'Open BGOS Dashboard →';
    const appUrl = resolveBgosBaseUrl();
    const ctaUrl =
      typeof body.ctaUrl === 'string' && /^https?:\/\//i.test(body.ctaUrl.trim())
        ? body.ctaUrl.trim()
        : `${appUrl}/app?product=bgos&view=billing`;

    if (!subject || !headline || bodyParagraphs.length === 0) {
      return NextResponse.json(
        { error: 'subject, headline, and at least one bodyParagraph are required' },
        { status: 400 },
      );
    }

    const segment = (typeof body.segment === 'string' ? body.segment : 'all') as PromoSegment;
    const campaignKey =
      typeof body.campaignKey === 'string' && body.campaignKey.trim()
        ? body.campaignKey.trim()
        : `bgos_promo_${new Date().toISOString().slice(0, 10)}`;
    const dryRun = body.dryRun === true;
    const limit =
      typeof body.limit === 'number' && Number.isFinite(body.limit) && body.limit > 0
        ? Math.min(Math.floor(body.limit), 2000)
        : 500;
    const previewEmail =
      typeof body.previewEmail === 'string' && body.previewEmail.trim()
        ? body.previewEmail.trim()
        : null;

    // Preview mode: sends 1 email safely to previewEmail without affecting campaign dedup/audience
    if (previewEmail) {
      if (!isDeliverableEmail(previewEmail)) {
        return NextResponse.json(
          { error: 'previewEmail must be a valid deliverable email address' },
          { status: 400 },
        );
      }
      const rendered = renderBgosPromoEmail({
        businessName: 'Your Business (Preview)',
        subject,
        headline,
        subheadline,
        badgeText,
        bodyParagraphs,
        highlights,
        ctaLabel,
        ctaUrl,
        appUrl,
      });
      const res = await dispatchBgosEmail({
        tenantId: auth.tenantId || 'platform',
        to: previewEmail,
        recipientName: auth.name || 'SuperAdmin Preview',
        emailKey: 'bgos_promo_broadcast',
        cycleKey: `preview:${Date.now()}`,
        campaignKey: `${campaignKey}_preview`,
        category: 'marketing',
        subject: `[PREVIEW] ${rendered.subject}`,
        html: rendered.html,
        text: rendered.text,
        appUrl,
      });
      return NextResponse.json({
        success: res.sent,
        preview: true,
        sentTo: previewEmail,
        error: res.error,
      });
    }

    const snapshots = await loadBgosTenantSnapshots();
    const nowMs = Date.now();
    const matched = snapshots.filter((s) => matchesSegment(s, segment, nowMs)).slice(0, limit);

    // Fetch already-sent rows for this campaignKey so reruns are idempotent
    const alreadySentEmails = new Set<string>();
    try {
      const prevLogs = await db.notificationLog.findMany({
        where: { type: 'email', status: 'sent', metadataJson: { contains: campaignKey } },
        select: { recipient: true, metadataJson: true },
        take: 2000,
      });
      for (const l of prevLogs) {
        try {
          const meta = JSON.parse(l.metadataJson || '{}') as { campaignKey?: string };
          if (meta.campaignKey === campaignKey) {
            alreadySentEmails.add(l.recipient.toLowerCase());
          }
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* non-fatal */
    }

    const report: Array<{
      tenantId: string;
      businessName: string;
      email: string | null;
      status: 'sent' | 'would_send' | 'skipped' | 'failed';
      reason?: string;
    }> = [];

    for (const snap of matched) {
      const email = snap.recipientEmail?.trim() || '';
      if (!isDeliverableEmail(email)) {
        report.push({ tenantId: snap.tenantId, businessName: snap.businessName, email: snap.recipientEmail, status: 'skipped', reason: 'undeliverable_email' });
        continue;
      }
      if (alreadySentEmails.has(email.toLowerCase())) {
        report.push({ tenantId: snap.tenantId, businessName: snap.businessName, email, status: 'skipped', reason: 'already_sent_in_campaign' });
        continue;
      }
      if (await isEmailSuppressed(email, snap.tenantId)) {
        report.push({ tenantId: snap.tenantId, businessName: snap.businessName, email, status: 'skipped', reason: 'email_suppressed' });
        continue;
      }
      const prefs = parseBgosEmailPrefs(snap.settingsJson);
      if (!prefs.marketing) {
        report.push({ tenantId: snap.tenantId, businessName: snap.businessName, email, status: 'skipped', reason: 'opted_out_marketing' });
        continue;
      }

      if (dryRun) {
        alreadySentEmails.add(email.toLowerCase());
        report.push({ tenantId: snap.tenantId, businessName: snap.businessName, email, status: 'would_send' });
        continue;
      }

      const rendered = renderBgosPromoEmail({
        businessName: snap.businessName,
        subject,
        headline,
        subheadline,
        badgeText,
        bodyParagraphs,
        highlights,
        ctaLabel,
        ctaUrl,
        appUrl,
      });

      const res = await dispatchBgosEmail({
        tenantId: snap.tenantId,
        to: email,
        recipientName: snap.recipientName || snap.businessName,
        settingsJson: snap.settingsJson,
        emailKey: 'bgos_promo_broadcast',
        cycleKey: campaignKey,
        campaignKey,
        category: 'marketing',
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        appUrl,
      });

      if (res.sent) {
        alreadySentEmails.add(email.toLowerCase());
        report.push({ tenantId: snap.tenantId, businessName: snap.businessName, email, status: 'sent' });
      } else if (res.skipped) {
        report.push({ tenantId: snap.tenantId, businessName: snap.businessName, email, status: 'skipped', reason: res.reason });
      } else {
        report.push({ tenantId: snap.tenantId, businessName: snap.businessName, email, status: 'failed', reason: res.error });
      }
    }

    return NextResponse.json({
      success: true,
      campaignKey,
      segment,
      dryRun,
      totalBgosTenants: snapshots.length,
      matchedCount: matched.length,
      sent: report.filter((r) => r.status === 'sent').length,
      wouldSend: report.filter((r) => r.status === 'would_send').length,
      skipped: report.filter((r) => r.status === 'skipped').length,
      failed: report.filter((r) => r.status === 'failed').length,
      report,
    });
  } catch (error) {
    console.error('[superadmin/bgos-promo/send] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Broadcast failed' },
      { status: 500 },
    );
  }
}
