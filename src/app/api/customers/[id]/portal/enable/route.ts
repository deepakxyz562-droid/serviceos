import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, getAppUrl } from '@/lib/auth';
import crypto from 'crypto';

/**
 * POST /api/customers/[id]/portal/enable
 *
 * Enable portal access for a customer who previously had it disabled (or never had it).
 * Generates an activation token + Invitation row + invite URL.
 * The customer must set their password via the link before they can log in.
 *
 * This is idempotent: calling again on an already-enabled customer regenerates the link.
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
    if (!['owner', 'admin', 'manager'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can enable portal access' },
        { status: 403 }
      );
    }

    const { id: customerId } = await params;

    const customer = await db.customer.findUnique({
      where: { id: customerId },
      include: { workspace: { select: { id: true, tenantId: true } } },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (!customer.email) {
      return NextResponse.json(
        { error: 'Customer must have an email to enable portal access' },
        { status: 400 }
      );
    }

    // Invalidate prior pending invitations
    await db.invitation.updateMany({
      where: { customerId, status: 'pending' },
      data: { status: 'cancelled' },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await db.invitation.create({
      data: {
        token,
        email: customer.email,
        name: customer.name,
        role: 'customer',
        phone: customer.phone,
        status: 'pending',
        invitedById: user.id,
        tenantId: customer.workspace?.tenantId || user.tenantId,
        workspaceId: customer.workspaceId || user.workspaceId,
        customerId,
        expiresAt,
      },
    });

    await db.customer.update({
      where: { id: customerId },
      data: {
        portalEnabled: true,
        invitationStatus: 'pending',
        activationToken: token,
        activationTokenExpiresAt: expiresAt,
        invitationSentAt: new Date(),
      },
    });

    const tenant = await db.tenant.findUnique({
      where: { id: invitation.tenantId || undefined },
      select: { slug: true, name: true },
    });

    const appUrl = getAppUrl();
    const slug = tenant?.slug || 'default';
    const inviteUrl = `${appUrl}/${slug}/accept-invite?token=${token}`;

    return NextResponse.json({
      success: true,
      inviteUrl,
      expiresAt: expiresAt.toISOString(),
      alreadyActivated: !!customer.passwordHash && !!customer.activatedAt,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        portalEnabled: true,
        invitationStatus: 'pending',
      },
      company: { name: tenant?.name, slug: tenant?.slug },
    });
  } catch (error) {
    console.error('[Customer Portal Enable Error]', error);
    return NextResponse.json(
      { error: 'Failed to enable customer portal' },
      { status: 500 }
    );
  }
}
