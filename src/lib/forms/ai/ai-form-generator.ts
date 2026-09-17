/**
 * AI Form Generator (heuristic, no real LLM calls)
 * ------------------------------------------------
 * Parses a natural-language prompt and produces a starter FormField[]
 * with sensible widgetType + widgetConfig assignments. Emits a matching
 * FormTheme based on prompt tone keywords.
 *
 * VALIDATION: Every generated widgetType is validated against the canonical
 * FIELD_REGISTRY. If the widgetType doesn't exist in the registry, it's
 * stripped (field becomes a plain text input) to prevent runtime errors.
 *
 * TODO: integrate z-ai-web-dev-sdk LLM here for richer intent detection.
 */
import type { FormField, FormTheme } from '@/lib/forms/form-schema-types';
import { getFieldById } from '@/lib/forms/canonical-widget-registry';
import { DEFAULT_FORM_THEME } from '@/lib/forms/form-schema-types';

export interface GenerateFormResult {
  fields: FormField[];
  theme: FormTheme;
}

interface PromptIntent {
  widgetType?: string;
  widgetConfig?: Record<string, unknown>;
  label: string;
  required?: boolean;
}

const KEYWORD_MAP: Array<{ keywords: string[]; intent: PromptIntent }> = [
  { keywords: ['appointment', 'booking', 'schedule', 'reserve'], intent: { label: 'Preferred Appointment', widgetType: 'appointment', widgetConfig: { slotDurationMin: 30 }, required: true } },
  { keywords: ['accept payment', 'payment', 'pay', 'checkout', 'stripe'], intent: { label: 'Payment', widgetType: 'payment_stripe', widgetConfig: { amount: 0, currency: 'USD' }, required: true } },
  { keywords: ['photo of damage', 'upload photo', 'picture', 'damage'], intent: { label: 'Photo of Damage', widgetType: 'image_upload_with_notes', widgetConfig: { maxFiles: 5 }, required: true } },
  { keywords: ['signature', 'sign', 'consent'], intent: { label: 'Signature', widgetType: 'signature_pad', required: true } },
  { keywords: ['upload file', 'attach', 'document'], intent: { label: 'Attach Document', widgetType: 'file_upload', required: false } },
  { keywords: ['phone', 'call', 'mobile'], intent: { label: 'Phone Number', widgetType: 'phone', required: true } },
  { keywords: ['email', 'e-mail'], intent: { label: 'Email Address', widgetType: 'email', required: true } },
  { keywords: ['address', 'location', 'street'], intent: { label: 'Address', widgetType: 'address', required: true } },
  { keywords: ['rating', 'feedback', 'satisfaction', 'nps'], intent: { label: 'How did we do?', widgetType: 'star_rating_comments', required: false } },
  { keywords: ['newsletter', 'subscribe'], intent: { label: 'Subscribe to newsletter', widgetType: 'single_choice', widgetConfig: { options: ['Yes, sign me up', 'No thanks'] }, required: false } },
];

const THEME_PRESETS: Array<{ keywords: string[]; theme: Partial<FormTheme> }> = [
  { keywords: ['modern', 'clean', 'tech', 'startup'], theme: { primaryColor: '#2563eb', borderRadius: '0.5rem', fontFamily: 'Inter, sans-serif' } },
  { keywords: ['playful', 'fun', 'kids', 'party'], theme: { primaryColor: '#f97316', borderRadius: '1rem', fontFamily: 'Comic Sans MS, cursive' } },
  { keywords: ['elegant', 'luxury', 'premium'], theme: { primaryColor: '#0f766e', borderRadius: '0.25rem', fontFamily: 'Georgia, serif' } },
  { keywords: ['dark', 'night', 'midnight'], theme: { primaryColor: '#8b5cf6', backgroundColor: '#0f172a', textColor: '#f1f5f9', borderRadius: '0.5rem' } },
];

function pickTheme(prompt: string): FormTheme {
  const lower = prompt.toLowerCase();
  for (const preset of THEME_PRESETS) {
    if (preset.keywords.some((k) => lower.includes(k))) {
      return { ...DEFAULT_FORM_THEME, ...preset.theme };
    }
  }
  return DEFAULT_FORM_THEME;
}

function genId(prefix: string, i: number): string {
  return `field_${prefix}_${Date.now().toString(36)}_${i}`;
}

export async function generateFormFromPrompt(prompt: string): Promise<GenerateFormResult> {
  const lower = (prompt || '').toLowerCase();
  const fields: FormField[] = [];
  const seen = new Set<string>();

  // Always add a Name field first if "name" mentioned or default
  if (lower.includes('name') || lower.includes('contact') || fields.length === 0) {
    fields.push({ id: genId('name', 1), type: 'short_answer', label: 'Full Name', placeholder: 'John Doe', required: true, width: 'half' });
  }

  for (const { keywords, intent } of KEYWORD_MAP) {
    if (!keywords.some((k) => lower.includes(k))) continue;
    const key = intent.widgetType || intent.label;
    if (seen.has(key)) continue;
    seen.add(key);
    const wt = intent.widgetType;

    // ─── VALIDATION: check widgetType against canonical registry ──────────
    // If the widgetType doesn't exist in FIELD_REGISTRY, strip it
    // so the field becomes a plain text input instead of crashing at runtime.
    let validatedWidgetType = wt;
    if (wt && !getFieldById(wt)) {
      // Widget ID not in canonical registry — strip it
      console.warn(`AI Form Generator: widgetType '${wt}' not found in canonical registry — stripping to plain text`);
      validatedWidgetType = undefined;
    }

    let fieldType: FormField['type'] = 'short_answer';
    if (validatedWidgetType?.startsWith('payment_')) fieldType = 'payment_gateway';
    else if (validatedWidgetType === 'email') fieldType = 'email';
    else if (validatedWidgetType === 'phone') fieldType = 'phone';
    else if (validatedWidgetType === 'address') fieldType = 'address';
    else if (validatedWidgetType === 'signature_pad') fieldType = 'signature';
    else if (validatedWidgetType === 'image_upload_with_notes') fieldType = 'image_upload_with_notes';
    else if (validatedWidgetType === 'file_upload') fieldType = 'file';
    else if (validatedWidgetType === 'appointment' || validatedWidgetType === 'date_picker') fieldType = 'date';
    else if (validatedWidgetType === 'time_picker') fieldType = 'time';
    fields.push({
      id: genId(validatedWidgetType || 'f', fields.length + 2),
      type: fieldType,
      label: intent.label,
      required: intent.required ?? false,
      widgetType: validatedWidgetType,
      widgetConfig: validatedWidgetType ? intent.widgetConfig : undefined,
      width: 'full',
    });
  }

  // Always add a message/notes field at the end if not already covered
  if (!fields.some((f) => f.label.toLowerCase().includes('message') || f.label.toLowerCase().includes('notes'))) {
    fields.push({ id: genId('msg', fields.length + 2), type: 'long_answer', label: 'Additional Notes', placeholder: 'Anything else we should know?', required: false, width: 'full' });
  }

  return { fields, theme: pickTheme(prompt) };
}

export { generateFormFromPrompt as default };
