/**
 * TwilioTelephonyProvider
 * ======================
 *
 * Implements the TelephonyProvider interface for Twilio.
 *
 * ARCHITECTURE BOUNDARY (per Phase 8.5 directive):
 *   - This is the ONLY module that knows about Twilio API details.
 *   - PhoneNumberService calls `getTelephonyProvider()` — never Twilio directly.
 *   - Twilio credentials come from AiProviderConfig (platform-level, encrypted).
 *   - Tenant code never sees Twilio Account SID / Auth Token.
 *
 * The customer experiences "Fieseros as the phone provider" even though
 * Twilio is underneath.
 *
 * Twilio API: https://www.twilio.com/docs/phone-numbers/api
 */

import { getDecryptedApiKey } from '@/lib/ai-provider-config-service';
import type { TelephonyProvider, ProvisionNumberParams, ProvisionNumberResult, ConfigureForwardingParams, AvailableNumber } from '@/lib/telephony-provider';

// ─── Types ──────────────────────────────────────────────────────────────────

interface TwilioConfig {
  accountSid: string;
  authToken: string;
}

// ─── TwilioTelephonyProvider implementation ────────────────────────────────

class TwilioTelephonyProviderImpl implements TelephonyProvider {
  private baseUrl = 'https://api.twilio.com';

  /**
   * Get Twilio credentials from AiProviderConfig (encrypted in DB).
   * The configJson stores { accountSid, authToken } — but the authToken
   * is the sensitive part. We store it encrypted in encryptedApiKey.
   *
   * For Twilio, the "API key" is actually the Auth Token.
   * The Account SID is stored in configJson (non-secret).
   */
  private async getConfig(): Promise<TwilioConfig> {
    let authToken = '';
    let accountSid = '';

    try {
      const { getDecryptedApiKey } = await import('@/lib/ai-provider-config-service');
      authToken = (await getDecryptedApiKey('TWILIO')) || '';

      const config = await import('@/lib/db').then(db =>
        db.aiProviderConfig.findUnique({
          where: { provider: 'TWILIO' },
          select: { configJson: true },
        }),
      );

      if (config?.configJson) {
        const parsed = JSON.parse(config.configJson);
        accountSid = parsed.accountSid || '';
      }
    } catch {
      // Ignore DB errors — fall through to env vars
    }

    if (!authToken || !accountSid) {
      authToken = authToken || process.env.TWILIO_AUTH_TOKEN || '';
      accountSid = accountSid || process.env.TWILIO_ACCOUNT_SID || '';
    }

    if (!authToken || !accountSid) {
      throw new Error('Twilio credentials not configured. Superadmin must add TWILIO provider config.');
    }

    return { accountSid, authToken };
  }

  /**
   * Build the Basic Auth header for Twilio API calls.
   * Twilio uses Basic Auth with Account SID as username and Auth Token as password.
   */
  private async getAuthHeader(): Promise<string> {
    const { accountSid, authToken } = await this.getConfig();
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Provision (buy) a new phone number from Twilio.
   *
   * Flow:
   *   1. Search for available numbers in the requested area code
   *   2. Buy the first available number
   *   3. Configure voice + SMS webhooks
   *   4. Return the number details
   */
  async provisionNumber(params: ProvisionNumberParams): Promise<ProvisionNumberResult> {
    const auth = await this.getAuthHeader();
    const { accountSid } = await this.getConfig();

    // ── Phase 8.6: search → select → purchase ─────────────────────────────
    // If the caller passed a specific `phoneNumber` (the user selected one
    // from `searchNumbers()` results), buy THAT exact number. No search.
    // This is the only path the /api/addons/phones/buy route uses now.
    //
    // If `phoneNumber` is omitted (legacy callers), fall back to searching
    // for any available number and buying the first one. This preserves
    // backward compatibility but is discouraged — the user may not get the
    // number they expected.
    let numberToBuy: string;
    if (params.phoneNumber) {
      numberToBuy = params.phoneNumber;
    } else {
      // Legacy fallback: search + pick first available.
      const searchParams = new URLSearchParams({
        IsoCountry: params.countryCode || 'US',
        ...(params.capabilities.includes('voice') ? { VoiceEnabled: 'true' } : {}),
        ...(params.capabilities.includes('sms') ? { SmsEnabled: 'true' } : {}),
        Limit: '5',
      });

      const searchResponse = await fetch(
        `${this.baseUrl}/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/Local.json?${searchParams}`,
        {
          method: 'GET',
          headers: { Authorization: auth },
        },
      );

      if (!searchResponse.ok) {
        const error = await searchResponse.text();
        throw new Error(`Twilio search available numbers failed: ${searchResponse.status} ${error}`);
      }

      const searchData = await searchResponse.json();
      const availableNumbers = searchData.available_phone_numbers || [];

      if (availableNumbers.length === 0) {
        throw new Error(`No available phone numbers found for country ${params.countryCode || 'US'}`);
      }

      numberToBuy = availableNumbers[0].phone_number;
    }

    // Buy the number (either the exact one the user picked, or the first
    // available from the legacy fallback search above).
    const buyParams = new URLSearchParams({
      PhoneNumber: numberToBuy,
      ...(params.friendlyName ? { FriendlyName: params.friendlyName } : {}),
      ...(params.voiceWebhookUrl ? { VoiceUrl: params.voiceWebhookUrl } : {}),
      ...(params.voiceWebhookUrl ? { VoiceMethod: 'POST' } : {}),
      ...(params.smsWebhookUrl ? { SmsUrl: params.smsWebhookUrl } : {}),
      ...(params.smsWebhookUrl ? { SmsMethod: 'POST' } : {}),
    });

    const buyResponse = await fetch(
      `${this.baseUrl}/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
      {
        method: 'POST',
        headers: {
          Authorization: auth,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: buyParams.toString(),
      },
    );

    if (!buyResponse.ok) {
      const error = await buyResponse.text();
      throw new Error(`Twilio buy number failed: ${buyResponse.status} ${error}`);
    }

    const boughtNumber = await buyResponse.json();

    const capabilities: string[] = [];
    if (boughtNumber.capabilities?.voice) capabilities.push('voice');
    if (boughtNumber.capabilities?.sms) capabilities.push('sms');

    return {
      providerNumberId: boughtNumber.sid, // PNxxx
      e164: boughtNumber.phone_number, // +1xxxxxxxxxx
      friendlyName: boughtNumber.friendly_name || params.friendlyName,
      monthlyCostUsd: 1.15, // Twilio's standard monthly cost (approximate — actual varies by country)
      capabilities,
    };
  }

  /**
   * Release (return) a phone number to Twilio.
   * This releases the number from the Twilio account — the number goes back
   * to Twilio's pool and can be purchased by someone else.
   *
   * Called after the subscription grace period expires.
   */
  async releaseNumber(providerNumberId: string): Promise<void> {
    const auth = await this.getAuthHeader();
    const { accountSid } = await this.getConfig();

    const response = await fetch(
      `${this.baseUrl}/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${providerNumberId}.json`,
      {
        method: 'DELETE',
        headers: { Authorization: auth },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      // 404 means the number was already released — treat as success
      if (response.status === 404) return;
      throw new Error(`Twilio release number failed: ${response.status} ${error}`);
    }
  }

  /**
   * Configure the voice + SMS webhook URLs for a number.
   * This is how inbound calls/messages reach Fieseros' routing logic.
   */
  async configureWebhook(params: {
    providerNumberId: string;
    voiceWebhookUrl?: string;
    smsWebhookUrl?: string;
  }): Promise<void> {
    const auth = await this.getAuthHeader();
    const { accountSid } = await this.getConfig();

    const updateParams = new URLSearchParams();
    if (params.voiceWebhookUrl) {
      updateParams.append('VoiceUrl', params.voiceWebhookUrl);
      updateParams.append('VoiceMethod', 'POST');
    }
    if (params.smsWebhookUrl) {
      updateParams.append('SmsUrl', params.smsWebhookUrl);
      updateParams.append('SmsMethod', 'POST');
    }

    const response = await fetch(
      `${this.baseUrl}/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${params.providerNumberId}.json`,
      {
        method: 'POST',
        headers: {
          Authorization: auth,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: updateParams.toString(),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Twilio configure webhook failed: ${response.status} ${error}`);
    }
  }

  /**
   * Configure call forwarding on a number (for HUMAN_FORWARD routing mode).
   * Twilio's VoiceUrl will point to a Fieseros endpoint that redirects
   * to the human's number (via TwiML <Dial>).
   *
   * NOTE: This doesn't configure carrier-level forwarding. Instead, it
   * sets up the voice webhook to point to Fieseros' forwarding endpoint,
   * which generates TwiML to forward the call. This gives us full control
   * over the forwarding logic (fallback, business hours, etc.).
   */
  async configureForwarding(params: ConfigureForwardingParams): Promise<void> {
    // Forwarding is handled by Fieseros' voice webhook (which generates TwiML).
    // We just need to ensure the webhook URL is set (which configureWebhook does).
    // The actual forwarding target is stored in PhoneConnection.routingTarget.
    // No separate Twilio API call is needed — the webhook generates the TwiML.
    console.log(
      `[TwilioTelephonyProvider] forwarding configured for ${params.providerNumberId} → ${params.forwardTo} (via webhook TwiML)`,
    );
  }

  /**
   * Look up a number's details from Twilio.
   * Used for syncing provider state with local DB.
   */
  async lookupNumber(providerNumberId: string): Promise<{
    e164: string;
    status: string;
    capabilities: string[];
    voiceWebhookUrl?: string;
    smsWebhookUrl?: string;
  } | null> {
    const auth = await this.getAuthHeader();
    const { accountSid } = await this.getConfig();

    const response = await fetch(
      `${this.baseUrl}/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${providerNumberId}.json`,
      {
        method: 'GET',
        headers: { Authorization: auth },
      },
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      const error = await response.text();
      throw new Error(`Twilio lookup number failed: ${response.status} ${error}`);
    }

    const data = await response.json();
    const capabilities: string[] = [];
    if (data.capabilities?.voice) capabilities.push('voice');
    if (data.capabilities?.sms) capabilities.push('sms');

    return {
      e164: data.phone_number,
      status: data.status || 'in-use',
      capabilities,
      voiceWebhookUrl: data.voice_url || undefined,
      smsWebhookUrl: data.sms_url || undefined,
    };
  }

  /**
   * Validate the Twilio credentials.
   * Calls the Twilio API to fetch the account details.
   */
  async validateCredentials(): Promise<{ valid: boolean; error?: string }> {
    try {
      const auth = await this.getAuthHeader();
      const { accountSid } = await this.getConfig();

      const response = await fetch(
        `${this.baseUrl}/2010-04-01/Accounts/${accountSid}.json`,
        {
          method: 'GET',
          headers: { Authorization: auth },
        },
      );

      if (!response.ok) {
        const error = await response.text();
        return { valid: false, error: `Twilio API error: ${response.status} ${error}` };
      }

      return { valid: true };
    } catch (err) {
      return { valid: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * Search for available Twilio phone numbers to purchase.
   *
   * Calls Twilio's AvailablePhoneNumbers/Local endpoint with the requested
   * country code, optional area code, and capability filters. Returns up to
   * `limit` (default 10) numbers, normalised to the AvailableNumber shape
   * defined in the TelephonyProvider interface.
   *
   * Used by /api/addons/phones/search (the "search → select → purchase"
   * flow). The user picks one of these numbers, then /api/addons/phones/buy
   * calls `provisionNumber({ phoneNumber })` to buy the exact one.
   */
  async searchNumbers(params: {
    countryCode: string;
    areaCode?: string;
    capabilities: ('sms' | 'voice')[];
    limit?: number;
  }): Promise<AvailableNumber[]> {
    const auth = await this.getAuthHeader();
    const { accountSid } = await this.getConfig();

    const countryCode = params.countryCode || 'US';
    const searchUrl = new URL(
      `${this.baseUrl}/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/${countryCode}/Local.json`,
    );
    if (params.areaCode) searchUrl.searchParams.set('AreaCode', params.areaCode);
    if (params.capabilities.includes('voice')) searchUrl.searchParams.set('VoiceEnabled', 'true');
    if (params.capabilities.includes('sms')) searchUrl.searchParams.set('SmsEnabled', 'true');
    // Twilio caps this at 30 per request; we default to 10.
    searchUrl.searchParams.set('Limit', String(Math.min(params.limit ?? 10, 30)));

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: { Authorization: auth },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Twilio search failed: ${response.status} ${error}`);
    }

    const data = await response.json();
    const raw = (data.available_phone_numbers || []) as Array<Record<string, unknown>>;

    return raw.map((n) => {
      const caps = (n.capabilities ?? {}) as { voice?: boolean; sms?: boolean };
      return {
        phoneNumber: n.phone_number as string,
        friendlyName: (n.friendly_name as string | undefined) ?? undefined,
        capabilities: {
          voice: caps.voice ?? false,
          sms: caps.sms ?? false,
        },
        locality: (n.locality as string | null) ?? null,
        region: (n.region as string | null) ?? null,
        isoCountry: (n.iso_country as string) || params.countryCode || 'US',
      };
    });
  }
}

// ─── Singleton + factory ────────────────────────────────────────────────────

let _instance: TwilioTelephonyProviderImpl | null = null;

/**
 * Get the TwilioTelephonyProvider singleton.
 *
 * Credentials are fetched from AiProviderConfigService on each call
 * (cached for 60 seconds). Never stored on the instance.
 */
export function getTwilioTelephonyProvider(): TwilioTelephonyProviderImpl {
  if (!_instance) {
    _instance = new TwilioTelephonyProviderImpl();
  }
  return _instance;
}
