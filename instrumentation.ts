/**
 * Next.js Instrumentation Hook
 *
 * Runs once on server boot (both in `next dev` and in production). Used here
 * to register the lifecycle push dispatcher — a central EventBus listener
 * that fires an in-app notification + a real Web Push to the tenant owner
 * (and assigned employee) on EVERY lifecycle event (job.assigned,
 * lead.created, booking.confirmed, payment.received, etc.).
 *
 * See src/lib/lifecycle-push-dispatcher.ts for the full architecture.
 *
 * NOTE: Next.js invokes `register()` in BOTH the Node.js runtime (server)
 * AND the Edge runtime (for edge route handlers / middleware). The dispatcher
 * imports Node-only modules (`crypto` via sms-send → owner-notifications), so
 * we MUST guard registration with `process.env.NEXT_RUNTIME === 'nodejs'` —
 * otherwise Edge bundling fails with "crypto is not supported in Edge Runtime".
 */
export async function register() {
  // Only register in the Node.js runtime. The Edge runtime can't load the
  // dispatcher's transitive deps (Prisma, web-push, crypto).
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return
  }

  // Register the lifecycle push dispatcher so every EventBus.emit() for a
  // lifecycle event triggers an in-app + web push to the relevant dashboard
  // users. This is the single source of truth for "push on every lifecycle".
  try {
    const { registerLifecyclePushHandlers } = await import(
      '@/lib/lifecycle-push-dispatcher'
    )
    registerLifecyclePushHandlers()
  } catch (err) {
    // Non-fatal — the app still works without push, but log loudly so the
    // operator knows push is broken.
    console.error('[instrumentation] Failed to register lifecycle push handlers:', err)
  }
}

