import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { canUseInbox } from '@/lib/omnichannel/access';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!canUseInbox(authUser)) {
      return NextResponse.json(
        { error: 'Operator authentication required' },
        { status: authUser ? 403 : 401 }
      );
    }

    const tenantId = authUser?.tenantId || null;

    // Check for recent active visitor chat sessions (e.g. within last 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    // Look up any active visitor chat records or telemetry in db
    const activeChats = await db.chatMessage?.findMany({
      where: {
        createdAt: { gte: thirtyMinutesAgo },
        ...(tenantId ? { tenantId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }).catch(() => []);

    // If there are real active chat sessions, map them to visitor telemetry objects
    const visitors = (activeChats || []).map((chat: any, idx: number) => ({
      id: chat.sessionId || `vis_${chat.id}`,
      name: chat.visitorName || `Visitor #${chat.sessionId?.slice(-4) || (1000 + idx)}`,
      shortId: (chat.sessionId?.slice(-2) || `${idx + 1}`).toUpperCase(),
      location: chat.location || 'Website Visitor',
      page: chat.pageUrl || '/services',
      duration: 'Active now',
      intent: 'Chatting with Operator',
      intentScore: 85,
      device: chat.device || 'Web Browser',
      deviceCategory: 'desktop',
      referral: 'Direct / Website',
      referralCategory: 'direct',
      ip: chat.ip || 'Masked',
      provider: 'Web Provider',
      status: 'chatting',
      statusLabel: 'Active in Chat',
      quoteEstimate: 199,
      timeline: [
        {
          time: new Date(chat.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          title: 'Chat Message Received',
          desc: String(chat.message || '').slice(0, 80),
          isCurrent: true,
        },
      ],
      currentKeystroke: '',
      suggestedReplies: [
        'How can I help you book a service today?',
        'Would you like a free estimate sent over?',
      ],
      aiNudge: {
        rule: 'Active-Chat-Engaged',
        message: 'A representative is currently assisting you.',
      },
    }));

    return NextResponse.json({
      visitors,
      totalOnline: visitors.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Omnichannel Visitors] Error:', error);
    return NextResponse.json({ visitors: [], totalOnline: 0, error: 'Failed to fetch live visitors' }, { status: 500 });
  }
}
