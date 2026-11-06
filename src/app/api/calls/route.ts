import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { callInput, writeCall } from '@/lib/call-tracker-write';

export const dynamic = 'force-dynamic';

const safeDate = (d: unknown): string | null => {
  if (!d) return null;
  if (typeof d === 'string') return d;
  if (d instanceof Date) return d.toISOString();
  try {
    return new Date(d as string).toISOString();
  } catch {
    return null;
  }
};

/**
 * GET /api/calls
 * Query parameters:
 *   - search: query across phone number and summary
 *   - filter: 'all' | 'missed' | 'converted' | 'followup'
 *   - limit: number of calls (default 50)
 *   - page: pagination page (default 1)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const filter = searchParams.get('filter') || 'all';
    const limit = Math.min(100, Math.max(1, (parseInt(searchParams.get('limit') || '50', 10) || 50)));
    const page = Math.max(1, (parseInt(searchParams.get('page') || '1', 10) || 1));
    const skip = (page - 1) * limit;

    // Use Prisma AND array so search and filters combine cleanly without overwriting
    const andClauses: any[] = [{ tenantId: auth.tenantId }];

    if (search) {
      andClauses.push({
        OR: [
          { customerPhone: { contains: search, mode: 'insensitive' } },
          { fromNumber: { contains: search, mode: 'insensitive' } },
          { toNumber: { contains: search, mode: 'insensitive' } },
          { summary: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (filter === 'missed') {
      andClauses.push({
        OR: [
          { status: 'missed' },
          { callType: 'missed' },
          { endedReason: { in: ['no-answer', 'busy', 'missed', 'rejected', 'canceled', 'timeout'] } },
        ],
      });
    } else if (filter === 'converted') {
      andClauses.push({ leadId: { not: null } });
    } else if (filter === 'followup') {
      andClauses.push({
        OR: [
          { outcomeType: 'followup' },
          { endedReason: 'followup' },
          { summary: { contains: 'follow-up', mode: 'insensitive' } },
          { summary: { contains: 'callback', mode: 'insensitive' } },
        ],
      });
    }

    const where = { AND: andClauses };

    const [calls, totalCount] = await Promise.all([
      db.aiCall.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          callType: true,
          status: true,
          fromNumber: true,
          toNumber: true,
          customerPhone: true,
          durationSec: true,
          summary: true,
          outcomeType: true,
          endedReason: true,
          leadId: true,
          createdAt: true,
          startedAt: true,
          endedAt: true,
        },
      }),
      db.aiCall.count({ where }),
    ]);

    // Batch resolve attached Lead details for Caller ID
    const leadIds = calls.map((c) => c.leadId).filter(Boolean) as string[];
    const leadsMap = new Map<string, { id: string; name: string; status: string; value: number }>();
    if (leadIds.length > 0) {
      const leads = await db.lead.findMany({
        where: { id: { in: leadIds }, tenantId: auth.tenantId },
        select: { id: true, name: true, status: true, value: true },
      });
      leads.forEach((l) => leadsMap.set(l.id, l));
    }

    // Compute top summary KPIs for today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [todayCount, missedCount, convertedCount, followupCount] = await Promise.all([
      db.aiCall.count({
        where: {
          tenantId: auth.tenantId,
          createdAt: { gte: startOfToday },
        },
      }),
      db.aiCall.count({
        where: {
          tenantId: auth.tenantId,
          createdAt: { gte: startOfToday },
          OR: [
            { status: 'missed' },
            { callType: 'missed' },
            { endedReason: { in: ['no-answer', 'busy', 'missed', 'rejected', 'canceled', 'timeout'] } },
          ],
        },
      }),
      db.aiCall.count({
        where: {
          tenantId: auth.tenantId,
          createdAt: { gte: startOfToday },
          leadId: { not: null },
        },
      }),
      db.aiCall.count({
        where: {
          tenantId: auth.tenantId,
          OR: [
            { outcomeType: 'followup' },
            { endedReason: 'followup' },
            { summary: { contains: 'follow-up', mode: 'insensitive' } },
            { summary: { contains: 'callback', mode: 'insensitive' } },
          ],
        },
      }),
    ]);

    return NextResponse.json({
      calls: calls.map((c) => ({
        ...c,
        lead: c.leadId ? leadsMap.get(c.leadId) || null : null,
        startedAt: safeDate(c.startedAt),
        endedAt: safeDate(c.endedAt),
        createdAt: safeDate(c.createdAt),
      })),
      stats: {
        total: totalCount,
        todayCount,
        missedCount,
        convertedCount,
        followupCount,
      },
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('[Calls GET]', error);
    return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 });
  }
}

/** Authenticated ingestion; atomic persistence is implemented in PostgreSQL. */
export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth?.tenantId) return NextResponse.json({error:'Unauthorized'},{status:401});
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({error:'Invalid JSON'},{status:400}); }
  const parsed = callInput.safeParse(raw);
  if (!parsed.success) return NextResponse.json({error:parsed.error.issues[0].message},{status:400});
  const v = parsed.data;
  try {
    const result = await writeCall(auth.tenantId,'create',{
      ...v, customerPhone:v.customerPhone || v.phone,
      summary:v.summary || v.notes || null,
      notesJson:JSON.stringify(v.notes ? [{author:auth.name || 'User',text:v.notes,createdAt:new Date().toISOString()}] : []),
      // Manual records do not invent call timestamps from form duration.
      startedAt:v.startedAt || null, endedAt:v.endedAt || null,
    });
    return NextResponse.json(result,{status:result.status || 200});
  } catch {
    return NextResponse.json({error:'Call could not be saved. Please retry; automatic retries will not duplicate identified events.'},{status:503});
  }
}
