/**
 * Reusable OTP Service — generate, hash, send, verify, expire.
 *
 * Phase 6: Extracted from the customer auth OTP flow
 * (src/app/api/auth/customer/send-otp) into a reusable module so both
 * customer authentication AND business verification can use it.
 *
 * Features:
 *   - 6-digit code generation
 *   - SHA-256 hashing (never store raw codes)
 *   - 5-minute expiry
 *   - Resend cooldown (60s)
 *   - Max verification attempts (5)
 *   - Rate limiting (5 requests/hour per target)
 *   - One-time use (hash cleared after verify)
 *
 * Usage:
 *   const otp = generateOtp();
 *   const hash = hashOtp(otp);
 *   // store hash + expiry on the verification record
 *   // send otp via SMS/email
 *   const valid = verifyOtp(userInput, storedHash);
 */
import { createHash, randomBytes } from 'crypto';

// ── Constants ────────────────────────────────────────────────────────────────
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const OTP_MAX_ATTEMPTS = 5;
const OTP_RATE_LIMIT_PER_HOUR = 5;

// ── In-memory rate limiter (mirrors customer OTP pattern) ───────────────────
interface RateLimitEntry {
  count: number;
  windowStart: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();

// ── Core functions ───────────────────────────────────────────────────────────

/**
 * Generate a 6-digit OTP code.
 */
export function generateOtp(): string {
  // Use crypto.randomInt for cryptographically secure randomness
  const buffer = randomBytes(3);
  const num = buffer.readUIntBE(0, 3) % 1000000;
  return num.toString().padStart(6, '0');
}

/**
 * Hash an OTP code for secure storage. Never store raw codes.
 */
export function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

/**
 * Verify a user-supplied OTP code against the stored hash.
 * Returns true if the code matches.
 */
export function verifyOtpCode(code: string, storedHash: string | null): boolean {
  if (!storedHash) return false;
  return hashOtp(code) === storedHash;
}

/**
 * Check if an OTP is still within its validity window.
 */
export function isOtpExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return Date.now() > expiresAt.getTime();
}

/**
 * Calculate the expiry timestamp for a new OTP (now + 5 minutes).
 */
export function calculateOtpExpiry(): Date {
  return new Date(Date.now() + OTP_TTL_MS);
}

/**
 * Check if a resend is allowed (cooldown has passed).
 */
export function canResend(lastSentAt: Date | null): boolean {
  if (!lastSentAt) return true;
  return Date.now() - lastSentAt.getTime() > OTP_RESEND_COOLDOWN_MS;
}

/**
 * Check if the max verification attempts have been reached.
 */
export function isMaxAttemptsReached(attempts: number): boolean {
  return attempts >= OTP_MAX_ATTEMPTS;
}

/**
 * Rate limit check: max 5 OTP requests per target (phone/email) per hour.
 * Returns null if allowed, or an error message if rate-limited.
 */
export function checkRateLimit(target: string): string | null {
  const key = target.toLowerCase().trim();
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour

  let entry = rateLimitMap.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    entry = { count: 0, windowStart: now };
    rateLimitMap.set(key, entry);
  }

  if (entry.count >= OTP_RATE_LIMIT_PER_HOUR) {
    const resetIn = Math.ceil((entry.windowStart + windowMs - now) / 60000);
    return `Too many OTP requests. Please try again in ${resetIn} minute(s).`;
  }

  entry.count += 1;
  return null;
}

/**
 * Mask a phone number for display (first 6 chars + last 2 digits).
 * Used in the anchor API + verification UI.
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '******';
  const lastTwo = digits.slice(-2);
  const prefix = phone.slice(0, Math.min(phone.length, 6));
  return `${prefix}******${lastTwo}`;
}

/**
 * Mask an email for display (first char + domain).
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '******';
  const firstChar = local.slice(0, 1);
  return `${firstChar}******@${domain}`;
}

export {
  OTP_TTL_MS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_MAX_ATTEMPTS,
  OTP_RATE_LIMIT_PER_HOUR,
};
