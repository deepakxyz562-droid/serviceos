'use client';

/**
 * Submission PDF Download
 * -----------------------
 * Generates a printable PDF of a single submission using the browser's print
 * API. Opens a new window with print-optimized HTML and triggers print-to-PDF.
 *
 * Exports `downloadSubmissionAsPdf(submission, form)` per spec.
 */
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FormField } from '@/lib/forms/form-schema-types';

export interface FormResponseShape {
  id: string;
  formId: string;
  dataJson?: string;
  respondent?: string | null;
  respondentName?: string | null;
  createdAt?: string | Date;
}

export interface FormShape {
  id: string;
  name?: string;
  schemaJson?: string;
  fieldsJson?: string;
}

function parseFields(form: FormShape): FormField[] {
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

function findFieldValue(data: Record<string, unknown>, field: FormField): unknown {
  if (field.id && field.id in data) return data[field.id];
  if (field.name && field.name in data) return data[field.name];
  // Try label-based lookup
  const lower = field.label.toLowerCase();
  for (const k of Object.keys(data)) {
    if (k.toLowerCase() === lower) return data[k];
  }
  return undefined;
}

function fmtValue(v: unknown): string {
  if (v === undefined || v === null) return '—';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(fmtValue).join(', ');
  if (typeof v === 'object') return JSON.stringify(v, null, 2);
  return String(v);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function downloadSubmissionAsPdf(submission: FormResponseShape, form: FormShape): void {
  const fields = parseFields(form);
  const data = parseData(submission.dataJson);

  const rows = fields
    .map((f) => {
      const v = fmtValue(findFieldValue(data, f));
      return `<tr><td class="label">${escapeHtml(f.label)}</td><td>${escapeHtml(v)}</td></tr>`;
    })
    .join('\n');

  const submittedAt = submission.createdAt
    ? new Date(submission.createdAt).toLocaleString()
    : 'Unknown';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(form.name ?? 'Form')} — Submission</title>
<style>
  @page { size: A4; margin: 1.5cm; }
  body { font-family: -apple-system, system-ui, sans-serif; color: #111; }
  h1 { font-size: 18pt; margin: 0 0 4pt; }
  .meta { color: #555; font-size: 9pt; margin-bottom: 16pt; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 6pt 8pt; vertical-align: top; border-bottom: 1px solid #ddd; }
  td.label { font-weight: 600; width: 35%; color: #444; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <h1>${escapeHtml(form.name ?? 'Form Submission')}</h1>
  <div class="meta">
    Submission ID: ${escapeHtml(submission.id)}<br/>
    Submitted: ${escapeHtml(submittedAt)}<br/>
    Respondent: ${escapeHtml(submission.respondentName ?? submission.respondent ?? 'Anonymous')}
  </div>
  <table>
    <tbody>
      ${rows || '<tr><td colspan="2">No field data available.</td></tr>'}
    </tbody>
  </table>
  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    // Popup blocked — fallback: create a download link
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submission-${submission.id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

export interface SubmissionPdfDownloadProps {
  submission: FormResponseShape;
  form: FormShape;
  className?: string;
}

export function SubmissionPdfDownload({ submission, form, className }: SubmissionPdfDownloadProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          Download as PDF
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={() => downloadSubmissionAsPdf(submission, form)} className="w-full">
          <Download className="mr-2 h-4 w-4" />
          Generate PDF
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Opens the browser print dialog. Choose &ldquo;Save as PDF&rdquo; as the destination.
        </p>
      </CardContent>
    </Card>
  );
}

export default SubmissionPdfDownload;
