import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { listPhoneConnections } from '@/lib/phone-number-service';

/**
 * GET /api/addons/phones/connections
 * ─────────────────────────────────────────────────────────────────────────
 * List all phone connections for the authenticated tenant.
 * Includes the Fieseros PhoneNumber + the ExternalPhoneNumber (if forwarding).
 *
 * Auth: any authenticated tenant user (read-only).
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const connections = await listPhoneConnections(user.tenantId);
    return NextResponse.json({ connections });
  } catch (error) {
    console.error('[GET /api/addons/phones/connections] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch phone connections' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/addons/phones/connections
 * ─────────────────────────────────────────────────────────────────────────
 * Create a phone connection (either DIRECT or FORWARDING).
 *
 * Body for DIRECT connection:
 *   { type: 'DIRECT', phoneNumberId, routingMode: 'AI_RECEPTIONIST' | 'HUMAN_FORWARD' | 'VOICEMAIL', routingTarget? }
 *
 * Body for FORWARDING connection:
 *   { type: 'FORWARDING', externalE164, externalLabel?, externalCountry?, phoneNumberId, routingMode? }
 *
 * Auth: owner only.
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can manage phone connections' },
        { status: 403 },
      );
    }

    const body = await request.json();

    if (body.type === 'DIRECT') {
      const { phoneNumberId, routingMode, routingTarget } = body;
      if (!phoneNumberId || !routingMode) {
        return NextResponse.json(
          { error: 'phoneNumberId and routingMode are required' },
          { status: 400 },
        );
      }
      const { createDirectConnection } = await import('@/lib/phone-number-service');
      const connection = await createDirectConnection({
        tenantId: user.tenantId,
        phoneNumberId,
        routingMode,
        routingTarget,
      });
      return NextResponse.json({ connection });
    }

    if (body.type === 'FORWARDING') {
      const { externalE164, externalLabel, externalCountry, phoneNumberId, routingMode } = body;
      if (!externalE164 || !phoneNumberId) {
        return NextResponse.json(
          { error: 'externalE164 and phoneNumberId are required' },
          { status: 400 },
        );
      }
      const { createForwardingConnection } = await import('@/lib/phone-number-service');
      const result = await createForwardingConnection({
        tenantId: user.tenantId,
        externalE164,
        externalLabel,
        externalCountry,
        phoneNumberId,
        routingMode,
      });
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: 'Invalid type. Use "DIRECT" or "FORWARDING".' },
      { status: 400 },
    );
  } catch (error) {
    console.error('[POST /api/addons/phones/connections] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create phone connection' },
      { status: 500 },
    );
  }
}
