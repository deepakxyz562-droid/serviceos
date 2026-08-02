import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * POST /api/time-tracking/approve
 * ------------------------------
 * Approve or reject one or more time entries.
 *
 * Auth: owner / admin / manager only (NOT employees, NOT customers).
 *
 * Body:
 *   { entryIds: string[], action: 'approve' | 'reject' }
 *
 * Returns: { updated: <count> }
 *
 * Supabase-safe: uses `updateMany` with `{ id: { in: [...] } }`, which
 * PostgREST supports. No `upsert`, no compound-unique keys.
 */

function requireManager(role: string | undefined): boolean {
  return role !== 'employee' && role !== 'customer';
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!requireManager(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden — only owners, admins and managers can approve time entries' },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { entryIds, action } = body as {
      entryIds?: unknown;
      action?: unknown;
    };

    if (!Array.isArray(entryIds) || entryIds.length === 0) {
      return NextResponse.json({ error: 'entryIds must be a non-empty array' }, { status: 400 });
    }
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 },
      );
    }

    // Sanitize entryIds — accept only non-empty strings.
    const ids = entryIds.filter(
      (id): id is string => typeof id === 'string' && id.trim().length > 0,
    );
    if (ids.length === 0) {
      return NextResponse.json({ error: 'No valid entry ids provided' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const now = new Date();

    const result = await db.employeeShift.updateMany({
      where: {
        id: { in: ids },
        tenantId: user.tenantId || 'default',
      },
      data: {
        approvalStatus: newStatus,
        approvedBy: user.id,
        approvedAt: now,
      },
    });

    return NextResponse.json({ updated: (result as { count?: number }).count ?? 0 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update approval status';
    console.error('[time-tracking/approve POST]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
