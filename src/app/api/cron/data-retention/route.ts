import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/data-retention
 *
 * Enforces data retention policies. Runs daily via the master cron.
 *
 * For each tenant's DataRetentionPolicy:
 *   1. If autoDelete=true and archiveFirst=true → archive old records, then delete
 *   2. If autoDelete=true and archiveFirst=false → delete old records directly
 *   3. If autoDelete=false → skip (policy exists but not enforced)
 *
 * Supported resource types:
 *   - conversations → Conversation (archived = status='archived', deleted = hard delete)
 *   - form_responses → FormResponse (deleted = set status='archived')
 *   - audit_logs → AuditLog (hard delete)
 *   - notifications → Notification (hard delete)
 *   - campaigns → Campaign (archived = status='archived')
 *
 * Auth: None (called by master cron). The master cron handles auth.
 */
export async function GET(_request: NextRequest) {
  const results: Array<{ resourceType: string; tenantId: string | null; archived: number; deleted: number }> = [];

  try {
    // Fetch all retention policies with autoDelete enabled
    let policies;
    try {
      policies = await db.dataRetentionPolicy.findMany({
        where: { autoDelete: true },
      });
    } catch {
      // DB unavailable — nothing to do
      return NextResponse.json({ ok: true, results: [], note: 'DB unavailable' });
    }

    if (policies.length === 0) {
      return NextResponse.json({ ok: true, results: [], message: 'No auto-delete retention policies configured' });
    }

    const now = new Date();

    for (const policy of policies) {
      const cutoff = new Date(now.getTime() - policy.retentionDays * 24 * 60 * 60 * 1000);
      const where: Record<string, unknown> = {
        createdAt: { lt: cutoff },
      };
      if (policy.tenantId) where.tenantId = policy.tenantId;

      let archived = 0;
      let deleted = 0;

      try {
        switch (policy.resourceType) {
          case 'conversations':
            if (policy.archiveFirst) {
              const updated = await db.conversation.updateMany({
                where: { ...where, status: { not: 'archived' } },
                data: { status: 'archived' },
              });
              archived = updated.count;
            } else {
              const deletedCount = await db.conversation.deleteMany({ where });
              deleted = deletedCount.count;
            }
            break;

          case 'form_responses':
            // Archive = set status='archived' (soft delete, data preserved)
            if (policy.archiveFirst) {
              const updated = await db.formResponse.updateMany({
                where: { ...where, status: { not: 'archived' } },
                data: { status: 'archived' },
              });
              archived = updated.count;
            } else {
              const deletedCount = await db.formResponse.deleteMany({ where });
              deleted = deletedCount.count;
            }
            break;

          case 'audit_logs':
            // Hard delete audit logs past retention period
            const auditDeleted = await db.auditLog.deleteMany({ where });
            deleted = auditDeleted.count;
            break;

          case 'notifications':
            const notifDeleted = await db.notification.deleteMany({ where });
            deleted = notifDeleted.count;
            break;

          case 'campaigns':
            if (policy.archiveFirst) {
              const updated = await db.campaign.updateMany({
                where: { ...where, status: { not: 'archived' } },
                data: { status: 'archived' },
              });
              archived = updated.count;
            } else {
              const deletedCount = await db.campaign.deleteMany({ where });
              deleted = deletedCount.count;
            }
            break;

          default:
            // Unknown resource type — skip
            continue;
        }

        results.push({
          resourceType: policy.resourceType,
          tenantId: policy.tenantId,
          archived,
          deleted,
        });

        logger.info(
          { component: 'cron-data-retention', resourceType: policy.resourceType, tenantId: policy.tenantId, archived, deleted },
          `Retention policy enforced: ${archived} archived, ${deleted} deleted`,
        );
      } catch (error) {
        logger.error(
          { component: 'cron-data-retention', resourceType: policy.resourceType, error },
          `Failed to enforce retention policy`,
        );
      }
    }

    return NextResponse.json({
      ok: true,
      policiesProcessed: policies.length,
      results,
    });
  } catch (error: any) {
    logger.error({ component: 'cron-data-retention', error }, 'Data retention cron failed');
    return NextResponse.json(
      { error: error.message || 'Data retention cron failed' },
      { status: 500 },
    );
  }
}
