'use client';

import React from 'react';
import { User, Building2, DollarSign, Mail, Plus, Trash2, Briefcase } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num } from '../widget-props';

interface Reference {
  name: string;
  relationship: string;
  phone: string;
}
interface Employment {
  employer: string;
  position: string;
  monthlyIncome: number;
  startDate: string;
}
interface TenantAppValue {
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  ssnLast4: string;
  currentAddress: string;
  desiredMoveIn: string;
  occupants: number;
  pets: string;
  employment: Employment;
  references: Reference[];
  annualIncome: number;
  submittedAt?: string;
}

const empty: TenantAppValue = {
  fullName: '', email: '', phone: '', dob: '', ssnLast4: '',
  currentAddress: '', desiredMoveIn: '', occupants: 1, pets: '',
  employment: { employer: '', position: '', monthlyIncome: 0, startDate: '' },
  references: [{ name: '', relationship: 'Previous landlord', phone: '' }],
  annualIncome: 0,
};

export function TenantApplication({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Tenant application');
  const currency = str(config.currency, 'USD');
  const v: TenantAppValue = value && typeof value === 'object'
    ? { ...empty, ...(value as TenantAppValue) }
    : empty;

  const patch = (p: Partial<TenantAppValue>) => onChange({ ...v, ...p, submittedAt: new Date().toISOString() });

  const updateEmployment = (p: Partial<Employment>) => {
    const employment = { ...v.employment, ...p };
    const annualIncome = employment.monthlyIncome * 12;
    onChange({ ...v, employment, annualIncome, submittedAt: new Date().toISOString() });
  };

  const updateRef = (idx: number, p: Partial<Reference>) => {
    const references = v.references.map((r, i) => i === idx ? { ...r, ...p } : r);
    onChange({ ...v, references, submittedAt: new Date().toISOString() });
  };
  const addRef = () => onChange({ ...v, references: [...v.references, { name: '', relationship: '', phone: '' }] });
  const removeRef = (idx: number) => onChange({ ...v, references: v.references.filter((_, i) => i !== idx) });

  const incomeMultiple = v.annualIncome && v.employment.monthlyIncome > 0;

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <User className="size-3.5 text-primary" />
        <span className="text-xs font-semibold">Tenant application</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Label className="text-[11px] text-muted-foreground mb-1 block">Full name</Label>
          <Input value={v.fullName} disabled={disabled} onChange={(e) => patch({ fullName: e.target.value })}
            aria-label="Applicant full name" className="text-xs h-9" placeholder="Jane Doe" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Email</Label>
          <Input type="email" value={v.email} disabled={disabled} onChange={(e) => patch({ email: e.target.value })}
            aria-label="Email" className="text-xs h-9" placeholder="jane@example.com" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Phone</Label>
          <Input value={v.phone} disabled={disabled} onChange={(e) => patch({ phone: e.target.value })}
            aria-label="Phone" className="text-xs h-9" placeholder="(555) 123-4567" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Date of birth</Label>
          <Input type="date" value={v.dob} disabled={disabled} onChange={(e) => patch({ dob: e.target.value })}
            aria-label="Date of birth" className="text-xs h-9" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">SSN (last 4)</Label>
          <Input maxLength={4} value={v.ssnLast4} disabled={disabled}
            onChange={(e) => patch({ ssnLast4: e.target.value.replace(/\D/g, '') })}
            aria-label="SSN last four" className="text-xs h-9 font-mono" placeholder="1234" />
        </div>
        <div className="col-span-2">
          <Label className="text-[11px] text-muted-foreground mb-1 block">Current address</Label>
          <Input value={v.currentAddress} disabled={disabled} onChange={(e) => patch({ currentAddress: e.target.value })}
            aria-label="Current address" className="text-xs h-9" placeholder="123 Main St, City, ST ZIP" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Desired move-in</Label>
          <Input type="date" value={v.desiredMoveIn} disabled={disabled} onChange={(e) => patch({ desiredMoveIn: e.target.value })}
            aria-label="Desired move-in date" className="text-xs h-9" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Occupants</Label>
          <Input type="number" min={1} value={v.occupants} disabled={disabled}
            onChange={(e) => patch({ occupants: Math.max(1, Number(e.target.value) || 1) })}
            aria-label="Number of occupants" className="text-xs h-9" />
        </div>
      </div>

      <div className="rounded-md border border-border/60 p-2 space-y-2 bg-muted/30">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Briefcase className="size-3.5 text-primary" /> Employment
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input value={v.employment.employer} disabled={disabled}
            onChange={(e) => updateEmployment({ employer: e.target.value })}
            aria-label="Employer" className="text-xs h-8" placeholder="Employer name" />
          <Input value={v.employment.position} disabled={disabled}
            onChange={(e) => updateEmployment({ position: e.target.value })}
            aria-label="Position" className="text-xs h-8" placeholder="Job title" />
          <div className="col-span-2 relative">
            <DollarSign className="size-3 absolute left-2 top-2.5 text-muted-foreground" />
            <Input type="number" min={0} value={v.employment.monthlyIncome} disabled={disabled}
              onChange={(e) => updateEmployment({ monthlyIncome: Math.max(0, Number(e.target.value) || 0) })}
              aria-label="Monthly income" className="text-xs h-8 pl-7" placeholder="Monthly income" />
          </div>
          <Input type="date" value={v.employment.startDate} disabled={disabled}
            onChange={(e) => updateEmployment({ startDate: e.target.value })}
            aria-label="Employment start date" className="text-xs h-8 col-span-2" />
        </div>
        {incomeMultiple && (
          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/60">
            <span>Annual income (est.)</span>
            <Badge variant="secondary" className="text-[10px]">
              {num(v.annualIncome, 0).toLocaleString()} {currency}
            </Badge>
          </div>
        )}
      </div>

      <div className="rounded-md border border-border/60 p-2 space-y-2 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <Building2 className="size-3.5 text-primary" /> References
          </div>
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={addRef} className="h-7 text-[10px] gap-1">
            <Plus className="size-3" /> Add
          </Button>
        </div>
        {v.references.map((ref, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-1 items-center">
            <Input value={ref.name} disabled={disabled}
              onChange={(e) => updateRef(idx, { name: e.target.value })}
              aria-label="Reference name" placeholder="Name" className="col-span-4 h-8 text-xs" />
            <Input value={ref.relationship} disabled={disabled}
              onChange={(e) => updateRef(idx, { relationship: e.target.value })}
              aria-label="Reference relationship" placeholder="Relationship" className="col-span-3 h-8 text-xs" />
            <Input value={ref.phone} disabled={disabled}
              onChange={(e) => updateRef(idx, { phone: e.target.value })}
              aria-label="Reference phone" placeholder="Phone" className="col-span-4 h-8 text-xs" />
            <Button type="button" variant="ghost" size="sm" disabled={disabled}
              onClick={() => removeRef(idx)}
              className="col-span-1 h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
              aria-label="Remove reference">
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {v.submittedAt && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Mail className="size-2.5" /> Updated {new Date(v.submittedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

export default TenantApplication;
