/**
 * Conditional Email Routing
 * --------------------------
 * Given a form submission + a set of routing rules, determine which email
 * recipients should be notified and what subject line to use.
 *
 * Pure logic — no DB, no React. Safe to import from server or client.
 */
export interface EmailRoutingRule {
  id: string;
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' | 'is_empty' | 'is_not_empty';
  value?: string | number | boolean;
  recipients: string[];
  subject?: string;
  priority?: number; // lower = higher priority
}

export interface EmailRoutingResult {
  to: string[];
  subject: string;
  matchedRules: EmailRoutingRule[];
}

const DEFAULT_SUBJECT = 'New form submission received';

function getFieldValue(data: Record<string, unknown>, fieldId: string): unknown {
  if (fieldId in data) return data[fieldId];
  // Allow fieldId to be a label-like key with spaces
  const lower = fieldId.toLowerCase();
  for (const k of Object.keys(data)) {
    if (k.toLowerCase() === lower) return data[k];
  }
  // Allow fieldId-as-label embedded in keys
  for (const k of Object.keys(data)) {
    if (k.toLowerCase().includes(lower)) return data[k];
  }
  return undefined;
}

function match(value: unknown, operator: EmailRoutingRule['operator'], target: string | number | boolean | undefined): boolean {
  if (operator === 'is_empty') return value === undefined || value === null || value === '';
  if (operator === 'is_not_empty') return !(value === undefined || value === null || value === '');

  if (value === undefined || value === null) return false;

  switch (operator) {
    case 'equals': {
      if (typeof value === 'boolean') return value === target;
      return String(value) === String(target);
    }
    case 'not_equals': {
      if (typeof value === 'boolean') return value !== target;
      return String(value) !== String(target);
    }
    case 'contains': {
      return String(value).toLowerCase().includes(String(target ?? '').toLowerCase());
    }
    case 'gt': {
      const n = typeof value === 'number' ? value : parseFloat(String(value));
      const t = typeof target === 'number' ? target : parseFloat(String(target));
      return !isNaN(n) && !isNaN(t) && n > t;
    }
    case 'lt': {
      const n = typeof value === 'number' ? value : parseFloat(String(value));
      const t = typeof target === 'number' ? target : parseFloat(String(target));
      return !isNaN(n) && !isNaN(t) && n < t;
    }
    default:
      return false;
  }
}

export function routeEmail(
  submissionData: Record<string, unknown>,
  routingRules: EmailRoutingRule[],
): EmailRoutingResult {
  if (!routingRules || routingRules.length === 0) {
    return { to: [], subject: DEFAULT_SUBJECT, matchedRules: [] };
  }

  const matched = routingRules
    .filter((rule) => {
      const v = getFieldValue(submissionData, rule.fieldId);
      return match(v, rule.operator, rule.value);
    })
    .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));

  const recipientSet = new Set<string>();
  let subject = DEFAULT_SUBJECT;
  for (const rule of matched) {
    for (const r of rule.recipients) {
      const trimmed = r.trim();
      if (trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        recipientSet.add(trimmed);
      }
    }
    if (rule.subject && subject === DEFAULT_SUBJECT) subject = rule.subject;
  }

  return {
    to: Array.from(recipientSet),
    subject,
    matchedRules: matched,
  };
}

export { routeEmail as default };
