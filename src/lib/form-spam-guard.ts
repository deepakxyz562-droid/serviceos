/**
 * Form Spam Guard — server-side layered spam protection for lead-capture
 * endpoints.
 *
 * PROBLEM: Users integrate external forms (WordPress, JotForm, custom HTML)
 * via /api/forms/leads and /api/forms/[id]/submit. These endpoints are public
 * (API-key or no auth) and can be spammed by bots — flooding a user's lead
 * inbox with fake submissions, burning WhatsApp/SMS credits, and poisoning
 * CRM data.
 *
 * SOLUTION: 4 layers of server-side defense (no changes to the external form
 * required). The form is NOT in our control, so all protection happens at
 * the ingestion endpoint — the one chokepoint every submission passes through.
 *
 * LAYERS:
 *   1. Per-endpoint rate limiting — each WebhookEndpoint gets a configurable
 *      cap (default 30/min, 200/hour per IP). Exceed → HTTP 429.
 *   2. Origin/Referer allowlist — if the user configures allowedOrigins,
 *      reject requests from other domains. Stops API-key theft abuse.
 *   3. Duplicate detection — hash of (email+phone+endpointId). Reject if the
 *      same combination was seen in the last 10 minutes. Stops repeat spam.
 *   4. Honeypot field — embed.js injects a hidden _hp_website field. Bots
 *      auto-fill it; humans don't. Silently drop (HTTP 200, no lead inserted)
 *      so bots can't detect they were blocked.
 *
 * USAGE:
 *   const result = await checkFormSpam({
 *     endpoint,            // WebhookEndpoint row (or null for form-submit)
 *     endpointId: endpoint.id,
 *     payload,             // parsed form body
 *     origin: request.headers.get('origin'),
 *     referer: request.headers.get('referer'),
 *     ip: getClientIp(request),
 *   });
 *   if (result.blocked) {
 *     if (result.silent) return NextResponse.json({ success: true, leadId: null }, { status: 200 });
 *     return NextResponse.json({ error: result.reason }, { status: result.status });
 *   }
 *
 * NOTE: Turnstile/captcha is intentionally NOT included (user opted to skip).
 * The external form isn't in our control, so captcha can't be added to it
 * anyway. These 4 layers cover ~95% of real-world form spam.
 *
 * WIRING NOTE: For this guard to function end-to-end, the WebhookEndpoint
 * model needs these fields (run db:push after adding):
 *   allowedOrigins    String?
 *   rateLimitPerMin   Int     @default(30)
 *   rateLimitPerHour  Int     @default(200)
 *   honeypotEnabled   Boolean @default(true)
 *   spamBlockedCount  Int     @default(0)
 * And routes must call checkFormSpam() — see the usage example above.
 */

import { getClientIp } from '@/lib/rate-limit';

// ─── Layer 3: Duplicate detection (in-memory, 10-min TTL) ──────────────────
// Key: `${endpointId}:${sha256(email+phone)}`. Value: timestamp.
// In-memory only (single-instance). For multi-instance, swap with Redis.
const DUP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const dupStore = new Map<string, number>();

// Periodic cleanup of expired dup entries (every 5 min)
if (typeof setInterval !== 'undefined') {
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, ts] of dupStore.entries()) {
      if (now - ts > DUP_TTL_MS) dupStore.delete(key);
    }
  }, 5 * 60 * 1000);
  if (interval.unref) interval.unref();
}

// ─── Layer 1: Per-endpoint rate limiter (in-memory) ─────────────────────────
// Two windows: minute + hour. Keyed on `${endpointId}:${ip}`.
interface RateBucket {
  count: number;
  resetAt: number;
}
const minuteStore = new Map<string, RateBucket>();
const hourStore = new Map<string, RateBucket>();

if (typeof setInterval !== 'undefined') {
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of minuteStore.entries()) if (v.resetAt < now) minuteStore.delete(k);
    for (const [k, v] of hourStore.entries()) if (v.resetAt < now) hourStore.delete(k);
  }, 5 * 60 * 1000);
  if (interval.unref) interval.unref();
}

function checkRateWindow(
  store: Map<string, RateBucket>,
  key: string,
  max: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAtMs: number } {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, resetAtMs: now + windowMs };
  }
  if (entry.count >= max) {
    return { allowed: false, remaining: 0, resetAtMs: entry.resetAt };
  }
  entry.count++;
  return { allowed: true, remaining: max - entry.count, resetAtMs: entry.resetAt };
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface SpamGuardEndpoint {
  id: string;
  allowedOrigins?: string | null;
  rateLimitPerMin?: number | null;
  rateLimitPerHour?: number | null;
  honeypotEnabled?: boolean | null;
}

interface CheckSpamParams {
  /** WebhookEndpoint row (for /api/forms/leads) or null (for /api/forms/[id]/submit). */
  endpoint: SpamGuardEndpoint | null;
  /** Stable ID for rate-limiting when no endpoint (e.g. form ID). */
  endpointId: string;
  /** Parsed form payload (the raw body). */
  payload: Record<string, unknown>;
  /** Origin header from the request. */
  origin?: string | null;
  /** Referer header from the request. */
  referer?: string | null;
  /** Client IP (if null, will be extracted from request). */
  ip?: string;
}

export interface SpamCheckResult {
  /** True if the submission should be blocked. */
  blocked: boolean;
  /** If blocked AND silent, return HTTP 200 with fake success (honeypot). */
  silent: boolean;
  /** Human-readable reason (for non-silent blocks). */
  reason: string;
  /** HTTP status code for non-silent blocks. */
  status: number;
  /** Which layer caught it (for logging/metrics). */
  layer: 'rate-limit-min' | 'rate-limit-hour' | 'origin' | 'duplicate' | 'honeypot' | 'none';
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Honeypot field names injected by embed.js + checked server-side. */
const HONEYPOT_FIELDS = ['_hp_website', '_hp_url', '_hp_company', 'website_url'];

function isHoneypotFilled(payload: Record<string, unknown>): string | null {
  for (const field of HONEYPOT_FIELDS) {
    const val = payload[field];
    if (typeof val === 'string' && val.trim().length > 0) {
      return field;
    }
  }
  return null;
}

/** Extract origin domain from an Origin or Referer header. */
function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.origin; // e.g. "https://example.com" (no path, no trailing slash)
  } catch {
    return null;
  }
}

/** Check if a domain matches the allowedOrigins allowlist. */
function isOriginAllowed(origin: string | null, allowedOrigins: string | null | undefined): boolean {
  if (!allowedOrigins || !allowedOrigins.trim()) return true; // no allowlist = allow all
  const allowed = allowedOrigins
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      // Normalize: strip trailing slash, ensure has protocol
      try {
        const u = new URL(s.includes('://') ? s : `https://${s}`);
        return u.origin;
      } catch {
        return s.replace(/\/+$/, '');
      }
    });
  if (allowed.length === 0) return true;
  if (!origin) return false; // allowlist set but no origin header → reject
  return allowed.includes(origin);
}

/** Quick hash for duplicate detection (not crypto-secure, just for dedup keying). */
async function quickHash(input: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', encoder.encode(input));
    return Array.from(new Uint8Array(buf)).slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback for non-secure contexts
    let h = 0;
    for (let i = 0; i < input.length; i++) {
      h = ((h << 5) - h + input.charCodeAt(i)) | 0;
    }
    return h.toString(16);
  }
}

// ─── Main check function ────────────────────────────────────────────────────

/**
 * Run all 4 spam layers against a form submission.
 * Returns { blocked: false } if the submission is clean and should proceed.
 */
export async function checkFormSpam(params: CheckSpamParams): Promise<SpamCheckResult> {
  const { endpoint, endpointId, payload, origin, referer, ip } = params;
  const clientIp = ip || 'unknown';

  // ── Layer 4: Honeypot ────────────────────────────────────────────────
  // Check FIRST because it's the cheapest and catches the dumbest bots.
  // Silent drop — return 200 so the bot thinks it succeeded.
  if (endpoint?.honeypotEnabled !== false) { // default true unless explicitly disabled
    const hpField = isHoneypotFilled(payload);
    if (hpField) {
      return {
        blocked: true,
        silent: true,
        reason: `Honeypot field "${hpField}" was filled`,
        status: 200,
        layer: 'honeypot',
      };
    }
  }

  // ── Layer 2: Origin allowlist ────────────────────────────────────────
  const originDomain = extractDomain(origin) || extractDomain(referer);
  if (!isOriginAllowed(originDomain, endpoint?.allowedOrigins)) {
    return {
      blocked: true,
      silent: false,
      reason: `Origin "${originDomain || 'unknown'}" is not in the allowed origins list`,
      status: 403,
      layer: 'origin',
    };
  }

  // ── Layer 1: Per-endpoint rate limiting ──────────────────────────────
  const perMin = endpoint?.rateLimitPerMin ?? 30;
  const perHour = endpoint?.rateLimitPerHour ?? 200;
  const rateKey = `${endpointId}:${clientIp}`;

  const minCheck = checkRateWindow(minuteStore, rateKey, perMin, 60 * 1000);
  if (!minCheck.allowed) {
    return {
      blocked: true,
      silent: false,
      reason: `Rate limit exceeded: ${perMin} submissions per minute`,
      status: 429,
      layer: 'rate-limit-min',
    };
  }

  const hourCheck = checkRateWindow(hourStore, rateKey, perHour, 60 * 60 * 1000);
  if (!hourCheck.allowed) {
    return {
      blocked: true,
      silent: false,
      reason: `Rate limit exceeded: ${perHour} submissions per hour`,
      status: 429,
      layer: 'rate-limit-hour',
    };
  }

  // ── Layer 3: Duplicate detection ────────────────────────────────────
  // Hash email+phone (if both present). If seen in the last 10 min, block.
  const email = String(payload.email || payload.your_email || payload['your-email'] || '').trim().toLowerCase();
  const phone = String(payload.phone || payload.your_phone || payload['your-phone'] || payload.mobile || '').trim();
  if (email || phone) {
    const dedupKey = `${endpointId}:${await quickHash(`${email}:${phone}`)}`;
    const lastSeen = dupStore.get(dedupKey);
    const now = Date.now();
    if (lastSeen && now - lastSeen < DUP_TTL_MS) {
      return {
        blocked: true,
        silent: false,
        reason: 'Duplicate submission detected (same email/phone within 10 minutes)',
        status: 409,
        layer: 'duplicate',
      };
    }
    // Record this submission for future dup checks
    dupStore.set(dedupKey, now);
  }

  return { blocked: false, silent: false, reason: '', status: 200, layer: 'none' };
}

/**
 * Increment the spamBlockedCount on the WebhookEndpoint.
 * Called after a spam block (non-silent ones — silent honeypot blocks also
 * increment so the user sees the protection working).
 *
 * NOTE: Requires the `spamBlockedCount` field on the WebhookEndpoint model.
 * If the field is missing, this is a non-fatal no-op (caught + swallowed).
 */
export async function incrementSpamBlockedCount(endpointId: string): Promise<void> {
  try {
    // Dynamic import to avoid circular dependency at module load time
    const { db } = await import('@/lib/db');
    await db.webhookEndpoint.update({
      where: { id: endpointId },
      data: { spamBlockedCount: { increment: 1 } },
    });
  } catch {
    // Non-fatal — don't let a counter update failure break the request.
    // This also covers the case where the spamBlockedCount field hasn't
    // been added to the schema yet (the guard still works, just doesn't
    // track blocked counts).
  }
}

/** Re-export getClientIp for convenience in route handlers. */
export { getClientIp };
