/**
 * Default fallback for the `@recurring` parallel-route slot.
 *
 * Renders `null` when no intercepting route is active (i.e. the user is on
 * `/`, `/marketplace`, or any non-`/recurring-jobs/*` route).
 *
 * When a client-side navigation to `/recurring-jobs/*` is intercepted,
 * Next.js renders the matching page in `@recurring/(.)recurring-jobs/*`
 * instead of this default.
 *
 * This file MUST exist — Next.js requires a `default.tsx` for every
 * parallel-route slot so the layout can render when the slot has no
 * matching intercepted route.
 */

export default function DefaultRecurringSlot() {
  return null;
}
