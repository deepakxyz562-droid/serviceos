import React from 'react';
import Link from 'next/link';
import { Store, ShieldCheck, ArrowLeft } from 'lucide-react';
import { CustomerRequestTracker } from '@/components/marketplace/customer-request-tracker';

export const metadata = {
  title: 'Compare Proposals & Track Request | Fieseros Marketplace',
  description: 'Track real-time proposal updates, compare Good/Better/Best packages, and book top local pros.',
};

export default function RequestTrackingPage({
  params,
}: {
  params: { publicSlug: string };
}) {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/marketplace" className="flex items-center gap-2 font-bold text-lg text-foreground hover:opacity-90">
            <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
              <Store className="size-5" />
            </div>
            <span>Fieseros <span className="text-emerald-600">Marketplace</span></span>
          </Link>

          <div className="flex items-center gap-4 text-xs">
            <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground">
              <ShieldCheck className="size-4 text-emerald-600" />
              <span>Verified Local Contractors Only</span>
            </div>
            <Link
              href="/request"
              className="flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-foreground font-medium"
            >
              <ArrowLeft className="size-3.5" /> Post Another Request
            </Link>
          </div>
        </div>
      </header>

      {/* Main Tracker Container */}
      <main className="flex-1">
        <CustomerRequestTracker publicSlug={params.publicSlug} />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-muted-foreground bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Fieseros OS & Marketplace. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:underline">Terms</Link>
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <Link href="/marketplace" className="hover:underline">Browse Directory</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
