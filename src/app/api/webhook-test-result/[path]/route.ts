import { NextRequest, NextResponse } from 'next/server';
import { getLatestEvent, registerListener, unregisterListener, isListenerActive } from '@/lib/webhook-test-store';

/**
 * GET /api/webhook-test-result/[path]
 * 
 * Polling endpoint for the "Listen for Test Event" feature.
 * The frontend panel polls this endpoint while listening.
 * 
 * Query params:
 *   - action: "start" | "poll" | "stop" (default: "poll")
 *   - since: timestamp (ms) to only get events newer than this
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> },
) {
  const { path: webhookPath } = await params;
  const action = request.nextUrl.searchParams.get('action') || 'poll';
  const sinceParam = request.nextUrl.searchParams.get('since');
  const sinceTimestamp = sinceParam ? parseInt(sinceParam) : undefined;

  try {
    if (action === 'start') {
      // Register a new listener session
      registerListener(webhookPath);
      return NextResponse.json({
        status: 'listening',
        message: 'Now listening for test events on this webhook path.',
        webhookPath,
      });
    }

    if (action === 'stop') {
      // Unregister the listener
      unregisterListener(webhookPath);
      return NextResponse.json({
        status: 'stopped',
        message: 'Stopped listening for test events.',
        webhookPath,
      });
    }

    // action === 'poll'
    const listenerActive = isListenerActive(webhookPath);

    const latestEvent = getLatestEvent(webhookPath, sinceTimestamp);

    if (latestEvent) {
      // Found a test event! Return it and stop listening.
      unregisterListener(webhookPath);
      return NextResponse.json({
        status: 'received',
        event: {
          id: latestEvent.id,
          timestamp: latestEvent.timestamp,
          method: latestEvent.method,
          headers: latestEvent.headers,
          queryParams: latestEvent.queryParams,
          body: latestEvent.body,
          executionResult: latestEvent.executionResult,
        },
      });
    }

    // No event yet
    if (!listenerActive) {
      return NextResponse.json({
        status: 'expired',
        message: 'Listening session expired. Please try again.',
      });
    }

    return NextResponse.json({
      status: 'listening',
      message: 'No event received yet.',
    });
  } catch (error) {
    console.error('Webhook test result error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
