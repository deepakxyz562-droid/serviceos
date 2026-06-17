'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { CompanyLoginPageClient } from '@/components/auth/company-login-page-client';

/**
 * Customer login page.
 * Route: /{companySlug}/customer
 *
 * Same flow as the admin login page but with a teal/cyan accent and
 * role='customer' (so /api/auth/company-login authenticates against the
 * Customer table and synthesizes a portal-scoped user).
 */
export default function CompanyCustomerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] flex items-center justify-center bg-background">
          <Loader2 className="size-7 animate-spin text-teal-600" />
        </div>
      }
    >
      <CompanyLoginPageClient role="customer" />
    </Suspense>
  );
}
