'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { CompanyLoginPageClient } from '@/components/auth/company-login-page-client';

/**
 * Employee login page.
 * Route: /{companySlug}/employee
 *
 * Same flow as the admin login page but with an amber accent and
 * role='employee' (so /api/auth/company-login enforces the role match).
 */
export default function CompanyEmployeePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] flex items-center justify-center bg-background">
          <Loader2 className="size-7 animate-spin text-amber-600" />
        </div>
      }
    >
      <CompanyLoginPageClient role="employee" />
    </Suspense>
  );
}
