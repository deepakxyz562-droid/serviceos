/**
 * Intent Router — Enterprise Agent Architecture Phase D
 * =================================================================
 *
 * Shared intent classification used by both chat routes.
 * Previously duplicated inline in:
 *   - /api/forms/agents/[id]/chat/route.ts (lines ~208-210)
 *   - /api/public/ai/agent-chat/route.ts (prompt-instructed)
 *
 * Classifies a user message into one of 4 modes:
 *   - answer: informational question (services, pricing, hours, areas)
 *   - action: booking, quote, intake, form fill request
 *   - clarify: low-confidence KB match — ask a clarifying question
 *   - escalate: human handoff request, angry customer, sensitive topic
 *
 * The mode determines what the agent does next:
 *   - answer → respond with knowledge
 *   - action → execute tools (booking, form, calculator)
 *   - clarify → ask a clarifying question
 *   - escalate → transfer to human
 */

export type IntentMode = 'answer' | 'action' | 'clarify' | 'escalate';

export interface IntentResult {
  mode: IntentMode;
  confidence: number;  // 0-1
  reason: string;
  isBookingOrIntake: boolean;
  isInformationalQuery: boolean;
}

// Booking/intake keywords (whole-word match)
const BOOKING_INTAKE_REGEX = /\b(book|appointment|schedule|quote|estimate|fill\s+form|apply|intake|reserve|call\s+me|hire|order|book\s+me|schedule\s+me|set\s+up|arrange)\b/i;

// Question/informational keywords
const QUESTION_REGEX = /\b(what|where|which|who|why|how|when|is|are|do|does|can|could|tell\s+me|details|info)\b/i;

// Informational topic keywords (not booking)
const INFORMATIONAL_REGEX = /\b(website|services?|areas?|locations?|cities|hours?|pricing|rates?|emergency|licensed?|insured|phone|email|address|contact|about)\b/i;

// Escalation keywords
const ESCALATION_KEYWORDS = [
  'human', 'manager', 'supervisor', 'real person', 'agent', 'representative',
  'angry', 'frustrated', 'upset', 'ridiculous', 'unacceptable', 'terrible',
  'worst', 'hate', 'complaint', 'sue', 'lawyer', 'attorney',
  'cancel my', 'refund', 'chargeback', 'dispute',
];

/**
 * Classify a user message into an intent mode.
 * Uses whole-word regex matching (not substring) to prevent false positives.
 */
export function classifyIntent(message: string): IntentResult {
  const lower = (message || '').toLowerCase().trim();

  // 1. Escalation detection (highest priority)
  const isEscalation = ESCALATION_KEYWORDS.some(kw => lower.includes(kw));
  if (isEscalation) {
    return {
      mode: 'escalate',
      confidence: 0.9,
      reason: 'escalation_keyword_detected',
      isBookingOrIntake: false,
      isInformationalQuery: false,
    };
  }

  // 2. Booking/intake detection
  const isBookingOrIntake = BOOKING_INTAKE_REGEX.test(lower);

  // 3. Informational query detection
  const isQuestion = QUESTION_REGEX.test(lower) || lower.includes('?');
  const isInformationalQuery = !isBookingOrIntake && (isQuestion || INFORMATIONAL_REGEX.test(lower));

  // 4. Determine mode
  if (isBookingOrIntake && !isInformationalQuery) {
    return {
      mode: 'action',
      confidence: 0.85,
      reason: 'booking_or_intake_keyword',
      isBookingOrIntake: true,
      isInformationalQuery: false,
    };
  }

  if (isInformationalQuery) {
    return {
      mode: 'answer',
      confidence: 0.8,
      reason: 'informational_query',
      isBookingOrIntake: false,
      isInformationalQuery: true,
    };
  }

  if (isBookingOrIntake && isInformationalQuery) {
    // Mixed — default to answer mode (safer than auto-booking)
    return {
      mode: 'answer',
      confidence: 0.6,
      reason: 'mixed_intent_defaulting_to_answer',
      isBookingOrIntake: true,
      isInformationalQuery: true,
    };
  }

  // Default: answer mode for any unrecognized message
  return {
    mode: 'answer',
    confidence: 0.5,
    reason: 'default_answer',
    isBookingOrIntake: false,
    isInformationalQuery: false,
  };
}
