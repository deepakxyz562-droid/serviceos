/**
 * Bounded LRU In-Memory Rate Limiter + Optional PostgreSQL RPC Limiter (No Redis).
 * Multi-instance shared quotas use Postgres `checkDbRateLimit` when USE_SUPABASE_DB=true,
 * while fast per-request IP ceilings use a memory-bounded Map (max 20,000 keys).
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private readonly maxKeys: number;

  constructor(
    private readonly windowMs: number,
    private readonly max: number,
    maxKeys = 20_000,
  ) {
    this.maxKeys = maxKeys;
  }

  check(key: string): { success: boolean; remaining: number; resetAtMs: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.resetAt < now) {
      if (this.store.has(key)) {
        this.store.delete(key);
      } else if (this.store.size >= this.maxKeys) {
        const oldestKey = this.store.keys().next().value;
        if (oldestKey !== undefined) this.store.delete(oldestKey);
      }
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      return { success: true, remaining: this.max - 1, resetAtMs: now + this.windowMs };
    }

    // Refresh LRU order
    this.store.delete(key);
    if (entry.count >= this.max) {
      this.store.set(key, entry);
      return { success: false, remaining: 0, resetAtMs: entry.resetAt };
    }

    entry.count++;
    this.store.set(key, entry);
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
// Auth routes (passwords): 30 attempts per 15 min per IP (brute-force protection)
export const authLimiter = new RateLimiter(15 * 60 * 1000, 30);
// OAuth routes (Google / Apple / SSO): 60 attempts per 15 min per IP
export const oauthLimiter = new RateLimiter(15 * 60 * 1000, 60);
// Token refresh routes: 120 attempts per 15 min per IP (silent background refreshes)
export const refreshLimiter = new RateLimiter(15 * 60 * 1000, 120);
// Password reset: 5 per hour per IP
export const passwordResetLimiter = new RateLimiter(60 * 60 * 1000, 5);
// OTP send: 10 per hour per IP (in addition to per-phone limit already in the route)
export const otpLimiter = new RateLimiter(60 * 60 * 1000, 10);
// Generic API: 1200 per minute per IP (accommodates shared mobile CGNAT carrier IPs at 5,000+ users)
export const apiLimiter = new RateLimiter(60 * 1000, 1200);
// Per-tenant heavy AI & SEO scan limiters (enforced by tenantId)
export const tenantAiLimiter = new RateLimiter(60 * 1000, 30);
export const tenantScanLimiter = new RateLimiter(60 * 1000, 15);

/**
 * Per-tenant rate limit check for expensive AI / Places / Scan operations.
 * Uses local bounded LRU first, plus atomic Postgres RPC (`check_bgos_rate_limit`)
 * in multi-instance Supabase deployments (no Redis needed).
 */
export async function applyTenantRateLimit(
  limiter: RateLimiter,
  tenantId: string,
  bucketName: string,
  windowMs = 60_000,
  max = 30,
): Promise<{ success: boolean; remaining: number; resetAtMs: number }> {
  const key = `${bucketName}:${tenantId}`;
  const local = limiter.check(key);
  if (!local.success) return local;

  if (process.env.USE_SUPABASE_DB === 'true') {
    try {
      const { checkDbRateLimit } = await import('@/lib/supabase-rpc');
      const remote = await checkDbRateLimit(key, windowMs, max);
      if (remote && !remote.success) {
        return remote;
      }
    } catch {
      // Fail open to local limiter if RPC hasn't been migrated yet
    }
  }
  return local;
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  const interval = setInterval(() => {
    authLimiter.cleanup();
    oauthLimiter.cleanup();
    refreshLimiter.cleanup();
    passwordResetLimiter.cleanup();
    otpLimiter.cleanup();
    apiLimiter.cleanup();
  }, 5 * 60 * 1000);
  if (interval.unref) interval.unref();
}

/** Extract client IP from request, handling Cloudflare and proxy headers. */
export function getClientIp(request: Request): string {
  const cf = request.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
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
