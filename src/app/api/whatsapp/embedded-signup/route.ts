import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { verifyHandoffTicket } from '@/lib/bgos-mobile-auth';
import { db } from '@/lib/db';
import { syncTenantWhatsAppIdentity } from '@/lib/whatsapp/identity-sync';

/**
 * WhatsApp Embedded Signup — Code Exchange + WABA Registration + Coexistence
 * =========================================================================
 *
 * Supports both Standard Cloud API Onboarding and WhatsApp Business App Coexistence
 * (`featureType: 'whatsapp_business_app_onboarding'`), as well as Web session cookies
 * and BGOS Mobile short-lived handoff tickets.
 */

const META_GRAPH_API = 'https://graph.facebook.com/v21.0';

/**
 * Trigger best-effort Meta Coexistence initial sync for recent chats and contacts.
 */
async function triggerCoexistenceInitialSync(
  phoneNumberId: string,
  accessToken: string,
): Promise<boolean> {
  const syncTypes = ['smb_app_state_sync', 'history'] as const;
  let anyRequested = false;

  await Promise.all(
    syncTypes.map(async (syncType) => {
      try {
        const res = await fetch(`${META_GRAPH_API}/${phoneNumberId}/smb_app_data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            sync_type: syncType,
          }),
        });
        if (res.ok) {
          anyRequested = true;
        } else {
          const errText = await res.text().catch(() => '');
          console.warn(`[whatsapp/embedded-signup] ${syncType} sync notice:`, errText);
        }
      } catch (err) {
        console.warn(`[whatsapp/embedded-signup] ${syncType} sync failed:`, err);
      }
    }),
  );

  return anyRequested;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      code,
      state,
      wabaId: sessionWabaId,
      phoneNumberId: sessionPhoneNumberId,
      isCoexistence: rawIsCoexistence,
      featureType,
      ticket,
    } = body as {
      code?: string;
      state?: string;
      wabaId?: string;
      phoneNumberId?: string;
      isCoexistence?: boolean;
      featureType?: string;
      ticket?: string;
    };

    let authUser = await getAuthUser(request);
    if (!authUser?.tenantId && ticket) {
      const verified = verifyHandoffTicket(ticket);
      if (verified?.tenantId) {
        authUser = {
          id: verified.userId,
          email: verified.email,
          role: verified.role as any,
          tenantId: verified.tenantId,
        };
      }
    }

    if (!authUser || !authUser.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
    }

    const appId =
      process.env.META_APP_ID ||
      process.env.NEXT_PUBLIC_META_APP_ID ||
      process.env.FACEBOOK_APP_ID;
    const appSecret =
      process.env.WHATSAPP_APP_SECRET ||
      process.env.META_APP_SECRET ||
      process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
      console.error('[whatsapp/embedded-signup] META_APP_ID or META_APP_SECRET not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // 1. Exchange code for short-lived access token
    const tokenRes = await fetch(`${META_GRAPH_API}/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: '',
        code,
      }),
    });

    if (!tokenRes.ok) {
      const tokenErr = await tokenRes.text();
      console.error('[whatsapp/embedded-signup] Token exchange failed:', tokenErr);
      return NextResponse.json({ error: 'Failed to exchange authorization code' }, { status: 400 });
    }

    const tokenData = await tokenRes.json();
    const shortLivedToken = tokenData.access_token;

    if (!shortLivedToken) {
      console.error('[whatsapp/embedded-signup] No access_token in response:', tokenData);
      return NextResponse.json({ error: 'Failed to obtain access token' }, { status: 400 });
    }

    // 2. Exchange for long-lived token (60 days, renewable)
    const longLivedRes = await fetch(`${META_GRAPH_API}/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortLivedToken,
      }),
    });

    let longLivedToken = shortLivedToken;
    if (longLivedRes.ok) {
      const longLivedData = await longLivedRes.json();
      longLivedToken = longLivedData.access_token || shortLivedToken;
    }

    // 3. Resolve WABA ID & Phone Number ID (prefer exact session info from WA_EMBEDDED_SIGNUP)
    let wabaId: string | null = sessionWabaId?.trim() || null;
    let phoneNumberId: string | null = sessionPhoneNumberId?.trim() || null;
    let displayPhoneNumber: string | null = null;
    let verifiedName: string | null = null;
    let nameStatus: string | null = null;
    let messagingLimitTier: string | null = null;
    let qualityRating: string | null = null;

    if (!wabaId) {
      const wabaRes = await fetch(`${META_GRAPH_API}/debug_token?input_token=${longLivedToken}`, {
        headers: { Authorization: `Bearer ${appId}|${appSecret}` },
      });
      if (wabaRes.ok) {
        const debugData = await wabaRes.json();
        const wabaScope = debugData.data?.granular_scopes?.find(
          (s: any) => s.scope === 'whatsapp_business_management',
        );
        if (wabaScope?.target_ids?.length > 0) {
          wabaId = wabaScope.target_ids[0];
        }
      }
    }

    const isCoexistence =
      Boolean(rawIsCoexistence) ||
      featureType === 'whatsapp_business_app_onboarding';

    if (wabaId) {
      const phoneRes = await fetch(
        `${META_GRAPH_API}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,name_status,code_verification_status,quality_rating,messaging_limit_tier&access_token=${longLivedToken}`,
      );
      if (phoneRes.ok) {
        const phoneData = await phoneRes.json();
        const numbers: any[] = Array.isArray(phoneData.data) ? phoneData.data : [];
        const matched =
          (phoneNumberId && numbers.find((n) => n.id === phoneNumberId)) || numbers[0];
        if (matched) {
          phoneNumberId = matched.id || phoneNumberId;
          displayPhoneNumber = matched.display_phone_number || null;
          verifiedName = matched.verified_name || null;
          nameStatus = matched.name_status || null;
          messagingLimitTier = matched.messaging_limit_tier || null;
          qualityRating = matched.quality_rating || null;
        }
      }

      // 4. Subscribe the WABA to app webhooks (messages + Coexistence smb_message_echoes)
      try {
        await fetch(`${META_GRAPH_API}/${wabaId}/subscribed_apps`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${longLivedToken}` },
        });
      } catch (err) {
        console.warn('[whatsapp/embedded-signup] Failed to subscribe WABA:', err);
      }
    }

    // 5. Register Cloud API number ONLY for non-coexistence accounts;
    // for Coexistence, request initial chat/contact sync via smb_app_data
    let coexistenceSyncRequested = false;
    if (phoneNumberId && !isCoexistence) {
      try {
        await fetch(`${META_GRAPH_API}/${phoneNumberId}/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${longLivedToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            pin: '000000',
          }),
        });
      } catch (err) {
        console.warn('[whatsapp/embedded-signup] Phone registration notice:', err);
      }
    } else if (phoneNumberId && isCoexistence) {
      coexistenceSyncRequested = await triggerCoexistenceInitialSync(
        phoneNumberId,
        longLivedToken,
      );
    }

    // 6. Store credentials & rich Meta status in tenant-owned CommunicationProvider
    const configJson = JSON.stringify({
      accessToken: longLivedToken,
      phoneNumberId: phoneNumberId || '',
      wabaId: wabaId || '',
      displayPhoneNumber: displayPhoneNumber || '',
      verifiedName: verifiedName || '',
      nameStatus: nameStatus || '',
      messagingLimitTier: messagingLimitTier || '',
      qualityRating: qualityRating || '',
      coexistenceMode: isCoexistence,
      apiVersion: 'v21.0',
      source: isCoexistence ? 'embedded_signup_coexistence' : 'embedded_signup',
      connectedAt: new Date().toISOString(),
      connectedBy: authUser.id,
      state: state || undefined,
    });

    const existing = await db.communicationProvider.findFirst({
      where: { tenantId: authUser.tenantId, type: 'whatsapp', isPlatform: false },
    });

    if (existing) {
      await db.communicationProvider.update({
        where: { id: existing.id },
        data: {
          configJson,
          status: 'active',
          sendingEnabled: true,
          isPlatform: false,
        },
      });
    } else {
      await db.communicationProvider.create({
        data: {
          tenantId: authUser.tenantId,
          type: 'whatsapp',
          provider: 'meta_cloud_api',
          name: isCoexistence
            ? 'WhatsApp Business App (Coexistence)'
            : 'WhatsApp Business (Embedded Signup)',
          configJson,
          status: 'active',
          sendingEnabled: true,
          isPlatform: false,
        },
      });
    }

    await db.tenant
      .update({
        where: { id: authUser.tenantId },
        data: {
          whatsappConfigJson: configJson,
          ...(displayPhoneNumber ? { whatsappPhone: displayPhoneNumber } : {}),
        },
      })
      .catch(() => {});

    const identitySync = await syncTenantWhatsAppIdentity({
      tenantId: authUser.tenantId,
      phone: displayPhoneNumber,
      syncChatbot: true,
      syncGoogleBusiness: Boolean(displayPhoneNumber),
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      wabaId: wabaId || '',
      phoneNumberId: phoneNumberId || '',
      displayPhoneNumber: displayPhoneNumber || identitySync?.phone || '',
      verifiedName: verifiedName || '',
      messagingLimitTier: messagingLimitTier || '',
      coexistenceMode: isCoexistence,
      coexistenceSyncRequested,
      chatbotEnsured: Boolean(identitySync?.chatbotEnsured),
      googleMapsSynced: Boolean(identitySync?.syncedToGoogle),
      whatsappUrl: identitySync?.whatsappUrl || '',
    });
  } catch (error) {
    console.error('[whatsapp/embedded-signup] Fatal error:', error);
    return NextResponse.json(
      { error: 'Failed to connect WhatsApp. Please try again.' },
      { status: 500 },
    );
  }
}
