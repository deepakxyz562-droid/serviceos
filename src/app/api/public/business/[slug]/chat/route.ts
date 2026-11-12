import { NextRequest, NextResponse } from 'next/server';
import { getBgosPublicBusinessProfileUncached } from '@/lib/bgos-public-business';
import {
  answerBusinessChatbotMessage,
  getPrimaryBusinessChatbotMeta,
} from '@/lib/bgos-business-chatbot';

export const dynamic = 'force-dynamic';

type RouteProps = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteProps) {
  try {
    const { slug } = await params;
    const profile = await getBgosPublicBusinessProfileUncached(slug);
    if (!profile) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }
    const meta = await getPrimaryBusinessChatbotMeta(profile.tenantId);
    return NextResponse.json({ chatbot: meta }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[public/business/[slug]/chat GET]', err);
    return NextResponse.json({ error: 'Could not load assistant' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteProps) {
  try {
    const { slug } = await params;
    const profile = await getBgosPublicBusinessProfileUncached(slug);
    if (!profile) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid chat payload' }, { status: 400 });
    }

    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const action = typeof body.action === 'string' ? body.action.trim() : null;
    if (!message && action !== 'request_human') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message is too long (max 2000 chars)' }, { status: 400 });
    }

    const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() || null : null;
    const visitor =
      body.visitor && typeof body.visitor === 'object'
        ? {
            name: typeof body.visitor.name === 'string' ? body.visitor.name.trim() || null : null,
            phone: typeof body.visitor.phone === 'string' ? body.visitor.phone.trim() || null : null,
            email: typeof body.visitor.email === 'string' ? body.visitor.email.trim() || null : null,
          }
        : undefined;

    const result = await answerBusinessChatbotMessage({
      profile,
      message: message || 'Hello, I would like to speak with the business owner.',
      history,
      sessionId,
      action,
      visitor,
    });

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[public/business/[slug]/chat POST]', err);
    return NextResponse.json({ error: 'Assistant temporarily unavailable. Please retry.' }, { status: 500 });
  }
}
