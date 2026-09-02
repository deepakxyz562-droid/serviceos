import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getCall as vapiGetCall } from '@/lib/vapi-client';

/**
 * Helper: safely serialize dates from BOTH Prisma (Date objects) and the
 * Supabase REST adapter (which returns ISO strings from PostgREST).
 */
const safeDate = (d: unknown): string | null => {
  if (!d) return null;
  if (typeof d === 'string') return d;
  if (d instanceof Date) return d.toISOString();
  try { return new Date(d as string).toISOString(); } catch { return null; }
};

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
      // Phase 9.8: Removed `include: { agent, number }` — these use legacy
      // AiAgent/AiPhoneNumber tables that PostgREST can't resolve (wrong table
      // name fallback). The call's own fields (fromNumber, toNumber, customerPhone)
      // provide the same information without needing the relation.
      const call = await db.aiCall.findFirst({
        where: { id: callId, tenantId: auth.tenantId },
      });
      if (!call) return NextResponse.json({ error: 'Call not found' }, { status: 404 });

      // Try to enrich with live Vapi data (transcript, recording)
      let vapiCall: Record<string, unknown> | null = null;
      if (call.vapiCallId) {
        try { vapiCall = await vapiGetCall(call.vapiCallId); } catch { /* ignore */ }
      }

      const dbTranscript = JSON.parse(call.transcriptJson || '[]');
      const vapiTranscript = Array.isArray(vapiCall?.messages)
        ? (vapiCall.messages as Array<{ role?: string; message?: string; content?: string }>)
            .filter((m) => m.role === 'bot' || m.role === 'assistant' || m.role === 'user')
            .map((m) => ({
              role: m.role === 'user' ? 'user' : 'assistant',
              content: m.message || m.content || '',
            }))
        : [];

      return NextResponse.json({
        call: {
          ...call,
          recordingUrl: call.vapiCallId ? `/api/vapi/calls/${call.id}/recording` : null,
          startedAt: safeDate(call.startedAt),
          endedAt: safeDate(call.endedAt),
          createdAt: safeDate(call.createdAt),
          transcript: dbTranscript.length > 0 ? dbTranscript : vapiTranscript,
          analysis: JSON.parse(call.analysisJson || '{}'),
          functionCalls: JSON.parse(call.functionCallsJson || '[]'),
        },
        vapiCall,
      });
    }

    // List calls — no nested includes (use flat fields from AiCall)
    const where: Record<string, unknown> = { tenantId: auth.tenantId };
    if (status) where.status = status;
    if (assistantId) where.assistantId = assistantId;

    const calls = await db.aiCall.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // ── Phase C: Only compute stats when the caller needs them ──────────
    // The Overview tab calls with limit=5 (just needs recent calls, no stats).
    // The Calls tab calls with limit=100 (needs stats for the summary header).
    // Skip the expensive aggregate + count when limit < 50 unless ?stats=true.
    const wantsStats = limit >= 50 || searchParams.get('stats') === 'true';

    let statsData = null;
    if (wantsStats) {
      // Phase 9.8: Use _count: { id: true } instead of _count: { _all: true }
      const stats = await db.aiCall.aggregate({
        where: { tenantId: auth.tenantId },
        _sum: { durationSec: true, costUsd: true },
        _count: { id: true },
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCalls = await db.aiCall.count({
        where: { tenantId: auth.tenantId, createdAt: { gte: today } },
      });

      statsData = {
        total: typeof stats._count === 'number'
          ? stats._count
          : (stats._count as Record<string, number> | null)?.id || 0,
        totalDurationSec: stats._sum?.durationSec || 0,
        totalCost: stats._sum?.costUsd || 0,
        todayCount: todayCalls,
      };
    }

    return NextResponse.json({
      calls: calls.map((c: Record<string, unknown>) => ({
        ...c,
        recordingUrl: c.vapiCallId ? `/api/vapi/calls/${c.id}/recording` : null,
        startedAt: safeDate(c.startedAt),
        endedAt: safeDate(c.endedAt),
        createdAt: safeDate(c.createdAt),
      })),
      stats: statsData,
    });
  } catch (error) {
    console.error('[Vapi Calls GET]', error);
    return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 });
  }
}
