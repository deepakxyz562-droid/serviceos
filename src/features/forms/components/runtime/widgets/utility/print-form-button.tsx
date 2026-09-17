'use client';

import React, { useState } from 'react';
import { Printer, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';

interface PrintFormValue {
  action: 'print';
  timestamp: string;
}

export function PrintFormButton({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Print form');
  const existing = (value as Partial<PrintFormValue> | undefined) ?? {};
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const handlePrint = () => {
    if (disabled) return;
    setPending(true);
    setTimeout(() => {
      const next: PrintFormValue = { action: 'print', timestamp: new Date().toISOString() };
      onChange(next);
      setPending(false);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
      if (typeof window !== 'undefined') window.print();
    }, 300);
  };

  return (
    <div className="space-y-1" aria-label={ariaLabel}>
      <Button type="button" disabled={disabled || pending} onClick={handlePrint}
        variant={done ? 'outline' : 'default'}
        className="w-full h-9 text-xs gap-1.5">
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : done ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : <Printer className="size-3.5" />}
        {done ? 'Printed' : 'Print form'}
      </Button>
      {existing.timestamp && (
        <p className="text-[10px] text-muted-foreground text-center">
          Last printed: {new Date(existing.timestamp).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

export default PrintFormButton;
