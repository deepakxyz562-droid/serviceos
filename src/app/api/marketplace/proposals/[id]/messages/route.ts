import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/marketplace/proposals/[id]/messages
 * Returns chat messages for a proposal.
 *
 * POST /api/marketplace/proposals/[id]/messages
 * Sends a message in the proposal chat.
 * Body: { marketplaceCustomerId, senderType, body }
 *
 * Privacy: messages do NOT contain customer contact info.
 * Contact is revealed only after booking (via addressUnlocked).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const messages = await db.proposalMessage.findMany({
      where: { proposalId: id },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return NextResponse.json({ success: true, messages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: proposalId } = await params;
    const body = await req.json();
    const { marketplaceCustomerId, senderType, body: messageBody } = body;

    if (!marketplaceCustomerId || !senderType || !messageBody) {
      return NextResponse.json(
        { error: 'marketplaceCustomerId, senderType, and body are required' },
        { status: 400 },
      );
    }

    const message = await db.proposalMessage.create({
      data: {
        proposalId,
        marketplaceCustomerId,
        senderType,
        body: messageBody,
      },
    });

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    console.error('[marketplace/proposals/[id]/messages POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
