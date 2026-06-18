import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import {
  maskedConfigFromString,
  encodeProviderConfig,
  mergeConfigForUpdate,
} from '@/lib/email-providers';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/email-providers/[id]
 * Fetch one provider. Sensitive config fields are masked.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';
    const { id } = await params;

    const provider = await db.emailProvider.findFirst({
      where: { id, tenantId },
    });
    if (!provider) {
      return NextResponse.json(
        { error: 'Email provider not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...provider,
      config: maskedConfigFromString(provider.configJson),
      configJson: undefined,
    });
  } catch (error) {
    console.error('Error fetching email provider:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email provider' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/email-providers/[id]
 * Update a provider. Accepts the same field set as POST.
 * When isDefaultTransactional or isDefaultMarketing is being set to true,
 * unset that flag on all other providers for the tenant first (transactional).
 * Sensitive fields arriving as the mask string ('••••••••') preserve the
 * previously stored value (see mergeConfigForUpdate).
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';
    const { id } = await params;

    const existing = await db.emailProvider.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Email provider not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      providerType,
      configJson,
      fromName,
      fromEmail,
      replyTo,
      usageType,
      isDefaultTransactional,
      isDefaultMarketing,
      isPlatform,
    } = body as Record<string, unknown>;

    const validProviderTypes = [
      'smtp',
      'resend',
      'sendgrid',
      'ses',
      'mailgun',
      'postmark',
      'brevo',
    ];

    // Build update data — only set fields that were provided.
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
      }
      updateData.name = name.trim();
    }
    if (providerType !== undefined) {
      if (
        typeof providerType !== 'string' ||
        !validProviderTypes.includes(providerType)
      ) {
        return NextResponse.json(
          { error: `providerType must be one of: ${validProviderTypes.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.providerType = providerType;
    }
    if (fromName !== undefined) {
      if (typeof fromName !== 'string' || !fromName.trim()) {
        return NextResponse.json({ error: 'fromName cannot be empty' }, { status: 400 });
      }
      updateData.fromName = fromName.trim();
    }
    if (fromEmail !== undefined) {
      if (typeof fromEmail !== 'string' || !fromEmail.trim()) {
        return NextResponse.json({ error: 'fromEmail cannot be empty' }, { status: 400 });
      }
      updateData.fromEmail = fromEmail.trim();
    }
    if (replyTo !== undefined) {
      updateData.replyTo =
        typeof replyTo === 'string' && replyTo.trim() ? replyTo.trim() : null;
    }
    if (usageType !== undefined) {
      if (
        typeof usageType !== 'string' ||
        !['transactional', 'marketing', 'both'].includes(usageType)
      ) {
        return NextResponse.json(
          { error: 'usageType must be one of: transactional, marketing, both' },
          { status: 400 }
        );
      }
      updateData.usageType = usageType;
    }
    if (isPlatform !== undefined) {
      updateData.isPlatform = Boolean(isPlatform);
    }

    // Handle configJson — accept object, string, or undefined.
    // If a partial config object was sent, merge with existing (preserving secrets).
    if (configJson !== undefined && configJson !== null) {
      if (typeof configJson === 'object') {
        updateData.configJson = mergeConfigForUpdate(
          existing.configJson,
          configJson as Record<string, unknown>
        );
      } else if (typeof configJson === 'string') {
        // Treat as a full replacement (must parse). Caller is responsible for
        // sending the complete config in this form.
        updateData.configJson = encodeProviderConfig(configJson);
      }
    }

    const wantDefaultTransactional =
      isDefaultTransactional === undefined
        ? undefined
        : Boolean(isDefaultTransactional);
    const wantDefaultMarketing =
      isDefaultMarketing === undefined
        ? undefined
        : Boolean(isDefaultMarketing);

    const updated = await db.$transaction(async (tx) => {
      // Swap defaults: unset on others first, then set on this one.
      if (wantDefaultTransactional === true) {
        await tx.emailProvider.updateMany({
          where: {
            tenantId,
            isDefaultTransactional: true,
            NOT: { id },
          },
          data: { isDefaultTransactional: false },
        });
      }
      if (wantDefaultMarketing === true) {
        await tx.emailProvider.updateMany({
          where: {
            tenantId,
            isDefaultMarketing: true,
            NOT: { id },
          },
          data: { isDefaultMarketing: false },
        });
      }

      if (wantDefaultTransactional !== undefined) {
        updateData.isDefaultTransactional = wantDefaultTransactional;
      }
      if (wantDefaultMarketing !== undefined) {
        updateData.isDefaultMarketing = wantDefaultMarketing;
      }

      return tx.emailProvider.update({
        where: { id },
        data: updateData,
      });
    });

    return NextResponse.json({
      ...updated,
      config: maskedConfigFromString(updated.configJson),
      configJson: undefined,
    });
  } catch (error) {
    console.error('Error updating email provider:', error);
    return NextResponse.json(
      { error: 'Failed to update email provider' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/email-providers/[id]
 * Delete a provider.
 *  - Cannot delete the last remaining provider for the tenant (return 400).
 *  - If the deleted provider was a default, return a warning in the response.
 * Returns 200.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';
    const { id } = await params;

    const existing = await db.emailProvider.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Email provider not found' },
        { status: 404 }
      );
    }

    // Count remaining providers for this tenant (excluding the one to delete).
    const remaining = await db.emailProvider.count({
      where: { tenantId, NOT: { id } },
    });
    if (remaining === 0) {
      return NextResponse.json(
        { error: 'Cannot delete the last remaining email provider' },
        { status: 400 }
      );
    }

    await db.emailProvider.delete({ where: { id } });

    const wasDefault =
      existing.isDefaultTransactional || existing.isDefaultMarketing;

    return NextResponse.json({
      success: true,
      id,
      warning: wasDefault
        ? 'Deleted provider was a default — please assign a new default for the affected usage type.'
        : undefined,
    });
  } catch (error) {
    console.error('Error deleting email provider:', error);
    return NextResponse.json(
      { error: 'Failed to delete email provider' },
      { status: 500 }
    );
  }
}
