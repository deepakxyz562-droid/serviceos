import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * Tenant-owned WhatsApp (Meta Cloud API) configuration.
 *
 * Stores credentials in `Tenant.whatsappConfigJson` (a String column with a
 * default of "{}"). This is the BYO ("bring your own") layer — it sits ABOVE
 * the platform-wide / SuperAdmin-configured WhatsApp provider resolved by
 * `resolveWhatsAppConfig()` in `src/lib/whatsapp-config.ts`.
 *
 * Security:
 *   - GET masks the access token (last 4 chars only)
 *   - PUT preserves the existing token when the client sends the masked
 *     placeholder back (so the user can edit other fields without re-entering
 *     the token every time)
 *   - Only owners / admins may write
 */

interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  verifyToken: string;
  apiVersion: string;
  webhookVerified: boolean;
}

const DEFAULT_CONFIG: WhatsAppConfig = {
  accessToken: '',
  phoneNumberId: '',
  businessAccountId: '',
  verifyToken: '',
  apiVersion: 'v21.0',
  webhookVerified: false,
};

const API_VERSIONS = ['v18.0', 'v19.0', 'v20.0', 'v21.0'] as const;

/** Mask a sensitive string, showing only the last 4 characters. */
function maskToken(value: string): string {
  if (!value) return '';
  if (value.length <= 4) return '****';
  return '****' + value.slice(-4);
}

/** True when a string looks like the masked placeholder returned by GET. */
function isMaskedPlaceholder(value: string | undefined | null): boolean {
  return !value || value.startsWith('****');
}

function parseConfig(json: string | null | undefined): WhatsAppConfig {
  if (!json) return { ...DEFAULT_CONFIG };
  try {
    const parsed = JSON.parse(json) as Partial<WhatsAppConfig>;
    return {
      accessToken: parsed.accessToken ?? '',
      phoneNumberId: parsed.phoneNumberId ?? '',
      businessAccountId: parsed.businessAccountId ?? '',
      verifyToken: parsed.verifyToken ?? '',
      apiVersion: parsed.apiVersion ?? DEFAULT_CONFIG.apiVersion,
      webhookVerified: parsed.webhookVerified ?? false,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * GET /api/settings/whatsapp
 * Returns the tenant's WhatsApp configuration with the access token masked.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!user.tenantId) {
      // Super-admin / no-tenant session — return the demo defaults so the
      // settings UI can still render.
      return NextResponse.json({
        mode: 'demo',
        connected: false,
        config: {
          accessToken: '',
          accessTokenMasked: false,
          phoneNumberId: '',
          businessAccountId: '',
          verifyToken: '',
          apiVersion: DEFAULT_CONFIG.apiVersion,
          webhookVerified: false,
        },
        whatsappPhone: '',
      });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { whatsappConfigJson: true, whatsappPhone: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const config = parseConfig(tenant.whatsappConfigJson);
    const connected = !!(config.accessToken && config.phoneNumberId);
    const mode = connected ? 'connected' : 'demo';

    return NextResponse.json({
      mode,
      connected,
      config: {
        accessToken: maskToken(config.accessToken),
        accessTokenMasked: !!config.accessToken,
        phoneNumberId: config.phoneNumberId,
        businessAccountId: config.businessAccountId,
        verifyToken: config.verifyToken,
        apiVersion: config.apiVersion || DEFAULT_CONFIG.apiVersion,
        webhookVerified: config.webhookVerified,
      },
      whatsappPhone: tenant.whatsappPhone || '',
    });
  } catch (error) {
    console.error('WhatsApp settings GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch WhatsApp settings' }, { status: 500 });
  }
}

/**
 * PUT /api/settings/whatsapp
 * Body: Partial<WhatsAppConfig> (any subset of the 6 fields).
 *
 * If `accessToken` is omitted or equals the masked placeholder, the existing
 * token is preserved. This lets the user edit the phone number ID / verify
 * token / etc. without re-pasting their Meta access token every time.
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }
    if (user.role !== 'owner' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only owners and admins can update WhatsApp settings' },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Partial<WhatsAppConfig>;
    const {
      accessToken,
      phoneNumberId,
      businessAccountId,
      verifyToken,
      apiVersion,
      webhookVerified,
    } = body;

    // Load the existing config so we can preserve the access token when the
    // client re-submits the masked placeholder.
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { whatsappConfigJson: true },
    });
    const existing = parseConfig(tenant?.whatsappConfigJson);

    // ── Resolve access token ──────────────────────────────────────────
    // Masked / empty → keep existing. Otherwise, use the new value.
    const finalAccessToken = isMaskedPlaceholder(accessToken)
      ? existing.accessToken
      : (accessToken ?? '').trim();

    // ── Resolve remaining fields (fall back to existing values) ──────
    const finalPhoneNumberId =
      phoneNumberId === undefined ? existing.phoneNumberId : phoneNumberId.trim();
    const finalBusinessAccountId =
      businessAccountId === undefined ? existing.businessAccountId : businessAccountId.trim();
    const finalVerifyToken =
      verifyToken === undefined ? existing.verifyToken : verifyToken.trim();

    const finalApiVersion =
      apiVersion && (API_VERSIONS as readonly string[]).includes(apiVersion)
        ? apiVersion
        : existing.apiVersion || DEFAULT_CONFIG.apiVersion;

    const finalWebhookVerified =
      typeof webhookVerified === 'boolean' ? webhookVerified : existing.webhookVerified;

    // ── Validate ──────────────────────────────────────────────────────
    // If an access token is set, a phone number ID is required.
    if (finalAccessToken && !finalPhoneNumberId) {
      return NextResponse.json(
        { error: 'Phone Number ID is required when an Access Token is set.' },
        { status: 400 },
      );
    }

    const newConfig: WhatsAppConfig = {
      accessToken: finalAccessToken,
      phoneNumberId: finalPhoneNumberId,
      businessAccountId: finalBusinessAccountId,
      verifyToken: finalVerifyToken,
      apiVersion: finalApiVersion,
      webhookVerified: finalWebhookVerified,
    };

    await db.tenant.update({
      where: { id: user.tenantId },
      data: { whatsappConfigJson: JSON.stringify(newConfig) },
    });

    const connected = !!(newConfig.accessToken && newConfig.phoneNumberId);

    return NextResponse.json({
      success: true,
      mode: connected ? 'connected' : 'demo',
      connected,
      config: {
        accessToken: maskToken(newConfig.accessToken),
        accessTokenMasked: !!newConfig.accessToken,
        phoneNumberId: newConfig.phoneNumberId,
        businessAccountId: newConfig.businessAccountId,
        verifyToken: newConfig.verifyToken,
        apiVersion: newConfig.apiVersion,
        webhookVerified: newConfig.webhookVerified,
      },
    });
  } catch (error) {
    console.error('WhatsApp settings PUT error:', error);
    return NextResponse.json({ error: 'Failed to update WhatsApp settings' }, { status: 500 });
  }
}
