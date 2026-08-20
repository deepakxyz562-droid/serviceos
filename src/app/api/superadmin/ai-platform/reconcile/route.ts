import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getTelephonyProvider } from '@/lib/telephony-provider';
import { getVapiVoiceProvider } from '@/lib/vapi-voice-provider';
import { getDecryptedApiKey } from '@/lib/ai-provider-config-service';

/**
 * POST /api/superadmin/ai-platform/reconcile
 * ─────────────────────────────────────────────────────────────────────────
 * Phase 9A Gate C: Reconciliation with auto-repair actions.
 *
 * Body: { phoneNumberId: string, action: 'reimport_vapi' | 'create_db_record' | 'suspend' }
 *
 * Actions:
 *   reimport_vapi    — Vapi phone-number resource is missing. Re-imports the Twilio number into Vapi.
 *   create_db_record  — DB record is missing but Twilio + Vapi exist. Creates PhoneNumber + PhoneConnection.
 *   suspend           — Twilio number is missing externally. Suspends the PhoneNumber in Fieseros.
 *
 * Auth: superadmin only.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const isSuperAdmin =
      (user as Record<string, unknown>).isSuperAdmin === true ||
      user.role === 'superadmin' ||
      user.role === 'super_admin';
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { phoneNumberId, action } = body;

    if (!phoneNumberId || !action) {
      return NextResponse.json({ error: 'phoneNumberId and action are required' }, { status: 400 });
    }

    const phone = await db.phoneNumber.findUnique({
      where: { id: phoneNumberId },
      select: {
        id: true,
        number: true,
        providerSid: true,
        vapiNumberId: true,
        status: true,
        tenantId: true,
        displayName: true,
        capabilities: true,
        monthlyCost: true,
      },
    });

    if (!phone) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }

    const vapi = getVapiVoiceProvider();

    // ── Action: reimport_vapi ──
    if (action === 'reimport_vapi') {
      if (!phone.providerSid) {
        return NextResponse.json({ error: 'No providerSid — cannot re-import without Twilio number' }, { status: 400 });
      }

      // Get Twilio credentials
      const twilioAuthToken = await getDecryptedApiKey('TWILIO');
      if (!twilioAuthToken) {
        return NextResponse.json({ error: 'Twilio credentials not configured' }, { status: 503 });
      }

      const twilioConfig = await db.aiProviderConfig.findUnique({
        where: { provider: 'TWILIO' },
        select: { configJson: true },
      });
      let twilioAccountSid = '';
      if (twilioConfig?.configJson) {
        try { twilioAccountSid = JSON.parse(twilioConfig.configJson).accountSid || ''; } catch { /* ignore */ }
      }
      if (!twilioAccountSid) {
        return NextResponse.json({ error: 'Twilio Account SID not configured' }, { status: 503 });
      }

      // Get active deployment (assistant)
      const deployment = await db.aiProviderDeployment.findFirst({
        where: {
          provider: 'VAPI',
          status: 'ACTIVE',
          agentVersion: { receptionist: { tenantId: phone.tenantId } },
        },
        select: { externalAssistantId: true },
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '';
      const vapiWebhookUrl = appUrl ? `${appUrl}/api/vapi/webhook` : undefined;

      // Re-import
      const importResult = await vapi.importTwilioNumber({
        twilioAccountSid,
        twilioAuthToken,
        twilioPhoneNumber: phone.number,
        assistantId: deployment?.externalAssistantId || undefined,
        serverUrl: vapiWebhookUrl,
        name: phone.displayName || `Fieseros Number`,
      });

      // Update the PhoneNumber with the new vapiNumberId
      await db.phoneNumber.update({
        where: { id: phone.id },
        data: { vapiNumberId: importResult.vapiPhoneNumberId },
      });

      return NextResponse.json({
        ok: true,
        action: 'reimport_vapi',
        vapiNumberId: importResult.vapiPhoneNumberId,
        message: `Re-imported ${phone.number} into Vapi → ${importResult.vapiPhoneNumberId}`,
      });
    }

    // ── Action: create_db_record ──
    if (action === 'create_db_record') {
      // This handles provisioning attempts that failed at DB_COMMIT_FAILED
      // Check if a PhoneProvisioningAttempt exists with the IDs
      const attempt = await db.phoneProvisioningAttempt.findFirst({
        where: {
          twilioProviderSid: phone.providerSid,
          status: 'DB_COMMIT_FAILED',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!attempt) {
        return NextResponse.json({ error: 'No DB_COMMIT_FAILED attempt found for this number' }, { status: 400 });
      }

      // Create PhoneNumber + PhoneConnection
      const result = await db.$transaction(async (tx) => {
        const phoneNumber = await tx.phoneNumber.create({
          data: {
            number: phone.number,
            displayName: `Fieseros Number (${phone.tenantId.slice(-6)})`,
            provider: 'twilio',
            capabilities: 'sms,voice',
            providerSid: attempt.twilioProviderSid,
            vapiNumberId: attempt.vapiNumberId,
            status: 'active',
            monthlyCost: 1.15,
            costCurrency: 'USD',
            tenantId: phone.tenantId,
          },
        });

        const connection = await tx.phoneConnection.create({
          data: {
            tenantId: phone.tenantId,
            phoneNumberId: phoneNumber.id,
            connectionType: 'DIRECT',
            routingMode: 'AI_RECEPTIONIST',
            fallbackRoutingMode: 'VOICEMAIL',
            status: 'ACTIVE',
            verifiedAt: new Date(),
          },
        });

        await tx.phoneProvisioningAttempt.update({
          where: { id: attempt.id },
          data: {
            status: 'SUCCESS',
            resultingPhoneNumberId: phoneNumber.id,
            completedAt: new Date(),
          },
        });

        return { phoneNumber, connection };
      });

      return NextResponse.json({
        ok: true,
        action: 'create_db_record',
        phoneNumberId: result.phoneNumber.id,
        message: `Created DB record for ${phone.number}`,
      });
    }

    // ── Action: suspend ──
    if (action === 'suspend') {
      // Twilio number is missing externally — suspend in Fieseros
      await db.phoneNumber.update({
        where: { id: phone.id },
        data: { status: 'suspended' },
      });

      await db.phoneConnection.updateMany({
        where: { phoneNumberId: phone.id },
        data: { status: 'INACTIVE' },
      });

      return NextResponse.json({
        ok: true,
        action: 'suspend',
        message: `Suspended ${phone.number} (Twilio number not found externally)`,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[POST /api/superadmin/ai-platform/reconcile] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Reconciliation failed' },
      { status: 500 },
    );
  }
}
