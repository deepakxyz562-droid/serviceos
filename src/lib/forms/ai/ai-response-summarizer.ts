/**
 * AI Response Summarizer (heuristic)
 * ----------------------------------
 * Summarises a form submission into 1-2 sentences using field labels and
 * the most informative values.
 *
 * TODO: integrate z-ai-web-dev-sdk LLM for abstractive summarization.
 */
import type { FormField } from '@/lib/forms/form-schema-types';

function fmt(v: unknown): string {
  if (v === undefined || v === null || v === '') return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.filter(Boolean).map(fmt).join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function pickTopValues(data: Record<string, unknown>, fields: FormField[]): Array<{ label: string; value: string }> {
  const out: Array<{ label: string; value: string }> = [];
  const priorityLabels = ['name', 'email', 'phone', 'service', 'topic', 'subject', 'message', 'date', 'appointment', 'company'];
  const seen = new Set<string>();

  // First pass: priority labels
  for (const target of priorityLabels) {
    for (const f of fields) {
      const key = (f.name || f.id || '').toLowerCase();
      const label = f.label.toLowerCase();
      if (!seen.has(f.id) && (key.includes(target) || label.includes(target))) {
        for (const dataKey of Object.keys(data)) {
          const dk = dataKey.toLowerCase();
          if (dk === key || dk === label || dk.includes(label) || label.includes(dk) || dk.includes(target)) {
            const v = fmt(data[dataKey]);
            if (v) {
              out.push({ label: f.label, value: v });
              seen.add(f.id);
              break;
            }
          }
        }
        if (seen.has(f.id)) break;
      }
    }
  }

  // Second pass: any other non-empty values
  for (const f of fields) {
    if (seen.has(f.id)) continue;
    const key = (f.name || f.id || '').toLowerCase();
    for (const dataKey of Object.keys(data)) {
      const dk = dataKey.toLowerCase();
      if (dk === key || dk === f.label.toLowerCase()) {
        const v = fmt(data[dataKey]);
        if (v) {
          out.push({ label: f.label, value: v });
          seen.add(f.id);
          break;
        }
      }
    }
  }

  return out.slice(0, 4);
}

export async function summarizeSubmission(data: Record<string, unknown>, fields: FormField[]): Promise<string> {
  const top = pickTopValues(data, fields);
  if (top.length === 0) {
    // Fall back to raw first non-empty value
    const first = Object.values(data).find((v) => v !== undefined && v !== null && v !== '');
    if (!first) return 'Submission received with no identifiable content.';
    return `Submission received: ${fmt(first)}.`;
  }

  const name = top.find((t) => /name/i.test(t.label))?.value;
  const email = top.find((t) => /email|mail/i.test(t.label))?.value;
  const phone = top.find((t) => /phone|tel/i.test(t.label))?.value;
  const topic = top.find((t) => /service|topic|subject|category|interest/i.test(t.label))?.value;
  const message = top.find((t) => /message|notes|comment|description/i.test(t.label))?.value;

  const parts: string[] = [];
  if (name) {
    parts.push(`${name}${email ? ` (${email})` : phone ? ` (${phone})` : ''}`);
  } else if (email) {
    parts.push(email);
  } else if (phone) {
    parts.push(phone);
  }

  const detail = topic || message;
  if (detail) {
    parts.push(`regarding "${detail.length > 80 ? detail.slice(0, 77) + '...' : detail}"`);
  }

  if (parts.length === 0) {
    return `Submission with ${top.length} field${top.length === 1 ? '' : 's'} completed.`;
  }

  return parts.join(' ') + '.';
}

export { summarizeSubmission as default };
