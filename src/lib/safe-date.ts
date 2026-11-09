/**
 * Safe Date Parsing Utilities
 *
 * Supabase/PostgREST returns `timestamp` / `timestamptz` columns as strings
 * (including Postgres space-separated timestamps without a timezone suffix like
 * `"2026-11-08 10:00:00"`), whereas Prisma returns `Date` instances.
 * Always use these helpers instead of calling `.getTime()`, `.toISOString()`,
 * or `.getFullYear()` directly on database date fields.
 */

export function toValidDate(val: unknown): Date | null {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date) {
    return Number.isNaN(val.getTime()) ? null : val;
  }
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return null;
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    const normalized =
      /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(trimmed) &&
      !trimmed.endsWith('Z') &&
      !/[+-]\d{2}(:?\d{2})?$/.test(trimmed)
        ? `${trimmed.replace(' ', 'T')}Z`
        : trimmed;
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function toIsoStringSafe(val: unknown): string | null {
  const d = toValidDate(val);
  return d ? d.toISOString() : null;
}

export function getTimeSafe(val: unknown, fallback = 0): number {
  const d = toValidDate(val);
  return d ? d.getTime() : fallback;
}

export function getFullYearSafe(
  val: unknown,
  fallback = new Date().getUTCFullYear(),
): number {
  const d = toValidDate(val);
  return d ? d.getFullYear() : fallback;
}
