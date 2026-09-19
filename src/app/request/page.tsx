import React, { Suspense } from 'react';
import Link from 'next/link';
import { Store, ShieldCheck, ArrowLeft, Zap, Sparkles } from 'lucide-react';
import { RequestWizard } from '@/components/marketplace/request-wizard';

export const metadata = {
  title: 'Post a Service Request | Fieseros Marketplace',
  description: 'Post your trade service request, get AI-powered triage, and receive upfront proposals from verified local pros.',
};

export default function RequestPage({
  searchParams,
}: {
  searchParams?: { category?: string; q?: string; description?: string };
}) {
  const category = searchParams?.category;
  const initialDescription = searchParams?.q || searchParams?.description;

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
              <span>100% Free & No Hidden Lead Fees</span>
            </div>
            <Link
              href="/marketplace"
              className="flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-foreground font-medium"
            >
              <ArrowLeft className="size-3.5" /> Back to Directory
            </Link>
          </div>
        </div>
      </header>

      {/* Main Form Body */}
      <main className="flex-1">
        <Suspense fallback={<div className="text-center py-20">Loading Request Wizard...</div>}>
          <RequestWizard initialCategory={category} initialDescription={initialDescription} />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-muted-foreground bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Fieseros OS & Marketplace. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:underline">Terms</Link>
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <Link href="/marketplace" className="hover:underline">Browse Pros</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
