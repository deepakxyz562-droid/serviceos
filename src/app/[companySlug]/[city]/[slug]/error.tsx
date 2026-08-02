'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

/**
 * Error boundary for the public provider detail page
 * (/[companySlug]/[city]/[slug]).
 *
 * If the page throws a runtime error (DB timeout, serialization issue,
 * missing field, etc.), this component renders instead of a blank screen.
 * The user sees a friendly message with retry + back-to-marketplace options.
 */
export default function ProviderDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console for debugging (server logs already have the stack)
    console.error('[ProviderDetail] Runtime error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40">
            <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight">
              This profile couldn&apos;t load
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Something went wrong while loading this business profile. This is
              usually temporary — please try again in a moment.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
            <Link
              href="/marketplace"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to marketplace
            </Link>
          </div>
          {process.env.NODE_ENV === 'development' && error?.message && (
            <details className="mt-6 text-left rounded-lg border bg-muted/50 p-3">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                Error details (dev only)
              </summary>
              <pre className="mt-2 text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap break-all">
                {error.message}
                {error.digest ? `\nDigest: ${error.digest}` : ''}
              </pre>
            </details>
          )}
        </div>
      </main>
    </div>
  );
}
