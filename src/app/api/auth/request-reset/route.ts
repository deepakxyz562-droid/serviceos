import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAppUrl } from '@/lib/auth';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email-send';
import { passwordResetLimiter, applyRateLimit, rateLimitResponse } from '@/lib/rate-limit';

/**
 * POST /api/auth/request-reset
 *
 * Public endpoint: request a password-reset link by email.
 * Generates a reset token and sends the existing invitation-based recovery link
 * using the platform transactional email provider. Never returns the token.
 *
 * Body: { email, slug? }
 *
 * Security: always returns 200 even if email not found (prevents email enumeration).
 */
export async function POST(request: NextRequest) {
  const rateLimited = applyRateLimit(passwordResetLimiter, request);
  if (rateLimited) return rateLimitResponse(rateLimited.resetAtMs);

  try {
    const body = await request.json();
    const { email } = body;

    if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // Try to find a User (admin/employee) by email
    const userAccount = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true, role: true, tenantId: true, workspaceId: true, isActive: true },
    });

    // Try to find a Customer with portal enabled by email
    const customer = !userAccount
      ? await db.customer.findFirst({
          where: { email: normalizedEmail, portalEnabled: true },
          include: { workspace: { select: { id: true, tenantId: true } } },
        })
      : null;

    if ((!userAccount && !customer) || (userAccount && !userAccount.isActive)) {
      // Don't reveal whether the email exists — return success anyway
      return NextResponse.json({
        success: true,
        message: 'If an account exists for that email, a reset link has been sent.',
      });
    }

    const entity = userAccount || customer!;
    const isCustomer = !!customer;
    const tenantId = isCustomer
      ? customer!.workspace?.tenantId
      : userAccount!.tenantId;
    const workspaceId = isCustomer
      ? customer!.workspaceId
      : userAccount!.workspaceId;

    const tenant = tenantId
      ? await db.tenant.findUnique({ where: { id: tenantId }, select: { slug: true, name: true } })
      : null;

    // Invalidate prior tokens for this entity
    if (isCustomer) {
      await db.invitation.updateMany({
        where: { customerId: customer!.id, status: 'pending' },
        data: { status: 'cancelled' },
      });
    } else {
      const employee = await db.employee.findFirst({
        where: { userId: userAccount!.id },
        select: { id: true },
      });
      if (employee) {
        await db.invitation.updateMany({
          where: { employeeId: employee.id, status: 'pending' },
          data: { status: 'cancelled' },
        });
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h for reset

    await db.invitation.create({
      data: {
        token,
        email: normalizedEmail,
        name: entity.name,
        role: isCustomer ? 'customer' : (userAccount!.role || 'employee'),
        phone: isCustomer ? customer!.phone : null,
        status: 'pending',
        tenantId: tenantId || null,
        workspaceId: workspaceId || null,
        customerId: isCustomer ? customer!.id : null,
        employeeId: !isCustomer
          ? (await db.employee.findFirst({ where: { userId: userAccount!.id }, select: { id: true } }))?.id || null
          : null,
        expiresAt,
      },
    });

    const appUrl = getAppUrl();
    const resolvedSlug = encodeURIComponent(tenant?.slug || 'default');
    const resetUrl = `${appUrl}/${resolvedSlug}/accept-invite?token=${token}&mode=reset`;

    const delivery = await sendEmail({ to: normalizedEmail, usageType: 'transactional',
      subject: 'Reset your password', text: `Use this link to reset your password: ${resetUrl}\n\nThis link expires in 24 hours. If you did not request it, you can ignore this email.` }).catch(() => ({ success: false, simulated: false }));
    if (!delivery.success || delivery.simulated) {
      // Keep the public response independent of whether the address exists.
      // Operations must monitor provider failures; never return a reset token.
      console.error('[Request Reset] Transactional email delivery unavailable');
    }
    return NextResponse.json({
      success: true,
      message: 'If an account exists for that email, a reset link has been sent.',
    });
  } catch (error) {
    console.error('[Request Reset Error]', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}
