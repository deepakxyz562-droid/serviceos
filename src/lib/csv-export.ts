/**
 * CSV Export Helpers
 * ==================
 *
 * Shared utilities for generating CSV downloads from any data source.
 * Extracted from contact-exports-view.tsx so both the per-tenant contact
 * export and the superadmin tenant export use the same quoting logic.
 *
 * RFC 4180 compliant:
 *   - Fields containing commas, quotes, or newlines are wrapped in double quotes
 *   - Double quotes within quoted fields are escaped as ""
 *   - UTF-8 BOM prefix for Excel compatibility (Excel otherwise garbles UTF-8)
 */

/**
 * Escape a single value for CSV output.
 * - null/undefined → empty string
 * - Contains comma, quote, or newline → wrapped in quotes, inner quotes doubled
 */
export function escapeCsv(value: unknown): string {
  if (value == null) return '';
  const str = String(value);
  const needsQuote = /[",\n\r]/.test(str);
  const escaped = str.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

/**
 * Build a complete CSV string from rows of data.
 *
 * @param headers  Array of header labels (strings)
 * @param rows     Array of arrays — each inner array is one row of values
 * @returns        Complete CSV string (with \n line endings, no BOM)
 */
export function buildCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const headerLine = headers.map((h) => escapeCsv(h)).join(',');
  const dataLines = rows.map((row) => row.map((v) => escapeCsv(v)).join(','));
  return [headerLine, ...dataLines].join('\n');
}

/**
 * Prepend UTF-8 BOM to a CSV string so Excel opens it without garbling
 * non-ASCII characters (é, ñ, ü, etc.).
 */
export function withBom(csv: string): string {
  return '\uFEFF' + csv;
}

/**
 * Suggested filename with timestamp.
 * @example 'tenants-export-2026-01-15.csv'
 */
export function exportFilename(prefix: string, ext: 'csv' | 'json' | 'xls' = 'csv'): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const time = now.toISOString().slice(11, 19).replace(/:/g, ''); // HHMMSS
  return `${prefix}-${date}-${time}.${ext}`;
}

/**
 * MIME types for common export formats.
 */
export const EXPORT_MIME = {
  csv: 'text/csv; charset=utf-8',
  json: 'application/json; charset=utf-8',
  xls: 'application/vnd.ms-excel',
} as const;
