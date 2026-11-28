import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getAuthUser } from '@/lib/auth';
import { verifyHandoffTicket } from '@/lib/bgos-mobile-auth';
import { resolveWhatsAppConfig, WHATSAPP_API_VERSION } from '@/lib/whatsapp-config';
import { normalizeWhatsAppDigits, resolveCountryCode } from '@/lib/bgos-business-sanitizers';
import { db } from '@/lib/db';
import { fetchMetaAccountActivationSnapshot } from '@/lib/whatsapp/activation';
import { syncTenantWhatsAppIdentity } from '@/lib/whatsapp/identity-sync';

function maskString(value: string): string {
  if (!value || value.length <= 4) return value ? '****' : '';
  return '****' + value.slice(-4);
}

type CallerAuth =
  | { ok: true; userId: string; tenantId: string }
  | { ok: false; status: 401 | 403; error: string };

async function resolveWhatsAppConfigCaller(request: NextRequest): Promise<CallerAuth> {
  const authUser = await getAuthUser(request).catch(() => null);
  if (authUser?.id) {
    if (authUser.role === 'customer') {
      return { ok: false, status: 403, error: 'Business account required' };
    }
    if (!authUser.tenantId) {
      return { ok: false, status: 401, error: 'Unauthorized' };
    }
    return { ok: true, userId: authUser.id, tenantId: authUser.tenantId };
  }

  try {
    const ticket = new URL(request.url).searchParams.get('ticket');
    if (ticket) {
      const verified = verifyHandoffTicket(ticket);
      if (verified?.userId && verified?.tenantId) {
        if (verified.role === 'customer') {
          return { ok: false, status: 403, error: 'Business account required' };
        }
        return { ok: true, userId: verified.userId, tenantId: verified.tenantId };
      }
    }
  } catch {
    // Ignore malformed request URL
  }

  return { ok: false, status: 401, error: 'Unauthorized' };
}

/**
 * GET - Return current WhatsApp configuration status, live metadata & QR standee URL
 * Resolves from DB: tenant's own → platform (SuperAdmin) → .env fallback
 */
export async function GET(request: NextRequest) {
  try {
    const caller = await resolveWhatsAppConfigCaller(request);
    if (!caller.ok) {
      return NextResponse.json({ error: caller.error }, { status: caller.status });
    }
    const tenantId = caller.tenantId;

    let config = await resolveWhatsAppConfig(tenantId);
    const shouldRefreshPending =
      new URL(request.url).searchParams.get('refresh') === '1';

    if (
      shouldRefreshPending &&
      config.pendingProvider?.accessToken &&
      (config.pendingProvider.wabaId || config.pendingProvider.phoneNumberId)
    ) {
      const pendingProv = config.pendingProvider;
      const snapshot = await fetchMetaAccountActivationSnapshot({
        wabaId: pendingProv.wabaId,
        phoneNumberId: pendingProv.phoneNumberId,
        accessToken: pendingProv.accessToken!,
      });
      if (snapshot.activationStatus === 'active' && snapshot.phoneNumberId) {
        let prevCfg: Record<string, any> = {};
        try {
          prevCfg = JSON.parse(pendingProv.configJson || '{}') as Record<string, any>;
        } catch {}
        const updatedJson = JSON.stringify({
          ...prevCfg,
          phoneNumberId: snapshot.phoneNumberId || prevCfg.phoneNumberId || '',
          wabaId: snapshot.wabaId || prevCfg.wabaId || '',
          displayPhoneNumber: snapshot.displayPhoneNumber || prevCfg.displayPhoneNumber || '',
          verifiedName: snapshot.verifiedName || prevCfg.verifiedName || '',
          nameStatus: snapshot.nameStatus || prevCfg.nameStatus || '',
          messagingLimitTier: snapshot.messagingLimitTier || prevCfg.messagingLimitTier || '',
          qualityRating: snapshot.qualityRating || prevCfg.qualityRating || '',
          phoneStatus: snapshot.phoneStatus || 'CONNECTED',
          codeVerificationStatus: snapshot.codeVerificationStatus || 'VERIFIED',
          accountReviewStatus: snapshot.accountReviewStatus || 'APPROVED',
          activationStatus: 'active',
        });
        await db.communicationProvider
          .update({
            where: { id: pendingProv.id },
            data: { status: 'active', sendingEnabled: true, configJson: updatedJson },
          })
          .catch(() => {});
        await db.tenant
          .update({
            where: { id: tenantId },
            data: {
              whatsappConfigJson: updatedJson,
              ...(snapshot.displayPhoneNumber ? { whatsappPhone: snapshot.displayPhoneNumber } : {}),
            },
          })
          .catch(() => {});
        if (snapshot.displayPhoneNumber) {
          await syncTenantWhatsAppIdentity({
            tenantId,
            phone: snapshot.displayPhoneNumber,
            syncChatbot: true,
            syncGoogleBusiness: true,
          }).catch(() => {});
        }
        config = await resolveWhatsAppConfig(tenantId);
      }
    }

    const configured = Boolean(
      config.accessToken &&
      config.phoneNumberId &&
      config.source === 'tenant-own',
    );
    const pendingActivation = Boolean(!configured && config.pendingProvider);
    let googleMapsWhatsappUrl: string | null = null;
    let googleMapsWhatsappSynced = false;
    let googleMapsWhatsappWarnings: string[] = [];
    let resolvedCountry = 'US';
    if (tenantId) {
      const tenantRow = await db.tenant
        .findUnique({
          where: { id: tenantId },
          select: { settingsJson: true, country: true, address: true, phone: true },
        })
        .catch(() => null);
      if (tenantRow) {
        let s: Record<string, any> = {};
        if (tenantRow.settingsJson) {
          try {
            s = JSON.parse(tenantRow.settingsJson) as Record<string, any>;
            googleMapsWhatsappUrl = s?.googlePlaceActions?.whatsappUri || s?.whatsappChatLink || null;
            googleMapsWhatsappSynced = Boolean(s?.googlePlaceActions?.whatsappSyncedToGoogle);
            if (Array.isArray(s?.googlePlaceActions?.whatsappWarnings)) {
              googleMapsWhatsappWarnings = s.googlePlaceActions.whatsappWarnings.filter(
                (w: unknown) => typeof w === 'string',
              );
            }
          } catch {}
        }
        resolvedCountry = resolveCountryCode({
          country: (typeof s?.country === 'string' ? s.country : null) || tenantRow.country,
          address: (typeof s?.activeGbpAddress === 'string' ? s.activeGbpAddress : null) || tenantRow.address,
          phone: config.displayPhoneNumber || tenantRow.phone,
        });
      }
    }

    const phoneDigits = configured
      ? normalizeWhatsAppDigits(config.displayPhoneNumber, resolvedCountry) || ''
      : '';
    const waMeUrl = phoneDigits ? `https://wa.me/${phoneDigits}` : null;
    const qrCodeDataUrl = waMeUrl
      ? await QRCode.toDataURL(waMeUrl, { margin: 2, width: 320 }).catch(() => null)
      : null;

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
      mode: configured ? 'live' : pendingActivation ? 'pending_activation' : 'not_connected',
      activationStatus: configured ? 'active' : pendingActivation ? 'pending' : 'none',
      pendingActivation,
      platformGatewayAvailable: config.source === 'platform' || config.source === 'env',
      phoneNumberId: configured
        ? maskString(config.phoneNumberId)
        : pendingActivation && config.pendingProvider?.phoneNumberId
          ? maskString(config.pendingProvider.phoneNumberId)
          : '',
      source: pendingActivation ? 'tenant-own' : config.source || 'none',
      displayPhoneNumber: configured
        ? config.displayPhoneNumber || null
        : pendingActivation
          ? config.pendingProvider?.displayPhoneNumber || null
          : null,
      verifiedName: configured
        ? config.verifiedName || null
        : pendingActivation
          ? config.pendingProvider?.verifiedName || null
          : null,
      nameStatus: configured ? config.nameStatus || null : null,
      messagingLimitTier: configured ? config.messagingLimitTier || null : null,
      qualityRating: configured ? config.qualityRating || null : null,
      phoneStatus: pendingActivation ? config.pendingProvider?.phoneStatus || null : null,
      accountReviewStatus: pendingActivation ? config.pendingProvider?.accountReviewStatus || null : null,
      coexistenceMode: configured
        ? Boolean(config.coexistenceMode)
        : pendingActivation
          ? Boolean(config.pendingProvider?.coexistenceMode)
          : false,
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
    const caller = await resolveWhatsAppConfigCaller(request);
    if (!caller.ok) {
      return NextResponse.json({ error: caller.error }, { status: caller.status });
    }

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
export async function DELETE(request: NextRequest) {
  const caller = await resolveWhatsAppConfigCaller(request);
  if (!caller.ok) {
    return NextResponse.json({ error: caller.error }, { status: caller.status });
  }
  return NextResponse.json({
    success: true,
    mode: 'demo',
    message: 'To fully reset WhatsApp config, remove the WhatsApp CommunicationProvider from the database or disable it in Communication Providers settings.',
  });
}
