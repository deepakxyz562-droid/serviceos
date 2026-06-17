import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, getAppUrl } from '@/lib/auth';
import crypto from 'crypto';

/**
 * POST /api/customers/[id]/invite
 *
 * Owner / Admin generates (or regenerates) a portal invitation magic link for
 * a customer. The customer will use this link to set their password and
 * activate their portal account (no password sharing, no Customer ID).
 *
 * Flow:
 *   1. Owner clicks "Send Portal Invitation" on a customer record.
 *   2. This endpoint generates an activation token + URL.
 *   3. The frontend shows the link (with a copy button) so the owner can
 *      email/WhatsApp it to the customer. In production, this would also send
 *      an actual email/SMS via a notification provider.
 *
 * Returns:
 *   {
 *     success: true,
 *     inviteUrl: string,         // full magic link to send to the customer
 *     expiresAt: string,         // ISO timestamp
 *     customer: { id, name, email, phone },
 *     alreadyActivated: boolean  // true if customer already set their password
 *   }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only owners, managers and admins can send invitations
    if (!['owner', 'manager', 'admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can send portal invitations' },
        { status: 403 }
      );
    }

    const { id: customerId } = await params;

    const customer = await db.customer.findUnique({
      where: { id: customerId },
      include: {
        workspace: {
          include: { tenant: true },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Optional: enforce that the customer belongs to the caller's tenant
    // (SuperAdmin can invite anyone)
    if (
      user.role !== 'super_admin' &&
      customer.workspace?.tenantId &&
      user.tenantId &&
      customer.workspace.tenantId !== user.tenantId
    ) {
      return NextResponse.json(
        { error: 'You can only invite customers in your own company' },
        { status: 403 }
      );
    }

    // Require an email to send an invitation — we'll still allow phone-only
    // customers to be invited via a phone-based magic link, but email is the
    // primary channel for the modern invitation flow.
    const alreadyActivated = !!customer.passwordHash && !!customer.activatedAt;

    // Generate a fresh token (invalidates any previous one)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.customer.update({
      where: { id: customer.id },
      data: {
        activationToken: token,
        activationTokenExpiresAt: expiresAt,
        invitationSentAt: new Date(),
      },
    });

    const appUrl = getAppUrl();
    // Use a query-param-based activation URL on the main `/` route so we
    // don't need a separate page route. The page.tsx will detect ?activate=TOKEN
    // and render the activation component.
    const inviteUrl = `${appUrl}/?activate=${token}`;

    return NextResponse.json({
      success: true,
      inviteUrl,
      expiresAt: expiresAt.toISOString(),
      alreadyActivated,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email || null,
        phone: customer.phone,
      },
      company: {
        name: customer.workspace?.tenant?.name || customer.workspace?.name || null,
        slug: customer.workspace?.tenant?.slug || customer.workspace?.slug || null,
      },
    });
  } catch (error) {
    console.error('[Customer Invite Error]', error);
    return NextResponse.json(
      { error: 'Failed to generate portal invitation' },
      { status: 500 }
    );
  }
}
