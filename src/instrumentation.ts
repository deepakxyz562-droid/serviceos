/**
 * Next.js Server Lifecycle Instrumentation Hook
 *
 * Runs once when the Next.js server starts up in production or development.
 * Starts background tasks such as the internal outreach worker daemon.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Never run background daemons during next build / SSG prerender phase
    if (
      process.env.NEXT_PHASE === 'phase-production-build' ||
      process.env.npm_lifecycle_event === 'build' ||
      process.env.BUILDING === '1'
    ) {
      return;
    }

    try {
      const { startOutreachBackgroundWorker } = await import('@/lib/outreach/worker-daemon');
      startOutreachBackgroundWorker();
    } catch (err) {
      console.warn('[Instrumentation] Failed to start background worker:', err);
    }
  }
}
