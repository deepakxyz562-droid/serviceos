/**
 * Social Publishing — Token Encryption at Rest
 * --------------------------------------------
 *
 * `SocialAccount.accessToken` and `SocialAccount.refreshToken` are stored
 * AES-256-GCM encrypted in the database. This module is the single point
 * that knows how to encrypt/decrypt them.
 *
 * WHY A WRAPPER (instead of importing ai-key-crypto directly everywhere)?
 *   1. **Single source of truth** — if we ever swap the algorithm, change
 *      the key-derivation strategy, or migrate to a KMS, only this file
 *      changes. Every social-publisher caller stays the same.
 *   2. **Distinct audit surface** — social tokens are NOT AI provider
 *      keys. Even though they currently use the same crypto primitive
 *      (AES-256-GCM with SHA-256-derived key), separating the API means
 *      we can later rotate one without rotating the other (e.g. by
 *      adding `SOCIAL_CRYPTO_KEY` as a distinct env var).
 *   3. **Self-documenting** — `encryptToken()` / `decryptToken()` make
 *      it obvious at the call site that social tokens are flowing.
 *
 * KEY RESOLUTION (priority order):
 *   1. `process.env.SOCIAL_CRYPTO_KEY` — preferred, dedicated key for
 *      social publishing tokens (lets ops rotate independently).
 *   2. `process.env.ENCRYPTION_KEY` — shared app-wide encryption key.
 *   3. `process.env.NEXTAUTH_SECRET` — commonly available fallback.
 *   4. Hard-coded dev-only key (NOT for production; logs a warning).
 *
 * The existing `ai-key-crypto.ts` already implements AES-256-GCM with
 * `ENCRYPTION_KEY` → `NEXTAUTH_SECRET` → dev-fallback resolution. We
 * reuse its `encryptKey` / `decryptKey` primitives (which are pure
 * functions keyed on `getKey()`-derived state) by deriving our own key
 * with the same SHA-256 scheme when `SOCIAL_CRYPTO_KEY` is set.
 *
 * This module is server-only — it imports Node's `crypto` indirectly via
 * ai-key-crypto. Importing it from a client component would crash at
 * build time, which is the desired behaviour (tokens must NEVER touch
 * the client).
 */
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
const DEV_FALLBACK_KEY = 'social-dev-only-key-not-for-production';

let devWarned = false;

/**
 * Derive the 32-byte AES-256 key from the first available env var.
 *
 * SHA-256 normalises any-length input into exactly 32 bytes, so callers
 * can set a long random hex string OR a short passphrase — both work.
 */
function getKey(): Buffer {
  const raw =
    process.env.SOCIAL_CRYPTO_KEY ||
    process.env.ENCRYPTION_KEY ||
    process.env.NEXTAUTH_SECRET ||
    DEV_FALLBACK_KEY;

  if (
    !process.env.SOCIAL_CRYPTO_KEY &&
    !process.env.ENCRYPTION_KEY &&
    !process.env.NEXTAUTH_SECRET &&
    !devWarned
  ) {
    console.warn(
      '[social/crypto] WARNING: SOCIAL_CRYPTO_KEY, ENCRYPTION_KEY, and NEXTAUTH_SECRET are all unset. ' +
        'Using insecure dev-only key — DO NOT use in production.',
    );
    devWarned = true;
  }

  return createHash('sha256').update(raw).digest();
}

/**
 * Encrypt a plaintext token (access OR refresh) for storage.
 *
 * Storage format: base64(IV[12] || ciphertext || tag[16])
 * — same format as ai-key-crypto so a future migration can read either.
 */
export function encryptToken(plaintext: string): string {
  if (!plaintext) return '';
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, tag]).toString('base64');
}

/**
 * Decrypt a stored token back to plaintext.
 *
 * Throws if the auth tag fails to verify (tampered ciphertext / rotated
 * key / wrong secret). The caller (publisher) should catch + treat as a
 * "refresh failed → mark account inactive" condition.
 *
 * Returns '' for empty input (so nullable refresh tokens don't crash).
 */
export function decryptToken(stored: string): string {
  if (!stored) return '';
  const buf = Buffer.from(stored, 'base64');
  if (buf.length < IV_LEN + TAG_LEN) {
    throw new Error('Invalid social token ciphertext: too short');
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(buf.length - TAG_LEN);
  const ciphertext = buf.subarray(IV_LEN, buf.length - TAG_LEN);
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}

/**
 * Mask a token for display (never expose the full plaintext to the UI).
 *
 * "EAAB1234ZyXwvUtsrQpo..." → "EAA...Qpo"
 *
 * Used by the accounts API when returning metadata about a connected
 * account so the user can verify "yes, that's the right token" without
 * the actual secret ever leaving the server.
 */
export function maskToken(plaintext: string): string {
  if (!plaintext) return '';
  if (plaintext.length <= 8) return '****';
  return `${plaintext.slice(0, 3)}...${plaintext.slice(-3)}`;
}

/**
 * Mask an already-encrypted token without ever exposing the plaintext.
 *
 * Used by the accounts list endpoint to render a "last 3 chars" hint
 * in the UI. Returns '****' if decryption fails (rotated key / tampered).
 */
export function maskEncryptedToken(encrypted: string): string {
  if (!encrypted) return '';
  try {
    return maskToken(decryptToken(encrypted));
  } catch {
    return '****';
  }
}
