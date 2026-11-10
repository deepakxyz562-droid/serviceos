/**
 * Next.js Server Lifecycle Instrumentation Hook
 *
 * Runs once when the Next.js server starts up in production or development.
 * Starts background tasks such as the internal outreach worker daemon.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Never run background workers or listeners during next build / SSG prerender phase
    if (
      process.env.NEXT_PHASE === 'phase-production-build' ||
      process.env.npm_lifecycle_event === 'build' ||
      process.env.BUILDING === '1'
    ) {
      return;
    }

    try {
      const { registerLifecyclePushHandlers } = await import('@/lib/lifecycle-push-dispatcher');
      registerLifecyclePushHandlers?.();
    } catch (err) {
      console.error('[Instrumentation] Failed to register lifecycle push handlers:', err);
    }

    try {
      const { registerLeadDealSyncListener } = await import('@/lib/lead-deal-sync-listener');
      registerLeadDealSyncListener?.();
    } catch (err) {
      console.error('[Instrumentation] Failed to register lead-deal sync listener:', err);
    }

    try {
      const { startOutreachBackgroundWorker } = await import('@/lib/outreach/worker-daemon');
      startOutreachBackgroundWorker();
    } catch (err) {
      console.warn('[Instrumentation] Failed to start outreach background worker:', err);
    }

    try {
      const { startDiskJanitorWorker } = await import('@/lib/server/disk-janitor');
      startDiskJanitorWorker();
    } catch (err) {
      console.warn('[Instrumentation] Failed to start disk janitor worker:', err);
    }

    try {
      const { startBgosAutopilotWorker } = await import('@/lib/social/autopilot-worker-daemon');
      startBgosAutopilotWorker();
    } catch (err) {
      console.warn('[Instrumentation] Failed to start BGOS autopilot background worker:', err);
    }
  }
}
