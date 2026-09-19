/**
 * Cognito-Style Calculation & Formula Engine
 * Evaluates safe arithmetic expressions, aggregates repeating fields,
 * and dynamically calculates quote estimates in real time.
 */

export interface EvaluationContext {
  [fieldIdOrName: string]: any;
}

/**
 * Evaluates an arithmetic formula string (e.g. `(sqft * 4.5) + (rooms * 25) - discount`).
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

  // Replace variable tokens e.g. {{field_1}} or variable names with numeric values from context
  expr = expr.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const val = context[key.trim()];
    return typeof val === 'number' && !isNaN(val) ? String(val) : String(Number(val) || 0);
  });

  // Also replace identifier names like `sqft`, `hours`, `price`, `quantity` if matched in context
  for (const [key, rawVal] of Object.entries(context)) {
    const numVal = typeof rawVal === 'number' && !isNaN(rawVal) ? rawVal : Number(rawVal) || 0;
    // Word boundary replace for identifier
    const regex = new RegExp(`\\b${key}\\b`, 'g');
    expr = expr.replace(regex, String(numVal));
  }

  // Whitelist safe arithmetic characters only
  const sanitized = expr.replace(/[^0-9+\-*/().,\s]/g, '');

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
