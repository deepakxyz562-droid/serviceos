import { db } from '@/lib/db';

/**
 * AiChatTurn Tracer — writes per-turn execution traces for text-based AI agent
 * conversations.
 *
 * Enterprise Agent Architecture — Phase 8: Traces
 *
 * Every message the AI processes generates one AiChatTurn row, storing:
 *   - Intent detected, urgency
 *   - Model used, prompt version, temperature
 *   - Retrieved knowledge doc IDs, confidence tier/score
 *   - Token usage, cost
 *   - Tool calls JSON
 *   - Response text, card type
 *   - Latency
 *   - Outcome (answered, booked, escalated, failed, blocked)
 *
 * This is the foundation for debugging, evaluation, and continuous improvement.
 */

export interface ChatTurnTraceInput {
  sessionId?: string | null;
  tenantId?: string | null;
  workspaceId?: string | null;
  agentId?: string | null;
  formId?: string | null;
  userMessage: string;
  historyLength?: number;
  intent?: string | null;
  urgency?: string | null;
  retrievedDocIds?: string[];
  confidenceTier?: string | null;
  confidenceScore?: number | null;
  modelUsed?: string | null;
  promptVersion?: string | null;
  temperature?: number | null;
  promptTokens?: number;
  completionTokens?: number;
  costUsd?: number;
  toolCallsJson?: string;
  responseText?: string;
  cardType?: string | null;
  latencyMs?: number;
  outcome?: string;
  failureCategory?: string | null;
}

/**
 * Write a trace row for a single chat turn. Fire-and-forget — never blocks
 * the response to the visitor. Errors are logged but never thrown.
 */
export function traceChatTurn(input: ChatTurnTraceInput): void {
  // Fire-and-forget — don't block the response
  _traceChatTurn(input).catch((err) => {
    console.warn('[traceChatTurn] Failed to write trace:', err);
  });
}

async function _traceChatTurn(input: ChatTurnTraceInput): Promise<void> {
  await db.aiChatTurn.create({
    data: {
      sessionId: input.sessionId || null,
      tenantId: input.tenantId || null,
      workspaceId: input.workspaceId || null,
      agentId: input.agentId || null,
      formId: input.formId || null,
      userMessage: input.userMessage.slice(0, 5000),
      historyLength: input.historyLength || 0,
      intent: input.intent || null,
      urgency: input.urgency || null,
      retrievedDocIds: JSON.stringify(input.retrievedDocIds || []),
      confidenceTier: input.confidenceTier || null,
      confidenceScore: input.confidenceScore || null,
      modelUsed: input.modelUsed || null,
      promptVersion: input.promptVersion || null,
      temperature: input.temperature || null,
      promptTokens: input.promptTokens || 0,
      completionTokens: input.completionTokens || 0,
      costUsd: input.costUsd || 0,
      toolCallsJson: input.toolCallsJson || '[]',
      responseText: (input.responseText || '').slice(0, 2000),
      cardType: input.cardType || null,
      latencyMs: input.latencyMs || 0,
      outcome: input.outcome || 'answered',
      failureCategory: input.failureCategory || null,
    },
  });
}
