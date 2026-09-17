'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WidgetProps, str, num } from '../widget-props';

interface ParsedRow {
  raw: string;
  cells: string[];
}

function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQ = !inQ;
      continue;
    }
    if (ch === ',' && !inQ) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

export function CsvImport({ value, onChange, config, disabled, field }: WidgetProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const maxRows = num(config.maxRows, 1000);
  const ariaLabel = str(field?.label, 'CSV import');
  const initial: Record<string, unknown>[] = Array.isArray(value)
    ? (value as Record<string, unknown>[])
    : [];
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0).slice(0, maxRows + 1);
      if (!lines.length) {
        setError('CSV appears to be empty.');
        return;
      }
      const hdr = parseLine(lines[0]);
      const body = lines.slice(1).map((l) => ({ raw: l, cells: parseLine(l) }));
      setHeaders(hdr);
      setRows(body);
      const objRows = body.map((r) => {
        const obj: Record<string, unknown> = {};
        hdr.forEach((h, i) => {
          obj[h || `col_${i}`] = r.cells[i] ?? '';
        });
        return obj;
      });
      onChange(objRows);
    };
    reader.onerror = () => setError('Failed to read file.');
    reader.readAsText(file);
  }

  function clear() {
    setHeaders([]);
    setRows([]);
    setError(null);
    onChange([]);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        disabled={disabled}
        onChange={handleFile}
        className="hidden"
        id="csv-import-input"
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="text-xs gap-1.5"
        >
          <Upload className="size-3.5" /> Choose CSV file
        </Button>
        {rows.length > 0 && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            className="text-xs gap-1.5 text-muted-foreground"
          >
            <Trash2 className="size-3.5" /> Clear
          </Button>
        )}
      </div>
      {error && (
        <div className="text-[11px] text-red-500 flex items-center gap-1">
          <AlertCircle className="size-3.5" /> {error}
        </div>
      )}
      {rows.length > 0 && headers.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border/70">
          <table className="w-full text-xs">
            <thead className="bg-muted/60 text-[10px] uppercase text-muted-foreground">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="text-left font-bold px-2 py-1.5 border-b border-border/70 whitespace-nowrap">
                    {h || `col_${i}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {rows.slice(0, 50).map((r, rIdx) => (
                <tr key={rIdx} className="bg-card">
                  {headers.map((_, cIdx) => (
                    <td key={cIdx} className="px-2 py-1 text-foreground/90 whitespace-nowrap">
                      {r.cells[cIdx] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 50 && (
        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
          <FileText className="size-3" /> Showing first 50 of {rows.length} rows.
        </div>
      )}
      {rows.length === 0 && !error && (
        <p className="text-[11px] text-muted-foreground">
          No file selected. Output: array of row objects keyed by header.
        </p>
      )}
    </div>
  );
}

export default CsvImport;
