'use client';

import React, { useRef, useState } from 'react';
import { ShieldCheck, Cake, Calendar, Upload, X, CheckCircle2, AlertTriangle, IdCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface AgeValue {
  accepted: boolean;
  timestamp?: string;
  version?: string;
  signature?: string;
  dateOfBirth?: string;
  age?: number;
  meetsMinimum: boolean;
  minimumAge: number;
  idDocument?: { name: string; size: number; dataUrl?: string };
  idUploaded: boolean;
  confirmed: boolean;
}

export function AgeVerificationV2({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Age verification');
  const minAge = Math.max(1, num(config.minimumAge, 21));
  const requireDob = bool(config.requireDateOfBirth, true);
  const requireIdUpload = bool(config.requireIdUpload, false);
  const version = str(config.version, '2.0.0');
  const confirmationText = str(
    config.confirmationText,
    `I confirm that I am at least ${minAge} years of age and that the information provided is true.`,
  );

  const v: AgeValue = value && typeof value === 'object'
    ? (value as AgeValue)
    : { accepted: false, meetsMinimum: false, minimumAge: minAge, idUploaded: false, confirmed: false };
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const computeAge = (dob: string): number | null => {
    if (!dob) return null;
    const d = new Date(dob);
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age;
  };

  const patch = (p: Partial<AgeValue>) => {
    const next: AgeValue = { ...v, ...p, minimumAge: minAge };
    if (next.dateOfBirth) {
      const a = computeAge(next.dateOfBirth);
      next.age = a ?? undefined;
      next.meetsMinimum = a != null && a >= minAge;
    }
    const fullyReady: boolean =
      (!requireDob || (!!next.dateOfBirth && next.meetsMinimum)) &&
      (!requireIdUpload || next.idUploaded) &&
      !!next.confirmed;
    next.accepted = fullyReady;
    next.timestamp = fullyReady ? new Date().toISOString() : undefined;
    next.version = version;
    onChange(next);
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (disabled) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Document must be under 10 MB.');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      patch({
        idDocument: { name: file.name, size: file.size, dataUrl: String(reader.result) },
        idUploaded: true,
      });
    };
    reader.readAsDataURL(file);
  };

  const removeId = () => patch({ idDocument: undefined, idUploaded: false });

  const dob = v.dateOfBirth ?? '';
  const age = v.age ?? null;
  const meets = v.meetsMinimum;
  const ready = (!requireDob || (dob && meets)) && (!requireIdUpload || v.idUploaded) && v.confirmed;

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <ShieldCheck className="size-3.5 text-primary" />
          Age verification — must be {minAge}+
          <Badge variant="outline" className="text-[9px] h-4 ml-auto">v{version}</Badge>
        </div>

        {requireDob && (
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              <Cake className="size-3" /> Date of birth
            </Label>
            <Input
              type="date"
              value={dob}
              disabled={disabled}
              onChange={(e) => patch({ dateOfBirth: e.target.value })}
              aria-label="Date of birth"
              className="text-xs h-9"
              max={new Date().toISOString().slice(0, 10)}
            />
            {age != null && (
              <p className={cn('text-[10px] mt-1 flex items-center gap-1', meets ? 'text-emerald-600' : 'text-red-600')}>
                {meets ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />}
                {meets ? `Verified: ${age} years old` : `Too young — age ${age}, must be ${minAge}+`}
              </p>
            )}
          </div>
        )}

        {requireIdUpload && (
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              <IdCard className="size-3" /> Government ID upload
            </Label>
            {v.idDocument ? (
              <div className="rounded-md border border-border bg-background p-2 flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] truncate font-medium">{v.idDocument.name}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {(v.idDocument.size / 1024).toFixed(1)} KB · uploaded
                  </p>
                </div>
                {!disabled && (
                  <Button type="button" variant="ghost" size="sm" onClick={removeId}
                    className="size-6 p-0 text-muted-foreground hover:text-red-500"
                    aria-label="Remove ID document">
                    <X className="size-3.5" />
                  </Button>
                )}
              </div>
            ) : (
              <Button
                type="button" variant="outline" size="sm"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
                className="text-[11px] h-8 gap-1 w-full"
              >
                <Upload className="size-3.5" /> Upload ID document
              </Button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*,application/pdf"
              disabled={disabled}
              className="hidden"
              aria-label="Upload ID document"
              onChange={(e) => { handleFile(e.target.files?.[0]); e.currentTarget.value = ''; }}
            />
            {error && (
              <p className="text-[10px] text-red-600 flex items-center gap-1 mt-1">
                <AlertTriangle className="size-3" /> {error}
              </p>
            )}
          </div>
        )}

        <div className="flex items-start gap-2 pt-1 border-t border-border/60">
          <input
            type="checkbox"
            id={`age2-${str(field?.id, 'field')}`}
            checked={v.confirmed}
            disabled={disabled || (requireDob && !meets)}
            onChange={(e) => patch({ confirmed: e.target.checked })}
            className="mt-0.5 size-4 rounded border-input accent-primary"
            aria-label={confirmationText}
          />
          <label htmlFor={`age2-${str(field?.id, 'field')}`} className="text-[11px] text-muted-foreground cursor-pointer">
            {confirmationText}
          </label>
        </div>

        {ready ? (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            Age confirmed{v.timestamp ? ` at ${new Date(v.timestamp).toLocaleString()}` : ''}.
          </div>
        ) : requireDob && dob && !meets ? (
          <p className="text-[11px] text-amber-600 flex items-center gap-1">
            <AlertTriangle className="size-3.5" /> You must be {minAge} or older to continue.
          </p>
        ) : null}
      </div>

      <Badge variant="outline" className="text-[9px] gap-1">
        <Calendar className="size-2.5" /> Min age {minAge}+{requireIdUpload ? ' · ID required' : ''}
      </Badge>
    </div>
  );
}

export default AgeVerificationV2;
