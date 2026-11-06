import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/calls/convert
 * Atomically converts a logged call into a full CRM lead.
 * Uses a database transaction to prevent duplicate leads under concurrent requests.
 *
 * Body:
 *   - callId: string (required)
 *   - name: string (optional customer name)
 *   - value: number (optional estimated deal value)
 *   - notes: string (optional follow-up notes)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const callId = body.callId;
    if (!callId) {
      return NextResponse.json({ error: 'callId is required' }, { status: 400 });
    }

    // Execute atomically inside a transaction
    const result = await db.$transaction(async (tx) => {
      // 1. Fetch the target call record
      const call = await tx.aiCall.findFirst({
        where: { id: callId, tenantId: auth.tenantId },
      });

      if (!call) {
        return { error: 'Call record not found', status: 404 };
      }

      // 2. Idempotency check: If already converted, return existing lead
      if (call.leadId) {
        const existingLead = await tx.lead.findUnique({
          where: { id: call.leadId },
        });
        return {
          success: true,
          alreadyConverted: true,
          lead: existingLead,
          status: 200,
        };
      }

      // 3. Prepare lead details
      const phone = call.customerPhone || call.fromNumber || call.toNumber || 'Unknown';
      const name = (body.name || '').trim() || `Caller ${phone.slice(-4)}`;
      const value = parseFloat(body.value || '0') || 0;
      const notesText =
        body.notes || call.summary || `Converted from ${call.callType} call (${call.durationSec}s)`;

      const initialNotes = [
        {
          author: auth.name || 'User',
          text: notesText,
          createdAt: new Date().toISOString(),
        },
      ];

      // 4. Create lead atomically
      const lead = await tx.lead.create({
        data: {
          tenantId: auth.tenantId,
          name,
          phone,
          source: 'phone_call',
          status: 'new',
          value,
          description: `Call duration: ${call.durationSec}s · ${call.callType}`,
          notesJson: JSON.stringify(initialNotes),
        },
      });

      // 5. Link lead ID to call record
      await tx.aiCall.update({
        where: { id: call.id },
        data: {
          leadId: lead.id,
          outcomeType: 'lead_created',
        },
      });

      return {
        success: true,
        alreadyConverted: false,
        lead,
        status: 200,
      };
    });

    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result, { status: result.status });
  } catch (error) {
    console.error('[Calls Convert POST]', error);
    return NextResponse.json({ error: 'Failed to convert call to lead' }, { status: 500 });
  }
}
