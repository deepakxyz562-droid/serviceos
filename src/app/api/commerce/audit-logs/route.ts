import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveStaffSessionFromRequest } from '@/lib/commerce/access';
import { commerceError } from '@/lib/commerce/atomic';

/**
 * GET /api/commerce/audit-logs
 * Latest commerce audit-trail rows for the BOS settings screen. Reads the
 * same ActivityLog table written by logCommerceActivity (see
 * src/lib/commerce/audit.ts) and is scoped to the caller's business tenant.
 *
 * Permission: read-level, mirroring GET /api/commerce/money — the caller
 * needs canViewReports OR canPosBilling.
 */

// Only commerce-relevant entity types are surfaced (the entityTypes the
// commerce routes actually log — see src/lib/commerce/audit.ts call sites).
const COMMERCE_ENTITY_TYPES = [
  'invoice',
  'payment',
  'bank_account',
  'cheque',
  'money',
  'expense',
  'customer',
] as const;

export async function GET(req: Request) {
  try {
    const session = await resolveStaffSessionFromRequest(req);
    if (!session.permissions.canViewReports && !session.permissions.canPosBilling) {
      throw new Error('FORBIDDEN_INSUFFICIENT_ROLE');
    }
    const business = session.business;

    const logs = await db.activityLog.findMany({
      where: {
        tenantId: business.tenantId || business.id,
        entityType: { in: [...COMMERCE_ENTITY_TYPES] },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(
      {
        logs: logs.map((log) => ({
          id: log.id,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          entityName: log.entityName,
          description: log.description,
          actorId: log.actorId,
          actorName: log.actorName,
          actorType: log.actorType,
          severity: log.severity,
          metadataJson: log.metadataJson,
          createdAt: log.createdAt,
        })),
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'UNAUTHORIZED' || message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (message === 'FORBIDDEN' || message === 'FORBIDDEN_INSUFFICIENT_ROLE') {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions to view the commerce audit trail' },
        { status: 403 }
      );
    }
    if (message === 'BUSINESS_NOT_FOUND') {
      return NextResponse.json({ error: 'Business not found' }, { status: 503 });
    }
    const failure = commerceError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
