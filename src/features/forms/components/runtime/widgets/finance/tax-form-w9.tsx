'use client';

import React, { useState } from 'react';
import { FileText, BadgeCheck, AlertCircle, User, Building2, Hash, Mail, MapPin, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface W9Value {
  name: string;
  businessName?: string;
  taxIdType: 'SSN' | 'EIN';
  taxId: string;
  taxIdMasked?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  taxClassification?: string;
  exemptStatus?: string;
  accountId?: string;
  signature?: string;
  signedDate?: string;
  valid: boolean;
  errors?: string[];
}

const CLASSIFICATIONS = ['Individual/Sole proprietor', 'C Corporation', 'S Corporation', 'Partnership', 'Trust/Estate', 'LLC', 'Other'];

function maskId(id: string, type: 'SSN' | 'EIN'): string {
  const digits = id.replace(/\D/g, '');
  if (type === 'SSN') return digits.length === 9 ? `XXX-XX-${digits.slice(5)}` : digits;
  return digits.length === 9 ? `XX-XXX${digits.slice(5)}` : digits;
}

function isValidId(id: string, type: 'SSN' | 'EIN'): boolean {
  const digits = id.replace(/\D/g, '');
  return digits.length === 9;
}

export function TaxFormW9({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'W-9 tax form');
  const showAccountId = bool(config.showAccountId, true);
  const showClassification = bool(config.showClassification, true);
  const collectSignature = bool(config.collectSignature, true);

  const existing: W9Value | undefined = value && typeof value === 'object' ? (value as W9Value) : undefined;
  const [state, setState] = useState<W9Value>({
    name: existing?.name ?? '',
    businessName: existing?.businessName ?? '',
    taxIdType: existing?.taxIdType ?? 'SSN',
    taxId: existing?.taxId ?? '',
    address: existing?.address ?? '',
    city: existing?.city ?? '',
    state: existing?.state ?? '',
    zip: existing?.zip ?? '',
    taxClassification: existing?.taxClassification ?? '',
    exemptStatus: existing?.exemptStatus ?? '',
    accountId: existing?.accountId ?? '',
    signature: existing?.signature ?? '',
    signedDate: existing?.signedDate ?? '',
    valid: existing?.valid ?? false,
  });

  const errors: string[] = [];
  if (!state.name.trim()) errors.push('Name is required.');
  if (!isValidId(state.taxId, state.taxIdType)) errors.push(`${state.taxIdType} must be 9 digits.`);
  if (!state.address.trim()) errors.push('Address is required.');
  if (!state.city.trim() || !state.state.trim() || state.state.length !== 2) errors.push('City + 2-letter state required.');
  if (!/^\d{5}(-\d{4})?$/.test(state.zip)) errors.push('ZIP code must be 5 digits.');
  if (collectSignature && !state.signature.trim()) errors.push('Signature required.');
  if (collectSignature && !state.signedDate) errors.push('Signed date required.');

  const patch = (p: Partial<W9Value>) => {
    const next = { ...state, ...p };
    next.taxIdMasked = maskId(next.taxId, next.taxIdType);
    next.valid = errors.length === 0 || (p === state ? false : (
      !!next.name && isValidId(next.taxId, next.taxIdType) && !!next.address && !!next.city && next.state.length === 2 && /^\d{5}/.test(next.zip)
      && (!collectSignature || (!!next.signature && !!next.signedDate))
    ));
    setState(next);
    onChange(next);
  };

  const formatTaxId = (v: string, type: 'SSN' | 'EIN') => {
    const d = v.replace(/\D/g, '').slice(0, 9);
    if (type === 'SSN') {
      return d.length <= 3 ? d : d.length <= 5 ? `${d.slice(0, 3)}-${d.slice(3)}` : `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
    }
    return d.length <= 2 ? d : `${d.slice(0, 2)}-${d.slice(2)}`;
  };

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <FileText className="size-4 text-indigo-600" />
        <span className="text-xs font-bold">Form W-9</span>
        <Badge variant="outline" className="ml-auto text-[9px]">Request for Taxpayer ID</Badge>
      </div>

      <div>
        <label className="text-[10px] font-semibold text-muted-foreground mb-1 block flex items-center gap-1">
          <User className="size-3" /> Name <span className="text-red-500">*</span>
        </label>
        <Input value={state.name} onChange={(e) => patch({ name: e.target.value })} disabled={disabled} placeholder="John Q. Public" className="h-9 text-xs" aria-label="Taxpayer name" />
      </div>

      <div>
        <label className="text-[10px] font-semibold text-muted-foreground mb-1 block flex items-center gap-1">
          <Building2 className="size-3" /> Business name (optional)
        </label>
        <Input value={state.businessName ?? ''} onChange={(e) => patch({ businessName: e.target.value })} disabled={disabled} placeholder="Acme LLC" className="h-9 text-xs" aria-label="Business name" />
      </div>

      {showClassification && (
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Tax classification</label>
          <select value={state.taxClassification} onChange={(e) => patch({ taxClassification: e.target.value })} disabled={disabled} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs" aria-label="Federal tax classification">
            <option value="">— Select —</option>
            {CLASSIFICATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className="text-[10px] font-semibold text-muted-foreground mb-1 block flex items-center gap-1">
          <Hash className="size-3" /> Taxpayer ID <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-1.5 mb-1.5">
          {(['SSN', 'EIN'] as const).map((t) => (
            <button
              key={t}
              type="button"
              disabled={disabled}
              onClick={() => patch({ taxIdType: t, taxId: '' })}
              aria-pressed={state.taxIdType === t}
              className={cn('flex-1 h-7 rounded-md border text-[10px] font-bold transition-colors', state.taxIdType === t ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted')}
            >
              {t}
            </button>
          ))}
        </div>
        <Input
          value={formatTaxId(state.taxId, state.taxIdType)}
          onChange={(e) => patch({ taxId: e.target.value })}
          disabled={disabled}
          placeholder={state.taxIdType === 'SSN' ? '123-45-6789' : '12-3456789'}
          className="font-mono text-xs"
          aria-label={`${state.taxIdType} tax ID`}
          inputMode="numeric"
        />
        {state.taxIdMasked && isValidId(state.taxId, state.taxIdType) && (
          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
            <BadgeCheck className="size-3 text-emerald-500" /> Masked for safety: {state.taxIdMasked}
          </p>
        )}
      </div>

      <div>
        <label className="text-[10px] font-semibold text-muted-foreground mb-1 block flex items-center gap-1">
          <MapPin className="size-3" /> Address <span className="text-red-500">*</span>
        </label>
        <Input value={state.address} onChange={(e) => patch({ address: e.target.value })} disabled={disabled} placeholder="123 Main St" className="h-9 text-xs mb-1.5" aria-label="Street address" />
        <div className="grid grid-cols-2 gap-1.5">
          <Input value={state.city} onChange={(e) => patch({ city: e.target.value })} disabled={disabled} placeholder="City" className="h-9 text-xs" aria-label="City" />
          <div className="grid grid-cols-2 gap-1.5">
            <Input value={state.state} onChange={(e) => patch({ state: e.target.value.toUpperCase().slice(0, 2) })} disabled={disabled} placeholder="CA" className="h-9 text-xs uppercase" aria-label="State" />
            <Input value={state.zip} onChange={(e) => patch({ zip: e.target.value.replace(/[^\d-]/g, '').slice(0, 10) })} disabled={disabled} placeholder="94103" className="h-9 text-xs font-mono" aria-label="ZIP code" inputMode="numeric" />
          </div>
        </div>
      </div>

      {showAccountId && (
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground mb-1 block flex items-center gap-1">
            <Mail className="size-3" /> Account number (optional)
          </label>
          <Input value={state.accountId ?? ''} onChange={(e) => patch({ accountId: e.target.value })} disabled={disabled} placeholder="Lister account #" className="h-9 text-xs" aria-label="Account number" />
        </div>
      )}

      {collectSignature && (
        <div className="rounded-md border border-dashed border-border p-2 space-y-1.5">
          <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Signature <span className="text-red-500">*</span></label>
          <Input
            value={state.signature ?? ''}
            onChange={(e) => patch({ signature: e.target.value })}
            disabled={disabled}
            placeholder="Type your full legal name"
            className="h-9 text-xs italic"
            aria-label="Signature (type your name)"
            style={{ fontFamily: 'cursive' }}
          />
          <Input
            type="date"
            value={state.signedDate ?? ''}
            onChange={(e) => patch({ signedDate: e.target.value })}
            disabled={disabled}
            className="h-9 text-xs"
            aria-label="Date signed"
          />
        </div>
      )}

      {errors.length > 0 && (
        <div className="rounded-md border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 p-2 space-y-0.5">
          {errors.map((e, i) => (
            <p key={i} className="text-[10px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <AlertCircle className="size-3" /> {e}
            </p>
          ))}
        </div>
      )}

      {state.valid && (
        <p className="text-[11px] text-emerald-600 flex items-center gap-1">
          <CheckCircle2 className="size-3.5" /> W-9 complete and ready for submission.
        </p>
      )}
    </div>
  );
}

export default TaxFormW9;
