/**
 * Customer duplicate detection — phone/email normalization utilities.
 *
 * Used by:
 *   - POST /api/customers (create guard)
 *   - PUT  /api/customers (update guard)
 *   - WhatsApp inbound customer upsert
 *
 * Design:
 *   - Phone: strip all non-digit characters (including leading +).
 *     "+1 (210) 555-1234" → "12105551234"
 *     "210-555-1234"      → "2105551234"
 *   - Email: trim + lowercase.
 *     "John@Example.COM" → "john@example.com"
 *
 * The normalized values are stored alongside the raw phone/email so the
 * original display value is preserved. Unique constraints are tenant-scoped:
 *   @@unique([tenantId, normalizedPhone])
 *   @@unique([tenantId, normalizedEmail])
 * NOT global — the same person can legitimately exist in two tenants.
 */

/**
 * Normalize a phone number for duplicate detection.
 * Strips all non-digit characters (including leading +).
 * Returns null for empty/whitespace-only input.
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.length > 0 ? digits : null;
}

/**
 * Normalize an email for duplicate detection.
 * Trims whitespace and lowercases the entire string.
 * Returns null for empty/whitespace-only input.
 */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Format a normalized phone for display in the "Existing customer found" dialog.
 * E.g. "12105551234" → "+1 (210) 555-1234" (best-effort US format).
 * Falls back to the raw digits if formatting fails.
 */
export function formatNormalizedPhone(normalized: string | null): string {
  if (!normalized) return '';
  // US format: 11 digits starting with 1 → +1 (XXX) XXX-XXXX
  if (normalized.length === 11 && normalized.startsWith('1')) {
    const area = normalized.slice(1, 4);
    const prefix = normalized.slice(4, 7);
    const line = normalized.slice(7, 11);
    return `+1 (${area}) ${prefix}-${line}`;
  }
  // US format: 10 digits → (XXX) XXX-XXXX
  if (normalized.length === 10) {
    const area = normalized.slice(0, 3);
    const prefix = normalized.slice(3, 6);
    const line = normalized.slice(6, 10);
    return `(${area}) ${prefix}-${line}`;
  }
  // International: prepend + if it looks like a country code
  if (normalized.length > 10) {
    return `+${normalized}`;
  }
  return normalized;
}
