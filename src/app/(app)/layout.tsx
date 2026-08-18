import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { AppShell } from '@/components/layout/app-shell';

// ─── (app) route group layout ──────────────────────────────────────────────
// Wraps all authenticated dashboard sub-routes. Currently only
// /recurring-jobs/* lives here; other dashboard views remain in the SPA shell
// at `/` (rendered by HomePageClient + AppLayout via the Zustand `currentView`
// store). This layout exists so Recurring Jobs can graduate to real Next.js
// routes (Approach A) WITHOUT forcing every other view to migrate too.
//
// Server-side auth gate: if no valid session cookie, redirect to `/` (which
// renders the landing page / login). This mirrors the auth check inside
// HomePageClient, but server-side — so a deep-link to /recurring-jobs/new by a
// logged-out user lands on the homepage instead of a broken dashboard shell.
//
// NOTE: We intentionally do NOT call `notFound()` or `401` here. A redirect to
// `/` is friendlier (the user sees the landing page + login CTA) and matches
// the existing behavior of HomePageClient when auth fails.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user || !user.tenantId) {
    redirect('/');
  }
  // Role guard: only owner/admin/superadmin use the dashboard shell.
  // Customer + employee roles have their own portal layouts under
  // /[companySlug]/(auth)/ — they should never reach /recurring-jobs/*.
  // (If they somehow do, redirect to `/` and let HomePageClient route them
  // to the correct portal.)
  const role = user.role;
  if (role === 'customer' || role === 'employee') {
    redirect('/');
  }

  return <AppShell>{children}</AppShell>;
}
