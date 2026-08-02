/**
 * Shared helpers for the EmailProvider / EmailTemplate API layer.
 *
 * - maskSensitiveConfig: walk a config object and replace secret keys with
 *   '••••••••' so that GET responses never leak SMTP passwords, API keys, etc.
 * - parseProviderConfig: accept either a JSON string or an object from the
 *   request body and return a normalized string for storage in configJson.
 */

const SENSITIVE_KEYS = new Set<string>([
  'smtpPass',
  'password',
  'pass',
  'apiKey',
  'api_key',
  'secretAccessKey',
  'secret',
  'serverToken',
  'token',
  'smtpUserParts', // Contains reconstructed sensitive credentials
]);

const MASK = '••••••••';

/**
 * Walk a config object and replace sensitive values with a mask.
 * Returns a NEW object — does not mutate input.
 */
export function maskSensitiveConfig<T extends Record<string, unknown>>(
  config: T | null | undefined
): Record<string, unknown> {
  if (!config || typeof config !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (SENSITIVE_KEYS.has(key)) {
      out[key] = MASK;
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Parse the configJson field of an EmailProvider (stored as a JSON string) and
 * return a masked object for safe inclusion in API responses.
 */
export function maskedConfigFromString(
  configJson: string | null | undefined
): Record<string, unknown> {
  if (!configJson) return {};
  try {
    const parsed = JSON.parse(configJson) as Record<string, unknown>;
    return maskSensitiveConfig(parsed);
  } catch {
    return {};
  }
}

/**
 * Accept a configJson value that may arrive as:
 *  - a string (already JSON-encoded)
 *  - an object (raw)
 *  - undefined / null
 * Returns the canonical JSON-encoded string for storage in the DB.
 */
export function encodeProviderConfig(
  raw: unknown
): string {
  if (raw == null) return '{}';
  if (typeof raw === 'string') {
    // Validate it parses; if not, fall back to '{}'.
    try {
      JSON.parse(raw);
      return raw;
    } catch {
      return '{}';
    }
  }
  if (typeof raw === 'object') {
    try {
      return JSON.stringify(raw);
    } catch {
      return '{}';
    }
  }
  return '{}';
}

/**
 * Merge an incoming partial config with the existing stored config.
 *
 * When a user submits a provider edit, sensitive fields often come back as the
 * mask string ('••••••••') from the GET response. We never want to store the
 * mask — we want to preserve the previously stored secret. So:
 *  - For sensitive keys, only overwrite the existing value if the new value
 *    is non-empty AND not equal to the mask.
 *  - For non-sensitive keys, always overwrite (or remove if undefined).
 */
export function mergeConfigForUpdate(
  existingJson: string | null | undefined,
  incoming: Record<string, unknown> | null | undefined
): string {
  const existing = existingJson
    ? (() => {
        try {
          return JSON.parse(existingJson) as Record<string, unknown>;
        } catch {
          return {} as Record<string, unknown>;
        }
      })()
    : ({} as Record<string, unknown>);

  const next: Record<string, unknown> = { ...existing };

  if (incoming && typeof incoming === 'object') {
    for (const [key, value] of Object.entries(incoming)) {
      if (SENSITIVE_KEYS.has(key)) {
        // Only update if a real (non-mask, non-empty) value was provided.
        if (Array.isArray(value) && value.length > 0) {
          next[key] = value; // e.g. smtpUserParts
        } else if (typeof value === 'string' && value.trim() !== '' && value !== MASK) {
          next[key] = value;
        }
        // else: keep existing value
      } else {
        if (value === undefined || value === null) {
          delete next[key];
        } else {
          next[key] = value;
        }
      }
    }
  }

  return JSON.stringify(next);
}
