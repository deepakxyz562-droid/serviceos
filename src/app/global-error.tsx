'use client';

import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { isChunkLoadError } from '@/components/common/chunk-load-recovery';

export default function RootGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isChunkError, setIsChunkError] = useState(false);

  useEffect(() => {
    const chunkError = isChunkLoadError(error);
    setIsChunkError(chunkError);

    if (chunkError) {
      console.warn('[RootGlobalError] Stale deployment chunk detected. Auto-reloading page...');
      try {
        const now = Date.now();
        const lastReload = parseInt(sessionStorage.getItem('fieseros_chunk_reload_ts') || '0', 10);
        if (now - lastReload > 20000) {
          sessionStorage.setItem('fieseros_chunk_reload_ts', String(now));
          window.location.reload();
          return;
        }
      } catch {
        window.location.reload();
        return;
      }
    } else {
      console.error('Root global error:', error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex items-center justify-center p-6 font-sans">
        {isChunkError ? (
          <div className="max-w-md text-center space-y-4 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
            <div className="size-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <Loader2 className="size-6 animate-spin" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Updating to the latest version...</h2>
            <p className="text-muted-foreground text-xs leading-relaxed">
              A new update was deployed. We&apos;re refreshing your page to load the latest features.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-md"
            >
              <RefreshCw className="size-3.5" /> Reload Now
            </button>
          </div>
        ) : (
          <div className="max-w-md text-center space-y-4 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
            <div className="text-4xl">⚠️</div>
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-slate-500 text-sm">
              {error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={reset}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </body>
    </html>
  );
}
