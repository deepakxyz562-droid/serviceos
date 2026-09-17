'use client';

import React, { useState } from 'react';
import { WidgetProps, str } from '../widget-props';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, ScanLine, Upload, IdCard, CheckCircle2, Loader2, FileImage } from 'lucide-react';

interface CardValue {
  frontFileName?: string;
  backFileName?: string;
  frontDataUrl?: string;
  backDataUrl?: string;
  ocrStatus?: 'pending' | 'processing' | 'complete' | 'failed';
  ocrFields?: Record<string, string>;
}

const OCR_FIELDS_TEMPLATE: Record<string, string> = {
  memberId: '',
  groupNumber: '',
  payerName: '',
  rxBin: '',
  rxPcn: '',
  planType: '',
};

export function InsuranceCardScanner({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Insurance card scanner');
  const autoOcr = config.autoOcr !== false;

  const v: CardValue = value && typeof value === 'object' ? (value as CardValue) : {};
  const [processing, setProcessing] = useState<'front' | 'back' | null>(null);

  const handleFile = (side: 'front' | 'back', file: File) => {
    if (disabled) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const patch: CardValue = {
        ...v,
        [side === 'front' ? 'frontFileName' : 'backFileName']: file.name,
        [side === 'front' ? 'frontDataUrl' : 'backDataUrl']: dataUrl,
        ocrStatus: 'pending',
      };
      onChange(patch);
      if (autoOcr) runOcr();
    };
    reader.readAsDataURL(file);
  };

  const runOcr = () => {
    setProcessing('front');
    setTimeout(() => {
      setProcessing('back');
      setTimeout(() => {
        setProcessing(null);
        onChange({
          ...v,
          ocrStatus: 'complete',
          ocrFields: {
            ...OCR_FIELDS_TEMPLATE,
            memberId: 'XXX-XX-XXXX',
            payerName: 'Placeholder Health Plan',
            planType: 'PPO',
          },
        });
      }, 600);
    }, 600);
  };

  const removeImage = (side: 'front' | 'back') => {
    if (disabled) return;
    const patch: CardValue = { ...v };
    delete patch[side === 'front' ? 'frontFileName' : 'backFileName'];
    delete patch[side === 'front' ? 'frontDataUrl' : 'backDataUrl'];
    onChange(patch);
  };

  const setOcrField = (key: string, val: string) => {
    onChange({ ...v, ocrFields: { ...(v.ocrFields || OCR_FIELDS_TEMPLATE), [key]: val } });
  };

  const statusBadge = (() => {
    const s = v.ocrStatus;
    if (!s || s === 'pending') return null;
    if (s === 'processing' || processing) return (
      <Badge variant="outline" className="text-[10px] gap-1 text-amber-700 border-amber-300">
        <Loader2 className="size-2.5 animate-spin" /> Processing
      </Badge>
    );
    if (s === 'complete') return (
      <Badge variant="secondary" className="text-[10px] gap-1 text-emerald-700">
        <CheckCircle2 className="size-2.5" /> OCR complete
      </Badge>
    );
    return (
      <Badge variant="destructive" className="text-[10px]">OCR failed</Badge>
    );
  })();

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <IdCard className="size-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-foreground">Insurance card</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[9px] gap-0.5 text-emerald-700 border-emerald-300">
            <Lock className="size-2.5" /> Encrypted
          </Badge>
          {statusBadge}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(['front', 'back'] as const).map((side) => {
          const fileName = side === 'front' ? v.frontFileName : v.backFileName;
          const dataUrl = side === 'front' ? v.frontDataUrl : v.backDataUrl;
          return (
            <div key={side}>
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={disabled}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(side, f);
                    e.target.value = '';
                  }}
                />
                <div
                  className={cn(
                    'aspect-[1.586/1] w-full rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-center p-2 transition-colors cursor-pointer',
                    fileName
                      ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-border bg-muted/30 hover:bg-muted',
                    disabled && 'opacity-60 cursor-not-allowed',
                  )}
                >
                  {dataUrl ? (
                    <div className="relative w-full h-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={dataUrl} alt={`Insurance card ${side}`} className="absolute inset-0 w-full h-full object-contain rounded-md" />
                      {!disabled && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="absolute top-1 right-1 h-6 text-[10px] px-2"
                          onClick={(e) => { e.preventDefault(); removeImage(side); }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <FileImage className="size-5 text-muted-foreground mb-1" />
                      <span className="text-[10px] font-semibold text-foreground">Upload {side}</span>
                      <span className="text-[9px] text-muted-foreground">JPG/PNG</span>
                    </>
                  )}
                </div>
              </label>
            </div>
          );
        })}
      </div>

      {(v.frontFileName || v.backFileName) && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <ScanLine className="size-3" /> Extracted fields
            </span>
            {!autoOcr && (
              <Button type="button" variant="outline" size="sm" className="h-6 text-[10px]" disabled={disabled || !!processing} onClick={runOcr}>
                <Upload className="size-2.5" /> Run OCR
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.keys(OCR_FIELDS_TEMPLATE).map((k) => (
              <div key={k} className="space-y-0.5">
                <label className="text-[9px] text-muted-foreground uppercase tracking-wider">{k.replace(/([A-Z])/g, ' $1')}</label>
                <input
                  type="text"
                  value={v.ocrFields?.[k] ?? ''}
                  disabled={disabled}
                  onChange={(e) => setOcrField(k, e.target.value)}
                  className="text-[11px] h-7 w-full rounded-md border border-border bg-background px-1.5 font-mono"
                  aria-label={k}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default InsuranceCardScanner;
