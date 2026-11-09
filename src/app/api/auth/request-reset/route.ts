import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAppUrl } from '@/lib/auth';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email-send';
import { passwordResetLimiter, applyRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { isBgosContext, sendBgosPasswordResetEmail } from '@/lib/emails/bgos/sender';
import {
  isSyntheticPlaceholderEmail,
  renderFieserosPasswordResetEmail,
  resolveBgosBaseUrl,
} from '@/lib/emails/bgos/templates';

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

    if (isSyntheticPlaceholderEmail(normalizedEmail)) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists for that email, a reset link has been sent.',
      });
    }

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
    let employeeId: string | null = null;
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
        employeeId = employee.id;
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
        employeeId,
        expiresAt,
      },
    });

    const reqHost = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').toLowerCase();
    const bgosCtx = await isBgosContext({ tenantId, workspaceId });
    const isBgos = !isCustomer && (body?.product === 'bgos' || reqHost.includes('bgos.') || bgosCtx.isBgos);

    const proto = request.headers.get('x-forwarded-proto') || (reqHost.startsWith('localhost') ? 'http' : 'https');
    const appUrl = isBgos
      ? resolveBgosBaseUrl(reqHost ? `${proto}://${reqHost}` : null)
      : getAppUrl(request);
    const resolvedSlug = encodeURIComponent(tenant?.slug || 'default');
    const resetUrl = `${appUrl}/${resolvedSlug}/accept-invite?token=${token}&mode=reset${isBgos ? '&product=bgos' : ''}`;

    if (isBgos) {
      const outcome = await sendBgosPasswordResetEmail({
        to: normalizedEmail,
        ownerName: entity.name,
        businessName: tenant?.name || null,
        resetUrl,
        appUrl,
        tenantId: tenantId || null,
      }).catch((err) => ({ sent: false, skipped: false, error: err instanceof Error ? err.message : 'send_failed' }));
      if (!outcome.sent && !outcome.skipped) {
        console.error('[Request Reset] BGOS password reset delivery failed:', outcome.error);
      }
    } else {
      const rendered = renderFieserosPasswordResetEmail({
        ownerName: entity.name,
        businessName: tenant?.name || null,
        resetUrl,
        appUrl,
      });
      const delivery = await sendEmail({
        to: normalizedEmail,
        usageType: 'transactional',
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        skipTenantQuota: true,
      }).catch(() => ({ success: false, simulated: false }));
      if (!delivery.success || delivery.simulated) {
        // Keep the public response independent of whether the address exists.
        // Operations must monitor provider failures; never return a reset token.
        console.error('[Request Reset] Transactional email delivery unavailable');
      }
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
