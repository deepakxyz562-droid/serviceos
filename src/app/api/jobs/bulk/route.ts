import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { reopenDealOnJobCancel } from '@/lib/deal-archive';

type BulkAction = 'delete' | 'softDelete' | 'updateStatus' | 'updatePriority' | 'assign';

interface BulkBody {
  jobIds: string[];
  action: BulkAction;
  status?: string;
  priority?: string;
  assigneeId?: string;
}

/**
 * POST /api/jobs/bulk — perform bulk operations on jobs.
 *
 * Actions:
 *   - delete:      Hard-delete (permanent, irreversible)
 *   - softDelete:  Set deletedAt = now() (hidden from active list, kept in History)
 *   - updateStatus:Update status (pending/assigned/in_progress/completed/cancelled)
 *   - updatePriority: Update priority (low/medium/high/urgent)
 *   - assign:     Assign an employee to all selected jobs
 *
 * Only jobs belonging to the authenticated user's tenant are affected.
 */
export async function POST(request: NextRequest) {
  const step = '[jobs/bulk]';
  let action: string = 'unknown';
  let jobIdsCount = 0;

  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    let body: BulkBody;
    try {
      body = (await request.json()) as BulkBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    action = body.action;
    jobIdsCount = Array.isArray(body.jobIds) ? body.jobIds.length : 0;

    const jobIds = Array.isArray(body.jobIds)
      ? body.jobIds.map(String).filter(Boolean)
      : [];

    if (jobIds.length === 0) {
      return NextResponse.json({ error: 'No jobIds provided' }, { status: 400 });
    }

    const validActions: BulkAction[] = [
      'delete',
      'softDelete',
      'updateStatus',
      'updatePriority',
      'assign',
    ];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // ── Validate status ──────────────────────────────────────────────────
    if (action === 'updateStatus') {
      const validStatuses = [
        'pending',
        'assigned',
        'in_progress',
        'completed',
        'cancelled',
        'on_hold',
        'invoice_generated',
      ];
      if (!body.status || !validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
    }

    if (action === 'updatePriority') {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!body.priority || !validPriorities.includes(body.priority)) {
        return NextResponse.json(
          { error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` },
          { status: 400 }
        );
      }
    }

    if (action === 'assign' && !body.assigneeId) {
      return NextResponse.json(
        { error: 'assigneeId is required for assign action' },
        { status: 400 }
      );
    }

    // ── Fetch only jobs belonging to this tenant ─────────────────────────
    const owned = await db.job.findMany({
      where: { id: { in: jobIds }, OR: [{ workspaceId: tenantId }, { tenantId: user.tenantId! }] },
      select: { id: true },
    });
    const ownedIds = owned.map((j: { id: string }) => j.id);
    const skippedCount = jobIds.length - ownedIds.length;

    if (ownedIds.length === 0) {
      return NextResponse.json({
        success: 0,
        failed: 0,
        skipped: skippedCount,
      });
    }

    let success = 0;

    try {
      switch (action) {
        case 'delete': {
          const res = await db.job.deleteMany({
            where: { id: { in: ownedIds } },
          });
          success = res.count;
          break;
        }

        case 'softDelete': {
          const res = await db.job.updateMany({
            where: { id: { in: ownedIds } },
            data: { deletedAt: new Date() },
          });
          success = res.count;
          break;
        }

        case 'updateStatus': {
          // ── Pipeline Redesign (Phase 1): stamp cancelledAt on cancel ──
          // When bulk-cancelling jobs, set `cancelledAt = now()` so the
          // Attention Center can efficiently query cancelled jobs. Also
          // fire-and-forget the Deal sync (reopenDealOnJobCancel) for each
          // affected job — sets Deal.jobCancelledAt on linked won deals.
          const isBulkCancel = body.status === 'cancelled';
          const res = await db.job.updateMany({
            where: { id: { in: ownedIds } },
            data: {
              status: body.status!,
              ...(isBulkCancel ? { cancelledAt: new Date() } : {}),
            },
          });
          success = res.count;

          // ── Sync Deal.jobCancelledAt for each cancelled job ──────────
          // Fire-and-forget — never blocks the bulk response. The helper
          // is idempotent and never throws.
          if (isBulkCancel) {
            for (const jid of ownedIds) {
              reopenDealOnJobCancel(jid).catch((err) => {
                console.error(`[jobs/bulk] reopenDealOnJobCancel failed for job ${jid} (non-blocking):`, err);
              });
            }
          }
          break;
        }

        case 'updatePriority': {
          const res = await db.job.updateMany({
            where: { id: { in: ownedIds } },
            data: { priority: body.priority! },
          });
          success = res.count;
          break;
        }

        case 'assign': {
          // Verify the employee belongs to this tenant
          const emp = await db.employee.findFirst({
            where: { id: body.assigneeId!, tenantId: user.tenantId! },
            select: { id: true, name: true },
          });
          if (!emp) {
            return NextResponse.json(
              { error: 'Employee not found in your tenant' },
              { status: 404 }
            );
          }
          const res = await db.job.updateMany({
            where: { id: { in: ownedIds } },
            data: {
              assigneeId: body.assigneeId!,
              assigneeName: emp.name,
            },
          });
          success = res.count;
          break;
        }
      }
    } catch (actionErr) {
      console.error(`${step} action '${action}' failed:`, actionErr);
      throw actionErr;
    }

    return NextResponse.json({
      success,
      failed: skippedCount,
      skipped: skippedCount,
    });
  } catch (error) {
    console.error(`${step} outer error:`, error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to perform bulk operation.', detail: message, action, jobIdsCount },
      { status: 500 }
    );
  }
}
