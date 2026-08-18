import type { Metadata } from 'next';
import { RecurringSchedulePage } from '@/components/recurring/recurring-schedule-page';

// ─── /recurring-jobs/[id]/edit — edit an existing recurring schedule ─────────
//
// Thin wrapper around <RecurringSchedulePage mode="edit" scheduleId={id} />.
// `params` is a Promise in Next.js 16 — must be awaited before access.

export const metadata: Metadata = {
  title: 'Edit Recurring Job Schedule — Fieseros',
};

export default async function EditRecurringJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RecurringSchedulePage mode="edit" scheduleId={id} />;
}
