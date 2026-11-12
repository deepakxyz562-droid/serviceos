import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { requireBgosEntitled } from '@/lib/bgos-entitlement';
import {
  GOOGLE_REVIEW_REMOVAL_TOOL_URL,
  generateAppealAndDisputeReply,
  getReviewReportReasonLabel,
  mergeReviewFlagReport,
  normalizeReviewFlagStatus,
  normalizeReviewReportReason,
  parseReviewFlagReport,
  type ReviewFlagReport,
} from '@/lib/reviews/report-review';

/**
 * POST /api/reviews/[id]/report
 * Flag a suspicious/fake/malicious review, optionally hide it from the public BGOS Business Page,
 * and generate a Google Policy Removal Appeal + diplomatic "no-record" dispute reply.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const gate = await requireBgosEntitled(user);
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const existing = await db.review.findFirst({
      where: { id, tenantId: user.tenantId },
      select: {
        id: true,
        rating: true,
        comment: true,
        authorName: true,
        responseJson: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true, phone: true },
    });

    const prevFlag = parseReviewFlagReport(existing.responseJson);
    const reason = normalizeReviewReportReason(body.reason ?? prevFlag?.reason);
    const flagStatus = normalizeReviewFlagStatus(body.flagStatus ?? prevFlag?.flagStatus ?? 'flagged');
    const details =
      typeof body.details === 'string'
        ? body.details.trim().slice(0, 1000)
        : prevFlag?.details ?? '';
    const hideOnPublicPage =
      typeof body.hideOnPublicPage === 'boolean'
        ? body.hideOnPublicPage
        : prevFlag?.hideOnPublicPage ?? true;

    const useAi = body.regenerateAppeal === true || !prevFlag?.appealText;
    const generated = useAi
      ? await generateAppealAndDisputeReply({
          businessName: tenant?.name || 'Our Business',
          authorName: existing.authorName || 'Reviewer',
          rating: existing.rating,
          comment: existing.comment || '',
          reason,
          details,
          businessPhone: tenant?.phone,
          useAi: body.useAi !== false,
        })
      : {
          appealText:
            typeof body.appealText === 'string' && body.appealText.trim()
              ? body.appealText.trim()
              : prevFlag.appealText,
          disputeReplyDraft:
            typeof body.disputeReplyDraft === 'string' && body.disputeReplyDraft.trim()
              ? body.disputeReplyDraft.trim()
              : prevFlag.disputeReplyDraft,
        };

    const nowIso = new Date().toISOString();
    const flagReport: ReviewFlagReport = {
      reason,
      reasonLabel: getReviewReportReasonLabel(reason),
      details,
      flagStatus,
      hideOnPublicPage,
      appealText:
        typeof body.appealText === 'string' && body.appealText.trim()
          ? body.appealText.trim()
          : generated.appealText,
      disputeReplyDraft:
        typeof body.disputeReplyDraft === 'string' && body.disputeReplyDraft.trim()
          ? body.disputeReplyDraft.trim()
          : generated.disputeReplyDraft,
      reportedAt: prevFlag?.reportedAt || nowIso,
      reportedBy: prevFlag?.reportedBy || user.id || user.email || null,
      updatedAt: nowIso,
      googleRemovalToolUrl: GOOGLE_REVIEW_REMOVAL_TOOL_URL,
    };

    const mergedResponseJson = mergeReviewFlagReport(existing.responseJson, flagReport);

    await db.review.update({
      where: { id: existing.id },
      data: { responseJson: mergedResponseJson },
    });

    return NextResponse.json({
      ok: true,
      reviewId: existing.id,
      flagReport,
      googleRemovalToolUrl: GOOGLE_REVIEW_REMOVAL_TOOL_URL,
    });
  } catch (error) {
    console.error('[reviews/report] Failed to report review:', error);
    return NextResponse.json({ error: 'Failed to save review report' }, { status: 500 });
  }
}

/**
 * DELETE /api/reviews/[id]/report
 * Clear a review flag / unhide it from the public BGOS Business Page.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const gate = await requireBgosEntitled(user);
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const existing = await db.review.findFirst({
      where: { id, tenantId: user.tenantId },
      select: { id: true, responseJson: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const mergedResponseJson = mergeReviewFlagReport(existing.responseJson, null);
    await db.review.update({
      where: { id: existing.id },
      data: { responseJson: mergedResponseJson },
    });

    return NextResponse.json({ ok: true, reviewId: existing.id, flagReport: null });
  } catch (error) {
    console.error('[reviews/report] Failed to clear report:', error);
    return NextResponse.json({ error: 'Failed to clear review report' }, { status: 500 });
  }
}
