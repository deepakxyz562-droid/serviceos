import type { Metadata } from 'next'

/**
 * Layout for all /{companySlug}/* routes.
 *
 * Most routes here are auth-gated screens (admin login, customer login,
 * employee login, accept-invite) that should never be indexed.
 *
 * However, the public-facing business hub also lives under this route tree
 * at /{industry}/{city}/{slug}. That page sets its own `robots` metadata in
 * generateMetadata() (based on the "rich enough" indexability rule), which
 * takes precedence over this layout-level default. So we set a conservative
 * noindex here as the fallback, and the public page overrides it when the
 * business profile is rich enough to index.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function CompanySlugLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
