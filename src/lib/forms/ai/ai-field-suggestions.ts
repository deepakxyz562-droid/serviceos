/**
 * AI Field Suggestions (heuristic)
 * --------------------------------
 * Given the current form fields, suggests 3 logical next fields to add.
 * Uses frequency-of-co-occurrence heuristics — no real LLM call.
 *
 * TODO: integrate z-ai-web-dev-sdk LLM for smarter context-aware suggestions.
 */
import type { FormField } from '@/lib/forms/form-schema-types';

export interface FieldSuggestion {
  id: string;
  label: string;
  reason: string;
}

interface Rule {
  match: (fields: FormField[]) => boolean;
  suggest: { label: string; reason: string };
}

const RULES: Rule[] = [
  { match: (f) => f.some((x) => x.type === 'short_answer' && /name/i.test(x.label)), suggest: { label: 'Email Address', reason: 'A name field is usually followed by an email contact.' } },
  { match: (f) => f.some((x) => x.type === 'email'), suggest: { label: 'Phone Number', reason: 'Pair email collection with a phone number for follow-up.' } },
  { match: (f) => f.some((x) => x.type === 'phone'), suggest: { label: 'Preferred Contact Time', reason: 'Capture availability to reduce missed connections.' } },
  { match: (f) => f.some((x) => /appointment|booking|date/i.test(x.label)), suggest: { label: 'Service Type', reason: 'Identify what the appointment is for to assign the right resource.' } },
  { match: (f) => f.some((x) => x.type === 'long_answer'), suggest: { label: 'Attachment', reason: 'Let respondents attach files to support their answer.' } },
  { match: (f) => f.some((x) => x.type === 'payment_gateway'), suggest: { label: 'Billing Address', reason: 'Payments typically require a billing address for receipts.' } },
  { match: (f) => f.some((x) => x.type === 'image_upload_with_notes'), suggest: { label: 'Description of Issue', reason: 'Add context to uploaded photos for triage.' } },
  { match: (f) => f.some((x) => /company|business/i.test(x.label)), suggest: { label: 'Job Title', reason: 'Role information qualifies B2B leads.' } },
  { match: (f) => f.some((x) => /feedback|rating|satisfaction/i.test(x.label)), suggest: { label: 'Comments', reason: 'Capture open-ended feedback after a rating.' } },
  { match: (f) => f.some((x) => x.type === 'address'), suggest: { label: 'Service Area Check', reason: 'Verify service availability for the provided address.' } },
  { match: (f) => f.some((x) => /newsletter|subscribe/i.test(x.label)), suggest: { label: 'Marketing Consent', reason: 'GDPR requires explicit consent for marketing.' } },
  { match: (f) => f.some((x) => x.widgetType === 'appointment'), suggest: { label: 'Time Zone', reason: 'Avoid scheduling mishaps across regions.' } },
  { match: (f) => f.some((x) => x.type === 'signature_pad' || /signature/i.test(x.label)), suggest: { label: 'Terms & Conditions', reason: 'Signatures typically require accompanying consent.' } },
  { match: (f) => f.some((x) => /quote|estimate/i.test(x.label)), suggest: { label: 'Budget Range', reason: 'Helps pre-qualify leads before sending a quote.' } },
];

function genId(i: number): string {
  return `suggestion_${i}_${Date.now().toString(36)}`;
}

export async function suggestNextFields(currentFields: FormField[]): Promise<FieldSuggestion[]> {
  const out: FieldSuggestion[] = [];
  const usedLabels = new Set<string>(currentFields.map((f) => f.label.toLowerCase()));
  const seenSuggestions = new Set<string>();

  for (const rule of RULES) {
    if (!rule.match(currentFields)) continue;
    if (seenSuggestions.has(rule.suggest.label)) continue;
    if (usedLabels.has(rule.suggest.label.toLowerCase())) continue;
    seenSuggestions.add(rule.suggest.label);
    out.push({ id: genId(out.length + 1), label: rule.suggest.label, reason: rule.suggest.reason });
    if (out.length >= 3) break;
  }

  // Fallback: generic high-value suggestions if we couldn't find 3
  const fallbacks = [
    { label: 'How did you hear about us?', reason: 'Identify your most effective acquisition channel.' },
    { label: 'Preferred Contact Method', reason: 'Respect respondent communication preferences.' },
    { label: 'Anything else?', reason: 'Open-ended catch-all for unprompted context.' },
  ];
  for (const fb of fallbacks) {
    if (out.length >= 3) break;
    if (seenSuggestions.has(fb.label) || usedLabels.has(fb.label.toLowerCase())) continue;
    out.push({ id: genId(out.length + 1), ...fb });
  }

  return out.slice(0, 3);
}

export { suggestNextFields as default };
