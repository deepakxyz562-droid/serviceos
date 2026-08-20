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
