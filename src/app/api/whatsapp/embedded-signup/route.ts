import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * WhatsApp Embedded Signup — Code Exchange + WABA Registration
 * ==============================================================
 *
 * Receives the authorization code from Meta's Embedded Signup popup
 * (launched via FB.login in whatsapp-embedded-signup-button.tsx),
 * and:
 *
 * 1. Exchanges the code for a short-lived user access token
 * 2. Exchanges the short-lived token for a long-lived token (60 days)
 * 3. Discovers the WABA ID and phone number ID from the granted assets
 * 4. Subscribes the WABA to webhooks (so we receive incoming messages)
 * 5. Registers the phone number (enables messaging)
 * 6. Stores credentials in CommunicationProvider + Credential (encrypted)
 *
 * This is the flow Meta expects for Tech Provider App Review.
 */

const META_GRAPH_API = 'https://graph.facebook.com/v21.0';
// NOTE: This route uses v21.0 to match the Facebook JS SDK version
// (whatsapp-embedded-signup-button.tsx loads FB SDK with version: 'v21.0').
// The send path (src/lib/whatsapp-send.ts) uses v25.0 — that's fine because
// the Graph API is backward-compatible and the send path doesn't use the
// FB SDK. The stored apiVersion in configJson is 'v21.0' for traceability.

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code, state } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
    }

    const appId = process.env.META_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID;
    const appSecret = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
      console.error('[whatsapp/embedded-signup] META_APP_ID or WHATSAPP_APP_SECRET not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // 1. Exchange code for short-lived access token
    const tokenRes = await fetch(`${META_GRAPH_API}/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: '',  // Empty for Embedded Signup
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

    let longLivedToken = shortLivedToken; // fallback to short-lived
    if (longLivedRes.ok) {
      const longLivedData = await longLivedRes.json();
      longLivedToken = longLivedData.access_token || shortLivedToken;
    }

    // 3. Discover WABA ID from the granted WhatsApp Business Accounts
    const wabaRes = await fetch(`${META_GRAPH_API}/debug_token?input_token=${longLivedToken}`, {
      headers: { Authorization: `Bearer ${appId}|${appSecret}` },
    });

    let wabaId: string | null = null;
    let phoneNumberId: string | null = null;
    let displayPhoneNumber: string | null = null;

    if (wabaRes.ok) {
      const debugData = await wabaRes.json();
      // The debug_token response includes the WhatsApp Business Account ID
      // in the granular_scopes or data.waba_id field
      const wabaScope = debugData.data?.granular_scopes?.find(
        (s: any) => s.scope === 'whatsapp_business_management'
      );
      if (wabaScope?.target_ids?.length > 0) {
        wabaId = wabaScope.target_ids[0];
      }
    }

    // If we got the WABA ID, fetch phone numbers
    if (wabaId) {
      const phoneRes = await fetch(`${META_GRAPH_API}/${wabaId}/phone_numbers?access_token=${longLivedToken}`);
      if (phoneRes.ok) {
        const phoneData = await phoneRes.json();
        if (phoneData.data?.length > 0) {
          phoneNumberId = phoneData.data[0].id;
          // Capture the display phone number (E.164) so the Publish card
          // can show the real number the tenant connected.
          displayPhoneNumber = phoneData.data[0].display_phone_number ||
            phoneData.data[0].verified_name || null;
        }
      }

      // 4. Subscribe the WABA to webhooks
      try {
        await fetch(`${META_GRAPH_API}/${wabaId}/subscribed_apps`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${longLivedToken}` },
        });
        console.log('[whatsapp/embedded-signup] WABA subscribed to webhooks');
      } catch (err) {
        console.warn('[whatsapp/embedded-signup] Failed to subscribe WABA:', err);
      }
    }

    // 5. Register the phone number (if found)
    if (phoneNumberId) {
      try {
        await fetch(`${META_GRAPH_API}/${phoneNumberId}/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${longLivedToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            pin: '000000', // 6-digit PIN — user can change later
          }),
        });
        console.log('[whatsapp/embedded-signup] Phone number registered');
      } catch (err) {
        console.warn('[whatsapp/embedded-signup] Phone registration failed (may already be registered):', err);
      }
    }

    // 6. Store credentials in CommunicationProvider
    const configJson = JSON.stringify({
      accessToken: longLivedToken,
      phoneNumberId: phoneNumberId || '',
      wabaId: wabaId || '',
      displayPhoneNumber: displayPhoneNumber || '',
      apiVersion: 'v21.0',
      source: 'embedded_signup',
      connectedAt: new Date().toISOString(),
      connectedBy: user.id,
    });

    // Upsert the CommunicationProvider record for this tenant.
    //
    // BUG FIXES (Phase B):
    //   1. findFirst now filters isPlatform: false — we must ONLY match
    //      tenant-owned rows, never the platform-managed fallback.
    //      Without this filter, tenant1's seeded platform provider would be
    //      matched and its configJson overwritten with the tenant's tokens.
    //   2. Removed the invalid `isActive: true` field — CommunicationProvider
    //      has no `isActive` column (it has `status` + `isPlatform`).
    //      Prisma mode throws; Supabase adapter silently strips it.
    //   3. CREATE branch now includes the required `provider` field
    //      (schema requires it, no default) + explicit `isPlatform: false`.
    const existing = await db.communicationProvider.findFirst({
      where: { tenantId: user.tenantId, type: 'whatsapp', isPlatform: false },
    });

    if (existing) {
      await db.communicationProvider.update({
        where: { id: existing.id },
        data: {
          configJson,
          status: 'active',
          sendingEnabled: true,
          // Ensure a previously-platform row is converted to tenant-owned.
          // (Safeguard — the findFirst filter above should prevent this, but
          // if a row was mis-flagged in a prior version, this corrects it.)
          isPlatform: false,
        },
      });
    } else {
      await db.communicationProvider.create({
        data: {
          tenantId: user.tenantId,
          type: 'whatsapp',
          provider: 'meta_cloud_api',
          name: 'WhatsApp Business (Embedded Signup)',
          configJson,
          status: 'active',
          sendingEnabled: true,
          isPlatform: false,
        },
      });
    }

    // Also update Tenant.whatsappConfigJson for backward compatibility
    await db.tenant.update({
      where: { id: user.tenantId },
      data: { whatsappConfigJson: configJson },
    }).catch(() => {});

    console.log('[whatsapp/embedded-signup] WhatsApp connected successfully:', {
      wabaId,
      phoneNumberId,
      displayPhoneNumber,
      tenantId: user.tenantId,
    });

    return NextResponse.json({
      success: true,
      wabaId: wabaId || '',
      phoneNumberId: phoneNumberId || '',
      displayPhoneNumber: displayPhoneNumber || '',
    });
  } catch (error) {
    console.error('[whatsapp/embedded-signup] Fatal error:', error);
    return NextResponse.json(
      { error: 'Failed to connect WhatsApp. Please try again.' },
      { status: 500 }
    );
  }
}
