import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { canUseInbox } from '@/lib/conversation-access';
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
    
    // Look up real active public chat sessions in db
    const activeSessions = await db.publicChatSession.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        status: { in: ['active', 'claimed'] },
        updatedAt: { gte: thirtyMinutesAgo },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    }).catch(() => []);

    // If there are real active chat sessions, map them to visitor telemetry objects
    const visitors = activeSessions.map((session, idx) => {
      let meta: Record<string, any> = {};
      try {
        meta = JSON.parse(session.metadataJson || '{}');
      } catch {}

      const latestMsg = session.messages[0];
      const minutesAgo = Math.max(1, Math.round((Date.now() - new Date(session.updatedAt).getTime()) / 60000));

      return {
        id: session.id,
        name: session.visitorName || `Visitor #${session.id.slice(-4)}`,
        shortId: (session.id.slice(-2) || `${idx + 1}`).toUpperCase(),
        location: meta.city || meta.location || 'Website Visitor',
        page: meta.currentPage || meta.page || '/services',
        duration: `${minutesAgo}m on site`,
        intent: session.messages.length > 0 ? 'Live Chat Active' : 'Browsing Services',
        intentScore: session.messages.length > 2 ? 90 : session.messages.length > 0 ? 75 : 50,
        device: meta.browser || meta.device || 'Web Browser',
        deviceCategory: (meta.device || '').toLowerCase().includes('mobile') ? 'mobile' : 'desktop',
        referral: meta.referrer || 'Direct / Website',
        referralCategory: (meta.referrer || '').includes('google') ? 'maps' : 'direct',
        ip: 'Masked',
        provider: 'Live Chat',
        status: session.status === 'claimed' ? 'chatting' : 'active',
        statusLabel: session.status === 'claimed' ? 'Assigned to Agent' : 'Active on Site',
        quoteEstimate: 0,
        timeline: session.messages.map((m) => ({
          time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          title: m.senderType === 'admin' ? 'Operator Message' : 'Visitor Message',
          desc: m.body.slice(0, 80),
          isCurrent: m.id === latestMsg?.id,
        })),
        currentKeystroke: '',
        suggestedReplies: [
          'Hello! How can we assist you with our services today?',
          'Would you like to schedule an appointment or get an estimate?',
        ],
        aiNudge: {
          rule: 'High-Intent-Assistance',
          message: 'Hello! I noticed you are checking our services. Would you like a quick quote or help booking?',
        },
      };
    });

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
