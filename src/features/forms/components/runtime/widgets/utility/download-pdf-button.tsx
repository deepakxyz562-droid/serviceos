'use client';

import React, { useState } from 'react';
import { Download, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';

interface DownloadPdfValue {
  action: 'download_pdf';
  timestamp: string;
  method: 'window.print' | 'api';
}

export function DownloadPdfButton({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Download PDF');
  const apiEndpoint = str(config.apiEndpoint, '');
  const existing = (value as Partial<DownloadPdfValue> | undefined) ?? {};
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const handleDownload = () => {
    if (disabled) return;
    setPending(true);
    setTimeout(() => {
      const method: 'window.print' | 'api' = apiEndpoint ? 'api' : 'window.print';
      const next: DownloadPdfValue = { action: 'download_pdf', timestamp: new Date().toISOString(), method };
      onChange(next);
      setPending(false);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
      // Phase 4 fallback: use window.print() (user can choose Save as PDF).
      if (typeof window !== 'undefined') window.print();
    }, 400);
  };

  return (
    <div className="space-y-1" aria-label={ariaLabel}>
      <Button type="button" disabled={disabled || pending} onClick={handleDownload}
        variant={done ? 'outline' : 'default'}
        className="w-full h-9 text-xs gap-1.5">
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : done ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : <Download className="size-3.5" />}
        {done ? 'Saved' : 'Download as PDF'}
      </Button>
      {existing.timestamp && (
        <p className="text-[10px] text-muted-foreground text-center">
          Last saved via <span className="font-mono">{existing.method}</span>
        </p>
      )}
      {!apiEndpoint && (
        <p className="text-[10px] text-muted-foreground text-center">
          Uses browser print dialog (Save as PDF).
        </p>
      )}
    </div>
  );
}

export default DownloadPdfButton;
