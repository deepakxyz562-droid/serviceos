import { RecurringJobDetailPage } from '@/components/recurring/recurring-job-detail-page';

// ─── Intercepted /recurring-jobs/[id] (detail) ────────────────────────────
//
// Renders the SAME component as the real (app)/recurring-jobs/[id]/page.tsx.
// `params` is a Promise in Next.js 16 — must be awaited before access.
//
// See @recurring/(.)recurring-jobs/page.tsx for the full architectural note.

export default async function InterceptedRecurringJobDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RecurringJobDetailPage scheduleId={id} />;
}
