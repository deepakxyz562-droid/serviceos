/**
 * Lead-Deal Sync — EventBus Listener
 * ==================================
 *
 * Registers an EventBus handler for the `lead.created` event that
 * asynchronously calls `ensureDealForLead(leadId, tenantId)` so that
 * every Lead — regardless of which of the ~15 ingestion endpoints
 * created it — gets a linked Deal in the Sales Pipeline.
 *
 * WHY A LISTENER (INSTEAD OF EDITING 13 ENDPOINTS)
 * ------------------------------------------------
 * Modifying the 13 ingestion endpoints (Form Builder submit, WordPress,
 * embed.js, public booking, WhatsApp chatbot, AI Receptionist, Google/Meta
 * Ads webhook, Lead Discovery, Omnichannel, …) would be invasive and
 * brittle — each has its own auth flow, payload shape, and error
 * handling. A single EventBus listener is:
 *
 *   - Non-invasive: zero changes to ingestion endpoints.
 *   - Centralized: one place to audit / debug / extend.
 *   - Self-healing: works even if a future endpoint forgets to emit
 *     `lead.created` (the lazy safety net in `GET /api/deals` catches
 *     orphans on the next pipeline view).
 *
 * WHY ASYNC / NON-BLOCKING
 * ------------------------
 * The listener calls `ensureDealForLead` WITHOUT awaiting it inside the
 * handler — the event flow (audit log, webhooks, push notifications)
 * must not be blocked by Deal creation. `ensureDealForLead` already
 * swallows all errors internally, so fire-and-forget is safe.
 *
 * REGISTRATION
 * ------------
 * `registerLeadDealSyncListener()` is called once from `instrumentation.ts`
 * at Next.js server boot (alongside `registerLifecyclePushHandlers()`).
 * It is idempotent — calling it twice registers the listener twice
 * (harmless but wasteful), so we guard with a module-level `registered`
 * flag (same pattern as `lifecycle-push-dispatcher.ts`).
 *
 * SUPABASE SAFETY
 * ---------------
 * The listener itself performs no Prisma queries — it just delegates to
 * `ensureDealForLead`, which is Supabase-safe (see lead-deal-sync.ts).
 */

import { EventBus, type EventPayload } from '@/lib/event-bus'
import { ensureDealForLead } from '@/lib/lead-deal-sync'

let registered = false

/**
 * Register the `lead.created` EventBus listener that auto-creates a
 * linked Deal for every new Lead. Idempotent — safe to call multiple
 * times (the second call is a no-op).
 *
 * Called from `instrumentation.ts` at server boot, in the Node.js
 * runtime only (Edge runtime can't load Prisma).
 */
export function registerLeadDealSyncListener(): void {
  if (registered) return
  registered = true

  EventBus.on('lead.created', async (payload: EventPayload) => {
    try {
      const leadId: string | undefined =
        payload.data?.leadId || payload.data?.id || payload.data?.lead?.id
      if (!leadId) {
        // No leadId in the payload — nothing to sync. Log at debug so we
        // can spot emitter bugs without spamming production logs.
        console.warn('[lead-deal-sync-listener] lead.created event missing leadId — skipping', {
          event: payload.event,
          tenantId: payload.tenantId,
          dataKeys: Object.keys(payload.data || {}),
        })
        return
      }

      const tenantId: string | undefined =
        payload.tenantId || payload.data?.tenantId || payload.data?.lead?.tenantId

      // Fire-and-forget — DO NOT await inside the handler. The EventBus
      // runs all handlers via Promise.allSettled, so awaiting would
      // block the parallel handler fan-out (audit log, push, webhooks).
      // `ensureDealForLead` swallows all errors internally, so this is
      // safe to detach.
      //
      // We do NOT catch the detached promise — `ensureDealForLead` already
      // has its own try/catch wrapper, and an unhandled rejection here
      // would only happen if `ensureDealForLead` itself threw before
      // entering its try/catch (impossible by construction).
      void ensureDealForLead(leadId, tenantId).catch((err) => {
        // Defensive double-catch — should never fire, but if it does we
        // don't want an unhandled rejection crashing the process.
        console.error(`[lead-deal-sync-listener] ensureDealForLead threw for Lead ${leadId}:`, err)
      })
    } catch (err) {
      // Never let a listener failure bubble — the EventBus already logs
      // handler rejections, but we double-catch here to be safe.
      console.error('[lead-deal-sync-listener] handler threw:', err)
    }
  })

  console.info('[lead-deal-sync-listener] Registered lead.created → ensureDealForLead listener')
}
