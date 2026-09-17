'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, FileText } from 'lucide-react';
import type { WidgetProps } from '../widget-props';

/**
 * Medical Release Form — authorization to release medical records.
 * Produces: { patientName, dob, recipient, recordsRequested, purpose, signature, signedAt, expiresAt }
 */
export function MedicalReleaseForm({ value, onChange, disabled, field }: WidgetProps) {
  const v = (value && typeof value === 'object' ? value : {}) as Record<string, string>;
  const label = String(field?.label || 'Medical Records Release');
  const set = (k: string, val: string) => onChange({ ...v, [k]: val });
  return (
    <div className="space-y-3 p-3 border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold flex items-center gap-1.5">
          <FileText className="size-3.5 text-emerald-600" />
          {label}
        </p>
        <Badge variant="outline" className="text-[9px] gap-0.5 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
          <ShieldCheck className="size-2.5" /> HIPAA
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] font-semibold">Patient Name</Label>
          <Input className="h-8 text-xs" value={v.patientName ?? ''} onChange={(e) => set('patientName', e.target.value)} disabled={disabled} aria-label="Patient name" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-semibold">Date of Birth</Label>
          <Input type="date" className="h-8 text-xs" value={v.dob ?? ''} onChange={(e) => set('dob', e.target.value)} disabled={disabled} aria-label="Date of birth" />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] font-semibold">Release Records To</Label>
        <Input className="h-8 text-xs" value={v.recipient ?? ''} onChange={(e) => set('recipient', e.target.value)} disabled={disabled} placeholder="Dr. / Facility name" aria-label="Release records to" />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] font-semibold">Records Requested</Label>
        <Textarea className="text-xs min-h-[60px]" value={v.recordsRequested ?? ''} onChange={(e) => set('recordsRequested', e.target.value)} disabled={disabled} placeholder="Specify records (e.g. lab results, imaging, notes from 2023-01-01 to 2024-12-31)" aria-label="Records requested" />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] font-semibold">Purpose</Label>
        <Input className="h-8 text-xs" value={v.purpose ?? ''} onChange={(e) => set('purpose', e.target.value)} disabled={disabled} placeholder="Continuity of care / legal / insurance" aria-label="Purpose" />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] font-semibold">Patient Signature (type full name)</Label>
        <Input className="h-8 text-xs font-mono" value={v.signature ?? ''} onChange={(e) => set('signature', e.target.value)} disabled={disabled} aria-label="Patient signature" />
      </div>
      <Button
        type="button"
        size="sm"
        className="h-7 text-xs w-full"
        disabled={disabled || !v.signature}
        onClick={() => {
          const now = new Date();
          const expires = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
          onChange({
            ...v,
            signedAt: now.toISOString(),
            expiresAt: expires.toISOString(),
          });
        }}
      >
        Sign & Authorize Release (90-day expiry)
      </Button>
      {v.signedAt && (
        <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
          ✓ Signed at {new Date(v.signedAt).toLocaleString()}. Expires {new Date(v.expiresAt).toLocaleDateString()}.
        </p>
      )}
    </div>
  );
}

export default MedicalReleaseForm;
