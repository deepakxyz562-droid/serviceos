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
  // Secret token sent in the Authorization/X-Vapi-Secret header
  serverUrlSecret?: string;
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
   * Phase 9.8: Build the OpenAI function-call tool schemas for the Vapi assistant.
   *
   * These tools map 1:1 to the handlers in ai-tool-handlers.ts. The LLM uses
   * these schemas to decide when to emit function-call requests, which Vapi
   * sends to our /api/vapi/function-call endpoint → AiToolDispatcher → handler.
   *
   * CRITICAL: Without these tool declarations, the LLM cannot emit function
   * calls, so create_lead / schedule_job / transfer_to_human etc. are never
   * invoked — the entire CRM action pipeline is dead code at runtime.
   *
   * The tools array includes all 13 non-restricted tools (cancel_job is
   * excluded because it's in RESTRICTED_CAPABILITIES).
   */
  private getToolSchemas() {
    return [
      // ── Read tools ──
      {
        type: 'function',
        function: {
          name: 'get_customer',
          description: 'Look up an existing customer by phone number or name. Use this when a caller identifies themselves or when you need to check if they are an existing customer.',
          parameters: {
            type: 'object',
            properties: {
              phone: { type: 'string', description: 'Phone number in E.164 or local format' },
              name: { type: 'string', description: 'Customer name (partial match, case-insensitive)' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_customer_jobs',
          description: 'Get recent jobs/appointments for a customer. Use this when an existing customer asks about their appointment status or upcoming service.',
          parameters: {
            type: 'object',
            properties: {
              customerId: { type: 'string', description: 'Customer ID from get_customer result' },
              phone: { type: 'string', description: 'Customer phone (alternative to customerId)' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_job',
          description: 'Get details of a specific job/appointment by ID.',
          parameters: {
            type: 'object',
            properties: {
              jobId: { type: 'string', description: 'Job ID' },
            },
            required: ['jobId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_business_hours',
          description: 'Get the business hours for this company. Use this when a caller asks about hours, when you are open, or when determining if the call is during or after business hours.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_service_options',
          description: 'Get the list of services this company offers, with prices and durations. Use this when a caller asks about services, pricing, or what the company does.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'check_availability',
          description: 'Check available appointment slots for a given date. Use this when a caller wants to book an appointment and needs to know what times are available.',
          parameters: {
            type: 'object',
            properties: {
              date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
            },
            required: ['date'],
          },
        },
      },
      // ── Action tools (write/reversible) ──
      {
        type: 'function',
        function: {
          name: 'create_lead',
          description: 'Create a new lead in the CRM. Use this when a caller expresses interest in a service, requests a quote, asks for a callback, or provides their contact information for follow-up. This is the primary action for capturing potential customers.',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Caller name (required if phone is not provided)' },
              phone: { type: 'string', description: 'Caller phone in E.164 or local format (required if name is not provided)' },
              email: { type: 'string', description: 'Caller email (optional)' },
              notes: { type: 'string', description: 'What the caller is interested in, any specific requests (optional)' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'create_customer',
          description: 'Create a new customer record in the CRM. Use this when a caller wants to become a customer (not just a lead) and provides their full contact information.',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Customer name (required)' },
              phone: { type: 'string', description: 'Customer phone (optional)' },
              email: { type: 'string', description: 'Customer email (optional)' },
              address: { type: 'string', description: 'Customer address (optional)' },
            },
            required: ['name'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'create_job_request',
          description: 'Create a job/service request (unscheduled). Use this when a caller describes a problem or service need but has not committed to a specific appointment time.',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Short title for the job (required)' },
              customerId: { type: 'string', description: 'Customer ID from get_customer or create_customer (required)' },
              description: { type: 'string', description: 'Detailed description of the service request (optional)' },
            },
            required: ['title', 'customerId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'schedule_job',
          description: 'Schedule a job/appointment for a specific date and time. Use this when a caller agrees to a specific appointment slot. This creates a scheduled job in the system.',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Short title for the appointment (required)' },
              customerId: { type: 'string', description: 'Customer ID (required)' },
              date: { type: 'string', description: 'Date in YYYY-MM-DD format (required)' },
              time: { type: 'string', description: 'Time in HH:MM 24-hour format (required)' },
              address: { type: 'string', description: 'Service address (optional)' },
            },
            required: ['title', 'customerId', 'date', 'time'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'reschedule_job',
          description: 'Reschedule an existing job/appointment to a new date and time. Use this when a caller wants to change their existing appointment.',
          parameters: {
            type: 'object',
            properties: {
              jobId: { type: 'string', description: 'Job ID to reschedule (required)' },
              date: { type: 'string', description: 'New date in YYYY-MM-DD format (required)' },
              time: { type: 'string', description: 'New time in HH:MM 24-hour format (required)' },
            },
            required: ['jobId', 'date', 'time'],
          },
        },
      },
      // ── External side effect tools ──
      {
        type: 'function',
        function: {
          name: 'send_sms',
          description: 'Send an SMS message to a phone number. Use this to send a follow-up message, confirmation, or summary to the caller after the conversation.',
          parameters: {
            type: 'object',
            properties: {
              to: { type: 'string', description: 'Recipient phone in E.164 format (required)' },
              message: { type: 'string', description: 'Message content (required, max 1600 chars)' },
            },
            required: ['to', 'message'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'transfer_to_human',
          description: 'Transfer the call to a human agent. Use this when the caller explicitly asks for a human, when the request is too complex for AI, or when the AI cannot help. If no target is specified, the receptionist\'s configured handoff number is used.',
          parameters: {
            type: 'object',
            properties: {
              target: { type: 'string', description: 'Phone number to transfer to (E.164). If omitted, uses the configured handoff number.' },
            },
          },
        },
      },
    ];
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
        // Phase 9.8: tools go INSIDE model (Vapi API puts function-call
        // tools on the model, not at the assistant top level)
        tools: this.getToolSchemas(),
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
        provider: 'openai',
        voiceId: 'alloy',
      },
      transcriber: {
        provider: 'deepgram',
        model: 'nova-2',
      },
      maxDurationSeconds: config.maxDurationSeconds,
      silenceTimeoutSeconds: config.silenceTimeoutSeconds,
      ...(config.serverUrl ? { serverUrl: config.serverUrl } : {}),
      ...(config.serverUrlSecret ? { serverUrlSecret: config.serverUrlSecret } : {}),
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
        // Phase 9.8: tools must be inside model for update too
        tools: this.getToolSchemas(),
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
        provider: 'openai',
        voiceId: 'alloy',
      },
      transcriber: {
        provider: 'deepgram',
        model: 'nova-2',
      },
      maxDurationSeconds: config.maxDurationSeconds,
      silenceTimeoutSeconds: config.silenceTimeoutSeconds,
      ...(config.serverUrl ? { serverUrl: config.serverUrl } : {}),
      ...(config.serverUrlSecret ? { serverUrlSecret: config.serverUrlSecret } : {}),
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
      number: params.twilioPhoneNumber, // Vapi API field is "number", not "twilioPhoneNumber"
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
    serverUrl?: string;
    serverUrlSecret?: string;
  }): Promise<void> {
    const auth = await this.getAuthHeader();

    const patchBody: Record<string, unknown> = {
      assistantId: params.assistantId,
    };
    if (params.serverUrl) {
      patchBody.serverUrl = params.serverUrl;
    }
    if (params.serverUrlSecret) {
      patchBody.serverUrlSecret = params.serverUrlSecret;
    }

    const response = await fetch(`${this.baseUrl}/phone-number/${params.vapiPhoneNumberId}`, {
      method: 'PATCH',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patchBody),
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
   * List all Vapi phone numbers (for reconciliation + finding existing numbers).
   */
  async listPhoneNumbers(): Promise<Array<{ id: string; number: string; assistantId: string | null; status: string }>> {
    const auth = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/phone-number`, {
      headers: { Authorization: auth },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vapi listPhoneNumbers failed: ${response.status} ${errorText}`);
    }
    return await response.json();
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
