'use client';

import React from 'react';
import { AppProviders } from '@/features/quote-flow/components/AppProviders';
import { AppShell } from '@/features/quote-flow/components/AppShell';

export function QuoteFlowView() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-stone-50 dark:bg-stone-950">
      <AppProviders>
        <AppShell />
      </AppProviders>
    </div>
  );
}

export default QuoteFlowView;
