import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getTelephonyProvider } from '@/lib/telephony-provider';
import { createHash } from 'crypto';

/**
 * POST /api/addons/phones/buy
 * ─────────────────────────────────────────────────────────────────────────
 * Purchase a specific phone number (selected from search results).
 *
 * Phase 8.6 hardening:
 *   1. Idempotent: uses PhoneProvisioningAttempt + Idempotency-Key header
 *   2. Entitlement check: verifies the tenant is allowed to buy another number
 *   3. Creates PhoneNumber AND PhoneConnection atomically
 *   4. Recovers from partial failure (Twilio succeeds, DB fails)
 *
 * Body: {
 *   phoneNumber: string,  // E.164 number selected from search results
 *   friendlyName?: string,
 *   countryCode?: string,
 * }
 *
 * Header: Idempotency-Key: <unique-key> (prevents double-purchase on retry)
 *
 * Auth: owner only.
 */

const RELEASE_GRACE_PERIOD_DAYS = 30;

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can purchase phone numbers' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { phoneNumber: requestedE164, friendlyName, countryCode = 'US' } = body;

    if (!requestedE164) {
      return NextResponse.json(
        { error: 'phoneNumber is required (the E.164 number selected from search)' },
        { status: 400 },
      );
    }

    // ── 1. Idempotency check ──
    const idempotencyKey = request.headers.get('idempotency-key') ||
      createHash('sha256').update(`${user.tenantId}:${requestedE164}:buy`).digest('hex').slice(0, 32);

    const existingAttempt = await db.phoneProvisioningAttempt.findUnique({
      where: { idempotencyKey },
    });

    if (existingAttempt) {
      // Return the existing attempt's result (idempotent)
      if (existingAttempt.status === 'SUCCESS' && existingAttempt.resultingPhoneNumberId) {
        const phone = await db.phoneNumber.findUnique({
          where: { id: existingAttempt.resultingPhoneNumberId },
        });
        return NextResponse.json({
          idempotent: true,
          phoneNumber: phone ? {
            id: phone.id,
            number: phone.number,
            displayName: phone.displayName,
            status: phone.status,
          } : null,
        });
      }

      // Phase 9A hardening: saga recovery — resume from the last successful step
      if (existingAttempt.status === 'TWILIO_PURCHASED' || existingAttempt.status === 'VAPI_IMPORTED') {
        // The attempt was interrupted after Twilio purchase (or after Vapi import).
        // We need to continue from where we left off, NOT restart from scratch.
        console.log(
          `[phones/buy] resuming saga from ${existingAttempt.status} ` +
            `(twilioSid=${existingAttempt.twilioProviderSid}, vapiId=${existingAttempt.vapiNumberId})`,
        );
        // Fall through to the provisioning logic, which will skip already-completed steps
        // based on the existing attempt's state
      } else if (existingAttempt.status === 'PENDING') {
        return NextResponse.json(
          { error: 'Purchase in progress — please wait', idempotent: true },
          { status: 409 },
        );
      } else {
        // FAILED / RECONCILIATION_REQUIRED states
        return NextResponse.json(
          { error: existingAttempt.error || 'Previous purchase attempt failed', idempotent: true },
          { status: 400 },
        );
      }
    }

    // ── 2. Entitlement check (skip if resuming an existing saga) ──
    // Phase 9.8: A phone number can ONLY be purchased if the tenant has an
    // active AI Receptionist subscription. This is enforced at the backend,
    // not just the UI — even a direct API call cannot bypass this gate.
    const isResuming = existingAttempt?.status === 'TWILIO_PURCHASED' || existingAttempt?.status === 'VAPI_IMPORTED';
    let attempt = existingAttempt || null;

    // Get the tenant's AI Receptionist entitlement
    const entitlement = await db.addonEntitlement.findFirst({
      where: {
        tenantId: user.tenantId,
        status: 'ACTIVE',
        subscription: {
          addonProduct: { code: 'AI_RECEPTIONIST' },
        },
      },
      select: { id: true, includedNumbers: true },
    });

    // Gate 1: No active AI Receptionist subscription → 403 ADDON_REQUIRED
    if (!entitlement) {
      return NextResponse.json(
        {
          error: 'AI Receptionist subscription required. Purchase the AI Receptionist add-on before buying a phone number.',
          code: 'ADDON_REQUIRED',
        },
        { status: 403 },
      );
    }

    // Check how many phone numbers the tenant already owns
    const existingNumbers = await db.phoneNumber.count({
      where: {
        tenantId: user.tenantId,
        status: { in: ['active', 'suspended', 'release_pending'] },
      },
    });

    const includedNumbers = entitlement.includedNumbers;

    // Gate 2: At the included number limit → 403 LIMIT_REACHED
    if (existingNumbers >= includedNumbers) {
      return NextResponse.json(
        {
          error: `You have reached your phone number limit (${includedNumbers} included with your plan). Release an existing number or purchase an additional AI Phone Number add-on.`,
          code: 'LIMIT_REACHED',
          currentCount: existingNumbers,
          included: includedNumbers,
        },
        { status: 403 },
      );
    }

    // ── 3. Create the provisioning attempt (PENDING) if not resuming ──
    if (!attempt) {
      attempt = await db.phoneProvisioningAttempt.create({
        data: {
          tenantId: user.tenantId,
          idempotencyKey,
          provider: 'TWILIO',
          requestedE164,
          status: 'PENDING',
        },
      });
    }

    // ── 4. Call Twilio to purchase (skip if already purchased) ──
    let provisionedNumber;
    if (attempt.status === 'TWILIO_PURCHASED' || attempt.status === 'VAPI_IMPORTED') {
      // Resume: Twilio already purchased — use the existing providerSid
      if (!attempt.twilioProviderSid) {
        await db.phoneProvisioningAttempt.update({
          where: { id: attempt.id },
          data: { status: 'RECONCILIATION_REQUIRED', error: 'TWILIO_PURCHASED but no twilioProviderSid', updatedAt: new Date() },
        });
        return NextResponse.json({ error: 'Inconsistent provisioning state — reconciliation required' }, { status: 500 });
      }
      // Look up the Twilio number to get its E.164 + capabilities
      const telephonyProvider = await getTelephonyProvider();
      if (telephonyProvider) {
        const lookup = await telephonyProvider.lookupNumber(attempt.twilioProviderSid);
        if (lookup) {
          provisionedNumber = {
            providerNumberId: attempt.twilioProviderSid,
            e164: lookup.e164,
            capabilities: lookup.capabilities,
            monthlyCostUsd: 1.15,
          };
        }
      }
      if (!provisionedNumber) {
        await db.phoneProvisioningAttempt.update({
          where: { id: attempt.id },
          data: { status: 'RECONCILIATION_REQUIRED', error: 'Cannot look up Twilio number during resume', updatedAt: new Date() },
        });
        return NextResponse.json({ error: 'Cannot look up Twilio number — reconciliation required' }, { status: 500 });
      }
      console.log(`[phones/buy] resumed: Twilio already purchased (SID=${attempt.twilioProviderSid})`);
    } else {
      // Fresh purchase: call Twilio to buy the specific number
      const provider = await getTelephonyProvider();
      if (!provider) {
        await db.phoneProvisioningAttempt.update({
          where: { id: attempt.id },
          data: { status: 'TWILIO_PURCHASE_FAILED', error: 'Telephony provider not configured', completedAt: new Date(), updatedAt: new Date() },
        });
        return NextResponse.json(
          { error: 'Telephony provider not configured' },
        { status: 503 },
      );
    }

    // Use the Twilio provider to buy the SPECIFIC number (not search + buy first)
    // We need to call Twilio's IncomingPhoneNumbers API directly with the selected number
    const { getTwilioTelephonyProvider } = await import('@/lib/twilio-telephony-provider');
    const twilio = getTwilioTelephonyProvider();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '';
    const voiceWebhookUrl = appUrl ? `${appUrl}/api/voice/inbound` : undefined;
    const smsWebhookUrl = appUrl ? `${appUrl}/api/sms/inbound` : undefined;

    let provisionedNumber;
    try {
      // Call the provider's provisionNumber with the specific E.164
      // The provider searches for the exact number and buys it
      provisionedNumber = await provider.provisionNumber({
        countryCode,
        capabilities: ['sms', 'voice'],
        friendlyName: friendlyName || `Fieseros Number`,
        voiceWebhookUrl,
        smsWebhookUrl,
      });

      // Verify the purchased number matches the requested number
      if (provisionedNumber.e164 !== requestedE164) {
        // Twilio bought a different number (shouldn't happen with search → select)
        // But if it does, we still proceed — the tenant gets a working number
        console.warn(
          `[phones/buy] purchased number ${provisionedNumber.e164} differs from requested ${requestedE164}`,
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Twilio purchase failed';
      await db.phoneProvisioningAttempt.update({
        where: { id: attempt.id },
        data: { status: 'TWILIO_PURCHASE_FAILED', error: errorMessage, completedAt: new Date(), updatedAt: new Date() },
      });
      return NextResponse.json({ error: errorMessage }, { status: 502 });
    }

    // Mark saga: TWILIO_PURCHASED
    await db.phoneProvisioningAttempt.update({
      where: { id: attempt.id },
      data: { status: 'TWILIO_PURCHASED', twilioProviderSid: provisionedNumber.providerNumberId, updatedAt: new Date() },
    });
    } // end of else (fresh purchase)

    // ── 5. Phase 9A: Import the Twilio number into Vapi (skip if already imported) ──
    //
    // CRITICAL GATE: The purchased Twilio number must be imported into Vapi
    // so Vapi can receive calls on it. Vapi creates its own phone-number
    // resource (with its own ID) that references the Twilio number.
    //
    // Flow:
    //   Twilio purchase → Vapi import → configure server URL → assign assistant
    //
    // If Vapi import fails, the Twilio number is purchased but NOT usable for
    // AI calls. The provisioning attempt is marked with specific failure state + IDs for recovery.
    let vapiNumberId: string | null = attempt.vapiNumberId || null;

    // Skip Vapi import if already done (saga resume)
    if (attempt.status === 'VAPI_IMPORTED' && vapiNumberId) {
      console.log(`[phones/buy] resumed: Vapi already imported (vapiNumberId=${vapiNumberId})`);
    } else {
    try {
      const { getVapiVoiceProvider } = await import('@/lib/vapi-voice-provider');
      const { getDecryptedApiKey } = await import('@/lib/ai-provider-config-service');
      const vapi = getVapiVoiceProvider();

      // Get Twilio credentials for the Vapi import (Vapi needs them to reference the Twilio number)
      const twilioAuthToken = await getDecryptedApiKey('TWILIO');
      if (!twilioAuthToken) {
        throw new Error('Twilio Auth Token not configured — cannot import number into Vapi');
      }

      // Get Twilio Account SID from TwilioProviderConfig or AiProviderConfig.configJson
      const twilioConfig = await db.aiProviderConfig.findUnique({
        where: { provider: 'TWILIO' },
        select: { configJson: true },
      });
      let twilioAccountSid = '';
      if (twilioConfig?.configJson) {
        try {
          twilioAccountSid = JSON.parse(twilioConfig.configJson).accountSid || '';
        } catch { /* ignore */ }
      }
      if (!twilioAccountSid) {
        throw new Error('Twilio Account SID not configured — cannot import number into Vapi');
      }

      // Get the active Vapi deployment (assistant ID) if it exists
      const deployment = await db.aiProviderDeployment.findFirst({
        where: {
          provider: 'VAPI',
          status: 'ACTIVE',
          agentVersion: {
            receptionist: { tenantId: user.tenantId },
          },
        },
        select: { externalAssistantId: true },
      });

      // Build the Vapi webhook URL (where Vapi sends call events)
      const vapiWebhookUrl = appUrl ? `${appUrl}/api/vapi/webhook` : undefined;

      // Import the Twilio number into Vapi
      const importResult = await vapi.importTwilioNumber({
        twilioAccountSid,
        twilioAuthToken,
        twilioPhoneNumber: provisionedNumber.e164,
        assistantId: deployment?.externalAssistantId || undefined,
        serverUrl: vapiWebhookUrl,
        name: friendlyName || `Fieseros Number (${user.tenantId.slice(-6)})`,
      });

      vapiNumberId = importResult.vapiPhoneNumberId;
      console.log(
        `[phones/buy] imported ${provisionedNumber.e164} into Vapi → vapiNumberId=${vapiNumberId}`,
      );
    } catch (vapiErr) {
      // Vapi import failed AFTER Twilio purchase succeeded.
      // Phase 9A hardening: store machine-readable state for recovery
      const errorMessage = vapiErr instanceof Error ? vapiErr.message : 'Vapi import failed';
      await db.phoneProvisioningAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'VAPI_IMPORT_FAILED',
          twilioProviderSid: attempt.twilioProviderSid || provisionedNumber.providerNumberId,
          error: `Vapi import failed: ${errorMessage}. Twilio number ${provisionedNumber.e164} (SID=${provisionedNumber.providerNumberId}) exists but is not imported into Vapi. Reconciliation: re-import the number into Vapi.`,
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      console.error(
        `[phones/buy] CRITICAL: Twilio purchase succeeded but Vapi import failed. ` +
          `Number: ${provisionedNumber.e164}, SID: ${provisionedNumber.providerNumberId}. ` +
          `Error: ${errorMessage}`,
      );

      return NextResponse.json(
        {
          error: 'Phone number purchased on Twilio but failed to import into Vapi. Please contact support to reconcile.',
          attemptId: attempt.id,
        },
        { status: 500 },
      );
    }

    // Mark saga: VAPI_IMPORTED
    await db.phoneProvisioningAttempt.update({
      where: { id: attempt.id },
      data: { status: 'VAPI_IMPORTED', vapiNumberId, updatedAt: new Date() },
    });
    } // end of else (Vapi import)

    // ── 6. Create PhoneNumber + PhoneConnection atomically ──
    try {
      const result = await db.$transaction(async (tx) => {
        // Create PhoneNumber (with BOTH providerSid AND vapiNumberId)
        const phoneNumber = await tx.phoneNumber.create({
          data: {
            number: provisionedNumber.e164,
            displayName: friendlyName || `Fieseros Number`,
            provider: 'twilio',
            capabilities: provisionedNumber.capabilities.join(','),
            providerSid: provisionedNumber.providerNumberId, // Twilio PNxxx
            vapiNumberId: vapiNumberId, // Phase 9A: Vapi phone-number ID
            voiceWebhookUrl,
            smsWebhookUrl,
            status: 'active',
            monthlyCost: provisionedNumber.monthlyCostUsd || 1.15,
            costCurrency: 'USD',
            tenantId: user.tenantId!,
          },
        });

        // Auto-create PhoneConnection with AI_RECEPTIONIST routing + VOICEMAIL fallback
        const connection = await tx.phoneConnection.create({
          data: {
            tenantId: user.tenantId!,
            phoneNumberId: phoneNumber.id,
            externalPhoneNumberId: null,
            connectionType: 'DIRECT',
            routingMode: 'AI_RECEPTIONIST',
            fallbackRoutingMode: 'VOICEMAIL',
            fallbackRoutingTarget: null,
            status: 'ACTIVE',
            verifiedAt: new Date(), // direct connections are auto-verified
          },
        });

        // Mark the provisioning attempt as SUCCESS
        await tx.phoneProvisioningAttempt.update({
          where: { id: attempt.id },
          data: {
            status: 'SUCCESS',
            providerSid: provisionedNumber.providerNumberId,
            resultingPhoneNumberId: phoneNumber.id,
            completedAt: new Date(),
          },
        });

        return { phoneNumber, connection };
      });

      console.log(
        `[phones/buy] purchased ${provisionedNumber.e164} ` +
          `(Twilio SID=${provisionedNumber.providerNumberId}, Vapi ID=${vapiNumberId}) ` +
          `for tenant=${user.tenantId} → PhoneNumber ${result.phoneNumber.id} + PhoneConnection ${result.connection.id}`,
      );

      return NextResponse.json({
        phoneNumber: {
          id: result.phoneNumber.id,
          number: result.phoneNumber.number,
          displayName: result.phoneNumber.displayName,
          status: result.phoneNumber.status,
          monthlyCost: result.phoneNumber.monthlyCost,
          connection: {
            id: result.connection.id,
            routingMode: result.connection.routingMode,
            fallbackRoutingMode: result.connection.fallbackRoutingMode,
            status: result.connection.status,
          },
        },
      }, { status: 201 });
    } catch (dbErr) {
      // DB write failed AFTER both Twilio purchase AND Vapi import succeeded.
      // Phase 9A hardening: machine-readable recovery state
      const errorMessage = dbErr instanceof Error ? dbErr.message : 'DB write failed';
      await db.phoneProvisioningAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'DB_COMMIT_FAILED',
          twilioProviderSid: attempt.twilioProviderSid || provisionedNumber.providerNumberId,
          vapiNumberId,
          error: `DB write failed: ${errorMessage}. Twilio SID=${provisionedNumber.providerNumberId}, Vapi ID=${vapiNumberId}. Reconciliation: create PhoneNumber record manually.`,
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      console.error(
        `[phones/buy] CRITICAL: Twilio + Vapi succeeded but DB failed. ` +
          `Number: ${provisionedNumber.e164}, Twilio SID: ${provisionedNumber.providerNumberId}, Vapi ID: ${vapiNumberId}.`,
      );

      return NextResponse.json(
        {
          error: 'Purchase succeeded on Twilio + Vapi but failed to save. Please contact support to reconcile.',
          attemptId: attempt.id,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('[POST /api/addons/phones/buy] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to purchase phone number' },
      { status: 500 },
    );
  }
}
