import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import {
  maskedConfigFromString,
  encodeProviderConfig,
  mergeConfigForUpdate,
} from '@/lib/email-providers';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/superadmin/providers/email-providers/[id]
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { id } = await params;

    const provider = await db.emailProvider.findUnique({ where: { id } });
    if (!provider) {
      return NextResponse.json({ error: 'Email provider not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...provider,
      config: maskedConfigFromString(provider.configJson),
      configJson: undefined,
    });
  } catch (error) {
    console.error('[SuperAdmin] Error fetching email provider:', error);
    return NextResponse.json({ error: 'Failed to fetch email provider' }, { status: 500 });
  }
}

/**
 * PUT /api/superadmin/providers/email-providers/[id]
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { id } = await params;

    const existing = await db.emailProvider.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Email provider not found' }, { status: 404 });
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
      status: reqStatus,
    } = body as Record<string, unknown>;

    const validProviderTypes = ['smtp', 'resend', 'sendgrid', 'ses', 'mailgun', 'postmark', 'brevo'];

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
      }
      updateData.name = name.trim();
    }
    if (providerType !== undefined) {
      if (typeof providerType !== 'string' || !validProviderTypes.includes(providerType)) {
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
      updateData.replyTo = typeof replyTo === 'string' && replyTo.trim() ? replyTo.trim() : null;
    }
    if (usageType !== undefined) {
      if (typeof usageType !== 'string' || !['transactional', 'marketing', 'both'].includes(usageType)) {
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
    if (reqStatus !== undefined) {
      if (typeof reqStatus === 'string' && ['active', 'paused', 'error'].includes(reqStatus)) {
        updateData.status = reqStatus;
      }
    }

    // Handle configJson merge
    if (configJson !== undefined && configJson !== null) {
      if (typeof configJson === 'object') {
        updateData.configJson = mergeConfigForUpdate(
          existing.configJson,
          configJson as Record<string, unknown>
        );
      } else if (typeof configJson === 'string') {
        updateData.configJson = encodeProviderConfig(configJson);
      }
    }

    const wantDefaultTransactional = isDefaultTransactional === undefined ? undefined : Boolean(isDefaultTransactional);
    const wantDefaultMarketing = isDefaultMarketing === undefined ? undefined : Boolean(isDefaultMarketing);

    const updated = await db.$transaction(async (tx) => {
      if (wantDefaultTransactional === true) {
        await tx.emailProvider.updateMany({
          where: { tenantId: existing.tenantId, isDefaultTransactional: true, NOT: { id } },
          data: { isDefaultTransactional: false },
        });
      }
      if (wantDefaultMarketing === true) {
        await tx.emailProvider.updateMany({
          where: { tenantId: existing.tenantId, isDefaultMarketing: true, NOT: { id } },
          data: { isDefaultMarketing: false },
        });
      }
      if (wantDefaultTransactional !== undefined) updateData.isDefaultTransactional = wantDefaultTransactional;
      if (wantDefaultMarketing !== undefined) updateData.isDefaultMarketing = wantDefaultMarketing;

      return tx.emailProvider.update({ where: { id }, data: updateData });
    });

    return NextResponse.json({
      ...updated,
      config: maskedConfigFromString(updated.configJson),
      configJson: undefined,
    });
  } catch (error) {
    console.error('[SuperAdmin] Error updating email provider:', error);
    return NextResponse.json({ error: 'Failed to update email provider' }, { status: 500 });
  }
}

/**
 * DELETE /api/superadmin/providers/email-providers/[id]
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { id } = await params;

    const existing = await db.emailProvider.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Email provider not found' }, { status: 404 });
    }

    await db.emailProvider.delete({ where: { id } });

    const wasDefault = existing.isDefaultTransactional || existing.isDefaultMarketing;
    return NextResponse.json({
      success: true,
      id,
      warning: wasDefault
        ? 'Deleted provider was a default — please assign a new default for the affected usage type.'
        : undefined,
    });
  } catch (error) {
    console.error('[SuperAdmin] Error deleting email provider:', error);
    return NextResponse.json({ error: 'Failed to delete email provider' }, { status: 500 });
  }
}
