/**
 * json-parsers.ts
 * ===============
 * Safe JSON parsing helpers for Prisma JSON-stringified columns.
 *
 * Prisma stores arrays/objects as JSON strings (e.g., customFieldsJson,
 * attachmentsJson, lineItemsJson). Every view that reads these columns
 * had its own try/catch parse function. This file consolidates them.
 *
 * USAGE:
 *   import { safeParseJson, parseStringArray, parseCustomFields } from '@/lib/json-parsers';
 */

/**
 * Safely parse a JSON string, returning a fallback if parsing fails.
 */
export function safeParseJson<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    const parsed = JSON.parse(json);
    return parsed as T;
  } catch {
    return fallback;
  }
}

/**
 * Parse a JSON string into a string array. Returns [] on any error.
 */
export function parseStringArray(json?: string | null): string[] {
  try {
    const parsed = json ? JSON.parse(json) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    return [];
  }
}

/**
 * Parse a JSON string into a generic array. Returns [] on any error.
 */
export function parseJsonArray<T>(json?: string | null): T[] {
  try {
    const parsed = json ? JSON.parse(json) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed as T[];
  } catch {
    return [];
  }
}

/**
 * Parse a JSON object. Returns {} on any error.
 */
export function parseJsonObject<T extends Record<string, unknown>>(
  json?: string | null
): Partial<T> {
  try {
    const parsed = json ? JSON.parse(json) : {};
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return parsed as Partial<T>;
  } catch {
    return {};
  }
}

// ── Domain-specific parsers ──────────────────────────────────────────────────

export interface CustomField {
  id: string;
  label: string;
  value: string;
}

/**
 * Parse customFieldsJson into typed CustomField[].
 */
export function parseCustomFields(json?: string | null): CustomField[] {
  try {
    const parsed = json ? JSON.parse(json) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((f: Record<string, unknown>, i: number) => ({
      id: (f.id as string) || `cf-${i}-${Date.now()}`,
      label: (f.label as string) || '',
      value: (f.value as string) || '',
    }));
  } catch {
    return [];
  }
}

export interface Attachment {
  name: string;
  url: string;
  size?: number;
  type?: string;
  uploadedAt?: string;
}

/**
 * Parse attachmentsJson into typed Attachment[].
 */
export function parseAttachments(json?: string | null): Attachment[] {
  return parseJsonArray<Attachment>(json);
}

/**
 * Parse notificationLogJson into a generic array.
 */
export function parseNotificationLog(json?: string | null): unknown[] {
  return parseJsonArray(json);
}

/**
 * Extract the assetId from a job's metadataJson.
 * metadataJson shape: { assetId?: string, lifecycleTimestamps?: {...}, ... }
 */
export function parseAssetIdFromMetadata(json?: string | null): string {
  try {
    const parsed = json ? JSON.parse(json) : {};
    if (parsed && typeof parsed === 'object' && typeof parsed.assetId === 'string') {
      return parsed.assetId;
    }
  } catch {
    // ignore
  }
  return '';
}
