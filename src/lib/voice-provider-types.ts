/**
 * VoiceProvider Interface Types
 * ==============================
 *
 * The interface boundary between the AI domain layer and the voice provider
 * (Vapi). Phase 5 implements VapiVoiceProvider against this interface.
 *
 * The domain layer (AiCallOrchestrator) calls this interface — it never
 * imports Vapi API details directly.
 */

export interface VoiceProvider {
  createAssistant(config: unknown): Promise<{ assistantId: string }>;
  updateAssistant(assistantId: string, config: unknown): Promise<void>;
  deleteAssistant(assistantId: string): Promise<void>;
  attachPhoneNumber(assistantId: string, phoneNumberId: string): Promise<void>;
  detachPhoneNumber(assistantId: string, phoneNumberId: string): Promise<void>;
  transferCall(callId: string, target: string): Promise<void>;
}
