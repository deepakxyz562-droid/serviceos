import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { emailProviderToSmtpConfig } from '@/lib/email-send';

/**
 * GET /api/email-providers/diagnostic
 *
 * Diagnostic endpoint for troubleshooting email provider resolution.
 * Only accessible by super admins.
 *
 * Returns:
 *  - All email providers in the DB (with masked config)
 *  - Whether each provider has valid SMTP config
 *  - resolveSmtpConfig simulation for transactional usage
 *
 * NOTE: Email providers are managed entirely through the SuperAdmin UI
 * (Settings → Providers). No .env SMTP variables are used.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = user.isSuperAdmin || !user.tenantId;
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    // 1. Check all email providers in the DB
    const allProviders = await db.emailProvider.findMany({
      orderBy: [{ isDefaultTransactional: 'desc' }, { updatedAt: 'desc' }],
    }) as Array<{
      id: string;
      name: string;
      providerType: string;
      fromEmail: string;
      fromName: string;
      usageType: string;
      isDefaultTransactional: boolean;
      isDefaultMarketing: boolean;
      isPlatform: boolean;
      status: string;
      tenantId: string;
      configJson: string;
      createdAt: string;
      updatedAt: string;
    }>;

    // 2. Check if each provider has valid config
    const isRedacted = (v: unknown): boolean =>
      v == null || (typeof v === 'string' && (v.includes('[REDACTED') || v.trim() === ''));

    const providersWithStatus = allProviders.map(p => {
      let configParsed: Record<string, unknown> = {};
      try { configParsed = JSON.parse(p.configJson || '{}'); } catch {}

      // Use emailProviderToSmtpConfig to check if the provider is valid
      const hasValidConfig = emailProviderToSmtpConfig(p) !== null;

      // Mask sensitive fields
      const maskedConfig: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(configParsed)) {
        if (key.toLowerCase().includes('pass') || key.toLowerCase().includes('key')) {
          maskedConfig[key] = typeof value === 'string' && value.length > 4
            ? `${value.substring(0, 4)}***`
            : value ? '***' : 'EMPTY';
        } else if (isRedacted(value)) {
          maskedConfig[key] = 'REDACTED';
        } else {
          maskedConfig[key] = value;
        }
      }

      // Identify what's missing for invalid providers
      const issues: string[] = [];
      const cfgSmtpUser = configParsed.smtpUser as string | undefined;
      const cfgSmtpPass = configParsed.smtpPass as string | undefined;
      const cfgSmtpHost = configParsed.smtpHost as string | undefined;
      const cfgApiKey = configParsed.apiKey as string | undefined;

      if (!hasValidConfig) {
        if (!cfgSmtpHost && !['resend', 'sendgrid', 'mailgun', 'postmark', 'brevo'].includes(p.providerType)) {
          issues.push('smtpHost is missing');
        }
        if (!cfgSmtpUser && !cfgApiKey) {
          issues.push('smtpUser/apiKey is missing or redacted');
        }
        if (!cfgSmtpPass && !cfgApiKey) {
          issues.push('smtpPass/apiKey is missing or redacted');
        }
        if (p.providerType === 'mailgun' && !configParsed.domain) {
          issues.push('domain is required for Mailgun');
        }
      }

      return {
        id: p.id,
        name: p.name,
        providerType: p.providerType,
        fromEmail: p.fromEmail,
        fromName: p.fromName,
        usageType: p.usageType,
        isDefaultTransactional: p.isDefaultTransactional,
        isDefaultMarketing: p.isDefaultMarketing,
        isPlatform: p.isPlatform,
        status: p.status,
        tenantId: p.tenantId,
        configValid: hasValidConfig,
        issues: issues.length > 0 ? issues : undefined,
        configKeys: Object.keys(configParsed),
        maskedConfig,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    // 3. Check tenant count
    const tenantCount = await db.tenant.count();

    // 4. Simulate resolution for each tenant
    const resolutionSimulation = [];
    if (tenantCount > 0) {
      const tenants = await db.tenant.findMany({ select: { id: true, name: true } }) as Array<{ id: string; name: string }>;
      for (const tenant of tenants.slice(0, 5)) {
        const defaultTxPlatformTenant = await db.emailProvider.findFirst({
          where: { status: 'active', isDefaultTransactional: true, isPlatform: true, tenantId: tenant.id },
          orderBy: { updatedAt: 'desc' },
        }) as { id: string; name: string; fromEmail: string } | null;

        const defaultTxTenant = await db.emailProvider.findFirst({
          where: { status: 'active', isDefaultTransactional: true, tenantId: tenant.id },
          orderBy: [{ isPlatform: 'desc' }, { updatedAt: 'desc' }],
        }) as { id: string; name: string; fromEmail: string } | null;

        const anyActiveTenant = await db.emailProvider.findFirst({
          where: { status: 'active', tenantId: tenant.id },
          orderBy: [{ isDefaultTransactional: 'desc' }, { isPlatform: 'desc' }, { updatedAt: 'desc' }],
        }) as { id: string; name: string; fromEmail: string } | null;

        resolutionSimulation.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          '3a:defaultTx+platform+tenant': defaultTxPlatformTenant ? `${defaultTxPlatformTenant.name} (${defaultTxPlatformTenant.fromEmail})` : null,
          '3b:defaultTx+tenant': defaultTxTenant ? `${defaultTxTenant.name} (${defaultTxTenant.fromEmail})` : null,
          '3c3:anyActive+tenant': anyActiveTenant ? `${anyActiveTenant.name} (${anyActiveTenant.fromEmail})` : null,
        });
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      totalProviders: allProviders.length,
      providersWithValidConfig: providersWithStatus.filter(p => p.configValid).length,
      providersWithInvalidConfig: providersWithStatus.filter(p => !p.configValid).length,
      providers: providersWithStatus,
      resolutionSimulation,
      tenantCount,
      note: 'Email providers are managed through SuperAdmin → Settings → Providers. No .env SMTP variables are used.',
    });
  } catch (error) {
    console.error('[email-providers/diagnostic] Error:', error);
    return NextResponse.json(
      { error: 'Diagnostic failed', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/email-providers/diagnostic
 *
 * Actions:
 *  - validate: Test if a specific provider's SMTP config works by sending a test email
 *  - set-default-tx: Set a provider as the default transactional provider
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const isSuperAdmin = user.isSuperAdmin || !user.tenantId;
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const action = body.action as string | undefined;

    if (action === 'set-default-tx') {
      // Set a provider as the default transactional provider
      const providerId = body.providerId as string | undefined;
      if (!providerId) {
        return NextResponse.json({ error: 'providerId is required for set-default-tx action' }, { status: 400 });
      }

      const provider = await db.emailProvider.findUnique({ where: { id: providerId } });
      if (!provider) {
        return NextResponse.json({ error: `Provider ${providerId} not found` }, { status: 404 });
      }

      // Validate the provider has working config
      const config = emailProviderToSmtpConfig(provider);
      if (!config) {
        return NextResponse.json({
          success: false,
          error: 'This provider has invalid SMTP configuration. Fix the provider credentials first.',
        }, { status: 400 });
      }

      // Update: unset other defaults for this tenant, then set this one
      await db.$transaction(async (tx) => {
        await tx.emailProvider.updateMany({
          where: { tenantId: provider.tenantId, isDefaultTransactional: true },
          data: { isDefaultTransactional: false },
        });
        await tx.emailProvider.update({
          where: { id: providerId },
          data: { isDefaultTransactional: true },
        });
      });

      return NextResponse.json({
        success: true,
        action: 'set-default-tx',
        providerId: provider.id,
        providerName: provider.name,
        message: `Provider "${provider.name}" is now the default transactional provider. Invoice emails will use this provider.`,
      });
    }

    return NextResponse.json({ error: 'action must be "set-default-tx"' }, { status: 400 });
  } catch (error) {
    console.error('[email-providers/diagnostic] POST error:', error);
    return NextResponse.json(
      { error: 'Action failed', details: String(error) },
      { status: 500 }
    );
  }
}
