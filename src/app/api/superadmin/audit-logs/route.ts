import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Helper to safely query tables that might not exist
async function safeQuery<T>(queryFn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await queryFn();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('Could not find the table') || msg.includes('does not exist') || msg.includes('relation')) {
      return fallback;
    }
    console.error('[SuperAdmin AuditLogs] Query error:', msg);
    return fallback;
  }
}

// GET: List audit log entries with filters
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || '';
    const action = searchParams.get('action') || '';
    const userId = searchParams.get('userId') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Try AuditLogEntry table first
    const where: Record<string, unknown> = {};
    if (tenantId) where.tenantId = tenantId;
    if (action) where.action = { contains: action };
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      const createdAt: Record<string, unknown> = {};
      if (startDate) createdAt.gte = new Date(startDate).toISOString();
      if (endDate) createdAt.lte = new Date(endDate).toISOString();
      where.createdAt = createdAt;
    }

    let auditLogs: unknown[] = [];
    let source = 'AuditLogEntry';

    const entryLogs = await safeQuery(
      () => db.auditLogEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      [],
    );

    if (Array.isArray(entryLogs) && entryLogs.length > 0) {
      auditLogs = entryLogs;
    } else {
      // Fallback to AuditLog table
      source = 'AuditLog';
      const auditWhere: Record<string, unknown> = {};
      if (action) auditWhere.action = { contains: action };
      if (userId) auditWhere.userId = userId;
      if (startDate || endDate) {
        const createdAt: Record<string, unknown> = {};
        if (startDate) createdAt.gte = new Date(startDate).toISOString();
        if (endDate) createdAt.lte = new Date(endDate).toISOString();
        auditWhere.createdAt = createdAt;
      }

      const fallbackLogs = await safeQuery(
        () => db.auditLog.findMany({
          where: auditWhere,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        [],
      );

      auditLogs = Array.isArray(fallbackLogs) ? fallbackLogs : [];
    }

    const formatted = auditLogs.map((log: Record<string, unknown>) => {
      let metadata = {};
      if (log.metadataJson) {
        try {
          metadata = typeof log.metadataJson === 'string' ? JSON.parse(log.metadataJson) : log.metadataJson;
        } catch {
          // Ignore parse errors
        }
      }

      return {
        id: log.id,
        userId: log.userId || null,
        tenantId: log.tenantId || null,
        action: log.action,
        resourceType: log.resourceType || null,
        resourceId: log.resourceId || null,
        ip: log.ip || null,
        userAgent: log.userAgent || null,
        metadata,
        createdAt: log.createdAt ? new Date(log.createdAt as string).toISOString() : null,
      };
    });

    // Filter by tenantId client-side if using AuditLog (which doesn't have tenantId)
    const filtered = tenantId && source === 'AuditLog'
      ? formatted.filter((log) => {
          // Can't filter by tenantId on AuditLog, return all
          return true;
        })
      : formatted;

    return NextResponse.json({
      auditLogs: filtered,
      total: filtered.length,
      source,
    });
  } catch (error) {
    console.error('[SuperAdmin AuditLogs GET] Error:', error);
    return NextResponse.json({ auditLogs: [], total: 0, source: 'none' });
  }
}
