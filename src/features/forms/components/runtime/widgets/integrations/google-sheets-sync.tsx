'use client';

import React, { useEffect } from 'react';
import { FileSpreadsheet, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';

interface GoogleSheetsSyncValue {
  integrated: boolean;
  timestamp?: string;
  externalId?: string;
  sheetUrl?: string;
}

export function GoogleSheetsSync({ value, onChange, config, disabled, field }: WidgetProps) {
  const sheetUrl = str(config.sheetUrl, '');
  const ariaLabel = str(field?.label, 'Google Sheets sync');
  const existing = (value as Partial<GoogleSheetsSyncValue> | undefined) ?? {};
  const syncing = !disabled && !!sheetUrl && !existing.integrated;

  useEffect(() => {
    if (!disabled && sheetUrl && !existing.integrated) {
      const t = setTimeout(() => {
        const next: GoogleSheetsSyncValue = {
          integrated: true, timestamp: new Date().toISOString(),
          externalId: `sheets_${Math.random().toString(36).slice(2, 10)}`, sheetUrl,
        };
        onChange(next);
      }, 500);
      return () => clearTimeout(t);
    }
     
  }, [sheetUrl]);

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <FileSpreadsheet className="size-3.5 text-[#0f9d58]" />
        <span className="text-xs font-semibold">Google Sheets</span>
      </div>
      {!sheetUrl ? (
        <p className="text-[11px] text-muted-foreground">Set <code>config.sheetUrl</code> to enable sync.</p>
      ) : existing.integrated ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-2.5 space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">Form submissions synced to sheet.</span>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-[10px] gap-1 h-6 px-2">
            <a href={sheetUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3" /> Open sheet
            </a>
          </Button>
        </div>
      ) : syncing ? (
        <div className="rounded-xl border border-border bg-muted/30 p-2.5 flex items-center gap-2">
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">Authorizing Google Sheets…</span>
        </div>
      ) : null}
    </div>
  );
}

export default GoogleSheetsSync;
