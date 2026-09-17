'use client';

import React, { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { WidgetProps, str } from '../widget-props';

interface Option {
  value: string;
  label: string;
}
interface ApiResponse {
  options?: Option[];
  error?: string;
}

export function RemoteDataDropdown({ value, onChange, config, disabled, field }: WidgetProps) {
  const apiUrl = str(config.apiUrl, '');
  const labelKey = str(config.labelKey, 'label');
  const valueKey = str(config.valueKey, 'value');
  const valStr = typeof value === 'string' ? value : '';
  const ariaLabel = str(field?.label, 'Remote dropdown');

  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!apiUrl) {
      setError('No apiUrl configured.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ApiResponse | Option[] | Record<string, unknown>[];
      let opts: Option[] = [];
      if (Array.isArray(json)) {
        opts = json.map((raw) => {
          if (typeof raw === 'string') return { value: raw, label: raw };
          const o = raw as Record<string, unknown>;
          return { value: String(o[valueKey] ?? o[labelKey] ?? ''), label: String(o[labelKey] ?? o[valueKey] ?? '') };
        });
      } else if (json && typeof json === 'object' && 'options' in json) {
        opts = (json as ApiResponse).options || [];
      }
      setOptions(opts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fetch failed.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (apiUrl) load();
  }, [apiUrl]); // load depends on apiUrl only

  return (
    <div className="space-y-1.5" aria-label={ariaLabel}>
      <div className="flex gap-2">
        <Select value={valStr} onValueChange={onChange} disabled={disabled || loading || !!error}>
          <SelectTrigger aria-label={ariaLabel} className="w-full">
            <span className="flex items-center gap-2">
              {loading && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
              <SelectValue placeholder={loading ? 'Loading…' : error ? 'Error' : 'Select…'} />
            </span>
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
            {options.length === 0 && !loading && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">No options.</div>
            )}
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={load}
          disabled={disabled || loading || !apiUrl}
          className="inline-flex items-center justify-center rounded-md border border-border bg-background px-2 hover:bg-muted disabled:opacity-50"
          aria-label="Reload options"
        >
          <RefreshCw className="size-3.5" />
        </button>
      </div>
      {error && (
        <p className="text-[11px] text-red-500 flex items-center gap-1">
          <AlertCircle className="size-3.5" /> {error}
        </p>
      )}
      {!apiUrl && (
        <p className="text-[11px] text-muted-foreground">Set <code>config.apiUrl</code> in field settings.</p>
      )}
    </div>
  );
}

export default RemoteDataDropdown;
