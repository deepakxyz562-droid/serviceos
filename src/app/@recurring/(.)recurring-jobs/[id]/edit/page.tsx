import { RecurringSchedulePage } from '@/components/recurring/recurring-schedule-page';

// ─── Intercepted /recurring-jobs/[id]/edit (edit form) ─────────────────────
//
// Renders the SAME component as the real (app)/recurring-jobs/[id]/edit/page.tsx.
// `params` is a Promise in Next.js 16 — must be awaited before access.
//
// See @recurring/(.)recurring-jobs/page.tsx for the full architectural note.

export default async function InterceptedEditRecurringJob({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RecurringSchedulePage mode="edit" scheduleId={id} />;
}
