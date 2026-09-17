/**
 * AI Smart Defaults (heuristic)
 * -----------------------------
 * Suggests a sensible default value for a field based on its type, label,
 * and widget config. Returns `undefined` when no smart default applies.
 *
 * TODO: integrate z-ai-web-dev-sdk LLM for context-aware defaults.
 */
import type { FormField } from '@/lib/forms/form-schema-types';

export function suggestDefaultValue(field: FormField): unknown {
  const label = (field.label || '').toLowerCase();
  const cfg = (field.widgetConfig ?? {}) as Record<string, unknown>;

  // 1. Country / region defaults
  if (/country/i.test(label)) return 'United States';
  if (/state|province|region/i.test(label)) return 'California';

  // 2. Currency / amount defaults
  if (field.type === 'currency' || field.widgetType === 'currency_amount') {
    if (/tip|donation|contribution/i.test(label)) return 5;
    return 0;
  }

  // 3. Numeric defaults
  if (field.type === 'numerical') {
    if (/age/i.test(label)) return 25;
    if (/quantity|count|number of/i.test(label)) return 1;
    if (/year/i.test(label)) return new Date().getFullYear();
    return 0;
  }

  // 4. Dropdown / radio / checkbox: default to first option
  if (field.type === 'dropdown' || field.type === 'radio' || field.type === 'checkbox') {
    if (field.options && field.options.length > 0) {
      return field.options[0].value ?? field.options[0].label;
    }
  }

  // 5. Email / phone — leave blank (PII shouldn't be pre-filled)
  if (field.type === 'email' || field.type === 'phone') return undefined;

  // 6. Date / appointment — default to next business day
  if (field.type === 'date' || field.widgetType === 'appointment' || field.widgetType === 'date_picker') {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    // Skip weekends
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  // 7. Time — default to 09:00
  if (field.type === 'time' || field.widgetType === 'time_picker') return '09:00';

  // 8. Address — default country only
  if (field.type === 'address' || field.widgetType === 'address') {
    return { country: 'United States' };
  }

  // 9. Yes/No single-choice defaults
  if (field.widgetType === 'single_choice') {
    const options = (cfg.options as string[] | undefined) ?? field.options?.map((o) => o.label);
    if (options && options.length === 2) {
      if (options.some((o) => /^yes$/i.test(o))) return 'Yes';
    }
  }

  // 10. Consent / agree checkbox — default to false (must opt-in)
  if (/consent|agree|accept terms|gdpr/i.test(label)) return false;

  // 11. Subscription / newsletter — default to false
  if (/newsletter|subscribe|marketing/i.test(label)) return false;

  // 12. Short text — suggest a sample format via placeholder if present
  if (field.type === 'short_answer' && field.placeholder) {
    // Heuristic: don't auto-fill, but suggest placeholder as default for readonly/preview
    if (field.readOnly) return field.placeholder;
  }

  // 13. Long answer / message — suggest an opening prompt
  if (field.type === 'long_answer') {
    if (/message|comment|feedback/i.test(label)) return '';
    return undefined;
  }

  return undefined;
}

export { suggestDefaultValue as default };
