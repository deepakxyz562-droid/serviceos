import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * POST /api/email-providers/default
 * Auto-repair: ensure every tenant with active providers has a default
 * transactional and/or marketing provider. This fixes providers that were
 * created before the auto-default logic was added.
 * Body: {} (no params needed)
 *
 * For each tenant that has active providers but no default transactional
 * provider, the most recently updated active provider with usageType
 * 'transactional' or 'both' is promoted. Same for marketing.
 */
export async function POST() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    const providers = await db.emailProvider.findMany({
      where: { tenantId, status: 'active' },
      orderBy: { updatedAt: 'desc' },
    });

    const hasDefaultTransactional = providers.some(p => p.isDefaultTransactional);
    const hasDefaultMarketing = providers.some(p => p.isDefaultMarketing);

    const fixed: string[] = [];

    // Auto-set default transactional
    if (!hasDefaultTransactional) {
      const candidate = providers.find(p =>
        p.usageType === 'transactional' || p.usageType === 'both'
      ) || providers[0]; // fallback to any active provider
      if (candidate) {
        await db.emailProvider.update({
          where: { id: candidate.id },
          data: { isDefaultTransactional: true },
        });
        fixed.push(`transactional: ${candidate.name} (${candidate.id})`);
      }
    }

    // Auto-set default marketing
    if (!hasDefaultMarketing) {
      const candidate = providers.find(p =>
        p.usageType === 'marketing' || p.usageType === 'both'
      );
      if (candidate) {
        await db.emailProvider.update({
          where: { id: candidate.id },
          data: { isDefaultMarketing: true },
        });
        fixed.push(`marketing: ${candidate.name} (${candidate.id})`);
      }
    }

    return NextResponse.json({
      success: true,
      tenantId,
      hadDefaultTransactional: hasDefaultTransactional,
      hadDefaultMarketing: hasDefaultMarketing,
      fixed,
    });
  } catch (error) {
    console.error('Error auto-repairing email provider defaults:', error);
    return NextResponse.json(
      { error: 'Failed to auto-repair defaults' },
      { status: 500 }
    );
  }
}

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
