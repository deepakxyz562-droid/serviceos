/**
 * AI Accessibility Checker (heuristic)
 * -----------------------------------
 * Scans a form for common accessibility issues:
 *   - Missing labels on input-style fields
 *   - Empty placeholders (low contrast / no hint)
 *   - Color-only required indicators
 *   - Missing helpText on complex widgets
 *   - Image-based fields without alt text config
 *
 * TODO: integrate z-ai-web-dev-sdk LLM for nuanced a11y review.
 */
import type { FormField } from '@/lib/forms/form-schema-types';

export interface AccessibilityIssue {
  fieldId: string;
  issue: string;
  severity: 'warning' | 'error';
}

export interface AccessibilityReport {
  issues: AccessibilityIssue[];
}

const INPUT_TYPES = new Set([
  'short_answer', 'long_answer', 'email', 'phone', 'numerical', 'currency',
  'dropdown', 'radio', 'checkbox', 'date', 'time',
]);

const COMPLEX_WIDGET_TYPES = new Set([
  'appointment', 'image_upload_with_notes', 'signature_pad', 'address',
  'payment_stripe', 'sms_otp', 'voice_recorder',
]);

export function checkAccessibility(fields: FormField[]): AccessibilityReport {
  const issues: AccessibilityIssue[] = [];
  const seenLabels = new Map<string, number>();

  for (const f of fields) {
    // 1. Missing or generic label
    if (!f.label || f.label.trim().length === 0) {
      issues.push({ fieldId: f.id, issue: 'Field is missing a label.', severity: 'error' });
    } else if (/^(field|untitled|input|text)\s*\d*$/i.test(f.label.trim())) {
      issues.push({ fieldId: f.id, issue: `Label "${f.label}" is too generic; use a descriptive label.`, severity: 'warning' });
    }

    // 2. Duplicate labels cause screen-reader confusion
    const labelKey = f.label?.trim().toLowerCase();
    if (labelKey) {
      seenLabels.set(labelKey, (seenLabels.get(labelKey) ?? 0) + 1);
      if (seenLabels.get(labelKey) === 2) {
        issues.push({ fieldId: f.id, issue: `Duplicate label "${f.label}" — screen readers may conflate the two fields.`, severity: 'warning' });
      }
    }

    // 3. Input fields without placeholder or helpText
    if (INPUT_TYPES.has(f.type) && !f.placeholder && !f.helpText) {
      issues.push({ fieldId: f.id, issue: 'Input field has no placeholder or help text to guide users.', severity: 'warning' });
    }

    // 4. Required field without a helpText on a complex widget
    if (f.required && COMPLEX_WIDGET_TYPES.has(f.widgetType ?? '')) {
      if (!f.helpText && !f.description) {
        issues.push({ fieldId: f.id, issue: 'Required complex widget lacks a description or help text.', severity: 'warning' });
      }
    }

    // 5. Image upload without alt-text configuration
    if (f.type === 'image_upload_with_notes' || f.widgetType === 'image_upload_with_notes') {
      const cfg = (f.widgetConfig ?? {}) as Record<string, unknown>;
      if (!cfg.altTextLabel && !cfg.requireAltText) {
        issues.push({ fieldId: f.id, issue: 'Image upload does not require alt text — inaccessible to screen readers.', severity: 'warning' });
      }
    }

    // 6. Color-only required indicator (heuristic: required=true but no visual cue in label)
    if (f.required && f.label && !/\*$/.test(f.label) && !/\(required\)/i.test(f.label) && !f.helpText) {
      issues.push({ fieldId: f.id, issue: 'Required field has no visible indicator (e.g. trailing *).', severity: 'warning' });
    }

    // 7. Validation pattern without a custom error message
    if (f.validation?.pattern && !f.helpText) {
      issues.push({ fieldId: f.id, issue: 'Field with a custom validation pattern should include a help text describing the expected format.', severity: 'warning' });
    }

    // 8. Heading/paragraph fields with empty content
    if ((f.type === 'heading' || f.type === 'paragraph') && (!f.label || f.label.trim().length === 0)) {
      issues.push({ fieldId: f.id, issue: `${f.type} field has no visible text content.`, severity: 'error' });
    }
  }

  return { issues };
}

export { checkAccessibility as default };
