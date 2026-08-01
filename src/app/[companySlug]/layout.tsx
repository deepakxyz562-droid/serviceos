/**
 * Layout for all /{companySlug}/* routes.
 *
 * This layout wraps TWO kinds of pages:
 *
 *   1. Auth-gated screens (login, employee, accept-invite) — these live
 *      under the `(auth)` route group which has its OWN layout that sets
 *      `robots: { index: false, follow: false }`. They must never be
 *      indexed.
 *
 *   2. The public-facing business hub at /{industry}/{city}/{slug} — this
 *      page sets its own `robots` metadata in generateMetadata() based on
 *      the "rich enough" indexability rule (isIndexable). It should be
 *      indexable when the profile is rich enough.
 *
 * We deliberately do NOT set a blanket `robots: noindex` here anymore.
 * Previously, a conservative noindex fallback was set at this level, with
 * the expectation that the public page's generateMetadata() would override
 * it. That worked but was fragile — any future code path where the public
 * page didn't explicitly set `robots` would silently be blocked from
 * indexing. Now the noindex is scoped precisely to the auth route group,
 * and the public page is indexable by default (controlled by its own
 * generateMetadata).
 */
export default function CompanySlugLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
