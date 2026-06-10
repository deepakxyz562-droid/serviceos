import { db } from '@/lib/db';
import { getAuthUser, getAppUrl } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// DELETE /api/invitations/[id] — Cancel an invitation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    const invitation = await db.invitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Verify the invitation belongs to the same tenant
    if (invitation.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending invitations can be cancelled' },
        { status: 400 }
      );
    }

    // Update the invitation status to cancelled
    await db.invitation.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    return NextResponse.json({ success: true, message: 'Invitation cancelled' });
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    return NextResponse.json(
      { error: 'Failed to cancel invitation' },
      { status: 500 }
    );
  }
}

// POST /api/invitations/[id] — Resend an invitation (action=resend)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only owners and managers can resend invitations
    if (user.role !== 'owner' && user.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only owners and managers can resend invitations' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = body.action;

    if (action !== 'resend') {
      return NextResponse.json(
        { error: 'Invalid action. Supported actions: resend' },
        { status: 400 }
      );
    }

    const invitation = await db.invitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Verify the invitation belongs to the same tenant
    if (invitation.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Can only resend cancelled or expired invitations
    if (invitation.status !== 'cancelled' && invitation.status !== 'expired') {
      return NextResponse.json(
        { error: 'Only cancelled or expired invitations can be resent' },
        { status: 400 }
      );
    }

    // Generate a new token and reset expiration
    const newToken = crypto.randomBytes(32).toString('hex');
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const updatedInvitation = await db.invitation.update({
      where: { id },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
        status: 'pending',
        acceptedAt: null,
      },
      include: {
        invitedBy: {
          select: { id: true, name: true, email: true },
        },
        employee: {
          select: { id: true, name: true, phone: true, status: true },
        },
      },
    });

    // Build the invite URL
    const appUrl = getAppUrl();
    const inviteUrl = `${appUrl}/?invite=${newToken}`;

    return NextResponse.json({
      ...updatedInvitation,
      inviteUrl,
    });
  } catch (error) {
    console.error('Error resending invitation:', error);
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    );
  }
}
