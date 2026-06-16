/**
 * credential-crypto.ts
 *
 * AES-256-GCM encryption utilities for credentials stored in the database.
 *
 * The Credential model stores API keys in `encryptedData` (TEXT) as a string in
 * the format: `aes-256-gcm:<ivHex>:<authTagHex>:<ciphertextHex>`.
 *
 * Key resolution:
 *   1. If `CREDENTIAL_ENCRYPTION_KEY` env var is set (32-byte hex string), use it.
 *   2. Otherwise, derive a deterministic key from a fallback string via
 *      `crypto.scryptSync` so the app works out-of-the-box in development.
 *   3. Never crash if the env var is missing — log a warning instead.
 *
 * Backward compatibility:
 *   - Old records may still contain raw `JSON.stringify()` output. The
 *     `decryptCredentialData()` function detects the new format by the
 *     `aes-256-gcm:` prefix; anything else is treated as legacy JSON.
 */

import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV is recommended for GCM
const PREFIX = 'aes-256-gcm:';
const FALLBACK_PASSPHRASE = 'serviceos-credential-fallback-key-v1';

let cachedKey: Buffer | null = null;
let encryptionEnabled = false;
let keyWarningLogged = false;

/**
 * Resolve and cache the encryption key at module-load time.
 *
 * - If `CREDENTIAL_ENCRYPTION_KEY` is set, it must be a 64-char hex string
 *   (32 bytes). We parse it directly into a 32-byte Buffer.
 * - Otherwise, we derive a 32-byte key from a fallback passphrase using
 *   scryptSync so the app still works in dev environments. A warning is
 *   logged once.
 *
 * This function never throws — it always returns a usable 32-byte key.
 */
function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const envKey = process.env.CREDENTIAL_ENCRYPTION_KEY;

  if (envKey && envKey.length === 64 && /^[0-9a-fA-F]{64}$/.test(envKey)) {
    cachedKey = Buffer.from(envKey, 'hex');
    encryptionEnabled = true;
    return cachedKey;
  }

  if (envKey && !keyWarningLogged) {
    console.warn(
      '[credential-crypto] CREDENTIAL_ENCRYPTION_KEY is set but is not a valid 32-byte hex string (expected 64 hex chars). Falling back to derived key.'
    );
    keyWarningLogged = true;
  } else if (!envKey && !keyWarningLogged) {
    console.warn(
      '[credential-crypto] CREDENTIAL_ENCRYPTION_KEY env var is not set. Using a deterministic fallback key derived from a fixed passphrase. This is NOT secure for production — set CREDENTIAL_ENCRYPTION_KEY to a 32-byte (64 hex char) random string.'
    );
    keyWarningLogged = true;
  }

  // Derive a 32-byte key from the fallback passphrase. scryptSync is
  // deterministic for the same passphrase + salt, so this works out-of-the-box.
  const salt = Buffer.from('serviceos-credential-salt-v1', 'utf8');
  cachedKey = crypto.scryptSync(FALLBACK_PASSPHRASE, salt, 32);
  encryptionEnabled = false;
  return cachedKey;
}

// Resolve the key once at module load.
getKey();

/**
 * Encrypt a credentials payload into the `aes-256-gcm:<iv>:<authTag>:<ciphertext>`
 * string format.
 *
 * @param data Plain key/value credential payload (e.g. `{ apiKey: 'sk-...' }`)
 * @returns Encrypted string ready to store in `Credential.encryptedData`.
 */
export function encryptCredentialData(data: Record<string, any>): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);

  const json = JSON.stringify(data ?? {});
  const ciphertext = Buffer.concat([
    cipher.update(json, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/**
 * Decrypt a credential payload previously produced by `encryptCredentialData`.
 *
 * Accepts the `aes-256-gcm:<iv>:<authTag>:<ciphertext>` format. Returns `{}`
 * on any failure (malformed input, auth tag mismatch, JSON parse error, etc.)
 * so callers don't crash when handling a corrupted record.
 *
 * For backward compatibility, if the input is NOT prefixed with `aes-256-gcm:`,
 * this function attempts to parse it as plain JSON (legacy records) before
 * returning `{}`.
 */
export function decryptCredentialData(encrypted: string): Record<string, any> {
  if (!encrypted || typeof encrypted !== 'string') return {};

  // Legacy records may be plain JSON.
  if (!encrypted.startsWith(PREFIX)) {
    try {
      const parsed = JSON.parse(encrypted);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  }

  try {
    const payload = encrypted.slice(PREFIX.length);
    const parts = payload.split(':');
    if (parts.length !== 3) return {};

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const ciphertext = Buffer.from(parts[2], 'hex');

    if (iv.length === 0 || authTag.length === 0 || ciphertext.length === 0) {
      return {};
    }

    const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
    decipher.setAuthTag(authTag);

    const plain = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    const parsed = JSON.parse(plain.toString('utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

/**
 * Mask sensitive values in a credential payload for safe display to the client.
 *
 * - Keys containing "password", "secret", "key", or "token" (case-insensitive)
 *   → `'••••••••'` (these are real secrets and must never be exposed).
 * - Other fields (e.g. host, port, region, phoneNumberId, businessAccountId,
 *   webhookVerifyToken, database, username, sslMode) are returned UNMASKED so
 *   the edit form can prefill them with their real values. These are
 *   configuration values, not secrets, and partial-masking them caused poor
 *   UX (e.g. host became `'sm••••et'`).
 * - Non-string values are passed through unchanged.
 */
export function maskCredentialData(
  data: Record<string, any>
): Record<string, any> {
  const masked: Record<string, any> = {};
  for (const [key, value] of Object.entries(data ?? {})) {
    if (typeof value === 'string' && value.length > 0) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('key') ||
        lowerKey.includes('token')
      ) {
        masked[key] = '••••••••';
      } else {
        // Non-sensitive configuration values are returned as-is so the
        // edit form can prefill them.
        masked[key] = value;
      }
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

/**
 * Returns `true` if a real encryption key was provided via the
 * `CREDENTIAL_ENCRYPTION_KEY` environment variable. Returns `false` when the
 * fallback derived key is in use.
 */
export function isEncryptionEnabled(): boolean {
  // Re-check in case env was set after module load (rare, but safe).
  if (encryptionEnabled) return true;
  const envKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
  return !!(envKey && envKey.length === 64 && /^[0-9a-fA-F]{64}$/.test(envKey));
}

/**
 * Test a credential by making a real (read-only) API call to the corresponding
 * provider. Used by the "Test" button on the credentials UI to validate a
 * credential BEFORE it is saved.
 *
 * Supported credential types:
 *   - `openai` or `apiKey` with an `apiKey` field → OpenAI `/v1/models`
 *   - `anthropic` with `apiKey` → Anthropic `/v1/models`
 *   - `huggingface` with `apiKey` → HuggingFace `/api/whoami-v2`
 *   - `whatsapp` with `apiKey` + `phoneNumberId` → Meta Graph API
 *
 * For any other type or missing required fields, returns
 * `{ success: true, message: 'Test skipped ...' }`.
 *
 * Uses a 10-second `AbortController` timeout. On any failure (network error,
 * non-2xx response, etc.) returns `{ success: false, message }`.
 */
export async function testCredential(
  credentialType: string,
  data: Record<string, any>
): Promise<{ success: boolean; message: string; details?: any }> {
  const apiKey = data?.apiKey;
  const phoneNumberId = data?.phoneNumberId;

  const tryFetch = async (
    url: string,
    init: RequestInit,
    providerName: string
  ): Promise<{ success: boolean; message: string; details?: any }> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      const text = await res.text();
      let body: any = text;
      try {
        body = JSON.parse(text);
      } catch {
        // keep as text
      }

      if (res.ok) {
        return {
          success: true,
          message: `${providerName} credential is valid.`,
          details: body,
        };
      }

      // Extract a human-friendly error message.
      let msg = `${providerName} returned status ${res.status}`;
      if (body && typeof body === 'object') {
        msg =
          body.error?.message ||
          body.error?.type ||
          body.message ||
          body.detail ||
          msg;
      } else if (typeof body === 'string' && body.length > 0 && body.length < 500) {
        msg = body;
      }
      return { success: false, message: msg, details: body };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return {
          success: false,
          message: `${providerName} request timed out after 10 seconds.`,
        };
      }
      return {
        success: false,
        message: err?.message || `Failed to reach ${providerName}.`,
      };
    } finally {
      clearTimeout(timeout);
    }
  };

  const type = (credentialType || '').toLowerCase();

  if ((type === 'openai' || type === 'apikey') && apiKey) {
    return tryFetch(
      'https://api.openai.com/v1/models',
      { headers: { Authorization: `Bearer ${apiKey}` }, method: 'GET' },
      'OpenAI'
    );
  }

  if (type === 'anthropic' && apiKey) {
    return tryFetch(
      'https://api.anthropic.com/v1/models',
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        method: 'GET',
      },
      'Anthropic'
    );
  }

  if (type === 'huggingface' && apiKey) {
    return tryFetch(
      'https://huggingface.co/api/whoami-v2',
      { headers: { Authorization: `Bearer ${apiKey}` }, method: 'GET' },
      'HuggingFace'
    );
  }

  if (type === 'whatsapp' && apiKey && phoneNumberId) {
    return tryFetch(
      `https://graph.facebook.com/v25.0/${phoneNumberId}`,
      { headers: { Authorization: `Bearer ${apiKey}` }, method: 'GET' },
      'WhatsApp'
    );
  }

  // ─── Phase 4: Additional AI providers ───────────────────────────────────
  //
  // Each provider's test endpoint is a lightweight authenticated GET that
  // returns 200 if the API key is valid. All endpoints are documented in
  // each provider's official API reference.

  if (type === 'gemini' && apiKey) {
    // Google AI Studio — list models (read-only)
    return tryFetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { method: 'GET' },
      'Google Gemini'
    );
  }

  if (type === 'mistral' && apiKey) {
    // Mistral AI — list models (OpenAI-compatible endpoint)
    return tryFetch(
      'https://api.mistral.ai/v1/models',
      { headers: { Authorization: `Bearer ${apiKey}` }, method: 'GET' },
      'Mistral AI'
    );
  }

  if (type === 'groq' && apiKey) {
    // Groq — list models (OpenAI-compatible endpoint)
    return tryFetch(
      'https://api.groq.com/openai/v1/models',
      { headers: { Authorization: `Bearer ${apiKey}` }, method: 'GET' },
      'Groq'
    );
  }

  if (type === 'cohere' && apiKey) {
    // Cohere — check token validity (returns 200 with key info on success)
    return tryFetch(
      'https://api.cohere.ai/v1/check-api-key',
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'X-Client-Name': 'serviceos-workflow',
        },
        method: 'POST',
      },
      'Cohere'
    );
  }

  if (type === 'perplexity' && apiKey) {
    // Perplexity — list models (OpenAI-compatible endpoint)
    return tryFetch(
      'https://api.perplexity.ai/models',
      { headers: { Authorization: `Bearer ${apiKey}` }, method: 'GET' },
      'Perplexity'
    );
  }

  if (type === 'deepseek' && apiKey) {
    // DeepSeek — list models (OpenAI-compatible endpoint)
    return tryFetch(
      'https://api.deepseek.com/v1/models',
      { headers: { Authorization: `Bearer ${apiKey}` }, method: 'GET' },
      'DeepSeek'
    );
  }

  // Platform AI is a virtual credential type — there's no key to test.
  // We just return a friendly "ready" message so the Test button shows
  // something useful instead of the generic "skipped" fallback.
  if (type === 'platform_ai') {
    return {
      success: true,
      message: 'Platform AI is ready — uses the server-side Z.AI SDK (no API key needed).',
      details: { platform: true, freeTier: '100 calls/month' },
    };
  }

  return {
    success: true,
    message: 'Test skipped (no test available for this credential type)',
  };
}
