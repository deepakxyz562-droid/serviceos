/**
 * circuit-breaker.ts — Protects against cascading failures when Supabase is down.
 *
 * PROBLEM
 * -------
 * When Supabase Free-tier is overloaded (CPU 98%, connection timeouts),
 * every request waits the full HTTP timeout (~30s) before failing. With
 * concurrent requests this cascades: the Vercel function exhausts its
 * execution budget, users see 504s, and Supabase gets hammered by retries
 * that prevent it from recovering.
 *
 * SOLUTION
 * --------
 * A circuit breaker wraps each Supabase REST call:
 *
 *   CLOSED    — normal operation. Requests go through; failures are counted.
 *   OPEN      — after `failureThreshold` consecutive failures, stop trying
 *               for `resetTimeoutMs`. All requests fail fast with
 *               CircuitOpenError (no network call, no 30s wait).
 *   HALF_OPEN — after resetTimeout, allow ONE probe request. If it succeeds,
 *               close the circuit. If it fails, reopen for another resetTimeout.
 *
 * INTEGRATION WITH shared-cache
 * -----------------------------
 * When the circuit is OPEN, read paths throw CircuitOpenError immediately.
 * The shared-cache's `sharedCacheWrap` catches this and serves stale data
 * (source: 'stale-grace') instead of propagating the error. So during a
 * Supabase outage, users see last-known-good data (provider listings,
 * marketplace, sitemap) rather than 500s — for as long as the stale cache
 * entries are available.
 *
 * WRITE paths are NOT wrapped — writes must surface errors so the caller
 * can retry or inform the user. Only read paths benefit from fail-fast.
 *
 * WHAT COUNTS AS A FAILURE
 * ------------------------
 * - Network errors (fetch rejected, DNS, connection refused)
 * - HTTP 5xx from PostgREST (server errors, gateway timeouts)
 * - AbortError from request timeouts
 *
 * What does NOT count (application errors, not infra failures):
 * - PostgREST 4xx (bad filter, missing column) — these are bugs, not outages
 * - "Table not in Supabase" (config issue)
 * - Empty results (valid data state)
 */

/**
 * Thrown when the circuit is OPEN. Callers that use sharedCacheWrap will
 * never see this (the cache serves stale data). Callers that bypass the
 * cache should catch it and present a "temporarily unavailable" UI.
 */
export class CircuitOpenError extends Error {
  readonly circuitName: string;
  readonly openedAt: number;

  constructor(circuitName: string, openedAt: number) {
    super(`[circuit-breaker] "${circuitName}" is OPEN — failing fast (Supabase may be down)`);
    this.name = 'CircuitOpenError';
    this.circuitName = circuitName;
    this.openedAt = openedAt;
  }
}

interface CircuitState {
  status: 'closed' | 'open' | 'half-open';
  consecutiveFailures: number;
  openedAt: number; // epoch ms when circuit opened
  lastError?: string;
}

// ── Configuration ──────────────────────────────────────────────────────────

interface CircuitBreakerOptions {
  /** Consecutive failures before opening. Default: 5. */
  failureThreshold?: number;
  /** How long to stay OPEN before HALF_OPEN probe. Default: 60s. */
  resetTimeoutMs?: number;
  /** Max failures to remember for logging. Default: 10. */
  recentErrorsToKeep?: number;
}

const DEFAULT_FAILURE_THRESHOLD = 5;
const DEFAULT_RESET_TIMEOUT_MS = 60_000;

// ── Per-circuit state ──────────────────────────────────────────────────────
//
// We use one circuit per table name (e.g. "Tenant", "Service"). This way a
// problem with one table (e.g. a missing column) doesn't trip the breaker
// for unrelated tables. But during a full Supabase outage, all circuits
// will trip independently — which is the desired behavior (fail fast
// everywhere, serve stale everywhere).

const circuits = new Map<string, CircuitState>();

function getCircuit(name: string): CircuitState {
  let c = circuits.get(name);
  if (!c) {
    c = { status: 'closed', consecutiveFailures: 0, openedAt: 0 };
    circuits.set(name, c);
  }
  return c;
}

/**
 * Check if a circuit is open and should fail fast. Called BEFORE making the
 * network request. If the circuit is OPEN but the reset timeout has elapsed,
 * transitions to HALF_OPEN (allowing one probe).
 *
 * @returns true if the request should proceed, false if it should fail fast.
 * @throws CircuitOpenError if the caller prefers exceptions (use the
 *         `throwIfOpen` variant below).
 */
export function isCircuitOpen(name: string, opts: CircuitBreakerOptions = {}): boolean {
  const resetTimeout = opts.resetTimeoutMs ?? DEFAULT_RESET_TIMEOUT_MS;
  const c = getCircuit(name);

  if (c.status === 'open') {
    const elapsed = Date.now() - c.openedAt;
    if (elapsed >= resetTimeout) {
      // Transition to HALF_OPEN — allow a single probe request through.
      c.status = 'half-open';
      return false;
    }
    return true; // still open, fail fast
  }
  return false; // closed or half-open, proceed
}

/**
 * Throw CircuitOpenError if the circuit is OPEN. Convenience for callers
 * that want the exception-based control flow.
 */
export function throwIfCircuitOpen(name: string, opts: CircuitBreakerOptions = {}): void {
  if (isCircuitOpen(name, opts)) {
    const c = getCircuit(name);
    throw new CircuitOpenError(name, c.openedAt);
  }
}

/**
 * Record a successful request. Closes the circuit and resets the failure
 * counter. Called AFTER a successful response.
 */
export function recordSuccess(name: string): void {
  const c = getCircuit(name);
  if (c.status !== 'closed' || c.consecutiveFailures > 0) {
    c.status = 'closed';
    c.consecutiveFailures = 0;
    c.openedAt = 0;
    c.lastError = undefined;
  }
}

/**
 * Record a failed request. Increments the failure counter; opens the circuit
 * if the threshold is reached. Called AFTER a failed response.
 *
 * NOTE: Only call this for INFRA failures (network errors, 5xx, timeouts).
 * Application errors (4xx, "not found", validation) should NOT trip the
 * breaker — see the classifyError helper below.
 */
export function recordFailure(
  name: string,
  error: unknown,
  opts: CircuitBreakerOptions = {},
): void {
  const threshold = opts.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD;
  const c = getCircuit(name);
  c.consecutiveFailures += 1;
  c.lastError = (error as Error)?.message ?? String(error);

  if (c.status === 'half-open') {
    // Probe failed — reopen the circuit.
    c.status = 'open';
    c.openedAt = Date.now();
    console.warn(
      `[circuit-breaker] "${name}" HALF_OPEN probe failed, reopening circuit. ` +
        `Error: ${c.lastError}`,
    );
    return;
  }

  if (c.consecutiveFailures >= threshold && c.status !== 'open') {
    c.status = 'open';
    c.openedAt = Date.now();
    console.error(
      `[circuit-breaker] "${name}" OPENED after ${c.consecutiveFailures} consecutive failures. ` +
        `Failing fast for ${Math.round((opts.resetTimeoutMs ?? DEFAULT_RESET_TIMEOUT_MS) / 1000)}s. ` +
        `Last error: ${c.lastError}`,
    );
  }
}

/**
 * Classify whether an error should trip the circuit breaker.
 *
 * TRIPS (infra failures — Supabase is likely down/overloaded):
 *   - TypeError: Failed to fetch (network/DNS)
 *   - AbortError (request timeout)
 *   - PostgREST error with code starting with 5 (HTTP 5xx)
 *   - Errors containing "timeout", "ECONNREFUSED", "ETIMEDOUT", "fetch failed"
 *
 * DOES NOT TRIP (application errors — Supabase is fine, the query is wrong):
 *   - PostgREST 4xx errors (bad filter, missing column, RLS denial)
 *   - "Table not in Supabase" config errors
 *   - Validation errors thrown by the adapter
 */
export function isInfraFailure(error: unknown): boolean {
  if (!error) return false;
  const msg = (error as Error)?.message ?? String(error);
  const name = (error as Error)?.name ?? '';

  // Network / fetch errors
  if (name === 'TypeError' && /fetch|network|failed to fetch/i.test(msg)) return true;
  if (name === 'AbortError') return true;

  // Connection-level errors
  if (/ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/i.test(msg)) return true;
  if (/timeout|timed out/i.test(msg)) return true;
  if (/fetch failed|network error|socket hang up/i.test(msg)) return true;

  // PostgREST 5xx — the adapter wraps these as "[SupabaseDB] ... failed: ... (code=5xx)"
  // The error code is PostgREST's internal code (like PGRST205), not HTTP status.
  // But network-level 5xx surface as fetch failures above. PostgREST application
  // errors (4xx) surface as "[SupabaseDB] ... code=42P01" etc. — those are NOT
  // infra failures. So we rely on the network-error patterns above.
  if (/\(code=50\d\)|HTTP 50\d|502 Bad Gateway|503 Service Unavailable|504 Gateway Timeout/i.test(msg)) {
    return true;
  }

  return false;
}

/**
 * Execute a function with circuit-breaker protection.
 *
 * - If the circuit is OPEN, throws CircuitOpenError immediately (no call made).
 * - On infra failure, records it and may open the circuit.
 * - On success, records it and closes the circuit.
 * - Application errors are re-thrown WITHOUT recording (they don't trip).
 *
 * @example
 *   const result = await withCircuitBreaker('Tenant', () => query);
 */
export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  opts: CircuitBreakerOptions = {},
): Promise<T> {
  // Check + throw BEFORE the network call. This is the fail-fast path.
  throwIfCircuitOpen(name, opts);

  try {
    const result = await fn();
    recordSuccess(name);
    return result;
  } catch (err) {
    if (err instanceof CircuitOpenError) {
      // Shouldn't happen (we checked above), but if a nested call re-throws,
      // just propagate.
      throw err;
    }
    if (isInfraFailure(err)) {
      recordFailure(name, err, opts);
    }
    // Always rethrow — the caller decides how to handle the error.
    // (The shared-cache layer catches CircuitOpenError to serve stale data;
    //  other errors propagate normally.)
    throw err;
  }
}

/**
 * Get the current state of a circuit (for health checks / debugging).
 */
export function getCircuitState(name: string): Readonly<CircuitState> {
  return { ...getCircuit(name) };
}

/**
 * Get all circuit states (for a /health endpoint).
 */
export function getAllCircuitStates(): Record<string, Readonly<CircuitState>> {
  const result: Record<string, Readonly<CircuitState>> = {};
  for (const [name, state] of circuits.entries()) {
    result[name] = { ...state };
  }
  return result;
}

/**
 * Manually reset a circuit (for admin/debugging). Use with caution —
 * normally the circuit self-heals via HALF_OPEN probes.
 */
export function resetCircuit(name: string): void {
  circuits.delete(name);
}

/**
 * Re-throw if the error is a CircuitOpenError. Use this in catch blocks
 * that would otherwise swallow errors (returning null/[]/0 as a fallback),
 * so that CircuitOpenError propagates up to sharedCacheWrap which can then
 * serve stale data instead.
 *
 * @example
 *   try {
 *     tenant = await db.tenant.findFirst({...});
 *   } catch (err) {
 *     rethrowIfCircuitOpen(err); // don't swallow — let cache serve stale
 *     return null; // legitimate "not found" fallback for other errors
 *   }
 */
export function rethrowIfCircuitOpen(err: unknown): void {
  if (err instanceof CircuitOpenError) throw err;
}
