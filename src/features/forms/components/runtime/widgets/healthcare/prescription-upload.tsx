'use client';

import React, { useState } from 'react';
import { WidgetProps, str } from '../widget-props';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Upload, Pill, CheckCircle2, FileImage, Trash2, MapPin } from 'lucide-react';

interface PrescriptionValue {
  fileName?: string;
  dataUrl?: string;
  pharmacyId?: string;
  pharmacyName?: string;
  notes?: string;
}

const DEFAULT_PHARMACIES: { id: string; name: string; address?: string }[] = [
  { id: 'cvs', name: 'CVS Pharmacy', address: '123 Main St' },
  { id: 'walgreens', name: 'Walgreens', address: '456 Oak Ave' },
  { id: 'walmart', name: 'Walmart Pharmacy', address: '789 Retail Rd' },
  { id: 'costco', name: 'Costco Pharmacy', address: '12 Wholesale Way' },
];

export function PrescriptionUpload({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Prescription upload');
  const pharmacies = Array.isArray(config.pharmacies) && config.pharmacies.length
    ? (config.pharmacies as { id: string; name: string; address?: string }[])
    : DEFAULT_PHARMACIES;

  const v: PrescriptionValue = value && typeof value === 'object' ? (value as PrescriptionValue) : {};
  const fileName = str(v.fileName, '');
  const dataUrl = str(v.dataUrl, '');
  const pharmacyId = str(v.pharmacyId, '');
  const notes = str(v.notes, '');

  const handleFile = (file: File) => {
    if (disabled) return;
    const reader = new FileReader();
    reader.onload = () => {
      onChange({
        ...v,
        fileName: file.name,
        dataUrl: String(reader.result || ''),
      });
    };
    reader.readAsDataURL(file);
  };

  const pickPharmacy = (id: string) => {
    const p = pharmacies.find((x) => x.id === id);
    onChange({
      ...v,
      pharmacyId: id,
      pharmacyName: p?.name,
    });
  };

  const setNotes = (n: string) => onChange({ ...v, notes: n });

  const removeFile = () => {
    onChange({
      ...v,
      fileName: undefined,
      dataUrl: undefined,
    });
  };

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Lock className="size-3 text-amber-600" />
        <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold uppercase tracking-wider">Encrypted PHI</span>
      </div>

      <div>
        <label className="block">
          <input
            type="file"
            accept="image/*,.pdf"
            className="sr-only"
            disabled={disabled}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
          <div
            className={cn(
              'rounded-lg border-2 border-dashed p-4 text-center transition-colors cursor-pointer',
              fileName
                ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
                : 'border-border bg-muted/30 hover:bg-muted',
              disabled && 'opacity-60 cursor-not-allowed',
            )}
          >
            {dataUrl && dataUrl.startsWith('data:image') ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={dataUrl} alt="Prescription preview" className="max-h-32 mx-auto rounded-md object-contain" />
                {!disabled && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-2 h-6 text-[10px] gap-1"
                    onClick={(e) => { e.preventDefault(); removeFile(); }}
                  >
                    <Trash2 className="size-2.5" /> Remove
                  </Button>
                )}
              </div>
            ) : fileName ? (
              <div className="flex flex-col items-center gap-1">
                <FileImage className="size-6 text-emerald-600" />
                <span className="text-xs font-semibold text-foreground truncate max-w-full">{fileName}</span>
                {!disabled && (
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px]" onClick={(e) => { e.preventDefault(); removeFile(); }}>Remove</Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 py-3">
                <Upload className="size-6 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">Upload prescription</span>
                <span className="text-[10px] text-muted-foreground">PDF, JPG, or PNG · max 10MB</span>
              </div>
            )}
          </div>
        </label>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Pill className="size-3 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-foreground">Preferred pharmacy</span>
        </div>
        <div className="space-y-1">
          {pharmacies.map((p) => {
            const sel = pharmacyId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => pickPharmacy(p.id)}
                aria-pressed={sel}
                className={cn(
                  'w-full flex items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-all active:scale-[0.99]',
                  sel ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted',
                )}
              >
                {sel ? (
                  <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                ) : (
                  <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate">{p.name}</div>
                  {p.address && <div className="text-[10px] text-muted-foreground truncate">{p.address}</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground">Notes for pharmacist (optional)</label>
        <input
          type="text"
          value={notes}
          disabled={disabled}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Need by Friday, pref. generic"
          className="text-xs h-8 w-full rounded-md border border-border bg-background px-2"
          aria-label="Pharmacy notes"
        />
      </div>

      {fileName && pharmacyId && (
        <Badge variant="secondary" className="text-[10px] gap-1">
          <CheckCircle2 className="size-2.5" /> Ready to submit
        </Badge>
      )}
    </div>
  );
}

export default PrescriptionUpload;
