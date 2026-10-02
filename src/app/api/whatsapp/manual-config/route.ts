import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * POST /api/whatsapp/manual-config
 * ─────────────────────────────────────────────────────────────────────────
 * Manual WhatsApp configuration fallback for users who cannot use the
 * Embedded Signup popup (e.g., their Meta Business Manager isn't set up
 * for Embedded Signup, or they're using a 360dialog / wati / gupshup
 * provider instead of Meta Cloud API).
 *
 * Body: { phoneNumber, phoneNumberId, wabaId, accessToken }
 *
 * Creates a tenant-owned CommunicationProvider row (isPlatform: false)
 * with the same shape as the Embedded Signup route, so the send path
 * and the Publish card work identically regardless of which connection
 * method was used.
 *
 * Auth: any authenticated tenant user (owner or admin).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { phoneNumber, phoneNumberId, wabaId, accessToken } = body as {
      phoneNumber?: string;
      phoneNumberId?: string;
      wabaId?: string;
      accessToken?: string;
    };

    if (!phoneNumber || !phoneNumberId || !wabaId || !accessToken) {
      return NextResponse.json(
        { error: 'phoneNumber, phoneNumberId, wabaId, and accessToken are all required' },
        { status: 400 },
      );
    }

    const configJson = JSON.stringify({
      accessToken,
      phoneNumberId,
      wabaId,
      displayPhoneNumber: phoneNumber,
      apiVersion: 'v21.0',
      source: 'manual_config',
      connectedAt: new Date().toISOString(),
      connectedBy: user.id,
    });

    // Upsert the tenant-owned CommunicationProvider row.
    // Same logic as embedded-signup: find existing tenant-owned (isPlatform: false),
    // update it; otherwise create a new one.
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
          isPlatform: false,
        },
      });
    } else {
      await db.communicationProvider.create({
        data: {
          tenantId: user.tenantId,
          type: 'whatsapp',
          provider: 'meta_cloud_api',
          name: 'WhatsApp Business (Manual Config)',
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

    console.log('[whatsapp/manual-config] WhatsApp configured manually:', {
      wabaId,
      phoneNumberId,
      displayPhoneNumber: phoneNumber,
      tenantId: user.tenantId,
    });

    return NextResponse.json({
      success: true,
      wabaId,
      phoneNumberId,
      displayPhoneNumber: phoneNumber,
    });
  } catch (error) {
    console.error('[POST /api/whatsapp/manual-config] error:', error);
    return NextResponse.json(
      { error: 'Failed to save WhatsApp configuration' },
      { status: 500 },
    );
  }
}
