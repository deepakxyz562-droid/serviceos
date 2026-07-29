import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';

/**
 * POST /api/superadmin/ai-keys/reorder
 *
 * Bulk-updates the `priority` field on many AiProviderKey rows in a single
 * request — the payload for the drag-and-drop priority reordering UI.
 *
 * Body: { items: [{ id, priority }, ...] }
 * Response: { success: true }
 *
 * Notes:
 *   - Each `priority` must be a finite number; non-finite values are rejected
 *     with a 400 (no partial application — all-or-nothing validation).
 *   - We update rows one-by-one rather than using a transaction so the route
 *     works identically against the Prisma + Supabase-REST adapter (which does
 *     not expose $transaction across the wire). Each update is independent.
 *   - Rows referenced by an unknown id are silently skipped (defensive against
 *     stale client state), but we still return success once all valid updates
 *     are applied.
 */

interface ReorderItem {
  id: string;
  priority: number;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const body = await request.json() as { items?: unknown };

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'items must be a non-empty array of { id, priority }' },
        { status: 400 },
      );
    }

    // Validate every entry up-front so a bad payload doesn't leave us with a
    // partially-applied reorder.
    const items: ReorderItem[] = [];
    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      if (!item || typeof item !== 'object') {
        return NextResponse.json(
          { error: `items[${i}] must be an object` },
          { status: 400 },
        );
      }
      const { id, priority } = item as { id?: unknown; priority?: unknown };
      if (typeof id !== 'string' || id.trim().length === 0) {
        return NextResponse.json(
          { error: `items[${i}].id must be a non-empty string` },
          { status: 400 },
        );
      }
      if (typeof priority !== 'number' || !Number.isFinite(priority)) {
        return NextResponse.json(
          { error: `items[${i}].priority must be a finite number` },
          { status: 400 },
        );
      }
      items.push({ id, priority: Math.trunc(priority) });
    }

    // Apply updates. Use Promise.all so we don't serialize 50 round-trips when
    // the DB supports concurrent writes (SQLite serializes them anyway, but the
    // Supabase REST adapter benefits from concurrency).
    await Promise.all(
      items.map((item) =>
        db.aiProviderKey.update({
          where: { id: item.id },
          data: { priority: item.priority },
        }),
      ),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SuperAdmin AI Keys reorder] Error:', error);
    return NextResponse.json({ error: 'Failed to reorder AI provider keys' }, { status: 500 });
  }
}
