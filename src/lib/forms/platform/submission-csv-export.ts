/**
 * Submission CSV Export
 * ---------------------
 * Exports all submissions as a CSV string. One row per submission; one column
 * per unique field label. Also includes meta columns: _id, _submittedAt,
 * _respondent, _status.
 *
 * Pure logic — no DB, no React.
 */
import type { FormField } from '@/lib/forms/form-schema-types';

export interface FormResponseLite {
  id: string;
  formId: string;
  dataJson?: string;
  respondent?: string | null;
  respondentName?: string | null;
  status?: string;
  createdAt?: string | Date;
}

export interface FormLite {
  id: string;
  name?: string;
  fieldsJson?: string;
  schemaJson?: string;
}

function parseFields(form: FormLite): FormField[] {
  const sources = [form.schemaJson, form.fieldsJson];
  for (const src of sources) {
    if (!src) continue;
    try {
      const parsed = JSON.parse(src);
      const arr = Array.isArray(parsed) ? parsed : (parsed?.fields ?? []);
      if (Array.isArray(arr)) return arr as FormField[];
    } catch {
      // ignore
    }
  }
  return [];
}

function parseData(json?: string): Record<string, unknown> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
  } catch {
    // ignore
  }
  return {};
}

function fmt(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(fmt).join('; ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function findValue(data: Record<string, unknown>, field: FormField): unknown {
  if (field.id && field.id in data) return data[field.id];
  if (field.name && field.name in data) return data[field.name];
  const lower = field.label.toLowerCase();
  for (const k of Object.keys(data)) {
    if (k.toLowerCase() === lower) return data[k];
  }
  return '';
}

function escapeCell(s: string): string {
  if (s == null) return '';
  // Wrap in quotes if contains comma, quote, or newline; escape quotes by doubling.
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const META_COLUMNS: Array<{ key: string; label: string; get: (s: FormResponseLite) => string }> = [
  { key: '_id', label: 'Submission ID', get: (s) => s.id ?? '' },
  { key: '_submittedAt', label: 'Submitted At', get: (s) => (s.createdAt ? new Date(s.createdAt).toISOString() : '') },
  { key: '_respondent', label: 'Respondent', get: (s) => s.respondentName ?? s.respondent ?? '' },
  { key: '_status', label: 'Status', get: (s) => s.status ?? '' },
];

export function exportSubmissionsAsCsv(submissions: FormResponseLite[], form: FormLite): string {
  const fields = parseFields(form);

  const header = [
    ...META_COLUMNS.map((m) => m.label),
    ...fields.map((f) => f.label),
  ];

  const rows: string[] = [header.map(escapeCell).join(',')];

  for (const s of submissions) {
    const data = parseData(s.dataJson);
    const row = [
      ...META_COLUMNS.map((m) => m.get(s)),
      ...fields.map((f) => fmt(findValue(data, f))),
    ];
    rows.push(row.map(escapeCell).join(','));
  }

  return rows.join('\r\n');
}

export function downloadCsv(csv: string, filename = 'submissions.csv'): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export { exportSubmissionsAsCsv as default };
