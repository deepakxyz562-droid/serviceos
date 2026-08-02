import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

const SECRET_MASK = '••••••';

/**
 * Mask a secret value for outbound responses. Returns the mask if a real
 * value is set, otherwise null.
 */
function maskSecret(value: string | null | undefined): string | null {
  return value && value.trim() ? SECRET_MASK : null;
}

/**
 * Shape returned by both GET and PUT — secrets are ALWAYS masked.
 */
function serializeConfig(config: {
  id: string;
  clientId: string | null;
  clientSecret: string | null;
  developerToken: string | null;
  refreshToken: string | null;
  loginCustomerId: string | null;
  accountName: string | null;
  autoCreateLeads: boolean;
  lastPollAt: Date | null;
}) {
  return {
    id: config.id,
    clientId: config.clientId,
    clientSecret: maskSecret(config.clientSecret),
    developerToken: maskSecret(config.developerToken),
    refreshToken: maskSecret(config.refreshToken),
    loginCustomerId: config.loginCustomerId,
    accountName: config.accountName,
    autoCreateLeads: config.autoCreateLeads,
    lastPollAt: config.lastPollAt,
  };
}

/**
 * GET /api/integrations/google-ads/config
 * Returns the tenant's GoogleAdsLeadConfig. Secrets are masked; never
 * returned raw. If no config exists yet, returns empty defaults.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    const config = await db.googleAdsLeadConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      // Empty defaults — no record exists yet.
      return NextResponse.json({
        id: null,
        clientId: null,
        clientSecret: null,
        developerToken: null,
        refreshToken: null,
        loginCustomerId: null,
        accountName: null,
        autoCreateLeads: true,
        lastPollAt: null,
      });
    }

    return NextResponse.json(serializeConfig(config));
  } catch (error) {
    console.error('Error fetching Google Ads lead config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Google Ads lead config' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/integrations/google-ads/config
 * Body: { clientId, clientSecret, developerToken, refreshToken, loginCustomerId, accountName, autoCreateLeads }
 * Upserts the tenant's GoogleAdsLeadConfig. Secret preservation:
 *   - If clientSecret / developerToken / refreshToken is the mask string
 *     ("••••••") or empty/null, PRESERVE the existing stored value.
 *   - Only update when a real new value is provided.
 * Returns the masked config (same shape as GET).
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    const body = await request.json();
    const {
      clientId,
      clientSecret,
      developerToken,
      refreshToken,
      loginCustomerId,
      accountName,
      autoCreateLeads,
    } = body as Record<string, unknown>;

    // Load the existing config so we can preserve secrets when the caller
    // sends the mask placeholder back (or sends an empty value).
    const existing = await db.googleAdsLeadConfig.findUnique({
      where: { tenantId },
    });

    const isMaskOrEmpty = (v: unknown): boolean =>
      v === SECRET_MASK ||
      v === null ||
      v === undefined ||
      (typeof v === 'string' && v.trim() === '');

    const resolveSecret = (
      incoming: unknown,
      stored: string | null | undefined
    ): string | null => {
      if (isMaskOrEmpty(incoming) && existing) {
        return stored ?? null;
      }
      if (typeof incoming === 'string' && incoming.trim()) {
        return incoming.trim();
      }
      return null;
    };

    const resolvedClientSecret = resolveSecret(
      clientSecret,
      existing?.clientSecret
    );
    const resolvedDeveloperToken = resolveSecret(
      developerToken,
      existing?.developerToken
    );
    const resolvedRefreshToken = resolveSecret(
      refreshToken,
      existing?.refreshToken
    );

    const data = {
      clientId:
        typeof clientId === 'string' && clientId.trim()
          ? clientId.trim()
          : null,
      clientSecret: resolvedClientSecret,
      developerToken: resolvedDeveloperToken,
      refreshToken: resolvedRefreshToken,
      loginCustomerId:
        typeof loginCustomerId === 'string' && loginCustomerId.trim()
          ? loginCustomerId.trim()
          : null,
      accountName:
        typeof accountName === 'string' && accountName.trim()
          ? accountName.trim()
          : null,
      autoCreateLeads:
        typeof autoCreateLeads === 'boolean' ? autoCreateLeads : true,
    };

    const config = await db.googleAdsLeadConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...data,
      },
      update: data,
    });

    return NextResponse.json(serializeConfig(config));
  } catch (error) {
    console.error('Error saving Google Ads lead config:', error);
    return NextResponse.json(
      { error: 'Failed to save Google Ads lead config' },
      { status: 500 }
    );
  }
}
