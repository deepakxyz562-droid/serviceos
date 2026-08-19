import { RecurringJobsListPage } from '@/components/recurring/recurring-jobs-list-page';

// ─── Intercepted /recurring-jobs (list) ────────────────────────────────────
//
// This page renders when the user navigates to /recurring-jobs via a
// CLIENT-SIDE link (e.g. clicking "Recurring Jobs" in the sidebar). Next.js
// intercepts the navigation and renders this page in the `@recurring`
// parallel-route slot instead of navigating to the real
// (app)/recurring-jobs/page.tsx route.
//
// The benefit: the SPA shell at `/` (HomePageClient → AppLayout → ViewCache)
// stays mounted. All previously-visited SPA views (Dashboard, Leads, Jobs,
// etc.) stay alive in ViewCache — switching back is instant with state
// preserved (scroll, filters, form drafts).
//
// The intercepted content flows through RouteContentContext to AppLayout,
// which renders it as a special '__route__' view inside ViewCache.
//
// Direct visits (hard refresh, external link) to /recurring-jobs bypass
// this intercepting route and hit the real (app)/recurring-jobs/page.tsx
// with (app)/layout.tsx (AppShell). This is correct for SEO + deep links.
//
// NOTE: No metadata export — intercepted pages are client-side-only and
// don't need server-rendered metadata. The real route's metadata is used
// for crawlers + social scrapers.

export default function InterceptedRecurringJobsList() {
  return <RecurringJobsListPage />;
}
