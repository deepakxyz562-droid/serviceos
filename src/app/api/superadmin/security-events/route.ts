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
    console.error('[SuperAdmin SecurityEvents] Query error:', msg);
    return fallback;
  }
}

// GET: List security events with filters
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
    const severity = searchParams.get('severity') || '';
    const eventType = searchParams.get('eventType') || '';
    const tenantId = searchParams.get('tenantId') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build where clause
    const where: Record<string, unknown> = {};
    if (severity) where.severity = severity;
    if (eventType) where.eventType = { contains: eventType };
    if (tenantId) where.tenantId = tenantId;
    if (startDate || endDate) {
      const createdAt: Record<string, unknown> = {};
      if (startDate) createdAt.gte = new Date(startDate).toISOString();
      if (endDate) createdAt.lte = new Date(endDate).toISOString();
      where.createdAt = createdAt;
    }

    const events = await safeQuery(
      () => db.securityEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      [],
    );

    const formatted = Array.isArray(events) ? events.map((e: Record<string, unknown>) => {
      let metadata = {};
      if (e.metadataJson) {
        try {
          metadata = typeof e.metadataJson === 'string' ? JSON.parse(e.metadataJson) : e.metadataJson;
        } catch {
          // Ignore parse errors
        }
      }

      return {
        id: e.id,
        eventType: e.eventType,
        severity: e.severity,
        userId: e.userId || null,
        tenantId: e.tenantId || null,
        ip: e.ip || null,
        userAgent: e.userAgent || null,
        metadata,
        createdAt: e.createdAt ? new Date(e.createdAt as string).toISOString() : null,
      };
    }) : [];

    // Get severity counts
    const severityCounts = await safeQuery(
      async () => {
        const allEvents = await db.securityEvent.findMany({
          select: { severity: true },
        });
        return allEvents.reduce((acc: Record<string, number>, e: Record<string, unknown>) => {
          const sev = (e.severity as string) || 'info';
          acc[sev] = (acc[sev] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      },
      {} as Record<string, number>,
    );

    return NextResponse.json({
      events: formatted,
      total: formatted.length,
      severityCounts,
    });
  } catch (error) {
    console.error('[SuperAdmin SecurityEvents GET] Error:', error);
    return NextResponse.json({
      events: [],
      total: 0,
      severityCounts: {},
    });
  }
}
