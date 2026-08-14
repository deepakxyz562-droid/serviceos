import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { maskedConfigFromString, encodeProviderConfig } from '@/lib/email-providers';
import { resolveFallbackTenantId } from '@/lib/tenant-resolver';

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

    // ─── Issues 2+3+4: Tenants now get full config (masked) for their OWN
    // providers so they can edit/test/delete them. Platform-shared providers
    // (isPlatform=true) created by the superadmin still return an empty
    // config to tenants — they can see the provider exists but can't see
    // the superadmin's credentials. Superadmins see masked config for
    // everything (including platform providers).
    const masked = providers.map((p) => {
      const base = {
        id: p.id,
        name: p.name,
        providerType: p.providerType,
        status: p.status,
        usageType: p.usageType,
        isPlatform: p.isPlatform,
        isDefaultTransactional: p.isDefaultTransactional,
        isDefaultMarketing: p.isDefaultMarketing,
        fromName: p.fromName,
        fromEmail: p.fromEmail,
        replyTo: p.replyTo,
        createdAt: p.createdAt,
      };
      // Platform-shared providers: tenants see no config details.
      // Tenant-owned providers: tenants see masked config (secrets hidden).
      // Superadmins: always see masked config.
      if (!isSuperAdmin && p.isPlatform) {
        return { ...base, config: {}, configJson: undefined };
      }
      return {
        ...base,
        config: maskedConfigFromString(p.configJson),
        configJson: undefined,
      };
    });

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
    // ─── Issues 2+3+4: Email provider config is TENANT-ACCESSIBLE ──────
    // Tenants MUST be able to configure their own email provider (SMTP,
    // Resend, SendGrid, SES, etc.) for campaigns. The previous superadmin-
    // only gate made campaigns impossible because the CampaignProviderGate
    // requires a tenant-owned email provider. All 3 channels (Email, SMS,
    // WhatsApp) now follow the same rule: if the tenant has added their
    // own credentials → working; otherwise → hidden/disabled in the UI.
    //
    // Super admins (tenantId=null) can still create platform-shared
    // providers (isPlatform=true) that all tenants can see but that don't
    // count toward the campaign gate.
    const isSuperAdmin = user.isSuperAdmin || !user.tenantId;
    let tenantId = user.tenantId;
    if (!tenantId && isSuperAdmin) {
      // Super admin creating a provider — if isPlatform, attach to first tenant;
      // otherwise require the tenant to be specified in the body or use first tenant.
      // Never use 'default' as a fake tenantId — it breaks provider resolution.
      // C-2C + cache: use shared cached helper to avoid 10s timeout on every request.
      tenantId = (await resolveFallbackTenantId(user)) || 'platform';
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
