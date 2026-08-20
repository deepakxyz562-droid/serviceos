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
  const rawBody = await request.text();
  return handleVapiWebhook(request, rawBody);
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
