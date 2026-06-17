'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { CompanyLoginPageClient } from '@/components/auth/company-login-page-client';

/**
 * Admin / Owner login page.
 * Route: /{companySlug}/login
 *
 * Resolves the slug, renders an emerald-accented enterprise auth card, and
 * submits credentials via /api/auth/company-login with role='admin'.
 */
export default function CompanyLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] flex items-center justify-center bg-background">
          <Loader2 className="size-7 animate-spin text-emerald-600" />
        </div>
      }
    >
      <CompanyLoginPageClient role="admin" />
    </Suspense>
  );
}
