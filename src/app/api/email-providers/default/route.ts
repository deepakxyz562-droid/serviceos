import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * PUT /api/email-providers/default
 * Set a provider as the default for a usage type.
 * Body: { id: string, usageType: 'transactional' | 'marketing' }
 *
 * Unsets the corresponding default flag on all other providers for the tenant,
 * then sets it on the requested one. Uses a Prisma transaction.
 * Returns 200.
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    const body = await request.json();
    const { id, usageType } = body as Record<string, unknown>;

    if (typeof id !== 'string' || !id.trim()) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }
    if (
      typeof usageType !== 'string' ||
      !['transactional', 'marketing'].includes(usageType)
    ) {
      return NextResponse.json(
        { error: 'usageType must be one of: transactional, marketing' },
        { status: 400 }
      );
    }

    // Verify the target provider belongs to this tenant.
    const provider = await db.emailProvider.findFirst({
      where: { id, tenantId },
    });
    if (!provider) {
      return NextResponse.json(
        { error: 'Email provider not found' },
        { status: 404 }
      );
    }

    const flagField =
      usageType === 'transactional' ? 'isDefaultTransactional' : 'isDefaultMarketing';

    await db.$transaction(async (tx) => {
      // Unset the flag on every other provider in this tenant.
      await tx.emailProvider.updateMany({
        where: {
          tenantId,
          [flagField]: true,
          NOT: { id },
        },
        data: { [flagField]: false },
      });

      // Set the flag on the requested provider.
      await tx.emailProvider.update({
        where: { id },
        data: { [flagField]: true },
      });
    });

    const updated = await db.emailProvider.findUnique({ where: { id } });

    return NextResponse.json({
      success: true,
      id,
      usageType,
      isDefaultTransactional: updated?.isDefaultTransactional ?? false,
      isDefaultMarketing: updated?.isDefaultMarketing ?? false,
    });
  } catch (error) {
    console.error('Error setting default email provider:', error);
    return NextResponse.json(
      { error: 'Failed to set default email provider' },
      { status: 500 }
    );
  }
}
