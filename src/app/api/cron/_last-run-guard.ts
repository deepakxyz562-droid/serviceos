import { db } from '@/lib/db';

const MIN_RUN_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes — if cron fires more often, it's likely a duplicate trigger

/**
 * Defense-in-depth guard against duplicate cron execution.
 *
 * Records the current run; refuses if the same endpoint ran within
 * MIN_RUN_INTERVAL_MS. Uses a lightweight ActivityLog entry (no schema change
 * needed) so this is purely additive — if the guard itself fails (e.g. the
 * ActivityLog table is missing, or `tenantId: 'system'` violates an FK), the
 * catch blocks ensure the cron STILL runs (returns `{ ok: true }`).
 *
 * The REAL protection is the unique constraints added in Phase A:
 *   - Job:       @@unique([recurringScheduleId, scheduledAt])
 *   - Invoice:   @@unique([recurrenceId, occurrenceDate])
 * This guard is OPTIONAL defense-in-depth — wiring it into the cron endpoints
 * is a separate concern (see PHASE-D2 notes in worklog.md).
 *
 * @example
 *   const guard = await checkCronRunGuard('/api/cron/recurring-jobs');
 *   if (!guard.ok) {
 *     return NextResponse.json({ skipped: true, reason: guard.reason });
 *   }
 *   // ... run the cron ...
 *   await recordCronRun('/api/cron/recurring-jobs', { processed: 5, errors: 0 });
 */
export async function checkCronRunGuard(
  endpoint: string,
): Promise<{ ok: true } | { ok: false; reason: string; lastRunAt?: Date }> {
  try {
    const recent = await db.activityLog.findFirst({
      where: {
        actorType: 'system',
        actorName: 'CronRunner',
        entityType: 'cron',
        entityId: endpoint,
        createdAt: { gte: new Date(Date.now() - MIN_RUN_INTERVAL_MS) },
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (recent) {
      return {
        ok: false,
        reason: `Cron ${endpoint} already ran at ${recent.createdAt.toISOString()} (within ${MIN_RUN_INTERVAL_MS / 60000}min window)`,
        lastRunAt: recent.createdAt,
      };
    }
    return { ok: true };
  } catch {
    // If the guard itself fails (e.g. activityLog doesn't exist, FK violation
    // on tenantId='system'), don't block the cron — the unique constraints on
    // Job + Invoice are the real protection.
    return { ok: true };
  }
}

export async function recordCronRun(
  endpoint: string,
  result: { processed?: number; errors?: number; succeeded?: number; failed?: number },
): Promise<void> {
  try {
    await db.activityLog.create({
      data: {
        // tenantId is required (non-nullable) on ActivityLog. There is no real
        // "system" tenant, but ActivityLog has no FK relation declared to
        // Tenant in prisma/schema.prisma — only indexes. If the underlying
        // Supabase migration added an FK anyway and rejects 'system', the
        // catch block swallows the error and the guard simply becomes a
        // no-op on subsequent calls (the real protection remains the
        // Job/Invoice @@unique constraints).
        tenantId: 'system',
        actorType: 'system',
        actorName: 'CronRunner',
        action: 'cron_run',
        entityType: 'cron',
        entityId: endpoint,
        entityName: endpoint,
        description: `Cron ${endpoint} ran: ${JSON.stringify(result)}`,
        severity: 'info',
      },
    });
  } catch (err) {
    console.error('[CronGuard] recordCronRun failed:', err);
  }
}
