import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/invitations/verify?token=xxx
// Verify an invitation/activation token (public, no auth required).
//
// Supports TWO token sources:
//   1. The Invitation table (employee/admin invitations + password resets
//      created via /api/auth/request-reset or /api/employees/[id]/invite).
//   2. The Customer.activationToken field (customer portal invitations created
//      via /api/customers/[id]/portal/{enable,resend}).
//
// Without #2, customer activation links always 404 here because the token is
// never written to the Invitation table.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { valid: false, message: 'Invitation token is required' },
        { status: 400 }
      );
    }

    // ── 1. Try the Invitation table first ────────────────────────────────
    const invitation = await db.invitation.findUnique({
      where: { token },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (invitation) {
      // Check if the invitation has already been used
      if (invitation.status !== 'pending') {
        const statusMessages: Record<string, string> = {
          accepted: 'This invitation has already been accepted',
          cancelled: 'This invitation has been cancelled',
          expired: 'This invitation has expired',
        };
        return NextResponse.json({
          valid: false,
          message: statusMessages[invitation.status] || 'This invitation is no longer valid',
        });
      }

      // Check if the invitation has expired
      if (invitation.expiresAt < new Date()) {
        await db.invitation.update({
          where: { id: invitation.id },
          data: { status: 'expired' },
        });

        return NextResponse.json({
          valid: false,
          message: 'This invitation has expired',
        });
      }

      return NextResponse.json({
        valid: true,
        invitation: {
          email: invitation.email,
          name: invitation.name,
          role: invitation.role,
          tenantName: invitation.tenant?.name,
          tenantSlug: invitation.tenant?.slug,
        },
      });
    }

    // ── 2. Fall back to Customer.activationToken ─────────────────────────
    // Customer portal invitations store the token directly on the Customer
    // record (not in the Invitation table), so we look it up here.
    const customer = await db.customer.findFirst({
      where: { activationToken: token },
      include: {
        workspace: {
          include: {
            tenant: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });

    if (customer) {
      // Check expiry
      if (
        customer.activationTokenExpiresAt &&
        customer.activationTokenExpiresAt < new Date()
      ) {
        return NextResponse.json({
          valid: false,
          message: 'This activation link has expired. Please request a new one.',
        });
      }

      // If already activated, the link is no longer valid for activation
      // (but we still allow password-reset reuse if status is 'accepted').
      if (customer.activatedAt && customer.invitationStatus === 'accepted') {
        return NextResponse.json({
          valid: false,
          message:
            'This activation link has already been used. You can sign in, or request a password reset.',
        });
      }

      const tenantSlug = customer.workspace?.tenant?.slug || null;
      const tenantName = customer.workspace?.tenant?.name || null;

      return NextResponse.json({
        valid: true,
        invitation: {
          email: customer.email || customer.phone || '',
          name: customer.name,
          role: 'customer',
          isCustomer: true,
          tenantName,
          tenantSlug,
        },
      });
    }

    // ── 3. No match in either source ────────────────────────────────────
    return NextResponse.json(
      { valid: false, message: 'Invitation not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error verifying invitation:', error);
    return NextResponse.json(
      { valid: false, message: 'Failed to verify invitation' },
      { status: 500 }
    );
  }
}
