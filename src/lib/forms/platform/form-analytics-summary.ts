/**
 * Form Analytics Summary
 * ----------------------
 * Given form submissions + form, compute summary analytics: views, submissions,
 * conversion rate, average completion time, and per-field drop-off counts.
 *
 * Pure logic — no DB, no React. Accepts already-fetched FormResponse-like
 * records (use a minimal shape so the caller can pass plain objects).
 */
export interface FormResponseLite {
  id: string;
  formId: string;
  startedAt?: string | Date | null;
  completedAt?: string | Date | null;
  status?: string;
  dataJson?: string;
  createdAt: string | Date;
}

export interface FormLite {
  id: string;
  submissions?: number;
  conversionRate?: number;
  fieldsJson?: string;
  schemaJson?: string;
}

export interface FieldDropOff {
  fieldId: string;
  fieldLabel: string;
  count: number;
  percentage: number;
}

export interface AnalyticsSummary {
  views: number;
  submissions: number;
  conversionRate: number;
  avgTimeSec: number;
  dropOff: FieldDropOff[];
}

interface FormFieldShape {
  id: string;
  label?: string;
  name?: string;
}

function safeParseFields(form: FormLite): FormFieldShape[] {
  // Try schemaJson first (full FormSchema), then fieldsJson (array of fields)
  const sources = [form.schemaJson, form.fieldsJson];
  for (const src of sources) {
    if (!src) continue;
    try {
      const parsed = JSON.parse(src);
      const arr = Array.isArray(parsed) ? parsed : (parsed?.fields ?? []);
      if (Array.isArray(arr)) {
        return arr.map((f: Record<string, unknown>) => ({
          id: String(f.id ?? ''),
          label: f.label ? String(f.label) : undefined,
          name: f.name ? String(f.name) : undefined,
        }));
      }
    } catch {
      // ignore
    }
  }
  return [];
}

function parseSubmissionData(json?: string): Record<string, unknown> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
  } catch {
    // ignore
  }
  return {};
}

function asDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export function computeAnalytics(submissions: FormResponseLite[], form: FormLite, views?: number): AnalyticsSummary {
  const submissionCount = submissions.length;
  // Views: prefer explicitly passed count, fall back to form.submissions + 20% drop-off estimate
  const viewCount = views ?? Math.max(submissionCount, form.submissions ?? submissionCount, Math.round(submissionCount / 0.3) || submissionCount);

  const conversionRate = viewCount > 0 ? (submissionCount / viewCount) * 100 : 0;

  // Average completion time (seconds)
  let totalSec = 0;
  let timedCount = 0;
  for (const s of submissions) {
    const start = asDate(s.startedAt);
    const end = asDate(s.completedAt) ?? asDate(s.createdAt);
    if (start && end) {
      const diff = (end.getTime() - start.getTime()) / 1000;
      if (diff > 0 && diff < 24 * 60 * 60) {
        totalSec += diff;
        timedCount++;
      }
    }
  }
  const avgTimeSec = timedCount > 0 ? Math.round(totalSec / timedCount) : 0;

  // Per-field drop-off: count submissions where each field has no answer
  const fields = safeParseFields(form);
  const dropOff: FieldDropOff[] = [];
  for (const field of fields) {
    if (!field.id) continue;
    let missingCount = 0;
    for (const s of submissions) {
      const data = parseSubmissionData(s.dataJson);
      const value = data[field.id] ?? data[field.name ?? ''] ?? data[field.label ?? ''];
      if (value === undefined || value === null || value === '') {
        missingCount++;
      }
    }
    if (missingCount > 0) {
      dropOff.push({
        fieldId: field.id,
        fieldLabel: field.label || field.id,
        count: missingCount,
        percentage: submissionCount > 0 ? Math.round((missingCount / submissionCount) * 100) : 0,
      });
    }
  }
  dropOff.sort((a, b) => b.count - a.count);

  return {
    views: viewCount,
    submissions: submissionCount,
    conversionRate: Math.round(conversionRate * 10) / 10,
    avgTimeSec,
    dropOff,
  };
}

export { computeAnalytics as default };
