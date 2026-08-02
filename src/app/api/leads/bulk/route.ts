import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

type BulkAction = 'delete' | 'softDelete' | 'restore' | 'updateStatus' | 'updatePriority' | 'assign';

interface BulkBody {
  leadIds: string[];
  action: BulkAction;
  status?: string;
  priority?: string;
  assignedToId?: string;
}

/**
 * POST /api/leads/bulk — perform bulk operations on leads.
 *
 * Actions:
 *   - delete:       Hard-delete (permanent, irreversible)
 *   - softDelete:   Set deletedAt = now() (hidden from active list, kept in History)
 *   - restore:      Clear deletedAt (restore from History back to active list)
 *   - updateStatus: Update status (new/new_lead/quote_sent/won/lost/etc.)
 *   - updatePriority: Update priority (low/medium/high/urgent)
 *   - assign:       Assign an employee to all selected leads
 *
 * Only leads belonging to the authenticated user's tenant are affected.
 */
export async function POST(request: NextRequest) {
  const step = '[leads/bulk]';
  let action: string = 'unknown';
  let leadIdsCount = 0;

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
    leadIdsCount = Array.isArray(body.leadIds) ? body.leadIds.length : 0;

    const leadIds = Array.isArray(body.leadIds)
      ? body.leadIds.map(String).filter(Boolean)
      : [];

    if (leadIds.length === 0) {
      return NextResponse.json({ error: 'No leadIds provided' }, { status: 400 });
    }

    const validActions: BulkAction[] = [
      'delete',
      'softDelete',
      'restore',
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
        'new',
        'new_lead',
        'contacted',
        'qualified',
        'quote_sent',
        'won',
        'lost',
        'archived',
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

    if (action === 'assign' && !body.assignedToId) {
      return NextResponse.json(
        { error: 'assignedToId is required for assign action' },
        { status: 400 }
      );
    }

    // ── Fetch only leads belonging to this tenant ────────────────────────
    const owned = await db.lead.findMany({
      where: { id: { in: leadIds }, tenantId },
      select: { id: true },
    });
    const ownedIds = owned.map((l: { id: string }) => l.id);
    const skippedCount = leadIds.length - ownedIds.length;

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
          const res = await db.lead.deleteMany({
            where: { id: { in: ownedIds } },
          });
          success = res.count;
          break;
        }

        case 'softDelete': {
          const res = await db.lead.updateMany({
            where: { id: { in: ownedIds } },
            data: { deletedAt: new Date() },
          });
          success = res.count;
          break;
        }

        case 'restore': {
          const res = await db.lead.updateMany({
            where: { id: { in: ownedIds } },
            data: { deletedAt: null },
          });
          success = res.count;
          break;
        }

        case 'updateStatus': {
          const res = await db.lead.updateMany({
            where: { id: { in: ownedIds } },
            data: { status: body.status! },
          });
          success = res.count;
          break;
        }

        case 'updatePriority': {
          const res = await db.lead.updateMany({
            where: { id: { in: ownedIds } },
            data: { priority: body.priority! },
          });
          success = res.count;
          break;
        }

        case 'assign': {
          // Verify the employee belongs to this tenant
          const emp = await db.employee.findFirst({
            where: { id: body.assignedToId!, tenantId: user.tenantId! },
            select: { id: true },
          });
          if (!emp) {
            return NextResponse.json(
              { error: 'Employee not found in your tenant' },
              { status: 404 }
            );
          }
          const res = await db.lead.updateMany({
            where: { id: { in: ownedIds } },
            data: { assignedToId: body.assignedToId! },
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
      { error: 'Failed to perform bulk operation.', detail: message, action, leadIdsCount },
      { status: 500 }
    );
  }
}
