/**
 * Form Approval Workflow Service
 *
 * Manages the approval lifecycle for form submissions:
 *   new → in_progress → approved → completed
 *   new → in_progress → rejected
 *   new → spam (auto-flagged by spam guard)
 *
 * Each status transition is audited in the FormResponse.actionsResultsJson
 * field (under the `_approval` key) with timestamp + actor.
 *
 * The existing ApprovalFlow model (prisma/schema.prisma) supports
 * sequential/parallel approvals for quotes/jobs/expenses/bookings.
 * This service extends the concept to form submissions via the
 * FormResponse.status field (added in Phase 6).
 */

import { db } from '@/lib/db';

export type FormResponseStatus =
  | 'new'
  | 'in_progress'
  | 'approved'
  | 'rejected'
  | 'spam'
  | 'archived';

export interface ApprovalTransition {
  from: FormResponseStatus;
  to: FormResponseStatus;
  actorId: string;
  actorName: string;
  note?: string;
  at: string; // ISO timestamp
}

export const VALID_TRANSITIONS: Record<FormResponseStatus, FormResponseStatus[]> = {
  new: ['in_progress', 'approved', 'rejected', 'spam', 'archived'],
  in_progress: ['approved', 'rejected', 'archived'],
  approved: ['archived'],
  rejected: ['archived'],
  spam: ['archived', 'new'],
  archived: ['new'],
};

/**
 * Transition a form response to a new status.
 * Validates the transition is allowed, updates the status, and appends
 * an audit entry to actionsResultsJson._approval.history.
 */
export async function transitionFormResponseStatus(
  responseId: string,
  newStatus: FormResponseStatus,
  actor: { id: string; name: string },
  note?: string
): Promise<{ success: boolean; error?: string; response?: unknown }> {
  const response = await db.formResponse.findUnique({
    where: { id: responseId },
    select: { id: true, status: true, actionsResultsJson: true },
  });

  if (!response) {
    return { success: false, error: 'Form response not found' };
  }

  const currentStatus = (response.status as FormResponseStatus) || 'completed';

  // Treat 'completed' as 'approved' for transition purposes (legacy responses
  // created before the status field was added have 'completed' by default).
  const effectiveCurrent: FormResponseStatus =
    currentStatus === 'completed' ? 'approved' : currentStatus;

  const allowed = VALID_TRANSITIONS[effectiveCurrent] || [];
  if (!allowed.includes(newStatus)) {
    return {
      success: false,
      error: `Cannot transition from '${effectiveCurrent}' to '${newStatus}'`,
    };
  }

  // Append audit entry to actionsResultsJson
  let actionsResults: Record<string, unknown> = {};
  try {
    actionsResults = JSON.parse(response.actionsResultsJson || '{}');
  } catch { /* ignore */ }

  const approvalData = (actionsResults._approval as { history?: ApprovalTransition[] }) || {};
  const history = approvalData.history || [];

  const transition: ApprovalTransition = {
    from: effectiveCurrent,
    to: newStatus,
    actorId: actor.id,
    actorName: actor.name,
    note,
    at: new Date().toISOString(),
  };

  history.push(transition);
  actionsResults._approval = { ...approvalData, history, currentStatus: newStatus };

  const updated = await db.formResponse.update({
    where: { id: responseId },
    data: {
      status: newStatus,
      actionsResultsJson: JSON.stringify(actionsResults),
    },
  });

  return { success: true, response: updated };
}

/**
 * Get the approval history for a form response.
 */
export async function getApprovalHistory(
  responseId: string
): Promise<ApprovalTransition[]> {
  const response = await db.formResponse.findUnique({
    where: { id: responseId },
    select: { actionsResultsJson: true },
  });

  if (!response) return [];

  try {
    const data = JSON.parse(response.actionsResultsJson || '{}');
    return (data._approval?.history as ApprovalTransition[]) || [];
  } catch {
    return [];
  }
}
