'use client';

import React, { useRef, useState } from 'react';
import { FileText, Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';

interface AiFormFillerValue {
  fileName?: string;
  status: 'idle' | 'analyzing' | 'placeholder';
  fields?: Record<string, string>;
  timestamp?: string;
}

const PLACEHOLDER_FIELDS: Record<string, string> = {
  fullName: 'Jane Q. Applicant',
  email: 'jane.applicant@example.com',
  phone: '+1 (555) 123-4567',
  address: '123 Sample Street, Anytown, CA 94000',
  summary: 'Auto-extracted from uploaded document via placeholder AI parser.',
};

export function AiFormFiller({ value, onChange, config, disabled, field }: WidgetProps) {
  const endpoint = str(config.endpoint, '/api/forms/ai/form-filler');
  const ariaLabel = str(field?.label, 'AI form filler');
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [pending, setPending] = useState(false);
  const existing = (value as Partial<AiFormFillerValue> | undefined) ?? {};

  const handleFile = (file: File | undefined) => {
    if (!file || disabled) return;
    setFileName(file.name);
    setPending(true);
    // Phase 4: placeholder only — no real API call.
    setTimeout(() => {
      const next: AiFormFillerValue = {
        fileName: file.name, status: 'placeholder',
        fields: PLACEHOLDER_FIELDS, timestamp: new Date().toISOString(),
      };
      onChange(next);
      setPending(false);
    }, 1100);
  };

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Sparkles className="size-3.5 text-primary" />
        <span className="text-xs font-semibold">AI Form Filler</span>
        <span className="ml-auto text-[10px] text-muted-foreground">placeholder</span>
      </div>
      <input
        ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
        disabled={disabled}
        onChange={(e) => handleFile(e.target.files?.[0])}
        className="hidden" aria-label="Upload document"
      />
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center">
        <FileText className="size-6 mx-auto text-muted-foreground" />
        <p className="text-[11px] mt-1 font-medium truncate">{fileName || 'No document selected'}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">PDF · DOC · TXT · PNG · JPG</p>
      </div>
      <Button type="button" disabled={disabled || pending}
        onClick={() => fileRef.current?.click()}
        className="w-full h-9 text-xs gap-1.5">
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}
        {pending ? 'Extracting fields…' : 'Upload & auto-fill'}
      </Button>
      {existing.fields && (
        <div className="rounded-xl border border-border bg-muted/30 p-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Suggested fields</span>
          </div>
          <div className="space-y-1">
            {Object.entries(existing.fields).slice(0, 4).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 text-[11px]">
                <span className="text-muted-foreground shrink-0">{k}:</span>
                <span className="font-medium truncate text-right">{v}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground font-mono pt-1">POST {endpoint}</p>
          <p className="text-[10px] text-amber-600 flex items-center gap-1"><AlertCircle className="size-3" /> Phase 4 placeholder — review all extracted data before submit.</p>
        </div>
      )}
    </div>
  );
}

export default AiFormFiller;
