import { NextRequest, NextResponse } from 'next/server';
import { getWebhookRequests, clearWebhookRequests } from '@/lib/webhook-buffer';

// GET /api/webhook-test-requests?path=<webhookPath>&since=<ISO timestamp>
// Polls for webhook test requests received for a specific path
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path');
  const since = request.nextUrl.searchParams.get('since') || undefined;

  if (!path) {
    return NextResponse.json(
      { error: 'Missing "path" query parameter' },
      { status: 400 },
    );
  }

  const requests = await getWebhookRequests(path, since);
  return NextResponse.json({ requests });
}

// DELETE /api/webhook-test-requests?path=<webhookPath>
// Clears the buffer for a specific path
export async function DELETE(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path');

  if (!path) {
    return NextResponse.json(
      { error: 'Missing "path" query parameter' },
      { status: 400 },
    );
  }

  await clearWebhookRequests(path);
  return NextResponse.json({ success: true });
}
