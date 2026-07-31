import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { toISO } from '@/lib/date-utils';

/**
 * POST /api/omnichannel/conversations/[id]/assign
 *
 * Assigns a conversation to the current user (or a specified agent).
 * - Creates a ConversationAssignment with status='active'
 * - Marks any previous active assignment as 'transferred'
 *
 * Body: { agentId?: string, agentName?: string }
 *   - If agentId omitted, assigns to the current authenticated user.
 *
 * DELETE /api/omnichannel/conversations/[id]/assign
 *
 * Unassigns the conversation — marks all active assignments as 'resolved'.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const agentId = (body as { agentId?: string })?.agentId || auth.userId;
    const agentName =
      (body as { agentName?: string })?.agentName || auth.name || auth.email || 'Agent';

    // Resolve the conversation record. The [id] param is the Conversation.id
    // (cuid). ConversationAssignment.conversationId stores the
    // Conversation.conversationId STRING field (verified against the seed
    // script), so we must use conv.conversationId (not conv.id) when
    // creating/looking up assignments.
    const conv = await db.conversation.findUnique({
      where: { id },
      select: { id: true, conversationId: true },
    });
    if (!conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Mark any existing active assignments as transferred.
    await db.conversationAssignment.updateMany({
      where: { conversationId: conv.conversationId, status: 'active' },
      data: { status: 'transferred' },
    });

    // Create the new active assignment.
    const assignment = await db.conversationAssignment.create({
      data: {
        conversationId: conv.conversationId,
        agentId,
        agentName,
        assignedById: auth.userId,
        type: 'primary',
        status: 'active',
      },
    });

    return NextResponse.json({
      success: true,
      assignment: {
        id: assignment.id,
        agentId: assignment.agentId,
        agentName: assignment.agentName,
        status: assignment.status,
        createdAt: toISO(assignment.createdAt),
      },
    });
  } catch (error) {
    console.error('[omnichannel/assign] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const conv = await db.conversation.findUnique({
      where: { id },
      select: { conversationId: true },
    });
    if (!conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Mark all active assignments as resolved (unassign).
    // Uses conv.conversationId (string field), matching the seed convention.
    const result = await db.conversationAssignment.updateMany({
      where: { conversationId: conv.conversationId, status: 'active' },
      data: { status: 'resolved' },
    });

    return NextResponse.json({ success: true, resolved: result.count });
  } catch (error) {
    console.error('[omnichannel/unassign] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
