import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { canSeeJobVerificationPin } from '@/lib/auth/permissions';
import { regenerateJobPin } from '@/lib/pin';
import { notifyCustomerVerificationPin } from '@/lib/whatsapp-notifications';

/**
 * POST /api/jobs/[id]/regenerate-pin
 *
 * Generates a NEW 4-digit verification PIN, immediately invalidating the old
 * one. Then sends the new PIN to the customer via the canonical pipeline.
 *
 * Returns: { ok: true, pin: "0427" }
 * The new PIN IS returned because the caller is authorized (canSeeJobVerificationPin).
 *
 * Auth: requires authentication + canSeeJobVerificationPin role.
 *
 * Body: { confirm: true }
 * The `confirm: true` flag prevents accidental regeneration. The UI must show
 * a confirmation dialog before calling this endpoint.
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
    if (body.confirm !== true) {
      return NextResponse.json(
        { error: 'Confirmation required. Pass { confirm: true } to regenerate the PIN.' },
        { status: 400 }
      );
    }

    // Fetch the job (need customer details for the notification)
    const job = await db.job.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        jobNumber: true,
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

    // Regenerate the PIN (invalidates old one, audit-logs the event)
    const newPin = await regenerateJobPin(id, user.id);

    // Send the new PIN to the customer via the canonical pipeline
    await notifyCustomerVerificationPin(
      {
        ...job,
        verificationPin: newPin,
        scheduledAt: job.scheduledAt?.toISOString(),
        tenantId: job.workspaceId,
      },
      {
        isResend: false, // this is a NEW PIN, not a resend
        actorUserId: user.id,
      }
    );

    // Return the new PIN — the user is authorized to see it
    return NextResponse.json({
      ok: true,
      pin: newPin,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to regenerate PIN';
    console.error('[regenerate-pin] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
