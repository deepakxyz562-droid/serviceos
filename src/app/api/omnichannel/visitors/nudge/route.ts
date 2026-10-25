import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { canUseInbox } from '@/lib/conversation-access';
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

    // Verify the visitor session exists and is active for this tenant
    const session = await db.publicChatSession.findFirst({
      where: {
        id: visitorId,
        ...(tenantId ? { tenantId } : {}),
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Visitor session not found or disconnected' },
        { status: 404 }
      );
    }

    // Deliver the proactive live nudge message into the visitor's public chat thread
    const nudgeText = String(message || 'Hello! How can we assist you with our services today?');
    await db.publicChatMessage.create({
      data: {
        sessionId: session.id,
        senderType: 'admin',
        senderId: authUser?.id || null,
        senderName: authUser?.name || 'Operator',
        body: nudgeText,
      },
    });

    await db.publicChatSession.update({
      where: { id: session.id },
      data: {
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Record audit log conforming to actual Prisma AuditLog schema
    await db.auditLog.create({
      data: {
        userId: authUser?.id || null,
        action: 'dispatch_live_nudge',
        resourceType: 'live_visitor',
        resourceId: visitorId,
        metadataJson: JSON.stringify({
          rule: rule || 'Standard',
          messageSnippet: nudgeText.slice(0, 100),
          delivered: true,
        }),
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
