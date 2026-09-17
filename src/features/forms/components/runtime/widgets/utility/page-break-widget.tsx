'use client';

import React from 'react';
import { SeparatorHorizontal } from 'lucide-react';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';

interface PageBreakValue {
  action: 'page_break';
  timestamp: string;
}

export function PageBreakWidget({ value, onChange, config, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Page break');
  const pageNumber = str(config.pageNumber, '');
  const existing = (value as Partial<PageBreakValue> | undefined) ?? {};

  // Emit a single timestamped action on mount (idempotent: only set if missing).
  React.useEffect(() => {
    if (!existing.action) {
      const next: PageBreakValue = { action: 'page_break', timestamp: new Date().toISOString() };
      onChange(next);
    }
     
  }, []);

  return (
    <div className="py-3" aria-label={ariaLabel} role="separator">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        <SeparatorHorizontal className="size-3.5 opacity-50" />
        {pageNumber && <span className="text-[10px] font-mono">page {pageNumber}</span>}
        <span className="h-px flex-1 bg-border" />
      </div>
      <p className="text-center text-[10px] text-muted-foreground mt-1">Page break</p>
    </div>
  );
}

export default PageBreakWidget;
