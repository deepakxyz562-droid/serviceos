/**
 * VapiVoiceProvider
 * =================
 *
 * Implements the VoiceProvider interface for Vapi.ai.
 *
 * ARCHITECTURE BOUNDARY (per Phase 5 directive):
 *   - This is the ONLY module that imports Vapi API details.
 *   - AiReceptionistService never calls Vapi directly.
 *   - AiCallOrchestrator calls this provider, which calls Vapi.
 *   - Provider credentials are fetched from AiProviderConfigService
 *     (encrypted in DB, decrypted in memory, never logged).
 *
 * Flow:
 *   AiCallOrchestrator → VapiVoiceProvider → Vapi REST API
 *   AiProviderConfigService provides the decrypted key (never exposed to caller)
 */

import { getDecryptedApiKey } from '@/lib/ai-provider-config-service';
import type { VoiceProvider } from '@/lib/voice-provider-types';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VapiAssistantConfig {
  name: string;
  systemPrompt: string;
  voice: string;
  model: string;
  temperature: number;
  maxTokens: number;
  greeting: string;
  maxDurationSeconds: number;
  silenceTimeoutSeconds: number;
  // The function-call server URL (Vapi sends tool-call requests here)
  serverUrl?: string;
  // The webhook URL (Vapi sends call lifecycle events here)
  webhookUrl?: string;
}

export interface CreateAssistantResult {
  assistantId: string;
}

export interface VapiCallResult {
  callId: string;
  status: string;
}

// ─── VapiVoiceProvider implementation ──────────────────────────────────────

class VapiVoiceProviderImpl implements VoiceProvider {
  private baseUrl = 'https://api.vapi.ai';

  /**
   * Get the Vapi API key (decrypted from AiProviderConfig).
   * Throws if the key is not available or the provider is not ACTIVE.
   */
  private async getAuthHeader(): Promise<string> {
    const apiKey = await getDecryptedApiKey('VAPI');
    if (!apiKey) {
      throw new Error('Vapi API key not configured or provider not ACTIVE');
    }
    return `Bearer ${apiKey}`;
  }

  /**
   * Create a Vapi assistant (called when deploying a new AiAgentVersion).
   */
  async createAssistant(config: VapiAssistantConfig): Promise<CreateAssistantResult> {
    const auth = await this.getAuthHeader();

    const body = {
      name: config.name,
      model: {
        provider: 'openai',
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        systemPrompt: config.systemPrompt,
        messages: [
          {
            role: 'system',
            content: config.systemPrompt,
          },
          {
            role: 'assistant',
            content: config.greeting,
          },
        ],
      },
      voice: {
        provider: '11labs',
        voiceId: config.voice,
      },
      transcriber: {
        provider: 'deepgram',
        model: 'nova-2',
      },
      // Vapi hard limits (enforced by Fieseros policy)
      maxDurationSeconds: config.maxDurationSeconds,
      silenceTimeoutSeconds: config.silenceTimeoutSeconds,
      // Function-call server URL (Vapi sends tool calls here)
      ...(config.serverUrl ? { serverUrl: config.serverUrl } : {}),
      // Webhook URL (Vapi sends call lifecycle events here)
      ...(config.webhookUrl ? { webhookUrl: config.webhookUrl } : {}),
    };

    const response = await fetch(`${this.baseUrl}/assistant`, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vapi createAssistant failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return { assistantId: data.id };
  }

  /**
   * Update a Vapi assistant (called when re-deploying an updated version).
   */
  async updateAssistant(assistantId: string, config: VapiAssistantConfig): Promise<void> {
    const auth = await this.getAuthHeader();

    const body = {
      name: config.name,
      model: {
        provider: 'openai',
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        systemPrompt: config.systemPrompt,
        messages: [
          {
            role: 'system',
            content: config.systemPrompt,
          },
          {
            role: 'assistant',
            content: config.greeting,
          },
        ],
      },
      voice: {
        provider: '11labs',
        voiceId: config.voice,
      },
      transcriber: {
        provider: 'deepgram',
        model: 'nova-2',
      },
      maxDurationSeconds: config.maxDurationSeconds,
      silenceTimeoutSeconds: config.silenceTimeoutSeconds,
      ...(config.serverUrl ? { serverUrl: config.serverUrl } : {}),
      ...(config.webhookUrl ? { webhookUrl: config.webhookUrl } : {}),
    };

    const response = await fetch(`${this.baseUrl}/assistant/${assistantId}`, {
      method: 'PATCH',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vapi updateAssistant failed: ${response.status} ${errorText}`);
    }
  }

  /**
   * Delete a Vapi assistant (called when a version is retired).
   */
  async deleteAssistant(assistantId: string): Promise<void> {
    const auth = await this.getAuthHeader();

    const response = await fetch(`${this.baseUrl}/assistant/${assistantId}`, {
      method: 'DELETE',
      headers: {
        Authorization: auth,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vapi deleteAssistant failed: ${response.status} ${errorText}`);
    }
  }

  /**
   * Attach a phone number to a Vapi assistant.
   * Called when a PhoneConnection is configured with routingMode=AI_RECEPTIONIST.
   */
  async attachPhoneNumber(assistantId: string, phoneNumberId: string): Promise<void> {
    const auth = await this.getAuthHeader();

    // Vapi expects the assistant ID to be set on the phone number
    const response = await fetch(`${this.baseUrl}/phone-number/${phoneNumberId}`, {
      method: 'PATCH',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ assistantId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vapi attachPhoneNumber failed: ${response.status} ${errorText}`);
    }
  }

  /**
   * Detach a phone number from its Vapi assistant.
   * Called when routingMode is changed away from AI_RECEPTIONIST, or when
   * the subscription is suspended (AI calls go to voicemail).
   */
  async detachPhoneNumber(assistantId: string, phoneNumberId: string): Promise<void> {
    const auth = await this.getAuthHeader();

    // Remove the assistant mapping from the phone number
    const response = await fetch(`${this.baseUrl}/phone-number/${phoneNumberId}`, {
      method: 'PATCH',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ assistantId: null }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vapi detachPhoneNumber failed: ${response.status} ${errorText}`);
    }
  }

  /**
   * Transfer a call to a human number (called by the transfer_call tool).
   */
  async transferCall(callId: string, target: string): Promise<void> {
    const auth = await this.getAuthHeader();

    const response = await fetch(`${this.baseUrl}/call/${callId}/phone-call-transfer`, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ destination: target }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vapi transferCall failed: ${response.status} ${errorText}`);
    }
  }

  /**
   * Get call details (used by the post-call webhook to fetch duration + cost).
   */
  async getCallDetails(callId: string): Promise<{
    id: string;
    status: string;
    durationSeconds: number;
    costUsd?: number;
    recordingUrl?: string;
    transcript?: Array<{ role: string; content: string; timestamp: string }>;
    analysis?: Record<string, unknown>;
    endedReason?: string;
  } | null> {
    const auth = await this.getAuthHeader();

    const response = await fetch(`${this.baseUrl}/call/${callId}`, {
      method: 'GET',
      headers: {
        Authorization: auth,
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      const errorText = await response.text();
      throw new Error(`Vapi getCallDetails failed: ${response.status} ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Create an outbound call (used by the Test Call feature).
   *
   * This calls the tenant's AI Receptionist from a customer-provided number.
   * Vapi dials the customer and connects them to the assistant.
   *
   * The `assistantId` and `phoneNumberId` come from the active AiProviderDeployment
   * and the PhoneNumber.vapiNumberId respectively — both are resolved by the
   * caller (the test-call API route) before invoking this method.
   *
   * Returns the Vapi call ID so the caller can poll for status / link to AiCall.
   */
  async createOutboundCall(params: {
    assistantId: string; // Vapi assistant ID (from AiProviderDeployment.externalAssistantId)
    phoneNumberId: string; // Vapi phone-number ID (from PhoneNumber.vapiNumberId)
    customerNumber: string; // E.164 number to dial
  }): Promise<{ callId: string; status: string }> {
    const auth = await this.getAuthHeader();

    const response = await fetch(`${this.baseUrl}/call`, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId: params.assistantId,
        phoneNumberId: params.phoneNumberId,
        customer: { number: params.customerNumber },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vapi createOutboundCall failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return {
      callId: data.id,
      status: data.status || 'queued',
    };
  }

  // ── Phase 9A: Vapi phone-number management ──────────────────────────────

  /**
   * Import a Twilio phone number into Vapi.
   *
   * This is the CRITICAL method for the Vapi number-binding gate.
   * After Fieseros purchases a number on Twilio, this method imports
   * that number into Vapi so Vapi can receive calls on it.
   *
   * Vapi creates its own phone-number resource (with its own ID) that
   * references the Twilio number. The returned `vapiPhoneNumberId` is
   * stored on `PhoneNumber.vapiNumberId` for reconciliation.
   *
   * Vapi API: POST /phone-number
   * Body: { provider: "twilio", twilioAccountSid, twilioAuthToken,
   *         twilioPhoneNumber, assistantId?, serverUrl?, name? }
   */
  async importTwilioNumber(params: {
    twilioAccountSid: string;
    twilioAuthToken: string;
    twilioPhoneNumber: string; // E.164 format: +1xxxxxxxxxx
    assistantId?: string; // Vapi assistant ID (if deployment exists)
    serverUrl?: string; // Vapi server URL for webhook events → Fieseros
    name?: string; // Friendly name
  }): Promise<{ vapiPhoneNumberId: string }> {
    const auth = await this.getAuthHeader();

    const body: Record<string, unknown> = {
      provider: 'twilio',
      twilioAccountSid: params.twilioAccountSid,
      twilioAuthToken: params.twilioAuthToken,
      twilioPhoneNumber: params.twilioPhoneNumber,
    };

    if (params.assistantId) body.assistantId = params.assistantId;
    if (params.serverUrl) body.serverUrl = params.serverUrl;
    if (params.name) body.name = params.name;

    const response = await fetch(`${this.baseUrl}/phone-number`, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vapi importTwilioNumber failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return { vapiPhoneNumberId: data.id };
  }

  /**
   * Configure the server URL on a Vapi phone number.
   *
   * The server URL is where Vapi sends webhook events:
   *   - status-update (call started/ringing/in_progress/ended)
   *   - end-of-call-report (call completed → finalize usage)
   *   - function-call (AI tool calls)
   *   - transcript (real-time transcript updates)
   *
   * This should point to Fieseros' /api/vapi/webhook endpoint.
   */
  async configurePhoneNumberServerUrl(params: {
    vapiPhoneNumberId: string;
    serverUrl: string;
  }): Promise<void> {
    const auth = await this.getAuthHeader();

    const response = await fetch(`${this.baseUrl}/phone-number/${params.vapiPhoneNumberId}`, {
      method: 'PATCH',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ serverUrl: params.serverUrl }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vapi configurePhoneNumberServerUrl failed: ${response.status} ${errorText}`);
    }
  }

  /**
   * Assign a Vapi assistant to a Vapi phone number.
   *
   * Called when:
   *   - A phone number is purchased + imported (if a deployment exists)
   *   - The tenant changes the AI Receptionist version (re-deploy)
   *   - The tenant activates AI routing on an existing number
   */
  async assignAssistantToPhoneNumber(params: {
    vapiPhoneNumberId: string;
    assistantId: string;
  }): Promise<void> {
    const auth = await this.getAuthHeader();

    const response = await fetch(`${this.baseUrl}/phone-number/${params.vapiPhoneNumberId}`, {
      method: 'PATCH',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ assistantId: params.assistantId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vapi assignAssistantToPhoneNumber failed: ${response.status} ${errorText}`);
    }
  }

  /**
   * Remove the assistant from a Vapi phone number.
   *
   * Called when:
   *   - The tenant switches routing mode away from AI_RECEPTIONIST
   *   - The subscription is suspended (calls go to fallback)
   *   - The number is being released
   */
  async detachAssistantFromPhoneNumber(vapiPhoneNumberId: string): Promise<void> {
    const auth = await this.getAuthHeader();

    const response = await fetch(`${this.baseUrl}/phone-number/${vapiPhoneNumberId}`, {
      method: 'PATCH',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ assistantId: null }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vapi detachAssistantFromPhoneNumber failed: ${response.status} ${errorText}`);
    }
  }

  /**
   * Delete a Vapi phone number (removes the Vapi resource, NOT the Twilio number).
   *
   * Called when:
   *   - The phone number is released (after the 30-day grace period)
   *   - The number is being fully decommissioned
   *
   * NOTE: This only deletes the Vapi phone-number resource. The actual Twilio
   * number is released separately via TwilioTelephonyProvider.releaseNumber().
   */
  async deleteVapiPhoneNumber(vapiPhoneNumberId: string): Promise<void> {
    const auth = await this.getAuthHeader();

    const response = await fetch(`${this.baseUrl}/phone-number/${vapiPhoneNumberId}`, {
      method: 'DELETE',
      headers: { Authorization: auth },
    });

    if (!response.ok) {
      if (response.status === 404) return; // already deleted — treat as success
      const errorText = await response.text();
      throw new Error(`Vapi deleteVapiPhoneNumber failed: ${response.status} ${errorText}`);
    }
  }

  /**
   * Look up a Vapi phone number by ID (for reconciliation).
   */
  async lookupVapiPhoneNumber(vapiPhoneNumberId: string): Promise<{
    id: string;
    number: string;
    assistantId: string | null;
    serverUrl: string | null;
    status: string;
  } | null> {
    const auth = await this.getAuthHeader();

    const response = await fetch(`${this.baseUrl}/phone-number/${vapiPhoneNumberId}`, {
      method: 'GET',
      headers: { Authorization: auth },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      const errorText = await response.text();
      throw new Error(`Vapi lookupVapiPhoneNumber failed: ${response.status} ${errorText}`);
    }

    return await response.json();
  }
}

// ─── Singleton export ──────────────────────────────────────────────────────

let _instance: VapiVoiceProviderImpl | null = null;

/**
 * Get the VapiVoiceProvider singleton.
 *
 * The provider fetches the API key from AiProviderConfigService on each call
 * (cached for 60 seconds). The key is never stored as a field on the instance.
 */
export function getVapiVoiceProvider(): VapiVoiceProviderImpl {
  if (!_instance) {
    _instance = new VapiVoiceProviderImpl();
  }
  return _instance;
}
