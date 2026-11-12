import { callAI } from '@/lib/ai-client';

export const GOOGLE_REVIEW_REMOVAL_TOOL_URL =
  'https://support.google.com/business/workflow/9945796';

export const REVIEW_REPORT_REASONS = [
  'conflict_of_interest',
  'fake_never_visited',
  'spam_off_topic',
  'harassment_profanity',
  'other',
] as const;

export type ReviewReportReason = (typeof REVIEW_REPORT_REASONS)[number];

export const REVIEW_FLAG_STATUSES = [
  'flagged',
  'appealed_on_google',
  'resolved',
] as const;

export type ReviewFlagStatus = (typeof REVIEW_FLAG_STATUSES)[number];

export interface ReviewFlagReport {
  reason: ReviewReportReason;
  reasonLabel: string;
  details: string;
  flagStatus: ReviewFlagStatus;
  hideOnPublicPage: boolean;
  appealText: string;
  disputeReplyDraft: string;
  reportedAt: string;
  reportedBy: string | null;
  updatedAt: string;
  googleRemovalToolUrl: string;
}

const REASON_LABELS: Record<ReviewReportReason, { label: string; policyRef: string }> = {
  conflict_of_interest: {
    label: 'Conflict of interest / Competitor',
    policyRef: 'Google Maps Prohibited Content — Conflict of Interest (competitor or former/affiliated party manipulation)',
  },
  fake_never_visited: {
    label: 'Fake / Never visited customer',
    policyRef: 'Google Maps Fake Engagement Policy — review not based on a real customer experience or transaction',
  },
  spam_off_topic: {
    label: 'Spam / Off-topic content',
    policyRef: 'Google Maps Spam & Deceptive Content Policy — irrelevant or promotional/spam rating',
  },
  harassment_profanity: {
    label: 'Harassment / Profanity',
    policyRef: 'Google Maps Harassment, Bullying & Offensive Content Policy',
  },
  other: {
    label: 'Policy violation / Unverified claim',
    policyRef: 'Google Business Profile User-Generated Content Policy',
  },
};

export function normalizeReviewReportReason(raw: unknown): ReviewReportReason {
  if (typeof raw === 'string' && (REVIEW_REPORT_REASONS as readonly string[]).includes(raw)) {
    return raw as ReviewReportReason;
  }
  return 'fake_never_visited';
}

export function normalizeReviewFlagStatus(raw: unknown): ReviewFlagStatus {
  if (typeof raw === 'string' && (REVIEW_FLAG_STATUSES as readonly string[]).includes(raw)) {
    return raw as ReviewFlagStatus;
  }
  return 'flagged';
}

export function getReviewReportReasonLabel(reason: ReviewReportReason): string {
  return REASON_LABELS[reason]?.label ?? REASON_LABELS.fake_never_visited.label;
}

export function parseResponseJsonObject(responseJson: unknown): Record<string, any> {
  if (!responseJson) return {};
  if (typeof responseJson === 'object' && !Array.isArray(responseJson)) {
    return { ...(responseJson as Record<string, any>) };
  }
  if (typeof responseJson === 'string') {
    try {
      const parsed = JSON.parse(responseJson);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return {};
    }
  }
  return {};
}

export function parseReviewFlagReport(responseJson: unknown): ReviewFlagReport | null {
  const obj = parseResponseJsonObject(responseJson);
  const raw = obj.flagReport;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const reason = normalizeReviewReportReason(raw.reason);
  const flagStatus = normalizeReviewFlagStatus(raw.flagStatus);
  return {
    reason,
    reasonLabel: typeof raw.reasonLabel === 'string' && raw.reasonLabel.trim()
      ? raw.reasonLabel.trim()
      : getReviewReportReasonLabel(reason),
    details: typeof raw.details === 'string' ? raw.details : '',
    flagStatus,
    hideOnPublicPage: Boolean(raw.hideOnPublicPage),
    appealText: typeof raw.appealText === 'string' ? raw.appealText : '',
    disputeReplyDraft: typeof raw.disputeReplyDraft === 'string' ? raw.disputeReplyDraft : '',
    reportedAt: typeof raw.reportedAt === 'string' ? raw.reportedAt : new Date().toISOString(),
    reportedBy: typeof raw.reportedBy === 'string' ? raw.reportedBy : null,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
    googleRemovalToolUrl: GOOGLE_REVIEW_REMOVAL_TOOL_URL,
  };
}

export function mergeReviewFlagReport(
  existingResponseJson: unknown,
  flagReport: ReviewFlagReport | null,
): string {
  const obj = parseResponseJsonObject(existingResponseJson);
  if (flagReport) {
    obj.flagReport = flagReport;
  } else {
    delete obj.flagReport;
  }
  return JSON.stringify(obj);
}

export function buildFallbackAppealAndDisputeReply(params: {
  businessName: string;
  authorName: string;
  rating: number;
  comment: string;
  reason: ReviewReportReason;
  details: string;
  businessPhone?: string | null;
}): { appealText: string; disputeReplyDraft: string } {
  const reasonMeta = REASON_LABELS[params.reason] ?? REASON_LABELS.fake_never_visited;
  const author = params.authorName.trim() || 'Unknown Reviewer';
  const excerpt = params.comment.trim() ? `"${params.comment.trim().slice(0, 280)}"` : '(rating-only review with no text)';
  const evidenceLine = params.details.trim()
    ? `Owner verification & evidence: ${params.details.trim()}`
    : `Owner verification: We thoroughly checked our customer booking, invoice, and visit records for "${author}" and found no matching transaction or service history with ${params.businessName}.`;

  const appealText = [
    `Request for Review Removal — ${params.businessName}`,
    `Policy Violated: ${reasonMeta.policyRef}`,
    `Reviewer: ${author} (${params.rating}-star rating)`,
    `Review Content: ${excerpt}`,
    evidenceLine,
    `This review appears inauthentic and misleads prospective customers. We kindly request Google Trust & Safety to investigate and remove this review under ${reasonMeta.label}.`,
  ].join('\n\n');

  const contactTail = params.businessPhone?.trim()
    ? ` at ${params.businessPhone.trim()}`
    : '';
  const disputeReplyDraft =
    params.reason === 'conflict_of_interest' || params.reason === 'fake_never_visited'
      ? `Thank you for your feedback. We take every concern seriously, however we have no record of a visit, booking, or purchase under "${author}" at ${params.businessName}. If this was posted in error or refers to another business, please contact our team directly${contactTail} with your invoice or booking reference so we can verify and assist right away.`
      : `Thank you for reaching out. We maintain strict quality and respectful service standards at ${params.businessName} and are unable to verify the experience described in this post against our records. Please contact our management team directly${contactTail} so we can review the details with you.`;

  return { appealText, disputeReplyDraft };
}

export async function generateAppealAndDisputeReply(params: {
  businessName: string;
  authorName: string;
  rating: number;
  comment: string;
  reason: ReviewReportReason;
  details: string;
  businessPhone?: string | null;
  useAi?: boolean;
}): Promise<{ appealText: string; disputeReplyDraft: string }> {
  const fallback = buildFallbackAppealAndDisputeReply(params);
  if (params.useAi === false) {
    return fallback;
  }

  try {
    const reasonMeta = REASON_LABELS[params.reason] ?? REASON_LABELS.fake_never_visited;
    const raw = await callAI([
      {
        role: 'system',
        content:
          'You help local business owners submit concise, factual, policy-compliant review removal appeals to Google Support and write calm, diplomatic public responses. Never accuse illegally or use profanity. Return strict JSON with keys "appealText" and "disputeReplyDraft".',
      },
      {
        role: 'user',
        content: JSON.stringify({
          businessName: params.businessName,
          reviewerName: params.authorName || 'Unknown',
          rating: params.rating,
          reviewComment: params.comment || '(no comment)',
          googlePolicyCategory: reasonMeta.policyRef,
          ownerEvidence: params.details || 'No matching customer record or invoice found in business system.',
          phone: params.businessPhone || null,
        }),
      },
    ]);
    const text = typeof raw === 'string' ? raw : (raw as any)?.content || (raw as any)?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const appealText = typeof parsed?.appealText === 'string' && parsed.appealText.trim().length > 20
        ? parsed.appealText.trim()
        : fallback.appealText;
      const disputeReplyDraft =
        typeof parsed?.disputeReplyDraft === 'string' && parsed.disputeReplyDraft.trim().length > 20
          ? parsed.disputeReplyDraft.trim()
          : fallback.disputeReplyDraft;
      return { appealText, disputeReplyDraft };
    }
  } catch {
    // Deterministic policy-aligned fallback stays active
  }

  return fallback;
}
