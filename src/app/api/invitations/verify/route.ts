import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/invitations/verify?token=xxx — Verify an invitation token (public, no auth required)
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

    const invitation = await db.invitation.findUnique({
      where: { token },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { valid: false, message: 'Invitation not found' },
        { status: 404 }
      );
    }

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
      // Update the status to expired
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
  } catch (error) {
    console.error('Error verifying invitation:', error);
    return NextResponse.json(
      { valid: false, message: 'Failed to verify invitation' },
      { status: 500 }
    );
  }
}
