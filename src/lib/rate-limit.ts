/**
 * In-memory IP-based rate limiter.
 * Singleton Map<ip, {count, resetAt}>.
 * Returns { success, remaining, resetAtMs }.
 * Note: in-memory only — for single-instance deploy. For multi-instance, swap with Redis.
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();

  constructor(
    private readonly windowMs: number,
    private readonly max: number,
  ) {}

  check(key: string): { success: boolean; remaining: number; resetAtMs: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.resetAt < now) {
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      return { success: true, remaining: this.max - 1, resetAtMs: now + this.windowMs };
    }

    if (entry.count >= this.max) {
      return { success: false, remaining: 0, resetAtMs: entry.resetAt };
    }

    entry.count++;
    return { success: true, remaining: this.max - entry.count, resetAtMs: entry.resetAt };
  }

  /** Periodic cleanup of expired entries (call on a setInterval). */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt < now) this.store.delete(key);
    }
  }

  /** Reset a key (e.g. after successful login, clear failed-attempt counter). */
  reset(key: string): void {
    this.store.delete(key);
  }
}

// Pre-configured limiters
// Auth routes: 10 attempts per 15 min per IP (brute-force protection)
export const authLimiter = new RateLimiter(15 * 60 * 1000, 10);
// Password reset: 3 per hour per IP
export const passwordResetLimiter = new RateLimiter(60 * 60 * 1000, 3);
// OTP send: 5 per hour per IP (in addition to per-phone limit already in the route)
export const otpLimiter = new RateLimiter(60 * 60 * 1000, 5);
// Generic API: 300 per minute per IP
export const apiLimiter = new RateLimiter(60 * 1000, 300);

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  const interval = setInterval(() => {
    authLimiter.cleanup();
    passwordResetLimiter.cleanup();
    otpLimiter.cleanup();
    apiLimiter.cleanup();
  }, 5 * 60 * 1000);
  if (interval.unref) interval.unref();
}

/** Extract client IP from request, handling X-Forwarded-For through the proxy. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

/** Helper: apply a rate limiter to a request and return a NextResponse if blocked, null if allowed. */
export function applyRateLimit(
  limiter: RateLimiter,
  request: Request,
): null | { success: boolean; remaining: number; resetAtMs: number; ip: string } {
  const ip = getClientIp(request);
  const result = limiter.check(ip);
  if (!result.success) {
    return { success: false, remaining: 0, resetAtMs: result.resetAtMs, ip };
  }
  return null;
}

/** Build a 429 Too Many Requests response with proper headers. */
export function rateLimitResponse(resetAtMs: number): Response {
  const retryAfter = Math.ceil((resetAtMs - Date.now()) / 1000);
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.max(retryAfter, 1)),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.floor(resetAtMs / 1000)),
      },
    },
  );
}

export { RateLimiter };
