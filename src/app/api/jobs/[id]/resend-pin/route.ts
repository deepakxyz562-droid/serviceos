import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { canSeeJobVerificationPin } from '@/lib/auth/permissions';
import { notifyCustomerVerificationPin } from '@/lib/whatsapp-notifications';

/**
 * POST /api/jobs/[id]/resend-pin
 *
 * Re-sends the EXISTING verification PIN to the customer via the canonical
 * pipeline (SMS → WhatsApp → Email cascade). Does NOT generate a new PIN.
 *
 * Returns: { ok: true, channel: "sms" | "whatsapp" | "email" }
 * Does NOT return the PIN value (least-privilege — the user already saw it
 * in the Job Detail card if they have permission).
 *
 * Auth: requires authentication + canSeeJobVerificationPin role.
 *
 * Body (optional): { channel?: "sms" | "whatsapp" | "email" }
 * If channel is specified, only that channel is used. If omitted, the full
 * cascade runs.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!canSeeJobVerificationPin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const channel = body.channel as 'sms' | 'whatsapp' | 'email' | undefined;

    // Fetch the job with all fields the notification function needs
    const job = await db.job.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        jobNumber: true,
        verificationPin: true,
        customerName: true,
        customerPhone: true,
        customerEmail: true,
        customerId: true,
        assigneeName: true,
        scheduledAt: true,
        scheduledTime: true,
        workspaceId: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (!job.verificationPin) {
      return NextResponse.json(
        { error: 'This job has no verification PIN. Use Regenerate PIN to create one.' },
        { status: 400 }
      );
    }

    // Call the canonical pipeline with isResend: true
    await notifyCustomerVerificationPin(
      {
        id: job.id,
        title: job.title,
        jobNumber: job.jobNumber,
        verificationPin: job.verificationPin,
        customerName: job.customerName ?? undefined,
        customerPhone: job.customerPhone ?? undefined,
        customerEmail: job.customerEmail ?? undefined,
        customerId: job.customerId ?? undefined,
        assigneeName: job.assigneeName ?? undefined,
        scheduledAt: job.scheduledAt?.toISOString(),
        scheduledTime: job.scheduledTime ?? undefined,
        tenantId: job.workspaceId,
        workspaceId: job.workspaceId,
      },
      {
        channel,
        isResend: true,
        actorUserId: user.id,
      }
    );

    // Return ONLY { ok, channel } — NOT the PIN (least-privilege)
    return NextResponse.json({
      ok: true,
      channel: channel || 'sms', // if cascade ran, default to "sms" for the response
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to resend PIN';
    console.error('[resend-pin] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
