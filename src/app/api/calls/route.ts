import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const safeDate = (d: unknown): string | null => {
  if (!d) return null;
  if (typeof d === 'string') return d;
  if (d instanceof Date) return d.toISOString();
  try { return new Date(d as string).toISOString(); } catch { return null; }
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
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId: auth.tenantId,
    };

    if (search) {
      where.OR = [
        { customerPhone: { contains: search, mode: 'insensitive' } },
        { fromNumber: { contains: search, mode: 'insensitive' } },
        { toNumber: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (filter === 'missed') {
      where.OR = [
        { status: 'missed' },
        { callType: 'missed' },
        { endedReason: { in: ['no-answer', 'busy', 'missed', 'rejected', 'canceled'] } },
        { durationSec: 0, status: { not: 'in_progress' } },
      ];
    } else if (filter === 'converted') {
      where.leadId = { not: null };
    } else if (filter === 'followup') {
      where.outcomeType = 'followup';
    }

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

    // Compute top summary KPIs for today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [todayCount, missedCount, convertedCount] = await Promise.all([
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
            { endedReason: { in: ['no-answer', 'busy', 'missed', 'rejected', 'canceled'] } },
            { durationSec: 0, status: { not: 'in_progress' } },
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
    ]);

    return NextResponse.json({
      calls: calls.map((c) => ({
        ...c,
        startedAt: safeDate(c.startedAt),
        endedAt: safeDate(c.endedAt),
        createdAt: safeDate(c.createdAt),
      })),
      stats: {
        total: totalCount,
        todayCount,
        missedCount,
        convertedCount,
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

/**
 * POST /api/calls
 * Manually logs a call or records a SIM call from the mobile app.
 * Body:
 *   - customerPhone: string (required)
 *   - callType: 'inbound' | 'outbound' | 'missed'
 *   - durationSec: number
 *   - summary: string (optional notes)
 *   - outcomeType: string ('interested' | 'quote' | 'followup' | 'spam' | 'other')
 *   - createLead: boolean (optional — if true, auto-creates a CRM lead)
 *   - leadName: string (optional)
 *   - leadValue: number (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const customerPhone = (body.customerPhone || body.phone || '').trim();
    if (!customerPhone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const callType = body.callType || (body.durationSec === 0 ? 'missed' : 'inbound');
    const durationSec = Math.max(0, parseInt(body.durationSec || '0', 10));
    const summary = body.summary || body.notes || null;
    const outcomeType = body.outcomeType || null;
    const createLead = Boolean(body.createLead);

    let createdLeadId: string | null = null;

    if (createLead) {
      const leadName = (body.leadName || '').trim() || `Caller ${customerPhone.slice(-4)}`;
      const leadValue = parseFloat(body.leadValue || '0') || 0;
      const initialNotes = summary
        ? [{ author: auth.name || 'User', text: `Logged via Call Tracker: ${summary}`, createdAt: new Date().toISOString() }]
        : [{ author: auth.name || 'User', text: `Call captured (${callType}, ${durationSec}s)`, createdAt: new Date().toISOString() }];

      const newLead = await db.lead.create({
        data: {
          tenantId: auth.tenantId,
          name: leadName,
          phone: customerPhone,
          source: 'phone_call',
          status: 'new',
          value: leadValue,
          description: summary || `Inbound call duration: ${durationSec}s`,
          notesJson: JSON.stringify(initialNotes),
        },
      });
      createdLeadId = newLead.id;
    }

    const newCall = await db.aiCall.create({
      data: {
        tenantId: auth.tenantId,
        customerPhone,
        fromNumber: callType === 'inbound' ? customerPhone : undefined,
        toNumber: callType === 'outbound' ? customerPhone : undefined,
        callType,
        status: callType === 'missed' ? 'missed' : 'ended',
        durationSec,
        summary,
        outcomeType,
        leadId: createdLeadId,
        endedReason: callType === 'missed' ? 'no-answer' : 'customer_ended',
        startedAt: new Date(Date.now() - durationSec * 1000),
        endedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      call: {
        ...newCall,
        createdAt: safeDate(newCall.createdAt),
      },
      leadId: createdLeadId,
    });
  } catch (error) {
    console.error('[Calls POST]', error);
    return NextResponse.json({ error: 'Failed to record call' }, { status: 500 });
  }
}
