import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getAuthUser } from '@/lib/auth';
import { verifyHandoffTicket } from '@/lib/bgos-mobile-auth';
import { resolveWhatsAppConfig, WHATSAPP_API_VERSION } from '@/lib/whatsapp-config';
import { db } from '@/lib/db';

function maskString(value: string): string {
  if (!value || value.length <= 4) return value ? '****' : '';
  return '****' + value.slice(-4);
}

/**
 * GET - Return current WhatsApp configuration status, live metadata & QR standee URL
 * Resolves from DB: tenant's own → platform (SuperAdmin) → .env fallback
 */
export async function GET(request: NextRequest) {
  try {
    let tenantId: string | undefined;
    try {
      const { searchParams } = new URL(request.url);
      tenantId = searchParams.get('tenantId') || undefined;
      if (!tenantId) {
        const ticket = searchParams.get('ticket');
        if (ticket) {
          const verified = verifyHandoffTicket(ticket);
          if (verified?.tenantId) tenantId = verified.tenantId;
        }
      }
    } catch { /* no query context */ }

    if (!tenantId) {
      const authUser = await getAuthUser(request).catch(() => null);
      if (authUser?.tenantId) {
        tenantId = authUser.tenantId;
      }
    }

    const config = await resolveWhatsAppConfig(tenantId);
    const configured = Boolean(
      config.accessToken &&
      config.phoneNumberId &&
      config.source === 'tenant-own',
    );
    const phoneDigits = configured
      ? (config.displayPhoneNumber || '').replace(/\D/g, '')
      : '';
    const waMeUrl = phoneDigits ? `https://wa.me/${phoneDigits}` : null;
    const qrCodeDataUrl = waMeUrl
      ? await QRCode.toDataURL(waMeUrl, { margin: 2, width: 320 }).catch(() => null)
      : null;

    let googleMapsWhatsappUrl: string | null = null;
    let googleMapsWhatsappSynced = false;
    let googleMapsWhatsappWarnings: string[] = [];
    if (tenantId) {
      const tenantRow = await db.tenant
        .findUnique({ where: { id: tenantId }, select: { settingsJson: true } })
        .catch(() => null);
      if (tenantRow?.settingsJson) {
        try {
          const s = JSON.parse(tenantRow.settingsJson) as Record<string, any>;
          googleMapsWhatsappUrl = s?.googlePlaceActions?.whatsappUri || s?.whatsappChatLink || null;
          googleMapsWhatsappSynced = Boolean(s?.googlePlaceActions?.whatsappSyncedToGoogle);
          if (Array.isArray(s?.googlePlaceActions?.whatsappWarnings)) {
            googleMapsWhatsappWarnings = s.googlePlaceActions.whatsappWarnings.filter(
              (w: unknown) => typeof w === 'string',
            );
          }
        } catch {}
      }
    }

    const embeddedConfigId = (
      process.env.NEXT_PUBLIC_WHATSAPP_EMBEDDED_CONFIG_ID ||
      process.env.WHATSAPP_EMBEDDED_CONFIG_ID ||
      ''
    ).trim();
    const metaAppId = (
      process.env.NEXT_PUBLIC_META_APP_ID ||
      process.env.META_APP_ID ||
      process.env.FACEBOOK_APP_ID ||
      ''
    ).trim();

    return NextResponse.json({
      isConfigured: configured,
      mode: configured ? 'live' : 'not_connected',
      platformGatewayAvailable: config.source === 'platform' || config.source === 'env',
      phoneNumberId: configured ? maskString(config.phoneNumberId) : '',
      source: config.source || 'none',
      displayPhoneNumber: configured ? config.displayPhoneNumber || null : null,
      verifiedName: configured ? config.verifiedName || null : null,
      nameStatus: configured ? config.nameStatus || null : null,
      messagingLimitTier: configured ? config.messagingLimitTier || null : null,
      qualityRating: configured ? config.qualityRating || null : null,
      coexistenceMode: configured ? Boolean(config.coexistenceMode) : false,
      waMeUrl,
      qrCodeDataUrl,
      googleMapsWhatsappUrl,
      googleMapsWhatsappSynced,
      googleMapsWhatsappWarnings,
      embeddedConfigId: embeddedConfigId || null,
      metaAppId: metaAppId || null,
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://fieseros.com'}/api/whatsapp/callback`,
      apiVersion: WHATSAPP_API_VERSION,
      verifyTokenSet: !!config.verifyToken && config.verifyToken !== 'fieseros_verify_token',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to read WhatsApp config';
    console.error('WhatsApp config GET error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT - Validate WhatsApp configuration against Meta Graph API
 * Actual config saving is done via /api/whatsapp/manual-config or /api/whatsapp/embedded-signup.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, phoneNumberId } = body;

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json({ error: 'Access token and phone number ID are required' }, { status: 400 });
    }

    let validated = false;
    let validationError: string | undefined;
    let verifiedName: string | undefined;
    let displayPhoneNumber: string | undefined;

    try {
      const testUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}?fields=id,verified_name,display_phone_number,quality_rating`;
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        const phoneMeta = await response.json().catch(() => ({}));
        validated = true;
        verifiedName = phoneMeta.verified_name;
        displayPhoneNumber = phoneMeta.display_phone_number;
      } else {
        const errorData = await response.json().catch(() => ({}));
        validationError = errorData?.error?.message || `API returned status ${response.status}`;
      }
    } catch (err) {
      validationError = err instanceof Error ? err.message : 'Network error during validation';
    }

    return NextResponse.json({
      success: validated,
      validated,
      verifiedName,
      displayPhoneNumber,
      error: validated ? undefined : validationError,
      message: validated
        ? 'WhatsApp configuration validated. Save it via Connect or Manual Setup.'
        : validationError || 'Validation failed. Please check your credentials.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to validate WhatsApp config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE - Clear WhatsApp configuration (reset to demo mode)
 */
export async function DELETE() {
  return NextResponse.json({
    success: true,
    mode: 'demo',
    message: 'To fully reset WhatsApp config, remove the WhatsApp CommunicationProvider from the database or disable it in Communication Providers settings.',
  });
}
