import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { sendEmail } from '@/lib/email-send';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/email-providers/[id]/test
 * Send a test email using this provider to a specified address.
 * Body: { to: string }
 *
 * - Uses sendEmail() from @/lib/email-send with providerId: id so the SMTP
 *   config is resolved from this EmailProvider row.
 * - Updates the provider's lastTestAt, lastTestStatus, and lastTestError
 *   fields based on the send result.
 * - Returns { success, messageId?, error?, providerUsed }.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';
    const { id } = await params;

    // Verify provider exists and belongs to this tenant.
    const provider = await db.emailProvider.findFirst({
      where: { id, tenantId },
    });
    if (!provider) {
      return NextResponse.json(
        { error: 'Email provider not found' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { to } = body as Record<string, unknown>;
    if (typeof to !== 'string' || !to.trim()) {
      return NextResponse.json(
        { error: 'to is required and must be a valid email address' },
        { status: 400 }
      );
    }

    const recipient = to.trim();
    const subject = `[ServiceOS Test] Provider test — ${provider.name}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #059669; margin-bottom: 8px;">Email Provider Test</h2>
        <p style="color: #374151; line-height: 1.6;">
          This is a test email sent from the <strong>${provider.name}</strong>
          email provider (${provider.providerType}).
        </p>
        <p style="color: #6b7280; line-height: 1.6; font-size: 14px;">
          If you're reading this, the SMTP/API configuration is working
          correctly. You can now use this provider for transactional and
          marketing emails.
        </p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
        <p style="color: #9ca3af; font-size: 12px;">
          Provider ID: ${provider.id}<br />
          Sent at: ${new Date().toISOString()}
        </p>
      </div>
    `.trim();

    const result = await sendEmail({
      to: recipient,
      subject,
      html,
      providerId: id,
    });

    // Update provider with the test result (best-effort, don't fail the
    // response if the stats update itself fails).
    try {
      await db.emailProvider.update({
        where: { id },
        data: {
          lastTestAt: new Date(),
          lastTestStatus: result.success ? 'success' : 'failed',
          lastTestError: result.success ? null : (result.error ?? null),
        },
      });
    } catch (statsErr) {
      console.error('Failed to update provider test stats:', statsErr);
    }

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      simulated: result.simulated,
      error: result.error,
      providerUsed: result.providerUsed,
    });
  } catch (error) {
    console.error('Error testing email provider:', error);
    return NextResponse.json(
      { error: 'Failed to test email provider' },
      { status: 500 }
    );
  }
}
