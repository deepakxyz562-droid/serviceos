import type { Metadata } from 'next';
import { RecurringJobsListPage } from '@/components/recurring/recurring-jobs-list-page';

// ─── /recurring-jobs — list page (server component) ──────────────────────────
//
// Thin server component wrapper. The actual list UI (search, status filter
// pills, schedule cards, action menu, delete confirm) lives in the client
// component <RecurringJobsListPage />.
//
// Auth is already gated by src/app/(app)/layout.tsx (server-side getAuthUser
// check + role guard). So this page.tsx itself does no auth.
//
// Keeping page.tsx a server component lets Next.js pre-render the route's
// metadata + shell for fast first paint. All interactivity lives in the
// client component below.

export const metadata: Metadata = {
  title: 'Recurring Jobs — Fieseros',
  description: 'Schedule repeating jobs, contract visits, and maintenance rounds.',
};

export default function Page() {
  return <RecurringJobsListPage />;
}
