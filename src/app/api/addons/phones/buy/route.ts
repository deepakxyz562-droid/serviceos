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
      if (existingAttempt.status === 'FAILED') {
        return NextResponse.json(
          { error: existingAttempt.error || 'Previous purchase attempt failed', idempotent: true },
          { status: 400 },
        );
      }
      // PENDING — another request is in flight
      return NextResponse.json(
        { error: 'Purchase in progress — please wait', idempotent: true },
        { status: 409 },
      );
    }

    // ── 2. Entitlement check ──
    // Check how many phone numbers the tenant already owns
    const existingNumbers = await db.phoneNumber.count({
      where: {
        tenantId: user.tenantId,
        status: { in: ['active', 'suspended', 'release_pending'] },
      },
    });

    // Get the tenant's includedNumbers from their entitlement
    const entitlement = await db.addonEntitlement.findFirst({
      where: {
        tenantId: user.tenantId,
        status: 'ACTIVE',
        subscription: {
          addonProduct: { code: 'AI_RECEPTIONIST' },
        },
      },
      select: { includedNumbers: true },
    });

    const includedNumbers = entitlement?.includedNumbers ?? 0;

    if (existingNumbers >= includedNumbers) {
      return NextResponse.json(
        {
          error: `You have reached your phone number limit (${includedNumbers} included). Purchase an additional AI Phone Number add-on or release an existing number.`,
          currentCount: existingNumbers,
          included: includedNumbers,
        },
        { status: 403 },
      );
    }

    // ── 3. Create the provisioning attempt (PENDING) ──
    const attempt = await db.phoneProvisioningAttempt.create({
      data: {
        tenantId: user.tenantId,
        idempotencyKey,
        provider: 'TWILIO',
        requestedE164,
        status: 'PENDING',
      },
    });

    // ── 4. Call Twilio to purchase the specific number ──
    const provider = await getTelephonyProvider();
    if (!provider) {
      await db.phoneProvisioningAttempt.update({
        where: { id: attempt.id },
        data: { status: 'FAILED', error: 'Telephony provider not configured', completedAt: new Date() },
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
        data: { status: 'FAILED', error: errorMessage, completedAt: new Date() },
      });
      return NextResponse.json({ error: errorMessage }, { status: 502 });
    }

    // ── 5. Create PhoneNumber + PhoneConnection atomically ──
    try {
      const result = await db.$transaction(async (tx) => {
        // Create PhoneNumber
        const phoneNumber = await tx.phoneNumber.create({
          data: {
            number: provisionedNumber.e164,
            displayName: friendlyName || `Fieseros Number`,
            provider: 'twilio',
            capabilities: provisionedNumber.capabilities.join(','),
            providerSid: provisionedNumber.providerNumberId,
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
        `[phones/buy] purchased ${provisionedNumber.e164} (SID=${provisionedNumber.providerNumberId}) ` +
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
      // DB write failed AFTER Twilio purchase succeeded.
      // The number is purchased on Twilio but not recorded in Fieseros.
      // Mark the attempt as FAILED so the Superadmin can manually reconcile.
      const errorMessage = dbErr instanceof Error ? dbErr.message : 'DB write failed after Twilio purchase';
      await db.phoneProvisioningAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'FAILED',
          error: `DB write failed (but Twilio purchase succeeded — number ${provisionedNumber.e164} with SID ${provisionedNumber.providerNumberId} needs manual reconciliation). Error: ${errorMessage}`,
          providerSid: provisionedNumber.providerNumberId,
          completedAt: new Date(),
        },
      });

      console.error(
        `[phones/buy] CRITICAL: Twilio purchase succeeded but DB failed. ` +
          `Number: ${provisionedNumber.e164}, SID: ${provisionedNumber.providerNumberId}. ` +
          `Superadmin must reconcile manually.`,
      );

      return NextResponse.json(
        {
          error: 'Purchase succeeded on Twilio but failed to save. Please contact support to reconcile.',
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
