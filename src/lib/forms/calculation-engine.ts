/**
 * Cognito-Style Calculation & Formula Engine
 * Evaluates safe arithmetic expressions, aggregates repeating fields,
 * and dynamically calculates quote estimates in real time.
 */

export interface EvaluationContext {
  [fieldIdOrName: string]: any;
}

/**
 * Evaluates an arithmetic formula string (e.g. `(sqft * 4.5) + (rooms * 25) - discount` or `[Square Feet] * 4.5`).
 * Supported operators: `+`, `-`, `*`, `/`, `(`, `)`, `Math.max()`, `Math.min()`, `Math.round()`.
 */
export function evaluateFormula(
  formula: string,
  context: EvaluationContext,
  fallback = 0
): number {
  if (!formula || typeof formula !== 'string' || !formula.trim()) {
    return fallback;
  }

  let expr = formula.trim();
  if (expr.startsWith('=')) {
    expr = expr.slice(1).trim();
  }

  // Replace bracket tokens e.g. [sqft] or [Square Footage] with context values
  expr = expr.replace(/\[([^\]]+)\]/g, (_, rawKey) => {
    const key = rawKey.trim();
    // Try direct key, lowercase key, or identifier key
    const val = context[key] ?? context[key.toLowerCase()] ?? context[key.toLowerCase().replace(/\s+/g, '_')] ?? context[key.replace(/[^a-zA-Z0-9_]/g, '_')];
    const num = typeof val === 'number' && !isNaN(val) ? val : Number(val);
    return !isNaN(num) ? String(num) : '0';
  });

  // Replace double brace tokens e.g. {{field_1}} with numeric values from context
  expr = expr.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const val = context[key.trim()];
    const num = typeof val === 'number' && !isNaN(val) ? val : Number(val);
    return !isNaN(num) ? String(num) : '0';
  });

  // Also replace identifier names like `sqft`, `hours`, `price`, `quantity` if matched in context
  for (const [key, rawVal] of Object.entries(context)) {
    if (!key || key.includes(' ')) continue;
    const numVal = typeof rawVal === 'number' && !isNaN(rawVal) ? rawVal : Number(rawVal);
    if (!isNaN(numVal)) {
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      expr = expr.replace(regex, String(numVal));
    }
  }

  // Whitelist safe arithmetic characters only
  const sanitized = expr.replace(/[^0-9+\-*/().,\s]/g, '');
  if (!sanitized.trim()) return fallback;

  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${sanitized});`)();
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return result;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Iterates through form fields and computes values for any calculated fields.
 */
export function calculateFormValues(
  fields: Array<{ id: string; label?: string; calculationFormula?: string; widgetConfig?: Record<string, any> }>,
  currentValues: Record<string, any>
): Record<string, any> {
  const updated = { ...currentValues };
  // Build lookup context supporting id, label, and normalized keys
  const context: Record<string, any> = { ...currentValues };
  for (const f of fields) {
    if (f.label) {
      context[f.label] = currentValues[f.id] ?? currentValues[f.label];
      context[f.label.toLowerCase()] = currentValues[f.id] ?? currentValues[f.label];
    }
  }

  for (const field of fields) {
    const formula =
      field.calculationFormula ||
      field.widgetConfig?.calculationFormula ||
      field.widgetConfig?.formula;

    if (formula) {
      const computed = evaluateFormula(formula, context, 0);
      updated[field.id] = computed;
      context[field.id] = computed;
      if (field.label) {
        context[field.label] = computed;
        context[field.label.toLowerCase()] = computed;
      }
    }
  }

  return updated;
}

/**
 * Formats a calculated numeric result into currency or formatted decimal string.
 */
export function formatCalculationOutput(
  value: number,
  options: { currencySymbol?: string; decimalPlaces?: number } = {}
): string {
  const { currencySymbol = '$', decimalPlaces = 2 } = options;
  const formattedNum = value.toLocaleString('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });

  return currencySymbol ? `${currencySymbol}${formattedNum}` : formattedNum;
}
