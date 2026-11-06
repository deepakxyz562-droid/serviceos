import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/calls/convert
 * Converts a logged call into a full CRM lead.
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

    const call = await db.aiCall.findFirst({
      where: { id: callId, tenantId: auth.tenantId },
    });

    if (!call) {
      return NextResponse.json({ error: 'Call record not found' }, { status: 404 });
    }

    // If already converted, return existing lead
    if (call.leadId) {
      const existingLead = await db.lead.findUnique({
        where: { id: call.leadId },
      });
      return NextResponse.json({
        success: true,
        alreadyConverted: true,
        lead: existingLead,
      });
    }

    const phone = call.customerPhone || call.fromNumber || call.toNumber || 'Unknown';
    const name = (body.name || '').trim() || `Caller ${phone.slice(-4)}`;
    const value = parseFloat(body.value || '0') || 0;
    const notesText = body.notes || call.summary || `Converted from ${call.callType} call (${call.durationSec}s)`;

    const initialNotes = [
      {
        author: auth.name || 'User',
        text: notesText,
        createdAt: new Date().toISOString(),
      },
    ];

    const lead = await db.lead.create({
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

    await db.aiCall.update({
      where: { id: call.id },
      data: {
        leadId: lead.id,
        outcomeType: 'lead_created',
      },
    });

    return NextResponse.json({
      success: true,
      lead,
    });
  } catch (error) {
    console.error('[Calls Convert POST]', error);
    return NextResponse.json({ error: 'Failed to convert call to lead' }, { status: 500 });
  }
}
