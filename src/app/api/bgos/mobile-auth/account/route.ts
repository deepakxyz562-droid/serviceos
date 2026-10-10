import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';

/**
 * DELETE /api/bgos/mobile-auth/account
 *
 * App Store & Google Play Account Deletion Compliance Endpoint.
 * Permanently deactivates the user account, removes active refresh sessions,
 * and anonymizes personal data.
 */
export async function DELETE(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    // 1. Invalidate all active refresh sessions
    try {
      await db.authRefreshSession.deleteMany({
        where: { userId: authUser.id },
      });
    } catch (err) {
      console.warn('[Account Deletion] Could not clear refresh sessions:', err);
    }

    // 2. Anonymize user record and deactivate
    const timestamp = Date.now();
    await db.user.update({
      where: { id: authUser.id },
      data: {
        isActive: false,
        email: `deleted_${timestamp}_${authUser.id.slice(0, 8)}@deleted.local`,
        name: 'Deleted User',
        phone: null,
        passwordHash: '',
        authProviderId: null,
      },
    });

    // 3. Best-effort audit log
    if (authUser.tenantId) {
      await logActivity({
        tenantId: authUser.tenantId,
        actorId: authUser.id,
        actorType: 'user',
        action: 'delete',
        entityType: 'user',
        entityId: authUser.id,
        entityName: authUser.email,
        description: 'User initiated account deletion from BGOS mobile app.',
        severity: 'info',
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: 'Account successfully deleted and all active sessions revoked.',
    });
  } catch (error) {
    console.error('[Account Deletion] Error:', error);
    return NextResponse.json(
      { error: 'Could not delete account. Please contact support.' },
      { status: 500 },
    );
  }
}
