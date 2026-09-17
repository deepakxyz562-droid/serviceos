'use server';

/**
 * Submission Assignment (server-side helper)
 * -------------------------------------------
 * Server actions called by `submission-assignment.tsx` (the UI component).
 *
 * Persists the assignee in the FormResponse.actionsResultsJson field under
 * the `_assignment` key — no Prisma migration required.
 */
import { db } from '@/lib/db';

interface AssignmentMeta {
  _assignment?: {
    agentId: string;
    assignedAt: string;
    assignedBy?: string;
  };
  [k: string]: unknown;
}

async function readMeta(submissionId: string): Promise<AssignmentMeta> {
  const row = await db.formResponse.findUnique({
    where: { id: submissionId },
    select: { actionsResultsJson: true },
  });
  if (!row) return {};
  try {
    const parsed = JSON.parse(row.actionsResultsJson || '{}');
    if (parsed && typeof parsed === 'object') return parsed as AssignmentMeta;
  } catch {
    // ignore
  }
  return {};
}

async function writeMeta(submissionId: string, meta: AssignmentMeta): Promise<void> {
  await db.formResponse.update({
    where: { id: submissionId },
    data: { actionsResultsJson: JSON.stringify(meta) },
  });
}

export async function assignSubmissionServer(
  submissionId: string,
  agentId: string,
  assignedBy?: string,
): Promise<void> {
  if (!submissionId || !agentId) return;
  const meta = await readMeta(submissionId);
  meta._assignment = {
    agentId,
    assignedAt: new Date().toISOString(),
    assignedBy,
  };
  await writeMeta(submissionId, meta);
}

export async function unassignSubmission(submissionId: string): Promise<void> {
  const meta = await readMeta(submissionId);
  delete meta._assignment;
  await writeMeta(submissionId, meta);
}

export async function getAssignee(submissionId: string): Promise<{ agentId: string; assignedAt: string; assignedBy?: string } | null> {
  const meta = await readMeta(submissionId);
  return meta._assignment ?? null;
}

export async function getSubmissionsByAgent(agentId: string): Promise<unknown[]> {
  if (!agentId) return [];
  const rows = await db.formResponse.findMany({
    where: { actionsResultsJson: { contains: agentId } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.filter((r) => {
    try {
      const meta = JSON.parse(r.actionsResultsJson || '{}') as AssignmentMeta;
      return meta._assignment?.agentId === agentId;
    } catch {
      return false;
    }
  });
}
