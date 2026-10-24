import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { canUseInbox } from '@/lib/omnichannel/access';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!canUseInbox(authUser)) {
      return NextResponse.json(
        { error: 'Operator authentication required' },
        { status: authUser ? 403 : 401 }
      );
    }

    const body = await request.json();
    const { visitorId, message, rule } = body;

    if (!visitorId || typeof visitorId !== 'string') {
      return NextResponse.json({ error: 'visitorId is required' }, { status: 400 });
    }

    const tenantId = authUser?.tenantId || null;

    // Log the proactive live nudge activity
    await db.auditLog?.create({
      data: {
        tenantId,
        actorId: authUser?.id || 'agent',
        actorType: 'agent',
        action: 'dispatch_live_nudge',
        entityType: 'live_visitor',
        entityId: visitorId,
        description: `Dispatched proactive live nudge (${rule || 'Standard'}): "${String(message || '').slice(0, 100)}"`,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      visitorId,
      dispatchedAt: new Date().toISOString(),
      rule: rule || 'Custom-Nudge',
    });
  } catch (error) {
    console.error('[Omnichannel Visitor Nudge] Error:', error);
    return NextResponse.json({ error: 'Failed to dispatch visitor nudge' }, { status: 500 });
  }
}
