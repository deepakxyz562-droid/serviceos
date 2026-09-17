/**
 * AI Thank-You Message Generator (heuristic)
 * -----------------------------------------
 * Generates a personalised thank-you message based on submission data.
 * Looks for common keys (name, email, service, appointment date) and composes
 * a 1-2 sentence acknowledgement.
 *
 * TODO: integrate z-ai-web-dev-sdk LLM for richer prose.
 */
import type { FormField } from '@/lib/forms/form-schema-types';

function findValue(data: Record<string, unknown>, keys: string[]): unknown {
  for (const k of Object.keys(data)) {
    const lower = k.toLowerCase();
    if (keys.some((target) => lower.includes(target))) {
      return data[k];
    }
  }
  return undefined;
}

function fmt(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.filter(Boolean).join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export async function generateThankYouMessage(submissionData: Record<string, unknown>): Promise<string> {
  const name = fmt(findValue(submissionData, ['name', 'fullname', 'first_name'])) || 'there';
  const firstName = name.split(/\s+/)[0];
  const email = fmt(findValue(submissionData, ['email', 'e-mail', 'mail']));
  const appointment = fmt(findValue(submissionData, ['appointment', 'date', 'schedule', 'booking']));
  const service = fmt(findValue(submissionData, ['service', 'product', 'topic', 'subject']));
  const phone = fmt(findValue(submissionData, ['phone', 'mobile', 'tel']));

  const parts: string[] = [`Thank you, ${firstName}!`];

  if (appointment) {
    parts.push(`We've received your request for ${appointment}${service ? ` (${service})` : ''}.`);
  } else if (service) {
    parts.push(`We've received your submission regarding ${service}.`);
  } else {
    parts.push("We've received your submission.");
  }

  if (email) {
    parts.push(`A confirmation email has been sent to ${email}.`);
  } else if (phone) {
    parts.push(`We'll reach out to you at ${phone} shortly.`);
  } else {
    parts.push('Our team will be in touch with you shortly.');
  }

  return parts.join(' ');
}

export async function generateThankYouMessageWithFields(
  submissionData: Record<string, unknown>,
  fields: FormField[],
): Promise<string> {
  // Use field labels to enrich the message
  const labelMap = new Map<string, unknown>();
  for (const f of fields) {
    const key = (f.name || f.id || '').toLowerCase();
    const label = f.label.toLowerCase();
    for (const dataKey of Object.keys(submissionData)) {
      const dk = dataKey.toLowerCase();
      if (dk === key || dk === label || dk.includes(label) || label.includes(dk)) {
        labelMap.set(f.label, submissionData[dataKey]);
        break;
      }
    }
  }
  // Fallback to plain submission data
  const merged = { ...submissionData };
  for (const [k, v] of labelMap.entries()) merged[k] = v;
  return generateThankYouMessage(merged);
}

export { generateThankYouMessage as default };
