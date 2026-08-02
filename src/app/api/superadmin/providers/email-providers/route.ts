import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { maskedConfigFromString, encodeProviderConfig } from '@/lib/email-providers';

/**
 * GET /api/superadmin/providers/email-providers
 * List all platform-level EmailProviders (isPlatform=true) for super admin.
 * Query params:
 *   - status: 'active' | 'paused' | 'error'
 *   - providerType: filter by provider type
 */
export async function GET(request: NextRequest) {
  try {
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const providerType = searchParams.get('providerType');
    const showAll = searchParams.get('showAll') === 'true';

    const where: Record<string, unknown> = {};
    if (!showAll) {
      where.isPlatform = true;
    }
    if (status && ['active', 'paused', 'error'].includes(status)) {
      where.status = status;
    }
    if (providerType) {
      where.providerType = providerType;
    }

    const providers = await db.emailProvider.findMany({
      where,
      orderBy: [{ isDefaultTransactional: 'desc' }, { createdAt: 'desc' }],
    });

    const masked = providers.map((p) => ({
      ...p,
      config: maskedConfigFromString(p.configJson),
      configJson: undefined,
    }));

    return NextResponse.json({ data: masked });
  } catch (error) {
    console.error('[SuperAdmin] Error fetching email providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email providers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/superadmin/providers/email-providers
 * Create a new platform-level EmailProvider.
 * Body: { name, providerType, configJson, fromName, fromEmail, replyTo?,
 *         usageType, isDefaultTransactional?, isDefaultMarketing?, tenantId? }
 * Super admin can specify tenantId (defaults to 'platform').
 * isPlatform is always true for super admin created providers.
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
      tenantId,
      status: reqStatus,
    } = body as Record<string, unknown>;

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const validProviderTypes = ['smtp', 'resend', 'sendgrid', 'ses', 'mailgun', 'postmark', 'brevo'];
    if (!providerType || typeof providerType !== 'string' || !validProviderTypes.includes(providerType)) {
      return NextResponse.json(
        { error: `providerType must be one of: ${validProviderTypes.join(', ')}` },
        { status: 400 }
      );
    }
    if (!fromName || typeof fromName !== 'string' || !fromName.trim()) {
      return NextResponse.json({ error: 'fromName is required' }, { status: 400 });
    }
    if (!fromEmail || typeof fromEmail !== 'string' || !fromEmail.trim()) {
      return NextResponse.json({ error: 'fromEmail is required' }, { status: 400 });
    }

    // If no tenantId specified, attach to the first real tenant (not a fake 'platform' string).
    // This ensures the provider is discoverable by resolveSmtpConfig when invoices,
    // invitations, etc. look for providers belonging to a real tenantId.
    let finalTenantId = typeof tenantId === 'string' && tenantId.trim() ? tenantId.trim() : undefined;
    if (!finalTenantId) {
      const firstTenant = await db.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
      finalTenantId = firstTenant?.id || 'platform';
    }
    const finalUsageType = typeof usageType === 'string' && ['transactional', 'marketing', 'both'].includes(usageType)
      ? usageType
      : 'both';
    const wantDefaultTransactional = Boolean(isDefaultTransactional);
    const wantDefaultMarketing = Boolean(isDefaultMarketing);
    const configString = encodeProviderConfig(configJson);

    const created = await db.$transaction(async (tx) => {
      if (wantDefaultTransactional) {
        await tx.emailProvider.updateMany({
          where: { tenantId: finalTenantId, isDefaultTransactional: true },
          data: { isDefaultTransactional: false },
        });
      }
      if (wantDefaultMarketing) {
        await tx.emailProvider.updateMany({
          where: { tenantId: finalTenantId, isDefaultMarketing: true },
          data: { isDefaultMarketing: false },
        });
      }

      return tx.emailProvider.create({
        data: {
          name: name.trim(),
          providerType,
          configJson: configString,
          fromName: fromName.trim(),
          fromEmail: fromEmail.trim(),
          replyTo: typeof replyTo === 'string' && replyTo.trim() ? replyTo.trim() : null,
          usageType: finalUsageType,
          isDefaultTransactional: wantDefaultTransactional,
          isDefaultMarketing: wantDefaultMarketing,
          isPlatform: true,
          status: (typeof reqStatus === 'string' && ['active', 'paused'].includes(reqStatus)) ? reqStatus : 'active',
          tenantId: finalTenantId,
          workspaceId: null,
        },
      });
    });

    return NextResponse.json(
      {
        ...created,
        config: maskedConfigFromString(created.configJson),
        configJson: undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[SuperAdmin] Error creating email provider:', error);
    return NextResponse.json(
      { error: 'Failed to create email provider' },
      { status: 500 }
    );
  }
}
