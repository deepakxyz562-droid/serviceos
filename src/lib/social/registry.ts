/**
 * Social Publishing — Platform Adapter Registry
 * ---------------------------------------------
 *
 * The registry is the bridge between the publisher orchestrator and the
 * 6 platform adapters (Facebook, Instagram, Google Business, LinkedIn,
 * Pinterest, X). Adapters register themselves at server boot; the
 * publisher looks them up by platform string at publish time.
 *
 * WHY A REGISTRY (instead of a hardcoded import map)?
 *   1. **Decoupled build** — the 6 adapters are being built by 6 different
 *      agents in parallel. Each adapter's module is self-contained: it
 *      imports the registry, calls `registerAdapter()`, and that's it.
 *      No central "adapters/index.ts" needs to know about all 6.
 *   2. **Lazy loading** — adapters are only loaded if a tenant actually
 *      tries to publish to that platform. A pure-CRM tenant that never
 *      connects Pinterest never pays the import cost for the Pinterest
 *      adapter's API client.
 *   3. **Testability** — tests can register a mock adapter for a fake
 *      platform without touching real adapter code.
 *   4. **Future-proofing** — adding a 7th platform (e.g. TikTok, YouTube)
 *      is a single `registerAdapter()` call in a new file — no changes
 *      to the publisher or any existing adapter.
 *
 * ADAPTER REGISTRATION PATTERN:
 *   Each adapter module looks like:
 *
 *     // src/lib/social/adapters/facebook.ts
 *     import { registerAdapter } from '../registry';
 *     import type { PlatformAdapter } from '../types';
 *
 *     const facebookAdapter: PlatformAdapter = {
 *       platform: 'facebook',
 *       async publish(account, params) { ... },
 *       async fetchMetrics(account, externalPostId) { ... },
 *     };
 *
 *     registerAdapter(facebookAdapter);
 *
 *   And a single bootstrap file (e.g. `src/lib/social/adapters/index.ts`)
 *   side-effect-imports all 6 adapter modules so they self-register:
 *
 *     import './facebook';
 *     import './instagram';
 *     // ... etc
 *
 * The publisher then calls `ensureAdaptersLoaded()` once before looking
 * up the first adapter, so the side-effect imports run lazily on first
 * publish (not at server boot — keeps cold-start fast).
 */

import type { PlatformAdapter, SocialPlatform } from './types';

const adapters = new Map<SocialPlatform, PlatformAdapter>();

/**
 * Register a platform adapter.
 *
 * Idempotent — registering the same platform twice overwrites the
 * previous registration (useful in tests + HMR).
 */
export function registerAdapter(adapter: PlatformAdapter): void {
  if (!adapter || !adapter.platform || typeof adapter.publish !== 'function') {
    throw new Error('[social/registry] registerAdapter: invalid adapter shape');
  }
  adapters.set(adapter.platform, adapter);
}

/**
 * Look up the adapter for a platform.
 *
 * Returns `undefined` if no adapter is registered for that platform
 * (e.g. the adapter module failed to load, or the platform is not yet
 * implemented). Callers MUST handle `undefined` — the publisher treats
 * it as a per-target failure rather than crashing.
 */
export function getAdapter(platform: SocialPlatform): PlatformAdapter | undefined {
  return adapters.get(platform);
}

/**
 * List all platforms that currently have a registered adapter.
 *
 * Used by the accounts view to show which platforms are "ready to
 * connect" vs "coming soon".
 */
export function getSupportedPlatforms(): SocialPlatform[] {
  return Array.from(adapters.keys());
}

/**
 * Check whether a specific platform's adapter is loaded.
 */
export function hasAdapter(platform: SocialPlatform): boolean {
  return adapters.has(platform);
}

/**
 * Clear all registered adapters — TEST ONLY.
 *
 * Used by unit tests to reset the registry between test cases so
 * mock adapters from one test don't leak into the next.
 */
export function clearAdaptersForTest(): void {
  adapters.clear();
}

// ─── Lazy adapter bootstrap ────────────────────────────────────────────────

let adaptersLoaded = false;
let adapterLoadPromise: Promise<void> | null = null;

/**
 * Side-effect-import the adapter modules so they self-register.
 *
 * This is wrapped in a function (not a top-level import) so the adapters
 * load lazily on the first publish request, not at server boot. Cold
 * start stays fast for tenants that never publish.
 *
 * The dynamic `import()` is wrapped in try/catch so a broken adapter
 * module (e.g. a missing optional dep) doesn't take down the whole
 * publisher — it just means that platform won't be available, and
 * `getAdapter(platform)` returns `undefined` for it.
 *
 * IMPORTANT: This function is idempotent and concurrency-safe — if it's
 * called twice in parallel, the second caller awaits the first's
 * in-flight load instead of triggering a duplicate import.
 */
export async function ensureAdaptersLoaded(): Promise<void> {
  if (adaptersLoaded) return;
  if (adapterLoadPromise) return adapterLoadPromise;

  adapterLoadPromise = (async () => {
    const platformImports: Array<[SocialPlatform, Promise<unknown>]> = [
      ['facebook', import('@/lib/social/adapters/facebook').catch(() => ({}))],
      ['instagram', import('@/lib/social/adapters/instagram').catch(() => ({}))],
      ['googlebusiness', import('@/lib/social/adapters/googlebusiness').catch(() => ({}))],
      ['linkedin', import('@/lib/social/adapters/linkedin').catch(() => ({}))],
      ['pinterest', import('@/lib/social/adapters/pinterest').catch(() => ({}))],
      ['twitter', import('@/lib/social/adapters/twitter').catch(() => ({}))],
    ];

    const results = await Promise.allSettled(platformImports.map(([, p]) => p));
    const failed: string[] = [];
    platformImports.forEach(([platform], idx) => {
      const result = results[idx];
      if (result.status === 'rejected' || !adapters.has(platform)) {
        // Either the import threw, or the module loaded but didn't register
        // (e.g. adapter not yet built by the responsible agent).
        failed.push(platform);
      }
    });

    if (failed.length > 0) {
      // Don't throw — partial adapter availability is fine. The publisher
      // will just skip these platforms with a clear "no adapter" error.
      console.warn(
        `[social/registry] Adapters not loaded (likely pending parallel build): ${failed.join(', ')}`,
      );
    }

    adaptersLoaded = true;
  })();

  return adapterLoadPromise;
}
