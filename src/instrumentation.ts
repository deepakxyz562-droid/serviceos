/**
 * Next.js Server Lifecycle Instrumentation Hook
 *
 * Runs once when the Next.js server starts up in production or development.
 * Starts background tasks such as the internal outreach worker daemon.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { startOutreachBackgroundWorker } = await import('@/lib/outreach/worker-daemon');
      startOutreachBackgroundWorker();
    } catch (err) {
      console.warn('[Instrumentation] Failed to start background worker:', err);
    }
  }
}
