import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { canAccessConversation, canUseInbox } from '@/lib/conversation-access';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!canUseInbox(user)) return NextResponse.json({ error: 'Operator authentication required' }, { status: user ? 403 : 401 });
  const body = await request.json().catch(() => null);
  if (typeof body?.aiPaused !== 'boolean') return NextResponse.json({ error: 'aiPaused must be a boolean' }, { status: 400 });
  try {
    const { id } = await params;
    const conversation = await db.conversation.findUnique({ where: { id } });
    if (!conversation || !canAccessConversation(user, conversation)) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    const updated = await db.conversation.update({ where: { id }, data: {
      aiPaused: body.aiPaused,
      tookOverById: body.aiPaused ? user.id : null,
      tookOverAt: body.aiPaused ? new Date() : null,
    }, select: { id: true, aiPaused: true } });
    return NextResponse.json(updated, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Could not update conversation. Please retry.' }, { status: 500 });
  }
}
