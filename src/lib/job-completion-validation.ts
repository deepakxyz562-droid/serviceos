import { db } from '@/lib/db';

/**
 * Validate that a job has the required completion proof before it can be
 * transitioned to `status = 'completed'`.
 *
 * Required proof:
 *   1. At least one JobPhoto with `photoType === 'before'`
 *   2. At least one JobPhoto with `photoType === 'after'`
 *   3. At least one JobSignature with `signatoryType === 'customer'`
 *   4. (Conditional) A completed checklist — only when the job has either
 *      linked checklists (job.linkedChecklistsJson is a non-empty array) OR
 *      existing JobChecklist rows. If neither exists, no checklist is
 *      required (matches the JobCompletionScreen UI behavior).
 *
 * This is the single source of truth for "can this job be completed?" — it
 * is called from every endpoint that can flip a job to `completed`:
 *   - /api/employee/jobs/[id]/lifecycle  (action=complete)
 *   - /api/jobs/[id]/lifecycle            (action=complete)
 *   - /api/jobs/lifecycle                 (action=complete, legacy/bulk)
 *   - /api/jobs/[id]/complete-proof
 *   - /api/jobs/[id]                      (PUT with status=completed)
 *   - /api/jobs/[id]/transition           (toState=completed)
 *
 * Returns:
 *   - `{ ok: true, missing: [] }` if all proof is present
 *   - `{ ok: false, missing: [...], error: 'Cannot complete job — missing: ...' }`
 *     if any required proof is absent. Callers should return a 400 with the
 *     `error` field as the message.
 */
export async function validateJobCompletionProof(
  jobId: string,
): Promise<{ ok: boolean; missing: string[]; error?: string }> {
  // Fetch the job's linked checklist config + the proof rows in parallel.
  const [job, photos, signatures, checklists] = await Promise.all([
    db.job.findUnique({ where: { id: jobId }, select: { linkedChecklistsJson: true } }),
    db.jobPhoto.findMany({ where: { jobId }, select: { photoType: true } }),
    db.jobSignature.findMany({ where: { jobId } }),
    db.jobChecklist.findMany({ where: { jobId } }),
  ]);

  const hasBefore = photos.some((p) => p.photoType === 'before');
  const hasAfter = photos.some((p) => p.photoType === 'after');
  const hasCustomerSig = signatures.some((s) => s.signatoryType === 'customer');

  // Parse linked checklist IDs from the job. Only enforce "completed
  // checklist" when there are linked checklists AND/OR at least one
  // JobChecklist row exists (i.e. the employee was expected to fill one).
  let linkedChecklistIds: string[] = [];
  if (job?.linkedChecklistsJson) {
    try {
      const parsed = JSON.parse(job.linkedChecklistsJson);
      if (Array.isArray(parsed)) {
        linkedChecklistIds = parsed.filter((x) => typeof x === 'string');
      }
    } catch {
      // ignore malformed JSON — treat as no linked checklists
    }
  }
  const checklistRequired =
    linkedChecklistIds.length > 0 || checklists.length > 0;
  const hasCompletedChecklist = checklists.some((c) => c.status === 'completed');

  const missing: string[] = [];
  if (!hasBefore) missing.push('Before photo');
  if (!hasAfter) missing.push('After photo');
  if (!hasCustomerSig) missing.push('Customer signature');
  if (checklistRequired && !hasCompletedChecklist) {
    missing.push('Completed checklist');
  }

  if (missing.length > 0) {
    return {
      ok: false,
      missing,
      error: 'Cannot complete job — missing: ' + missing.join(', '),
    };
  }

  return { ok: true, missing: [] };
}
