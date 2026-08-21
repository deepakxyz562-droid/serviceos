import { NextRequest, NextResponse } from 'next/server';
import { handleVapiWebhook } from '@/lib/vapi-webhook-adapter';

/**
 * POST /api/vapi/webhook
 * ─────────────────────────────────────────────────────────────────────────
 * Vapi webhook receiver — handles call lifecycle events.
 *
 * This is a THIN ADAPTER (per Phase 5 architectural boundary):
 *   1. Reads the raw body
 *   2. Delegates to VapiWebhookAdapter (authenticate → normalize → dispatch)
 *
 * The webhook MUST NOT contain business logic. All routing, admission,
 * reservation, and finalization happen in the adapter's handlers, which
 * call the appropriate services (PhoneNumberService, AdmissionController,
 * UsageService).
 *
 * Events handled:
 *   - status-update       → call started/ringing → admission check + reservation
 *   - end-of-call-report  → call ended → finalize UsageLedger (idempotent)
 *   - transcript          → real-time transcript (logged, not persisted in V1)
 *
 * Auth: Vapi bearer token (VAPI_WEBHOOK_SECRET or INTERNAL_API_SECRET)
 */

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    return await handleVapiWebhook(request, rawBody);
  } catch (err) {
    console.error('[vapi/webhook] Top-level handler error:', err);
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">Thank you for calling Singh Fabrication. Your call is connected to our AI receptionist.</Say>
    <Pause length="1"/>
    <Say voice="Polly.Joanna">How can I help you with your fabrication order today?</Say>
</Response>`;
      return new Response(twiml, { status: 200, headers: { 'Content-Type': 'text/xml' } });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET — health check (for Vapi webhook configuration verification).
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/vapi/webhook',
    status: 'active',
    note: 'POST receives Vapi call lifecycle events. Bearer token verified.',
  });
}
