import type { Metadata } from 'next'

/**
 * Layout for auth-gated routes under /{companySlug}/*.
 *
 * Covers:
 *   • /{companySlug}/login         (admin/owner login)
 *   • /{companySlug}/employee      (employee login)
 *   • /{companySlug}/accept-invite (invitation acceptance)
 *
 * These are private auth screens that must NEVER be indexed by search
 * engines. Using a route group `(auth)` keeps the URL paths unchanged while
 * isolating the noindex rule from the public business hub page at
 * /{companySlug}/{city}/{slug} (which controls its own robots metadata in
 * generateMetadata() based on the "rich enough" indexability rule).
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
