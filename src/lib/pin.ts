/**
 * Verification PIN utilities.
 *
 * The PIN is a 4-digit numeric code (0000-9999) generated per job visit.
 * It is persisted on `Job.verificationPin` (String?) and:
 *   - Sent to the customer via SMS → WhatsApp → Email cascade
 *   - Entered by the technician at arrival to verify they're at the right job
 *   - Immutable unless an explicit "Regenerate PIN" action is taken
 *
 * Recurring jobs: each recurring visit gets its OWN unique PIN. The PIN is
 * generated when the visit (Job row) is created, not when the recurring
 * schedule is defined.
 */

import crypto from 'crypto';

import { db } from '@/lib/db';

/**
 * Generate a random 4-digit PIN (zero-padded string).
 *
 * Uses crypto.randomInt (Node.js crypto module) for cryptographically secure
 * randomness — NOT Math.random(), which is predictable and would make PINs
 * guessable.
 *
 * @returns A 4-character string like "0427" or "9183". Range: "0000" to "9999".
 */
export function generateVerificationPin(): string {
  // crypto.randomInt is available in Node.js 14.10+ (stable in 16+). Next.js 16
  // requires Node 18+, so this is safe in the server runtime. We import `crypto`
  // at the top of the file (ESM-style) rather than `require('crypto')` so it
  // also works under Turbopack's bundler resolution.
  const pin = crypto.randomInt(0, 10000); // 0 to 9999 inclusive
  return pin.toString().padStart(4, '0');
}

/**
 * Regenerate a job's verification PIN.
 *
 * This is the explicit "Regenerate PIN" action — it creates a NEW 4-digit PIN
 * and immediately invalidates the old one. The caller is responsible for:
 *   1. Confirming with the user (the UI shows a confirmation dialog)
 *   2. Re-sending the new PIN to the customer (via notifyCustomerVerificationPin)
 *
 * @param jobId The job whose PIN should be regenerated
 * @param actorUserId The user performing the action (for audit logging)
 * @returns The new PIN value (so the caller can pass it to the notification function)
 *
 * @throws If the job doesn't exist
 */
export async function regenerateJobPin(jobId: string, actorUserId: string): Promise<string> {
  const newPin = generateVerificationPin();

  const updated = await db.job.update({
    where: { id: jobId },
    data: { verificationPin: newPin },
    select: { id: true, verificationPin: true },
  });

  // Audit log the regeneration (who, when, what job). We log the EVENT, not
  // the PIN value — the PIN is sensitive and shouldn't be in the audit trail.
  //
  // AuditLog schema fields (verified in prisma/schema.prisma):
  //   userId, action, resourceType, resourceId, metadataJson, ip, createdAt
  // (not entityId / entityType / details as one might assume — the schema
  // uses generic resourceType/resourceId naming.)
  try {
    await db.auditLog.create({
      data: {
        action: 'job.pin.regenerated',
        userId: actorUserId,
        resourceId: jobId,
        resourceType: 'Job',
        metadataJson: JSON.stringify({
          timestamp: new Date().toISOString(),
          // Do NOT store the PIN value in the audit log
        }),
      },
    });
  } catch {
    // Non-fatal — audit log failure shouldn't block the regeneration.
    // The PIN is already updated in the DB; we just couldn't log who did it.
    console.warn(`[regenerateJobPin] Failed to write audit log for job ${jobId}`);
  }

  return updated.verificationPin!;
}

/**
 * Ensure a job has a verification PIN. If it doesn't, generate one and persist it.
 *
 * Used by the notification pipeline (notifyCustomerVerificationPin) as a
 * safety net: if a job was created before the PIN feature was wired into all
 * creation paths, this backfills the PIN before sending the notification.
 *
 * @param jobId The job to ensure has a PIN
 * @returns The PIN (existing or newly generated)
 */
export async function ensureJobPin(jobId: string): Promise<string> {
  const job = await db.job.findUnique({
    where: { id: jobId },
    select: { id: true, verificationPin: true },
  });

  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  if (job.verificationPin) {
    return job.verificationPin;
  }

  // No PIN yet — generate and persist one
  const newPin = generateVerificationPin();
  await db.job.update({
    where: { id: jobId },
    data: { verificationPin: newPin },
  });

  return newPin;
}
