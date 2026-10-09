import { NextRequest, NextResponse } from 'next/server';
import { verifySns, trustedSnsUrl, type SnsEnvelope } from '@/lib/outreach/sns';
import { applyOutreachSesEvent } from '@/lib/outreach/events';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > 262144) return NextResponse.json({ error: 'Message too large.' }, { status: 413 });
  let message: SnsEnvelope;
  try { message = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  if (!message || !await verifySns(message)) return NextResponse.json({ error: 'Invalid SNS signature or topic.' }, { status: 401 });
  try {
    if (message.Type === 'SubscriptionConfirmation') {
      const url = trustedSnsUrl(message.SubscribeURL, message.TopicArn);
      if (url.searchParams.get('Action') !== 'ConfirmSubscription' || url.searchParams.get('TopicArn') !== message.TopicArn) throw new Error('Unexpected subscription URL.');
      const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('Subscription confirmation failed.');
      return NextResponse.json({ confirmed: true });
    }
    if (message.Type !== 'Notification') return NextResponse.json({ skipped: true });
    return NextResponse.json(await applyOutreachSesEvent(JSON.parse(message.Message)));
  } catch (error) {
    console.error('[outreach/ses-event] Could not apply event', error);
    // SNS must retry database failures; application is idempotent.
    return NextResponse.json({ error: 'Event could not be applied; retry.' }, { status: 503 });
  }
}
