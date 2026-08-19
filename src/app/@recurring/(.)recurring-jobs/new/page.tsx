import { RecurringSchedulePage } from '@/components/recurring/recurring-schedule-page';

// ─── Intercepted /recurring-jobs/new (create form) ──────────────────────────
//
// Renders the SAME component as the real (app)/recurring-jobs/new/page.tsx.
// When the user navigates from the intercepted list to "New Schedule",
// Next.js intercepts the /recurring-jobs/new navigation and renders this
// page in the `@recurring` slot. The SPA shell stays mounted.
//
// See @recurring/(.)recurring-jobs/page.tsx for the full architectural note.

export default function InterceptedNewRecurringJob() {
  return <RecurringSchedulePage mode="create" />;
}
