import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

type BulkAction = 'delete' | 'updateStatus' | 'updateRole';

interface BulkBody {
  employeeIds: string[];
  action: BulkAction;
  status?: string;
  role?: string;
}

/**
 * POST /api/employees/bulk — perform bulk operations on employees.
 *
 * Actions:
 *   - delete:       Hard-delete (permanent, irreversible)
 *   - updateStatus: Update status (active/inactive/on_leave/terminated)
 *   - updateRole:   Update role (admin/manager/technician/dispatcher/etc.)
 *
 * Only employees belonging to the authenticated user's tenant are affected.
 */
export async function POST(request: NextRequest) {
  const step = '[employees/bulk]';
  let action: string = 'unknown';
  let employeeIdsCount = 0;

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
    employeeIdsCount = Array.isArray(body.employeeIds) ? body.employeeIds.length : 0;

    const employeeIds = Array.isArray(body.employeeIds)
      ? body.employeeIds.map(String).filter(Boolean)
      : [];

    if (employeeIds.length === 0) {
      return NextResponse.json({ error: 'No employeeIds provided' }, { status: 400 });
    }

    const validActions: BulkAction[] = ['delete', 'updateStatus', 'updateRole'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // ── Validate status ──────────────────────────────────────────────────
    if (action === 'updateStatus') {
      const validStatuses = ['active', 'inactive', 'on_leave', 'terminated', 'available', 'busy'];
      if (!body.status || !validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
    }

    if (action === 'updateRole' && !body.role) {
      return NextResponse.json(
        { error: 'role is required for updateRole action' },
        { status: 400 }
      );
    }

    // ── Fetch only employees belonging to this tenant ────────────────────
    const owned = await db.employee.findMany({
      where: { id: { in: employeeIds }, tenantId: user.tenantId! },
      select: { id: true },
    });
    const ownedIds = owned.map((e: { id: string }) => e.id);
    const skippedCount = employeeIds.length - ownedIds.length;

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
          const res = await db.employee.deleteMany({
            where: { id: { in: ownedIds } },
          });
          success = res.count;
          break;
        }

        case 'updateStatus': {
          const res = await db.employee.updateMany({
            where: { id: { in: ownedIds } },
            data: { status: body.status! },
          });
          success = res.count;
          break;
        }

        case 'updateRole': {
          const res = await db.employee.updateMany({
            where: { id: { in: ownedIds } },
            data: { role: body.role! },
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
      { error: 'Failed to perform bulk operation.', detail: message, action, employeeIdsCount },
      { status: 500 }
    );
  }
}
