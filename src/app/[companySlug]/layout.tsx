import type { Metadata } from 'next'

/**
 * Layout for all /{companySlug}/* routes.
 *
 * These are ALL auth-gated routes (admin login, customer login, employee login,
 * accept-invite). They must NEVER be indexed by search engines — they're
 * tenant-specific auth screens, not content pages.
 *
 * The public-facing business hub lives at /{industry}/{city}/{slug} (a
 * different route tree) so it's NOT affected by this noindex.
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
