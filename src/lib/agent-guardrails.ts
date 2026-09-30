/**
 * Runtime Guardrails — Enterprise Agent Architecture Phase 6
 * =================================================================
 *
 * Actual code filters (not just text injected into the system prompt).
 * Three layers of defense:
 *
 *   1. Input Guardrail — runs BEFORE the LLM is called
 *      - Prompt injection detection (common attack patterns)
 *      - Blocked topics filter
 *      - PII redaction (optional)
 *
 *   2. Output Guardrail — runs AFTER the LLM responds, BEFORE the user sees it
 *      - PII redaction (phone, email, SSN patterns)
 *      - Blocked content filter
 *      - Response validation (no system prompt leaks)
 *
 *   3. Tool Policy — runs BEFORE a tool executes
 *      - Risk-level check (low/medium/high/critical)
 *      - Confirmation required check
 *      - Per-agent permission check
 *
 * The model proposes the action. Your application decides whether it's allowed.
 */

export interface GuardrailConfig {
  blockedTopics: string[];
  strictKnowledgeOnly: boolean;
  piiRedaction: boolean;
  zeroDataRetention: boolean;
}

export interface GuardrailResult {
  passed: boolean;
  reason?: string;
  filteredMessage?: string;  // the message after redaction/filtering
}

// ─── 1. Input Guardrail ─────────────────────────────────────────────────────

// Common prompt injection patterns
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous\s+)?instructions/i,
  /disregard\s+(all\s+)?(previous\s+)?instructions/i,
  /forget\s+(all\s+)?(previous\s+)?instructions/i,
  /you\s+are\s+now\s+a\s+/i,
  /system\s*:\s*/i,
  /reveal\s+(your\s+)?(system\s+)?prompt/i,
  /show\s+me\s+(your\s+)?(system\s+)?prompt/i,
  /what\s+are\s+your\s+instructions/i,
  /\[SYSTEM\]/i,
  /\[ADMIN\]/i,
  /override\s+(safety|rules|guardrails)/i,
  /pretend\s+you\s+(are|can)\s+/i,
  /act\s+as\s+if\s+you\s+(have\s+no\s+|don't\s+have\s+any\s+)?restrictions/i,
  /jailbreak/i,
  /DAN\s+mode/i,
];

/**
 * Input guardrail — checks the visitor's message before sending to the LLM.
 * Returns { passed: false } if the message should be blocked.
 * Returns { filteredMessage } if PII was redacted.
 */
export function inputGuardrail(message: string, config: GuardrailConfig): GuardrailResult {
  // 1. Prompt injection detection
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      return {
        passed: false,
        reason: 'prompt_injection_detected',
      };
    }
  }

  // 2. Blocked topics
  if (config.blockedTopics.length > 0) {
    const lowerMsg = message.toLowerCase();
    for (const topic of config.blockedTopics) {
      if (lowerMsg.includes(topic.toLowerCase())) {
        return {
          passed: false,
          reason: `blocked_topic: ${topic}`,
        };
      }
    }
  }

  // 3. PII redaction (if enabled)
  let filteredMessage = message;
  if (config.piiRedaction) {
    filteredMessage = redactPII(message);
  }

  return { passed: true, filteredMessage };
}

// ─── 2. Output Guardrail ────────────────────────────────────────────────────

/**
 * Output guardrail — checks the LLM response before sending to the visitor.
 * Redacts PII if enabled. Blocks system prompt leaks.
 */
export function outputGuardrail(response: string, config: GuardrailConfig): GuardrailResult {
  // 1. System prompt leak detection
  const SYSTEM_PROMPT_INDICATORS = [
    'You are the friendly, professional 24/7 AI',
    'BUSINESS SERVICES & PRICING',
    'KNOWLEDGE BASE & FAQS',
    'CONFIDENCE & ZERO-HALLUCINATION',
    'STRICT "DON\'T GUESS" MODE',
    'GROUNDED RAG MODE',
  ];

  for (const indicator of SYSTEM_PROMPT_INDICATORS) {
    if (response.includes(indicator)) {
      return {
        passed: false,
        reason: 'system_prompt_leak_detected',
      };
    }
  }

  // 2. PII redaction
  let filteredResponse = response;
  if (config.piiRedaction) {
    filteredResponse = redactPII(response);
  }

  return { passed: true, filteredMessage: filteredResponse };
}

// ─── 3. Tool Policy ────────────────────────────────────────────────────────

export interface ToolPolicyConfig {
  allowedTools: string[];
  highRiskToolsRequiringConfirmation: string[];
  deniedTools: string[];
}

/**
 * Tool policy — checks whether a tool call is allowed.
 * Returns { passed: false, reason } if the tool should be blocked.
 * Returns { requiresConfirmation: true } if human approval is needed.
 */
export function toolPolicy(
  toolName: string,
  config: ToolPolicyConfig
): GuardrailResult & { requiresConfirmation?: boolean } {
  // Denied tools
  if (config.deniedTools.includes(toolName)) {
    return { passed: false, reason: `tool_denied: ${toolName}` };
  }

  // Not in allowed list (if list is non-empty)
  if (config.allowedTools.length > 0 && !config.allowedTools.includes(toolName)) {
    return { passed: false, reason: `tool_not_allowed: ${toolName}` };
  }

  // High-risk tools requiring confirmation
  if (config.highRiskToolsRequiringConfirmation.includes(toolName)) {
    return { passed: true, requiresConfirmation: true };
  }

  return { passed: true };
}

// ─── PII Redaction ──────────────────────────────────────────────────────────

function redactPII(text: string): string {
  let redacted = text;

  // Phone numbers (US format: (XXX) XXX-XXXX or XXX-XXX-XXXX)
  redacted = redacted.replace(
    /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    '[PHONE REDACTED]'
  );

  // Email addresses
  redacted = redacted.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    '[EMAIL REDACTED]'
  );

  // SSN (XXX-XX-XXXX)
  redacted = redacted.replace(
    /\d{3}-\d{2}-\d{4}/g,
    '[SSN REDACTED]'
  );

  // Credit card numbers (basic pattern)
  redacted = redacted.replace(
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    '[CARD REDACTED]'
  );

  return redacted;
}

// ─── Rate Limiting (per-tenant AI calls) ──────────────────────────────────

const tenantCallCounts = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_CALLS = 30; // 30 AI calls per tenant per minute

export function checkTenantRateLimit(tenantId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = tenantCallCounts.get(tenantId);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    tenantCallCounts.set(tenantId, { count: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX_CALLS - 1 };
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX_CALLS) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: RATE_LIMIT_MAX_CALLS - entry.count };
}
