import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/activity-logs
 * List activity logs for the authenticated user's tenant with rich filters.
 *
 * Query params:
 *   entityType  — filter by entity type (lead, job, customer, invoice, ...)
 *   entityId    — filter by entity id
 *   actorId     — filter by actor
 *   action      — filter by action (create, update, delete, assign, ...)
 *   severity    — filter by severity (info, warning, error, critical)
 *   search      — search description
 *   limit       — default 50
 *   offset      — default 0
 *   startDate   — ISO date (inclusive)
 *   endDate     — ISO date (inclusive)
 *
 * Returns: { logs: [...], total }
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve tenant: superadmin without a tenantId gets nothing (or all?).
    // For audit-trail purposes we only show the user's own tenant.
    let tenantId = user.tenantId;
    if (!tenantId && !user.isSuperAdmin) {
      // Demo / cookieless fallback: pick the first tenant so the page still works.
      try {
        const firstTenant = await db.tenant.findFirst({
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });
        tenantId = firstTenant?.id ?? null;
      } catch {
        // ignore
      }
    }

    if (!tenantId) {
      return NextResponse.json({ logs: [], total: 0 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const actorId = searchParams.get('actorId');
    const action = searchParams.get('action');
    const severity = searchParams.get('severity');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 500);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = { tenantId };

    if (entityType && entityType !== 'all') where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (actorId) where.actorId = actorId;
    if (action && action !== 'all') where.action = action;
    if (severity && severity !== 'all') where.severity = severity;

    if (search) {
      where.OR = [
        { description: { contains: search } },
        { entityName: { contains: search } },
        { actorName: { contains: search } },
      ];
    }

    // Date range
    const dateFilter: Record<string, unknown> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) {
      // endDate inclusive of the whole day → push to end of day
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }
    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }

    const [logs, total] = await Promise.all([
      db.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.activityLog.count({ where }),
    ]);

    // Parse metadataJson for client convenience
    const formatted = logs.map((log) => {
      let metadata: unknown = {};
      try {
        metadata = JSON.parse(log.metadataJson || '{}');
      } catch {
        metadata = {};
      }
      return { ...log, metadata };
    });

    return NextResponse.json({ logs: formatted, total });
  } catch (error) {
    console.error('[activity-logs GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 },
    );
  }
}
