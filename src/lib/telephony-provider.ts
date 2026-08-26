/**
 * TelephonyProvider Interface
 * ===========================
 *
 * Boundary between the phone domain layer and the actual telephony provider
 * (Twilio, Telnyx, etc.). The domain layer (PhoneNumberService) calls this
 * interface — it never imports Twilio/Telnyx SDKs directly.
 *
 * ARCHITECTURE (per Phase 3.5 directive):
 *   PhoneNumberService → TelephonyProvider → Twilio/Telnyx
 *
 * Phase 8.5+ status: the interface AND the concrete Twilio implementation
 * (src/lib/twilio-telephony-provider.ts) are both live. Future providers
 * (Telnyx, etc.) implement this same interface.
 *
 * IMPORTANT: Vapi is NOT a telephony provider — Vapi is the VOICE EXECUTION
 * layer (AI agent runtime). The telephony provider owns the phone network
 * (buying numbers, configuring webhooks, call forwarding). Vapi connects to
 * the telephony provider via import/attach.
 *
 *   TelephonyProvider (Twilio) → owns the phone number + voice webhook
 *   VoiceProvider (Vapi)       → handles the AI conversation
 *
 * The PhoneConnection model connects them: a PhoneNumber (from the
 * TelephonyProvider) is linked to an AiReceptionist (which has a
 * VoiceProvider deployment).
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProvisionNumberParams {
  countryCode: string; // 'US' | 'GB' | 'AU'
  capabilities: ('sms' | 'voice')[];
  friendlyName?: string;
  // The voice webhook URL that the provider should call on incoming calls.
  // This URL points to Fieseros' inbound voice handler (Phase 5 Vapi webhook).
  voiceWebhookUrl?: string;
  smsWebhookUrl?: string;
  // ── Phase 8.6: search → select → purchase ──────────────────────────────
  // The exact E.164 number the user selected from `searchNumbers()` results.
  // When provided, the provider MUST buy this exact number (not "first
  // available"). When omitted, the provider falls back to buying the first
  // available number from a search (legacy behaviour, kept for back-compat).
  phoneNumber?: string;
}

export interface ProvisionNumberResult {
  providerNumberId: string; // Twilio PNxxx SID / Telnyx number ID
  e164: string; // '+14155551234'
  friendlyName?: string;
  monthlyCostUsd?: number;
  capabilities: string[]; // ['sms', 'voice']
}

export interface ConfigureForwardingParams {
  providerNumberId: string;
  forwardTo: string; // E.164 destination
}

export interface TelephonyProvider {
  /**
   * Provision (buy) a new phone number from the provider.
   * Called by PhoneNumberService when a tenant buys a Fieseros number.
   */
  provisionNumber(params: ProvisionNumberParams): Promise<ProvisionNumberResult>;

  /**
   * Release (return) a phone number to the provider.
   * Called when a tenant cancels their subscription (after grace period).
   */
  releaseNumber(providerNumberId: string): Promise<void>;

  /**
   * Configure the voice webhook URL for a number.
   * This is how inbound calls reach Fieseros' routing logic.
   */
  configureWebhook(params: {
    providerNumberId: string;
    voiceWebhookUrl?: string;
    smsWebhookUrl?: string;
  }): Promise<void>;

  /**
   * Configure call forwarding on a number (for HUMAN_FORWARD routing mode).
   * This is provider-level forwarding — the carrier forwards the call
   * before it reaches Fieseros at all.
   */
  configureForwarding(params: ConfigureForwardingParams): Promise<void>;

  /**
   * Look up a number's details (capabilities, status, webhook URLs).
   * Used for syncing provider state with local DB.
   */
  lookupNumber(providerNumberId: string): Promise<{
    e164: string;
    status: string;
    capabilities: string[];
    voiceWebhookUrl?: string;
    smsWebhookUrl?: string;
  } | null>;

  /**
   * Validate the provider credentials (API key).
   * Called by the Superadmin "Test Connection" button.
   */
  validateCredentials(): Promise<{ valid: boolean; error?: string }>;

  /**
   * Search for available phone numbers to purchase.
   * Called by /api/addons/phones/search before the user selects a number.
   *
   * Phase 8.6: search → select → purchase. The user picks a specific number
   * from these results, then `provisionNumber({ phoneNumber })` buys it.
   *
   * Returns up to `limit` (default 10) available numbers matching the
   * requested country / area code / capabilities.
   */
  searchNumbers(params: {
    countryCode: string;
    areaCode?: string;
    capabilities: ('sms' | 'voice')[];
    limit?: number;
  }): Promise<AvailableNumber[]>;
}

// ─── Search result type ─────────────────────────────────────────────────────

export interface AvailableNumber {
  phoneNumber: string; // E.164, e.g. '+14155551234'
  friendlyName?: string;
  capabilities: { voice: boolean; sms: boolean };
  locality?: string | null;
  region?: string | null;
  isoCountry: string;
}

// ─── Factory (Phase 8.5: Twilio implementation wired) ──────────────────────

/**
 * Get the active telephony provider for the platform.
 *
 * Phase 8.5: returns a TwilioTelephonyProvider if TWILIO is configured in
 * AiProviderConfig and is ACTIVE. Returns null otherwise.
 *
 * The domain layer calls this to get a provider — it never imports
 * Twilio/Telnyx directly.
 */
export async function getTelephonyProvider(): Promise<TelephonyProvider | null> {
  const { getTwilioTelephonyProvider } = await import('@/lib/twilio-telephony-provider');
  return getTwilioTelephonyProvider();
}
