'use client';

// ─── RecurringJobsView — SPA shell for the Recurring Jobs section ─────────────
//
// This is the entry point rendered by AppLayout's ViewCache when
// `currentView === 'recurringJobs'`. It replaces the old modal-based
// RecurringJobsView that lived in this file.
//
// Architecture — mirrors every other SPA view (jobs-view, invoices-view, etc.):
//   - A single `screen` state drives which child component is shown:
//       'list'   → <RecurringJobsListPage>   (search + card grid)
//       'detail' → <RecurringJobDetailPage>  (5-tab detail)
//       'create' → <RecurringSchedulePage mode="create">
//       'edit'   → <RecurringSchedulePage mode="edit" scheduleId={...}>
//   - Navigation between screens is done entirely via callbacks — no
//     router.push(), no URL changes, no parallel routes.
//   - AppLayout's ViewCache keep-alive behaviour means all 4 sub-screens
//     are cached after first visit, just like Jobs / Invoices / Customers.
//
// No API, Prisma schema, or backend changes required.

import { useState } from 'react';
import { RecurringJobsListPage } from '@/components/recurring/recurring-jobs-list-page';
import { RecurringJobDetailPage } from '@/components/recurring/recurring-job-detail-page';
import { RecurringSchedulePage } from '@/components/recurring/recurring-schedule-page';

// ─── Screen type ─────────────────────────────────────────────────────────────

type Screen =
  | { name: 'list' }
  | { name: 'detail'; scheduleId: string }
  | { name: 'create' }
  | { name: 'edit'; scheduleId: string };

// ─── Component ───────────────────────────────────────────────────────────────

export function RecurringJobsView() {
  const [screen, setScreen] = useState<Screen>({ name: 'list' });

  // ── List screen navigation ───────────────────────────────────────────────
  const goToDetail = (id: string) => setScreen({ name: 'detail', scheduleId: id });
  const goToCreate = () => setScreen({ name: 'create' });
  const goToEdit = (id: string) => setScreen({ name: 'edit', scheduleId: id });
  const goToList = () => setScreen({ name: 'list' });

  // ── Detail navigation ────────────────────────────────────────────────────
  // When a save completes: if we have the saved id → go to detail, else list.
  const afterSave = (id?: string) => {
    if (id) {
      setScreen({ name: 'detail', scheduleId: id });
    } else {
      setScreen({ name: 'list' });
    }
  };

  // ── Back from edit → go back to detail (not list) ───────────────────────
  const backFromEdit = () => {
    if (screen.name === 'edit') {
      setScreen({ name: 'detail', scheduleId: screen.scheduleId });
    } else {
      setScreen({ name: 'list' });
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  if (screen.name === 'detail') {
    return (
      <RecurringJobDetailPage
        scheduleId={screen.scheduleId}
        onBack={goToList}
        onEdit={goToEdit}
      />
    );
  }

  if (screen.name === 'create') {
    return (
      <RecurringSchedulePage
        mode="create"
        onBack={goToList}
        onSaved={afterSave}
      />
    );
  }

  if (screen.name === 'edit') {
    return (
      <RecurringSchedulePage
        mode="edit"
        scheduleId={screen.scheduleId}
        onBack={backFromEdit}
        onSaved={afterSave}
      />
    );
  }

  // Default: list
  return (
    <RecurringJobsListPage
      onViewDetail={goToDetail}
      onCreateNew={goToCreate}
      onEdit={goToEdit}
    />
  );
}
