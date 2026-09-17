'use server';

/**
 * Approval Workflow (server-side)
 * -------------------------------
 * Multi-step approval workflow for form submissions. Each step has an
 * assignee email, order, and status.
 *
 * Storage: we persist the workflow definition in the FormResponse row's
 * `actionsResultsJson` field under the `_approvalWorkflow` key (avoids a
 * Prisma migration). The existing FormResponse.status field already
 * supports 'approved' / 'rejected' / 'in_progress'.
 */
import { db } from '@/lib/db';

export type ApprovalStepStatus = 'pending' | 'approved' | 'rejected' | 'skipped';

export interface ApprovalStep {
  assigneeEmail: string;
  order: number;
  status: ApprovalStepStatus;
  decidedAt?: string;
  decidedBy?: string;
  note?: string;
}

export interface ApprovalWorkflow {
  workflowId: string;
  formResponseId: string;
  steps: ApprovalStep[];
  currentStepOrder: number;
  status: 'in_progress' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

function genId(prefix: string): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `${prefix}_${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

async function readWorkflow(formResponseId: string): Promise<ApprovalWorkflow | null> {
  const row = await db.formResponse.findUnique({
    where: { id: formResponseId },
    select: { actionsResultsJson: true },
  });
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.actionsResultsJson || '{}');
    if (parsed._approvalWorkflow && parsed._approvalWorkflow.workflowId) {
      return parsed._approvalWorkflow as ApprovalWorkflow;
    }
  } catch {
    // ignore
  }
  return null;
}

async function writeWorkflow(formResponseId: string, wf: ApprovalWorkflow): Promise<void> {
  const row = await db.formResponse.findUnique({
    where: { id: formResponseId },
    select: { actionsResultsJson: true },
  });
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(row?.actionsResultsJson || '{}');
  } catch {
    parsed = {};
  }
  parsed._approvalWorkflow = wf;
  await db.formResponse.update({
    where: { id: formResponseId },
    data: { actionsResultsJson: JSON.stringify(parsed), status: wf.status === 'approved' ? 'approved' : wf.status === 'rejected' ? 'rejected' : 'in_progress' },
  });
}

export async function createApprovalWorkflow(
  formResponseId: string,
  steps: Array<Pick<ApprovalStep, 'assigneeEmail' | 'order' | 'note'>>,
): Promise<string> {
  if (steps.length === 0) throw new Error('Approval workflow requires at least one step');

  const workflowId = genId('wf');
  const fullSteps: ApprovalStep[] = steps
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      assigneeEmail: s.assigneeEmail,
      order: s.order,
      status: 'pending',
      note: s.note,
    }));

  const now = new Date().toISOString();
  const wf: ApprovalWorkflow = {
    workflowId,
    formResponseId,
    steps: fullSteps,
    currentStepOrder: fullSteps[0].order,
    status: 'in_progress',
    createdAt: now,
    updatedAt: now,
  };
  await writeWorkflow(formResponseId, wf);
  return workflowId;
}

export async function getApprovalWorkflow(formResponseId: string): Promise<ApprovalWorkflow | null> {
  return readWorkflow(formResponseId);
}

export async function advanceApprovalWorkflow(
  formResponseId: string,
  decidedByEmail: string,
  decision: 'approved' | 'rejected',
  note?: string,
): Promise<ApprovalWorkflow> {
  const wf = await readWorkflow(formResponseId);
  if (!wf) throw new Error('No approval workflow found for this submission');
  if (wf.status !== 'in_progress') throw new Error(`Workflow already ${wf.status}`);

  const currentStep = wf.steps.find((s) => s.order === wf.currentStepOrder);
  if (!currentStep) throw new Error('No current step found');

  currentStep.status = decision;
  currentStep.decidedAt = new Date().toISOString();
  currentStep.decidedBy = decidedByEmail;
  currentStep.note = note ?? currentStep.note;

  if (decision === 'rejected') {
    wf.status = 'rejected';
  } else {
    // Find next pending step
    const next = wf.steps
      .filter((s) => s.order > wf.currentStepOrder && s.status === 'pending')
      .sort((a, b) => a.order - b.order)[0];
    if (next) {
      wf.currentStepOrder = next.order;
    } else {
      wf.status = 'approved';
    }
  }
  wf.updatedAt = new Date().toISOString();
  await writeWorkflow(formResponseId, wf);
  return wf;
}
