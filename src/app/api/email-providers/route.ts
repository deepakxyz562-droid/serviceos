import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { maskedConfigFromString, encodeProviderConfig } from '@/lib/email-providers';

/**
 * GET /api/email-providers
 * List EmailProviders for the current tenant.
 * Query params:
 *   - usageType: 'transactional' | 'marketing' | 'both'
 *   - status: 'active' | 'paused' | 'error'
 * Order: isDefaultTransactional desc, createdAt desc.
 * Sensitive fields in configJson are masked in the response.
 * Returns the array directly (not wrapped).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Super admins (tenantId=null) can see all providers;
    // tenant users see only their own tenant's providers + platform providers.
    const isSuperAdmin = user.isSuperAdmin || !user.tenantId;
    const tenantId = user.tenantId || undefined; // undefined = no tenant filter

    const { searchParams } = new URL(request.url);
    const usageType = searchParams.get('usageType');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = isSuperAdmin
      ? {}
      : { OR: [{ tenantId: user.tenantId! }, { isPlatform: true }] };
    if (usageType && ['transactional', 'marketing', 'both'].includes(usageType)) {
      where.usageType = usageType;
    }
    if (status && ['active', 'paused', 'error'].includes(status)) {
      where.status = status;
    }

    const providers = await db.emailProvider.findMany({
      where,
      orderBy: [{ isDefaultTransactional: 'desc' }, { createdAt: 'desc' }],
    });

    // Mask sensitive fields in each provider's configJson
    const masked = providers.map((p) => ({
      ...p,
      config: maskedConfigFromString(p.configJson),
      configJson: undefined,
    }));

    return NextResponse.json(masked);
  } catch (error) {
    console.error('Error fetching email providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email providers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/email-providers
 * Create a new EmailProvider for the current tenant.
 * Body:
 *   { name, providerType, configJson (object), fromName, fromEmail,
 *     replyTo?, usageType='both', isDefaultTransactional?, isDefaultMarketing?,
 *     isPlatform? }
 * When isDefaultTransactional=true is set, unset the same flag on all other
 * providers for this tenant first. Same for isDefaultMarketing.
 * Returns 201 with the created provider (config masked).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // For super admins without a tenantId, attach the provider to the first tenant
    // (or leave it as a cross-tenant platform provider if isPlatform=true).
    // Never use 'default' as a fake tenantId — it breaks provider resolution.
    const isSuperAdmin = user.isSuperAdmin || !user.tenantId;
    let tenantId = user.tenantId;
    if (!tenantId && !isSuperAdmin) {
      return NextResponse.json({ error: 'No tenant associated with your account' }, { status: 400 });
    }
    if (!tenantId && isSuperAdmin) {
      // Super admin creating a provider — if isPlatform, attach to first tenant;
      // otherwise require the tenant to be specified in the body or use first tenant.
      const firstTenant = await db.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
      tenantId = firstTenant?.id || 'platform';
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

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const validProviderTypes = [
      'smtp',
      'resend',
      'sendgrid',
      'ses',
      'mailgun',
      'postmark',
      'brevo',
    ];
    if (
      !providerType ||
      typeof providerType !== 'string' ||
      !validProviderTypes.includes(providerType)
    ) {
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

    const finalUsageType =
      typeof usageType === 'string' &&
      ['transactional', 'marketing', 'both'].includes(usageType)
        ? usageType
        : 'both';

    let wantDefaultTransactional = Boolean(isDefaultTransactional);
    let wantDefaultMarketing = Boolean(isDefaultMarketing);

    // Auto-set default flags if this is the first provider for the tenant.
    // When no other provider exists, the newly created one should become the
    // default for transactional (and marketing if usageType allows) so that
    // invoices, invitations, etc. can actually find a provider to use.
    const existingProviders = await db.emailProvider.findMany({
      where: { tenantId },
      select: { id: true, isDefaultTransactional: true, isDefaultMarketing: true },
    });
    const hasDefaultTransactional = existingProviders.some(p => p.isDefaultTransactional);
    const hasDefaultMarketing = existingProviders.some(p => p.isDefaultMarketing);

    // Auto-set as default transactional if:
    // - No existing default transactional provider AND
    // - The new provider is usable for transactional (usageType is 'transactional' or 'both')
    if (!hasDefaultTransactional && (finalUsageType === 'transactional' || finalUsageType === 'both')) {
      wantDefaultTransactional = true;
    }
    // Auto-set as default marketing if:
    // - No existing default marketing provider AND
    // - The new provider is usable for marketing (usageType is 'marketing' or 'both')
    if (!hasDefaultMarketing && (finalUsageType === 'marketing' || finalUsageType === 'both')) {
      wantDefaultMarketing = true;
    }

    const configString = encodeProviderConfig(configJson);

    // Multi-write: unset default flags on other providers, then create.
    const created = await db.$transaction(async (tx) => {
      if (wantDefaultTransactional) {
        await tx.emailProvider.updateMany({
          where: { tenantId, isDefaultTransactional: true },
          data: { isDefaultTransactional: false },
        });
      }
      if (wantDefaultMarketing) {
        await tx.emailProvider.updateMany({
          where: { tenantId, isDefaultMarketing: true },
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
          replyTo:
            typeof replyTo === 'string' && replyTo.trim()
              ? replyTo.trim()
              : null,
          usageType: finalUsageType,
          isDefaultTransactional: wantDefaultTransactional,
          isDefaultMarketing: wantDefaultMarketing,
          isPlatform: Boolean(isPlatform),
          status: 'active',
          tenantId,
          workspaceId: user.workspaceId || null,
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
    console.error('Error creating email provider:', error);
    return NextResponse.json(
      { error: 'Failed to create email provider' },
      { status: 500 }
    );
  }
}
