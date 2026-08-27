import type { Metadata } from 'next';
import { CustomerEmailOtpLogin } from '@/components/auth/customer-email-otp-login';

/**
 * /customer-login — cross-tenant customer sign-in page.
 *
 * This is a STATIC page (no force-dynamic) that renders a client component
 * implementing the email OTP flow. The page is `noindex` because auth pages
 * should never appear in search results.
 *
 * Backend (already shipped, do NOT modify):
 *   POST /api/auth/customer/send-otp   { email }                  → 200 / 400 / 429 / 502
 *   POST /api/auth/customer/verify-otp { email, otpCode, tenantId? } → 200 / 404 / 409 / 400
 *
 * All API requests use relative paths with `?XTransformPort=3000` so the
 * built-in Caddy gateway can route them to the Next.js dev server.
 */
export const metadata: Metadata = {
  title: 'Customer Sign In | Fieseros',
  description: 'Sign in to your customer portal',
  robots: { index: false, follow: false },
};

export default function CustomerLoginPage() {
  return <CustomerEmailOtpLogin />;
}
