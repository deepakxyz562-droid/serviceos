/**
 * AES-256-GCM encryption for AI provider API keys.
 *
 * Storage format: base64(IV[12] || ciphertext || tag[16])
 *
 * Used by the AiProviderKey table (superadmin-managed multi-key fallback chain).
 * The encryption key is derived (SHA-256) from, in priority order:
 *   1. process.env.ENCRYPTION_KEY  (preferred — 32+ char random hex/base64 secret)
 *   2. process.env.NEXTAUTH_SECRET  (commonly available in this project)
 *   3. a hard-coded dev-only fallback (NOT for production; logs a warning)
 *
 * IMPORTANT: rotating ENCRYPTION_KEY invalidates every stored key — re-encrypt
 * before rotating. This module is server-only (uses Node's `crypto`).
 */
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16
const DEV_FALLBACK_KEY = 'dev-only-key-not-for-production'

let devWarned = false

function getKey(): Buffer {
  const raw =
    process.env.ENCRYPTION_KEY ||
    process.env.NEXTAUTH_SECRET ||
    DEV_FALLBACK_KEY

  if (!process.env.ENCRYPTION_KEY && !process.env.NEXTAUTH_SECRET && !devWarned) {
    console.warn(
      '[ai-key-crypto] WARNING: ENCRYPTION_KEY and NEXTAUTH_SECRET are not set. ' +
        'Using insecure dev-only key — DO NOT use in production.',
    )
    devWarned = true
  }

  // SHA-256 yields exactly 32 bytes for AES-256 regardless of input length.
  return createHash('sha256').update(raw).digest()
}

/**
 * Encrypt a plaintext API key into the storage format:
 *   base64(IV[12] || ciphertext || tag[16])
 */
export function encryptKey(plaintext: string): string {
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, getKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, encrypted, tag]).toString('base64')
}

/**
 * Decrypt a stored, base64-encoded key back to plaintext.
 * Throws if the auth tag does not verify (tampered / wrong key).
 */
export function decryptKey(stored: string): string {
  const buf = Buffer.from(stored, 'base64')
  if (buf.length < IV_LEN + TAG_LEN) {
    throw new Error('Invalid ciphertext: too short')
  }
  const iv = buf.subarray(0, IV_LEN)
  const tag = buf.subarray(buf.length - TAG_LEN)
  const ciphertext = buf.subarray(IV_LEN, buf.length - TAG_LEN)
  const decipher = createDecipheriv(ALGO, getKey(), iv)
  decipher.setAuthTag(tag)
  return decipher.update(ciphertext) + decipher.final('utf8')
}

/**
 * Mask a plaintext key for display: show only first 3 and last 4 chars.
 * e.g. "sk-or-v1-abcdef1234567890" → "sk-...7890"
 */
export function maskKey(plaintext: string): string {
  if (plaintext.length <= 8) return '****'
  return `${plaintext.slice(0, 3)}...${plaintext.slice(-4)}`
}

/**
 * Mask an already-encrypted key (decrypts internally, never exposes full key).
 * Returns '****' if decryption fails (tampered / rotated key / wrong secret).
 */
export function maskEncryptedKey(encrypted: string): string {
  try {
    return maskKey(decryptKey(encrypted))
  } catch {
    return '****'
  }
}
