import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { sendMessage, type Channel } from '@/lib/communication-engine';

/**
 * POST /api/communication/send
 * ----------------------------
 * Unified multi-channel message send. Body matches `SendMessageParams` from
 * `src/lib/communication-engine.ts`:
 *
 *   {
 *     customerId?:  string
 *     userId?:      string        // for in-app/push to internal users
 *     channels?:    Channel[]     // omit to auto-select
 *     templateKey?: string        // job_scheduled | technician_on_route | ...
 *     variables?:   Record<string,string>
 *     subject?:     string        // direct content (overrides template)
 *     body?:        string
 *     relatedEntityType?: string  // job | invoice | lead
 *     relatedEntityId?:   string
 *   }
 *
 * Returns: { delivered, failed, results }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Resolve tenantId — prefer the request body, then the auth user.
    const tenantId: string | undefined = body.tenantId || user.tenantId || undefined;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Could not resolve tenantId for this user.' },
        { status: 400 },
      );
    }

    // Minimal validation: must have either customerId or userId, and at
    // least one of (templateKey, body).
    if (!body.customerId && !body.userId) {
      return NextResponse.json(
        { error: 'Either customerId or userId is required.' },
        { status: 400 },
      );
    }
    if (!body.templateKey && !body.body) {
      return NextResponse.json(
        { error: 'Either templateKey or body is required.' },
        { status: 400 },
      );
    }

    // Coerce channels into the allowed union.
    const allowed: Channel[] = ['email', 'sms', 'whatsapp', 'push', 'in_app'];
    const channels: Channel[] | undefined = Array.isArray(body.channels)
      ? (body.channels.filter((c: string) => allowed.includes(c as Channel)) as Channel[])
      : undefined;

    const result = await sendMessage({
      tenantId,
      customerId: body.customerId,
      userId: body.userId,
      channels: channels && channels.length > 0 ? channels : undefined,
      templateKey: body.templateKey,
      variables: body.variables ?? {},
      subject: body.subject,
      body: body.body,
      senderId: user.id,
      senderName: user.name || user.email,
      relatedEntityType: body.relatedEntityType,
      relatedEntityId: body.relatedEntityId,
      skipPreferenceCheck: !!body.skipPreferenceCheck,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send message';
    console.error('[/api/communication/send] error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
