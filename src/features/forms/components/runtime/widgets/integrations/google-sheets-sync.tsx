'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FileSpreadsheet, Loader2, CheckCircle2, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';

interface GoogleSheetsSyncValue {
  integrated: boolean;
  timestamp?: string;
  externalId?: string;
  sheetUrl?: string;
}

function flattenValues(allFormData: Record<string, unknown> | undefined): string[] {
  if (!allFormData || typeof allFormData !== 'object') return [];
  const out: string[] = [];
  for (const v of Object.values(allFormData)) {
    if (v == null) {
      out.push('');
    } else if (typeof v === 'object') {
      out.push(JSON.stringify(v));
    } else {
      out.push(String(v));
    }
  }
  return out;
}

export function GoogleSheetsSync({ value, onChange, config, disabled, field, allFormData }: WidgetProps) {
  const sheetUrl = str(config.sheetUrl, '');
  const spreadsheetId = str(config.spreadsheetId, '');
  const sheetName = str(config.sheetName, '');
  const ariaLabel = str(field?.label, 'Google Sheets sync');
  const existing = (value as Partial<GoogleSheetsSyncValue> | undefined) ?? {};

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState(false);
  const firedRef = useRef(false);

  const shouldFire = !disabled && (sheetUrl || spreadsheetId) && !existing.integrated && !firedRef.current;

  useEffect(() => {
    if (!shouldFire) return;
    firedRef.current = true;

    let cancelled = false;
    const run = async () => {
      setPending(true);
      setError(null);
      setNotConnected(false);

      try {
        // Compose a row from the form data + timestamp so the sheet captures
        // the live submission. Falls back to a single timestamp cell if
        // allFormData isn't provided (e.g. preview mode).
        const values = [new Date().toISOString(), ...flattenValues(allFormData)];

        const resp = await fetch('/api/integrations/google-sheets/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'append_row',
            spreadsheetId: spreadsheetId || undefined,
            sheetName: sheetName || undefined,
            values,
          }),
        });

        if (cancelled) return;

        if (resp.status === 503) {
          setNotConnected(true);
          setPending(false);
          return;
        }

        const data = (await resp.json().catch(() => ({}))) as {
          externalId?: string;
          spreadsheetUrl?: string;
          error?: string;
        };

        if (!resp.ok || !data.externalId) {
          setError(data.error || `Failed to sync to Google Sheets (${resp.status}).`);
          setPending(false);
          // allow a retry next render
          firedRef.current = false;
          return;
        }

        const next: GoogleSheetsSyncValue = {
          integrated: true,
          timestamp: new Date().toISOString(),
          externalId: data.externalId,
          sheetUrl: data.spreadsheetUrl || sheetUrl,
        };
        onChange(next);
        setPending(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Network error syncing to Google Sheets.');
        setPending(false);
        firedRef.current = false;
      }
    };
    void run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldFire]);

  const finalSheetUrl = existing.sheetUrl || sheetUrl;

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <FileSpreadsheet className="size-3.5 text-[#0f9d58]" />
        <span className="text-xs font-semibold">Google Sheets</span>
      </div>
      {!sheetUrl && !spreadsheetId ? (
        <p className="text-[11px] text-muted-foreground">
          Set <code>config.sheetUrl</code> or <code>config.spreadsheetId</code> to enable sync.
        </p>
      ) : notConnected ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-2.5 flex items-center gap-2">
          <AlertCircle className="size-4 text-amber-600 shrink-0" />
          <span className="text-[11px] text-amber-700 dark:text-amber-300">
            Connect your Google Sheets account in <strong>Dashboard &gt; Integrations</strong> to sync form submissions.
          </span>
        </div>
      ) : existing.integrated ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-2.5 space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
              Form submissions synced to sheet.
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono truncate">
            {existing.externalId}
          </div>
          {finalSheetUrl && (
            <Button asChild variant="ghost" size="sm" className="text-[10px] gap-1 h-6 px-2">
              <a href={finalSheetUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3" /> Open sheet
              </a>
            </Button>
          )}
        </div>
      ) : pending ? (
        <div className="rounded-xl border border-border bg-muted/30 p-2.5 flex items-center gap-2">
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">Syncing submission to Google Sheets…</span>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-2.5 flex items-center gap-2">
          <AlertCircle className="size-4 text-red-500 shrink-0" />
          <span className="text-[11px] text-red-700 dark:text-red-300">{error}</span>
        </div>
      ) : null}
    </div>
  );
}

export default GoogleSheetsSync;
