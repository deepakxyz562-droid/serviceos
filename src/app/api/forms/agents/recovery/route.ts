import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import {
  scanAbandonedSessions,
  triggerReengagementOutreach,
} from '@/lib/forms/abandoned-lead-recovery';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idleMinutes = parseInt(searchParams.get('idleMinutes') || '15', 10);

    const candidates = await scanAbandonedSessions({
      tenantId: auth.tenantId,
      idleMinutes,
    });

    return NextResponse.json({ success: true, candidates });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { candidate, customMessage, agentName, companyName } = body;

    if (!candidate || !candidate.sessionId) {
      return NextResponse.json({ error: 'Candidate session required' }, { status: 400 });
    }

    const result = await triggerReengagementOutreach({
      candidate: { ...candidate, tenantId: auth.tenantId },
      agentName,
      companyName,
      customMessage,
    });

    return NextResponse.json({ success: result.success, result });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
