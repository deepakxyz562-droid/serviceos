import type { Metadata } from 'next';
import { RecurringSchedulePage } from '@/components/recurring/recurring-schedule-page';

// ─── /recurring-jobs/new — create a new recurring schedule ───────────────────
//
// Thin wrapper around <RecurringSchedulePage mode="create" />. The actual form
// logic, supporting data fetch (customers/employees/services/checklists), and
// POST submission live in that shared component so create and edit stay
// perfectly in sync.

export const metadata: Metadata = {
  title: 'New Recurring Job Schedule — Fieseros',
};

export default function NewRecurringJobPage() {
  return <RecurringSchedulePage mode="create" />;
}
