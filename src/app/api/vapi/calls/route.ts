import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getCall as vapiGetCall } from '@/lib/vapi-client';

async function isFeatureVisible(tenantId: string): Promise<boolean> {
  const flag = await db.featureFlag.findUnique({
    where: { tenantId_featureKey: { tenantId, featureKey: 'ai_receptionist' } },
    select: { enabled: true },
  });
  return flag?.enabled ?? true;
}

// GET — list calls (with optional filters) or a single call with transcript
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isFeatureVisible(auth.tenantId))) {
      return NextResponse.json({ error: 'Feature not available' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const callId = searchParams.get('id');
    const status = searchParams.get('status');
    const assistantId = searchParams.get('assistantId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Single call with full transcript
    if (callId) {
      const call = await db.aiCall.findFirst({
        where: { id: callId, tenantId: auth.tenantId },
        include: {
          agent: { select: { id: true, name: true } },
          number: { select: { id: true, phoneNumber: true, friendlyName: true } },
        },
      });
      if (!call) return NextResponse.json({ error: 'Call not found' }, { status: 404 });

      // Try to enrich with live Vapi data (transcript, recording)
      let vapiCall: any = null;
      if (call.vapiCallId) {
        try { vapiCall = await vapiGetCall(call.vapiCallId); } catch (e) { /* ignore */ }
      }

      return NextResponse.json({
        call: {
          ...call,
          transcript: JSON.parse(call.transcriptJson || '[]'),
          analysis: JSON.parse(call.analysisJson || '{}'),
          functionCalls: JSON.parse(call.functionCallsJson || '[]'),
        },
        vapiCall,
      });
    }

    // List calls
    const where: Record<string, unknown> = { tenantId: auth.tenantId };
    if (status) where.status = status;
    if (assistantId) where.assistantId = assistantId;

    const calls = await db.aiCall.findMany({
      where,
      include: {
        agent: { select: { id: true, name: true } },
        number: { select: { id: true, phoneNumber: true, friendlyName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Summary stats
    const stats = await db.aiCall.aggregate({
      where: { tenantId: auth.tenantId },
      _sum: { durationSec: true, costUsd: true },
      _count: { _all: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCalls = await db.aiCall.count({
      where: { tenantId: auth.tenantId, createdAt: { gte: today } },
    });

    return NextResponse.json({
      calls,
      stats: {
        total: stats._count._all,
        totalDurationSec: stats._sum.durationSec || 0,
        totalCost: stats._sum.costUsd || 0,
        todayCount: todayCalls,
      },
    });
  } catch (error) {
    console.error('[Vapi Calls GET]', error);
    return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 });
  }
}
