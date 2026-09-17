'use client';

import React, { useRef, useState } from 'react';
import { FileSpreadsheet, Upload, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { WidgetProps } from '../widget-props';

interface LookupEntry {
  code: string;
  [key: string]: string | number;
}

interface SpreadsheetValue {
  fileName?: string;
  accessCode?: string;
  matched?: LookupEntry | null;
  error?: string;
}

export function SpreadsheetToForm({ value, onChange, config, disabled, field }: WidgetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initial = (value as SpreadsheetValue) || {};
  const [accessCode, setAccessCode] = useState<string>(initial.accessCode || '');

  const lookupData = (config.lookupData as LookupEntry[]) || [];
  const codeField = (config.codeField as string) || 'code';
  const fieldsToAutofill = (config.fieldsToAutofill as string[]) || [];

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange({ ...initial, fileName: file.name, accessCode });
  }

  function lookup() {
    if (!accessCode.trim()) {
      onChange({ ...initial, accessCode, matched: null, error: 'Enter access code' });
      return;
    }
    if (!lookupData.length) {
      onChange({ ...initial, accessCode, matched: null, error: 'No lookup data configured' });
      return;
    }
    const entry = lookupData.find((d) => String(d[codeField]) === accessCode.trim());
    if (!entry) {
      onChange({ ...initial, accessCode, matched: null, error: 'Access code not found' });
      return;
    }
    const autofill: Record<string, string | number> = {};
    fieldsToAutofill.forEach((k) => {
      if (entry[k] !== undefined) autofill[k] = entry[k];
    });
    onChange({ ...initial, accessCode, matched: entry, autofill, error: undefined });
  }

  const matched = initial.matched;
  const error = initial.error;

  return (
    <div className="space-y-3" aria-label={String(field?.['label'] ?? 'Spreadsheet to form')}>
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/30 p-4 text-center">
        <FileSpreadsheet className="size-6 mx-auto text-muted-foreground" />
        <p className="text-xs text-muted-foreground mt-1.5">
          {initial.fileName ? (
            <span className="font-semibold text-emerald-600 flex items-center justify-center gap-1">
              <CheckCircle2 className="size-3.5" /> {initial.fileName}
            </span>
          ) : (
            'Upload spreadsheet file (.csv, .xlsx)'
          )}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          disabled={disabled}
          onChange={handleFile}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className="mt-2 text-xs h-7 gap-1.5"
        >
          <Upload className="size-3.5" /> Choose File
        </Button>
      </div>

      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Access Code</Label>
        <div className="flex gap-2">
          <Input
            value={accessCode}
            disabled={disabled}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="e.g. ACME-2024"
            className="h-9 text-xs font-mono"
          />
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={disabled}
            onClick={lookup}
            className="h-9 gap-1.5 text-xs"
          >
            <Search className="size-3.5" /> Lookup
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-[11px] text-red-600">
          <AlertCircle className="size-3.5" /> {error}
        </div>
      )}

      {matched && (
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 p-2.5 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="size-3.5" /> Match found — auto-filled
          </div>
          {fieldsToAutofill.map((k) => (
            <div key={k} className="text-[11px] text-foreground flex justify-between">
              <span className="text-muted-foreground">{k}:</span>
              <span className="font-semibold">{String(matched[k] ?? '')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SpreadsheetToForm;
