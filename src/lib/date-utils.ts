/**
 * Date coercion helpers for Supabase REST compatibility.
 *
 * Supabase (PostgREST) returns DateTime columns as ISO strings, not Date
 * objects. These helpers safely handle both cases so API routes work
 * identically on SQLite (Date objects) and Supabase (strings).
 */

/**
 * Coerce a value (Date | string | null | undefined) to a Date, or null.
 */
export function toDate(v: Date | string | null | undefined): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'string') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Coerce a value to an ISO string, or null. Safe to call on Date or string.
 */
export function toISO(v: Date | string | null | undefined): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') {
    // Already a string — validate it parses, return as-is if valid
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : v;
  }
  return null;
}

/**
 * Get the timestamp (ms since epoch) from a Date or ISO string, or null.
 */
export function toTime(v: Date | string | null | undefined): number | null {
  const d = toDate(v);
  return d ? d.getTime() : null;
}
