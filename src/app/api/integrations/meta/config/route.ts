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
 * Resolve a public webhook URL for the tenant. Falls back to '' when the
 * app URL isn't configured.
 */
function resolveWebhookUrl(requestUrl: string): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) {
    return `${fromEnv.replace(/\/$/, '')}/api/integrations/meta/webhook`;
  }
  try {
    const url = new URL(requestUrl);
    return `${url.origin}/api/integrations/meta/webhook`;
  } catch {
    return '';
  }
}

/**
 * Shape returned by both GET and PUT — secrets are ALWAYS masked.
 */
function serializeConfig(
  config: {
    id: string;
    appId: string | null;
    appSecret: string | null;
    verifyToken: string | null;
    pageId: string | null;
    pageName: string | null;
    pageAccessToken: string | null;
    subscriptionVerified: boolean;
    autoCreateLeads: boolean;
  },
  webhookUrl: string
) {
  return {
    id: config.id,
    appId: config.appId,
    appSecret: maskSecret(config.appSecret),
    verifyToken: config.verifyToken,
    pageId: config.pageId,
    pageName: config.pageName,
    pageAccessToken: maskSecret(config.pageAccessToken),
    subscriptionVerified: config.subscriptionVerified,
    autoCreateLeads: config.autoCreateLeads,
    webhookUrl,
  };
}

/**
 * GET /api/integrations/meta/config
 * Returns the tenant's MetaLeadConfig. Secrets are masked; never returned raw.
 * If no config exists yet, returns empty defaults.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    const config = await db.metaLeadConfig.findUnique({ where: { tenantId } });
    const webhookUrl = resolveWebhookUrl(request.url);

    if (!config) {
      // Empty defaults — no record exists yet.
      return NextResponse.json({
        id: null,
        appId: null,
        appSecret: null,
        verifyToken: null,
        pageId: null,
        pageName: null,
        pageAccessToken: null,
        subscriptionVerified: false,
        autoCreateLeads: true,
        webhookUrl,
      });
    }

    return NextResponse.json(serializeConfig(config, webhookUrl));
  } catch (error) {
    console.error('Error fetching Meta lead config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Meta lead config' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/integrations/meta/config
 * Body: { appId, appSecret, verifyToken, pageId, pageName, pageAccessToken, autoCreateLeads }
 * Upserts the tenant's MetaLeadConfig. Secret preservation:
 *   - If appSecret / pageAccessToken is the mask string ("••••••") or empty,
 *     PRESERVE the existing stored value (don't overwrite with the mask).
 *   - Only update when a real new value is provided.
 * After upsert, subscriptionVerified is reset to false — it will be re-verified
 * by Meta's webhook GET call.
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
      appId,
      appSecret,
      verifyToken,
      pageId,
      pageName,
      pageAccessToken,
      autoCreateLeads,
    } = body as Record<string, unknown>;

    // Load the existing config so we can preserve secrets when the caller
    // sends the mask placeholder back (or sends an empty value).
    const existing = await db.metaLeadConfig.findUnique({ where: { tenantId } });

    const isMaskOrEmpty = (v: unknown): boolean =>
      v === SECRET_MASK ||
      v === null ||
      v === undefined ||
      (typeof v === 'string' && v.trim() === '');

    const resolvedAppSecret =
      isMaskOrEmpty(appSecret) && existing
        ? existing.appSecret
        : typeof appSecret === 'string'
        ? appSecret
        : null;

    const resolvedPageAccessToken =
      isMaskOrEmpty(pageAccessToken) && existing
        ? existing.pageAccessToken
        : typeof pageAccessToken === 'string'
        ? pageAccessToken
        : null;

    const data = {
      appId:
        typeof appId === 'string' && appId.trim() ? appId.trim() : null,
      appSecret: resolvedAppSecret,
      verifyToken:
        typeof verifyToken === 'string' && verifyToken.trim()
          ? verifyToken.trim()
          : null,
      pageId:
        typeof pageId === 'string' && pageId.trim() ? pageId.trim() : null,
      pageName:
        typeof pageName === 'string' && pageName.trim()
          ? pageName.trim()
          : null,
      pageAccessToken: resolvedPageAccessToken,
      autoCreateLeads:
        typeof autoCreateLeads === 'boolean' ? autoCreateLeads : true,
      // Reset verification — caller must re-trigger Meta's subscription
      // verification flow (Meta will GET /webhook?hub.mode=subscribe...).
      subscriptionVerified: false,
    };

    const config = await db.metaLeadConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...data,
      },
      update: data,
    });

    const webhookUrl = resolveWebhookUrl(request.url);
    return NextResponse.json(serializeConfig(config, webhookUrl));
  } catch (error) {
    console.error('Error saving Meta lead config:', error);
    return NextResponse.json(
      { error: 'Failed to save Meta lead config' },
      { status: 500 }
    );
  }
}
