/**
 * PhoneNumberService
 * =================
 *
 * Manages phone number provisioning, routing configuration, and verification
 * for the AI Receptionist add-on.
 *
 * ARCHITECTURAL BOUNDARY (per Phase 3 directive):
 *   Phone infrastructure decides WHERE the call should go (routing).
 *   It does NOT decide WHETHER the tenant has AI minutes remaining.
 *   That remains the job of the AdmissionController (Phase 2).
 *
 *   Phone routing → AI Admission Controller → UsageReservation → AI Runtime
 *
 * Three routing modes:
 *   AI_RECEPTIONIST → call goes to AI (then AdmissionController checks capacity)
 *   HUMAN_FORWARD   → call forwards to a human number (bypasses AI entirely)
 *   VOICEMAIL       → call goes to voicemail (no AI, no human)
 *
 * Three phone scenarios:
 *   1. Buy Fieseros number → PhoneConnection(DIRECT, AI_RECEPTIONIST)
 *   2. Forward existing number → PhoneConnection(FORWARDING, AI_RECEPTIONIST)
 *   3. Human forwarding → PhoneConnection(DIRECT, HUMAN_FORWARD, routingTarget)
 */

import { db } from '@/lib/db';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PhoneConnectionResult {
  id: string;
  tenantId: string;
  phoneNumberId: string;
  externalPhoneNumberId: string | null;
  connectionType: string;
  routingMode: string;
  routingTarget: string | null;
  status: string;
  verifiedAt: Date | null;
  createdAt: Date;
}

export interface ExternalPhoneNumberResult {
  id: string;
  tenantId: string;
  e164: string;
  label: string | null;
  country: string | null;
  verificationStatus: string;
  verifiedAt: Date | null;
  status: string;
}

export type RoutingMode = 'AI_RECEPTIONIST' | 'HUMAN_FORWARD' | 'VOICEMAIL';
export type ConnectionType = 'DIRECT' | 'FORWARDING';

// ─── Phone Connection Management ────────────────────────────────────────────

/**
 * Create a phone connection for a Fieseros-owned number (Scenario A: buy number).
 *
 * The PhoneNumber must already exist (provisioned via Twilio/Vapi in Phase 5).
 * This creates a PhoneConnection with `connectionType=DIRECT` + the specified
 * routing mode.
 *
 * If `routingMode=AI_RECEPTIONIST`, the call will go to the AI Receptionist
 * (Phase 4/5). The AdmissionController (Phase 2) checks capacity before AI answers.
 *
 * If `routingMode=HUMAN_FORWARD`, the call forwards to `routingTarget` (human).
 * No AI is involved — the AdmissionController is NOT called.
 */
export async function createDirectConnection(params: {
  tenantId: string;
  phoneNumberId: string;
  routingMode: RoutingMode;
  routingTarget?: string; // required for HUMAN_FORWARD
  fallbackRoutingMode?: 'HUMAN_FORWARD' | 'VOICEMAIL' | null;
  fallbackRoutingTarget?: string | null;
}): Promise<PhoneConnectionResult> {
  // Verify the phone number belongs to this tenant
  const phoneNumber = await db.phoneNumber.findFirst({
    where: { id: params.phoneNumberId, tenantId: params.tenantId },
  });

  if (!phoneNumber) {
    throw new Error('Phone number not found or does not belong to this tenant');
  }

  if (params.routingMode === 'HUMAN_FORWARD' && !params.routingTarget) {
    throw new Error('routingTarget is required for HUMAN_FORWARD routing mode');
  }

  if (params.fallbackRoutingMode === 'HUMAN_FORWARD' && !params.fallbackRoutingTarget) {
    throw new Error('fallbackRoutingTarget is required for HUMAN_FORWARD fallback mode');
  }

  // Check for an existing connection (one connection per phone number)
  const existing = await db.phoneConnection.findFirst({
    where: { phoneNumberId: params.phoneNumberId, tenantId: params.tenantId },
  });

  if (existing) {
    // Update the existing connection
    const updated = await db.phoneConnection.update({
      where: { id: existing.id },
      data: {
        routingMode: params.routingMode,
        routingTarget: params.routingTarget || null,
        fallbackRoutingMode: params.fallbackRoutingMode ?? undefined,
        fallbackRoutingTarget: params.fallbackRoutingTarget ?? undefined,
        status: 'ACTIVE',
      },
    });
    return serializeConnection(updated);
  }

  const connection = await db.phoneConnection.create({
    data: {
      tenantId: params.tenantId,
      phoneNumberId: params.phoneNumberId,
      externalPhoneNumberId: null,
      connectionType: 'DIRECT',
      routingMode: params.routingMode,
      routingTarget: params.routingTarget || null,
      fallbackRoutingMode: params.fallbackRoutingMode || null,
      fallbackRoutingTarget: params.fallbackRoutingTarget || null,
      status: 'ACTIVE',
      verifiedAt: new Date(), // direct connections are auto-verified
    },
  });

  return serializeConnection(connection);
}

/**
 * Create a forwarding connection (Scenario B: forward existing number).
 *
 * The customer's external number forwards to a Fieseros number. The
 * ExternalPhoneNumber must be verified before the connection is activated.
 *
 * Flow:
 *   1. Customer enters their existing number → ExternalPhoneNumber (PENDING)
 *   2. Fieseros assigns a Fieseros number → PhoneNumber (ACTIVE)
 *   3. PhoneConnection created (PENDING, FORWARDING, AI_RECEPTIONIST)
 *   4. Customer configures carrier forwarding + enters verification code
 *   5. PhoneConnection verified → ACTIVE
 */
export async function createForwardingConnection(params: {
  tenantId: string;
  externalE164: string;
  externalLabel?: string;
  externalCountry?: string;
  phoneNumberId: string; // Fieseros number to forward TO
  routingMode?: RoutingMode; // default: AI_RECEPTIONIST
}): Promise<{ connection: PhoneConnectionResult; externalPhone: ExternalPhoneNumberResult; verificationCode: string }> {
  const routingMode = params.routingMode || 'AI_RECEPTIONIST';

  // Verify the Fieseros phone number belongs to this tenant
  const phoneNumber = await db.phoneNumber.findFirst({
    where: { id: params.phoneNumberId, tenantId: params.tenantId },
  });

  if (!phoneNumber) {
    throw new Error('Fieseros phone number not found or does not belong to this tenant');
  }

  // Generate a 4-digit verification code
  const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
  const verificationExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Use a transaction: create ExternalPhoneNumber + PhoneConnection atomically
  const result = await db.$transaction(async (tx) => {
    // Check for an existing ExternalPhoneNumber with this e164 for this tenant
    const existingExternal = await tx.externalPhoneNumber.findFirst({
      where: { tenantId: params.tenantId, e164: params.externalE164 },
    });

    let externalPhone;
    if (existingExternal) {
      // Reset verification on the existing number
      externalPhone = await tx.externalPhoneNumber.update({
        where: { id: existingExternal.id },
        data: {
          label: params.externalLabel || existingExternal.label,
          country: params.externalCountry || existingExternal.country,
          verificationStatus: 'PENDING',
          verificationCode,
          verificationExpiresAt,
          verifiedAt: null,
          status: 'ACTIVE',
        },
      });
    } else {
      externalPhone = await tx.externalPhoneNumber.create({
        data: {
          tenantId: params.tenantId,
          e164: params.externalE164,
          label: params.externalLabel || null,
          country: params.externalCountry || null,
          verificationStatus: 'PENDING',
          verificationCode,
          verificationExpiresAt,
          status: 'ACTIVE',
        },
      });
    }

    // Check for an existing PhoneConnection for this external number
    const existingConnection = await tx.phoneConnection.findFirst({
      where: { externalPhoneNumberId: externalPhone.id, tenantId: params.tenantId },
    });

    let connection;
    if (existingConnection) {
      connection = await tx.phoneConnection.update({
        where: { id: existingConnection.id },
        data: {
          phoneNumberId: params.phoneNumberId,
          connectionType: 'FORWARDING',
          routingMode,
          status: 'PENDING', // stays PENDING until verified
          verifiedAt: null,
        },
      });
    } else {
      connection = await tx.phoneConnection.create({
        data: {
          tenantId: params.tenantId,
          phoneNumberId: params.phoneNumberId,
          externalPhoneNumberId: externalPhone.id,
          connectionType: 'FORWARDING',
          routingMode,
          status: 'PENDING',
        },
      });
    }

    return { connection, externalPhone };
  });

  return {
    connection: serializeConnection(result.connection),
    externalPhone: serializeExternalPhone(result.externalPhone),
    verificationCode,
  };
}

/**
 * Verify an external phone number (completes the forwarding setup).
 *
 * The customer enters the 4-digit code they received via verification call.
 * If correct + not expired, the ExternalPhoneNumber is marked VERIFIED and
 * the PhoneConnection is activated.
 */
export async function verifyExternalPhoneNumber(params: {
  tenantId: string;
  externalPhoneNumberId: string;
  code: string;
}): Promise<{ verified: boolean; reason?: string }> {
  const external = await db.externalPhoneNumber.findFirst({
    where: {
      id: params.externalPhoneNumberId,
      tenantId: params.tenantId,
    },
  });

  if (!external) {
    return { verified: false, reason: 'not_found' };
  }

  if (external.verificationStatus === 'VERIFIED') {
    return { verified: true, reason: 'already_verified' };
  }

  if (!external.verificationCode || external.verificationCode !== params.code) {
    return { verified: false, reason: 'invalid_code' };
  }

  if (external.verificationExpiresAt && external.verificationExpiresAt < new Date()) {
    return { verified: false, reason: 'code_expired' };
  }

  // Use a transaction: verify ExternalPhoneNumber + activate PhoneConnection
  await db.$transaction(async (tx) => {
    await tx.externalPhoneNumber.update({
      where: { id: external.id },
      data: {
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        verificationCode: null,
        verificationExpiresAt: null,
      },
    });

    // Activate any PENDING PhoneConnections for this external number
    await tx.phoneConnection.updateMany({
      where: {
        externalPhoneNumberId: external.id,
        tenantId: params.tenantId,
        status: 'PENDING',
      },
      data: {
        status: 'ACTIVE',
        verifiedAt: new Date(),
      },
    });
  });

  return { verified: true };
}

/**
 * Update the routing mode for a phone connection.
 *
 * This is how the tenant switches between AI Receptionist, Human Forward,
 * and Voicemail for a given phone number.
 *
 * ARCHITECTURAL RULE: This function ONLY changes WHERE the call goes.
 * It does NOT check or modify AI capacity (that's the AdmissionController's job).
 */
export async function updateRoutingMode(params: {
  tenantId: string;
  connectionId: string;
  routingMode: RoutingMode;
  routingTarget?: string;
  fallbackRoutingMode?: 'HUMAN_FORWARD' | 'VOICEMAIL' | null;
  fallbackRoutingTarget?: string | null;
}): Promise<PhoneConnectionResult> {
  const connection = await db.phoneConnection.findFirst({
    where: { id: params.connectionId, tenantId: params.tenantId },
  });

  if (!connection) {
    throw new Error('Phone connection not found or does not belong to this tenant');
  }

  if (params.routingMode === 'HUMAN_FORWARD' && !params.routingTarget) {
    throw new Error('routingTarget is required for HUMAN_FORWARD routing mode');
  }

  if (params.fallbackRoutingMode === 'HUMAN_FORWARD' && !params.fallbackRoutingTarget) {
    throw new Error('fallbackRoutingTarget is required for HUMAN_FORWARD fallback mode');
  }

  const updated = await db.phoneConnection.update({
    where: { id: connection.id },
    data: {
      routingMode: params.routingMode,
      routingTarget: params.routingTarget || null,
      // Phase 3.5: fallback routing when AI is unavailable
      fallbackRoutingMode: params.fallbackRoutingMode ?? undefined,
      fallbackRoutingTarget: params.fallbackRoutingTarget ?? undefined,
    },
  });

  return serializeConnection(updated);
}

/**
 * Get the routing decision for an incoming call to a Fieseros phone number.
 *
 * This is the entry point for the inbound call routing (Phase 5 Vapi webhook).
 * Given the destination phone number (the Fieseros number the call arrived on),
 * returns the routing decision: AI_RECEPTIONIST, HUMAN_FORWARD, or VOICEMAIL.
 *
 * If AI_RECEPTIONIST, the caller (Vapi webhook) must then call the
 * AdmissionController to check if the call is actually allowed.
 *
 * If HUMAN_FORWARD, the caller forwards to routingTarget immediately.
 * If VOICEMAIL, the caller routes to voicemail.
 */
export async function getRoutingDecision(
  destinationE164: string,
): Promise<{
  routingMode: RoutingMode | null;
  routingTarget: string | null;
  fallbackRoutingMode: 'HUMAN_FORWARD' | 'VOICEMAIL' | null;
  fallbackRoutingTarget: string | null;
  tenantId: string | null;
  phoneNumberId: string | null;
  connectionId: string | null;
} | null> {
  // Look up the PhoneNumber by the destination number
  const phoneNumber = await db.phoneNumber.findUnique({
    where: { number: destinationE164 },
    include: {
      phoneConnections: {
        where: { status: 'ACTIVE' },
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!phoneNumber) {
    return null; // unknown number — caller should reject
  }

  // Check if the number itself is active
  if (phoneNumber.status !== 'active') {
    return {
      routingMode: null,
      routingTarget: null,
      fallbackRoutingMode: null,
      fallbackRoutingTarget: null,
      tenantId: phoneNumber.tenantId,
      phoneNumberId: phoneNumber.id,
      connectionId: null,
    };
  }

  // Check for an active PhoneConnection
  const connection = phoneNumber.phoneConnections[0];
  if (!connection) {
    // No connection configured — default behavior depends on the number's voiceMode
    // (legacy compatibility — Phase 11 will remove this fallback)
    return {
      routingMode: null,
      routingTarget: phoneNumber.forwardToPhone || null,
      fallbackRoutingMode: null,
      fallbackRoutingTarget: null,
      tenantId: phoneNumber.tenantId,
      phoneNumberId: phoneNumber.id,
      connectionId: null,
    };
  }

  return {
    routingMode: connection.routingMode as RoutingMode,
    routingTarget: connection.routingTarget,
    // Phase 3.5: fallback routing when AI is unavailable
    // If fallbackRoutingMode is null, default to VOICEMAIL
    fallbackRoutingMode:
      (connection.fallbackRoutingMode as 'HUMAN_FORWARD' | 'VOICEMAIL' | null) || 'VOICEMAIL',
    fallbackRoutingTarget: connection.fallbackRoutingTarget,
    tenantId: phoneNumber.tenantId,
    phoneNumberId: phoneNumber.id,
    connectionId: connection.id,
  };
}

/**
 * List all phone connections for a tenant (for the UI).
 */
export async function listPhoneConnections(tenantId: string): Promise<PhoneConnectionResult[]> {
  const connections = await db.phoneConnection.findMany({
    where: { tenantId },
    include: {
      phoneNumber: {
        select: { id: true, number: true, displayName: true, status: true },
      },
      externalPhoneNumber: {
        select: { id: true, e164: true, label: true, verificationStatus: true, verifiedAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return connections.map((c) => ({
    ...serializeConnection(c),
    phoneNumber: c.phoneNumber,
    externalPhoneNumber: c.externalPhoneNumber,
  })) as PhoneConnectionResult[];
}

/**
 * Deactivate a phone connection (MANUAL — not auto-called on subscription suspension).
 *
 * Phase 3.5 hardening: This function is for MANUAL use by the tenant or
 * Superadmin — it is NOT automatically called when a subscription is suspended.
 *
 * The phone configuration stays ACTIVE even when the subscription is
 * SUSPENDED or EXPIRED. When AI is unavailable, the AdmissionController
 * rejects the call and the fallback routing mode takes over (HUMAN_FORWARD
 * or VOICEMAIL). This preserves the customer's configuration during payment
 * problems — consistent with "payment failure should not delete AI data/configuration."
 *
 * Use this function only when a tenant explicitly wants to disable a phone
 * connection (e.g., they're going on vacation and want all calls to voicemail).
 */
export async function deactivateConnection(
  tenantId: string,
  connectionId: string,
): Promise<void> {
  await db.phoneConnection.updateMany({
    where: { id: connectionId, tenantId },
    data: { status: 'INACTIVE' },
  });
}

/**
 * Reactivate a phone connection (MANUAL — not auto-called on subscription reactivation).
 *
 * See `deactivateConnection` for the Phase 3.5 rationale.
 */
export async function reactivateConnection(
  tenantId: string,
  connectionId: string,
): Promise<void> {
  await db.phoneConnection.updateMany({
    where: { id: connectionId, tenantId },
    data: { status: 'ACTIVE' },
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function serializeConnection(c: {
  id: string;
  tenantId: string;
  phoneNumberId: string;
  externalPhoneNumberId: string | null;
  connectionType: string;
  routingMode: string;
  routingTarget: string | null;
  status: string;
  verifiedAt: Date | null;
  createdAt: Date;
}): PhoneConnectionResult {
  return {
    id: c.id,
    tenantId: c.tenantId,
    phoneNumberId: c.phoneNumberId,
    externalPhoneNumberId: c.externalPhoneNumberId,
    connectionType: c.connectionType,
    routingMode: c.routingMode,
    routingTarget: c.routingTarget,
    status: c.status,
    verifiedAt: c.verifiedAt,
    createdAt: c.createdAt,
  };
}

function serializeExternalPhone(e: {
  id: string;
  tenantId: string;
  e164: string;
  label: string | null;
  country: string | null;
  verificationStatus: string;
  verifiedAt: Date | null;
  status: string;
}): ExternalPhoneNumberResult {
  return {
    id: e.id,
    tenantId: e.tenantId,
    e164: e.e164,
    label: e.label,
    country: e.country,
    verificationStatus: e.verificationStatus,
    verifiedAt: e.verifiedAt,
    status: e.status,
  };
}
