'use client';

import { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MobileStickyCta({
  onGetStarted,
}: {
  onGetStarted?: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-slate-950/95 pb-[max(0.625rem,env(safe-area-inset-bottom,0px))] backdrop-blur-md md:hidden">
      <div className="flex items-center gap-3 px-4 pt-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium leading-tight text-slate-300">
            Free forever
          </p>
          <p className="text-[11px] leading-tight text-slate-500">
            No card required
          </p>
        </div>

        <Button
          onClick={onGetStarted}
          className="bg-emerald-600 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
          size="sm"
        >
          Build a Form Free
          <ArrowRight className="size-3.5" />
        </Button>

        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
