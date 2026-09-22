/**
 * AES-256-GCM encryption helpers for payment credential storage.
 *
 * Used to encrypt secret gateway keys (Stripe sk_live_..., PayPal clientSecret,
 * Razorpay keySecret, etc.) before storing them in the form's widgetConfig or
 * in the PaymentGatewayConfig → Credential vault.
 *
 * The encryption key is read from process.env.ENCRYPTION_KEY (32-byte hex string,
 * 64 characters). Generate one with:
 *   openssl rand -hex 32
 *
 * Security notes:
 * - AES-256-GCM provides authenticated encryption (integrity + confidentiality).
 * - The IV (initialization vector) is prepended to the ciphertext and is safe
 *   to store alongside it. A fresh random IV is generated per encrypt() call.
 * - The auth tag is appended to the ciphertext.
 * - Decryption fails (throws) if the key is wrong or the ciphertext was tampered.
 */

import * as crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes (96 bits) is the GCM standard
const AUTH_TAG_LENGTH = 16; // 128 bits
const DEV_FALLBACK_KEY = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

function getKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY || DEV_FALLBACK_KEY;
  if (!envKey || envKey.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(envKey)) {
    throw new Error(
      'ENCRYPTION_KEY must be set to a 32-byte hex string (64 hex characters). ' +
      'Generate one with: openssl rand -hex 32'
    );
  }
  return Buffer.from(envKey, 'hex');
}

/**
 * Encrypt a plaintext string. Returns a base64 string containing
 * IV (12 bytes) + ciphertext + auth tag (16 bytes).
 *
 * Safe to store in DB columns, JSON fields, or widgetConfig.
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return '';
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Prepend IV, append auth tag, both base64-encoded.
  const combined = Buffer.concat([
    iv,
    Buffer.from(encrypted, 'base64'),
    authTag,
  ]);

  return combined.toString('base64');
}

/**
 * Decrypt a ciphertext produced by encrypt(). Returns the original plaintext.
 *
 * Throws if the key is wrong or the ciphertext was tampered (GCM auth failure).
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return '';
  const key = getKey();

  const combined = Buffer.from(ciphertext, 'base64');
  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid ciphertext: too short');
  }

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Encrypt a JSON object (e.g. { secretKey: 'sk_live_...', webhookSecret: 'whsec_...' }).
 * Returns the encrypted string. Useful for storing multiple secret fields together
 * in a single Credential.encryptedData row.
 */
export function encryptJSON(obj: Record<string, unknown>): string {
  return encrypt(JSON.stringify(obj));
}

/**
 * Decrypt a JSON object produced by encryptJSON().
 * Returns the parsed object, or {} on parse failure.
 */
export function decryptJSON<T = Record<string, unknown>>(ciphertext: string): T {
  if (!ciphertext) return {} as T;
  try {
    return JSON.parse(decrypt(ciphertext)) as T;
  } catch {
    return {} as T;
  }
}

/**
 * Check if a string looks like an encrypted ciphertext (base64, ≥28 chars).
 * Used to decide whether to decrypt a widgetConfig value or treat it as plaintext.
 */
export function isEncrypted(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  // AES-256-GCM output: base64 of (12 IV + ciphertext + 16 auth tag)
  // Minimum length: 12 + 0 + 16 = 28 bytes → 40 base64 chars (with padding).
  return value.length >= 40 && /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}
