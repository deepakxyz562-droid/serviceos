import type { Metadata } from 'next';
import { RecurringJobDetailPage } from '@/components/recurring/recurring-job-detail-page';

// ─── /recurring-jobs/[id] — schedule detail page ───────────────────────────
//
// Server component (auth already gated by (app)/layout.tsx). Renders the
// client <RecurringJobDetailPage /> component which handles all 5 tabs
// (Overview / Schedule / Generated Jobs / Billing / Activity), inline action
// buttons (Edit / Pause|Resume / Generate Now / Stop), and refetches its own
// data after each action.
//
// `params` is a Promise in Next.js 16 — must be awaited before access.

export const metadata: Metadata = {
  title: 'Recurring Job Schedule — Fieseros',
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RecurringJobDetailPage scheduleId={id} />;
}
