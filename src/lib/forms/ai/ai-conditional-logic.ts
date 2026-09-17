/**
 * AI Conditional Logic Parser (heuristic)
 * ----------------------------------------
 * Converts a natural-language sentence into a ConditionalRule. Returns null
 * when no rule could be confidently inferred.
 *
 * TODO: integrate z-ai-web-dev-sdk LLM for free-form natural-language parsing.
 */
import type { ConditionalRule, FormField } from '@/lib/forms/form-schema-types';

type Operator = ConditionalRule['operator'];
type Action = ConditionalRule['action'];

interface OperatorPattern {
  operator: Operator;
  regex: RegExp;
  extractValue?: (match: RegExpMatchArray) => string;
}

const OPERATOR_PATTERNS: OperatorPattern[] = [
  { operator: 'equals', regex: /\b(is|equals?|matches?|set to|chosen as)\b\s+(?:to\s+)?["']?([^"'.]+?)["']?(?:\.|$)/i, extractValue: (m) => m[2].trim() },
  { operator: 'not_equals', regex: /\b(is not|isn't|does not equal|doesn't equal|not equal to)\b\s+["']?([^"'.]+?)["']?(?:\.|$)/i, extractValue: (m) => m[2].trim() },
  { operator: 'contains', regex: /\b(contains?|includes?|has)\b\s+["']?([^"'.]+?)["']?(?:\.|$)/i, extractValue: (m) => m[2].trim() },
  { operator: 'is_empty', regex: /\b(is empty|is blank|is not filled|left blank|not provided)\b/i },
  { operator: 'is_not_empty', regex: /\b(is not empty|is filled|is provided|has a value|is set)\b/i },
];

interface ActionPattern {
  action: Action;
  regex: RegExp;
}

const ACTION_PATTERNS: ActionPattern[] = [
  { action: 'show', regex: /\b(show|display|reveal)\b\s+(?:the\s+)?(.+?)(?:\.|$)/i },
  { action: 'hide', regex: /\b(hide|remove)\b\s+(?:the\s+)?(.+?)(?:\.|$)/i },
  { action: 'require', regex: /\b(require|make mandatory|make required)\b\s+(?:the\s+)?(.+?)(?:\.|$)/i },
  { action: 'skip_to_step', regex: /\b(skip to|jump to|go to)\b\s+(?:step\s+)?(.+?)(?:\.|$)/i },
];

function findField(allFields: FormField[], label: string): FormField | null {
  const lower = label.trim().toLowerCase();
  if (!lower) return null;
  // Exact label match first
  let match = allFields.find((f) => f.label.toLowerCase() === lower);
  if (match) return match;
  // Partial label contains
  match = allFields.find((f) => f.label.toLowerCase().includes(lower) || lower.includes(f.label.toLowerCase()));
  if (match) return match;
  // Match by placeholder or name
  match = allFields.find((f) => (f.placeholder?.toLowerCase().includes(lower) || f.name?.toLowerCase().includes(lower)));
  return match ?? null;
}

export async function parseConditionalFromPrompt(
  prompt: string,
  allFields: FormField[],
): Promise<ConditionalRule | null> {
  const text = (prompt || '').trim();
  if (!text || allFields.length === 0) return null;

  // 1. Find a source field: scan for any field label mentioned in the prompt
  let sourceField: FormField | null = null;
  let sourceMatch: RegExpMatchArray | null = null;
  for (const f of allFields) {
    const re = new RegExp(`\\b${escapeRegex(f.label)}\\b`, 'i');
    const m = text.match(re);
    if (m) {
      sourceField = f;
      sourceMatch = m;
      break;
    }
  }
  if (!sourceField || !sourceMatch) return null;

  // 2. Find operator + value after the field mention
  const tail = text.slice(sourceMatch.index! + sourceMatch[0].length);
  let operator: Operator | null = null;
  let value: string | undefined;
  for (const op of OPERATOR_PATTERNS) {
    const m = tail.match(op.regex);
    if (m) {
      operator = op.operator;
      value = op.extractValue?.(m);
      break;
    }
  }
  if (!operator) return null;

  // 3. Find action + target field/step
  let action: Action | null = null;
  let targetFieldId: string | undefined;
  let targetStepId: string | undefined;
  for (const ap of ACTION_PATTERNS) {
    const m = text.match(ap.regex);
    if (m) {
      action = ap.action;
      const targetLabel = m[2].trim();
      const tf = findField(allFields, targetLabel);
      if (tf) targetFieldId = tf.id;
      else if (action === 'skip_to_step') targetStepId = targetLabel.replace(/\s+/g, '_').toLowerCase();
      break;
    }
  }
  if (!action) return null;

  return {
    id: `rule_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    sourceFieldId: sourceField.id,
    operator,
    value: value ?? '',
    action,
    targetFieldId,
    targetStepId,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export { parseConditionalFromPrompt as default };
