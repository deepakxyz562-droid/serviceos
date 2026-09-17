'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import type { WidgetProps } from '../widget-props';

/**
 * Patient Intake — 4-step wizard covering demographics, insurance, history, consent.
 * Produces: { demographics: {firstName, lastName, dob, phone, email, address},
 *              insurance: {provider, memberId, groupNumber, policyHolder},
 *              history: {conditions, medications, allergies, surgeries},
 *              consent: {hipaa, treatment, financialResponsibility, signedAt} }
 */
export function PatientIntake({ value, onChange, disabled, field }: WidgetProps) {
  const v = (value && typeof value === 'object' ? value : {}) as Record<string, Record<string, unknown>>;
  const [step, setStep] = useState(0);
  const label = String(field?.label || 'Patient Intake');
  const setSection = (section: string, key: string, val: unknown) =>
    onChange({ ...v, [section]: { ...(v[section] || {}), [key]: val } });

  const steps = ['Demographics', 'Insurance', 'History', 'Consent'];
  const demo = (v.demographics || {}) as Record<string, string>;
  const ins = (v.insurance || {}) as Record<string, string>;
  const hist = (v.history || {}) as Record<string, string>;
  const cons = (v.consent || {}) as Record<string, string>;

  return (
    <div className="space-y-3 p-3 border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold">{label}</p>
        <Badge variant="outline" className="text-[9px] gap-0.5 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
          <ShieldCheck className="size-2.5" /> HIPAA
        </Badge>
      </div>
      <div className="flex items-center gap-1 text-[10px]">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <span className={i === step ? 'font-bold text-emerald-600' : i < step ? 'text-emerald-600' : 'text-muted-foreground'}>
              {i + 1}. {s}
            </span>
            {i < steps.length - 1 && <ChevronRight className="size-3 text-muted-foreground mx-0.5" />}
          </React.Fragment>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input className="h-8 text-xs" placeholder="First name" value={demo.firstName ?? ''} onChange={(e) => setSection('demographics', 'firstName', e.target.value)} disabled={disabled} aria-label="First name" />
            <Input className="h-8 text-xs" placeholder="Last name" value={demo.lastName ?? ''} onChange={(e) => setSection('demographics', 'lastName', e.target.value)} disabled={disabled} aria-label="Last name" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" className="h-8 text-xs" placeholder="DOB" value={demo.dob ?? ''} onChange={(e) => setSection('demographics', 'dob', e.target.value)} disabled={disabled} aria-label="Date of birth" />
            <Input type="tel" className="h-8 text-xs" placeholder="Phone" value={demo.phone ?? ''} onChange={(e) => setSection('demographics', 'phone', e.target.value)} disabled={disabled} aria-label="Phone" />
          </div>
          <Input type="email" className="h-8 text-xs" placeholder="Email" value={demo.email ?? ''} onChange={(e) => setSection('demographics', 'email', e.target.value)} disabled={disabled} aria-label="Email" />
          <Input className="h-8 text-xs" placeholder="Address" value={demo.address ?? ''} onChange={(e) => setSection('demographics', 'address', e.target.value)} disabled={disabled} aria-label="Address" />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-2">
          <Input className="h-8 text-xs" placeholder="Insurance provider" value={ins.provider ?? ''} onChange={(e) => setSection('insurance', 'provider', e.target.value)} disabled={disabled} aria-label="Insurance provider" />
          <div className="grid grid-cols-2 gap-2">
            <Input className="h-8 text-xs" placeholder="Member ID" value={ins.memberId ?? ''} onChange={(e) => setSection('insurance', 'memberId', e.target.value)} disabled={disabled} aria-label="Member ID" />
            <Input className="h-8 text-xs" placeholder="Group #" value={ins.groupNumber ?? ''} onChange={(e) => setSection('insurance', 'groupNumber', e.target.value)} disabled={disabled} aria-label="Group number" />
          </div>
          <Input className="h-8 text-xs" placeholder="Policy holder name" value={ins.policyHolder ?? ''} onChange={(e) => setSection('insurance', 'policyHolder', e.target.value)} disabled={disabled} aria-label="Policy holder" />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold">Existing conditions</Label>
            <Textarea className="text-xs min-h-[50px]" placeholder="Diabetes, hypertension, asthma..." value={hist.conditions ?? ''} onChange={(e) => setSection('history', 'conditions', e.target.value)} disabled={disabled} aria-label="Conditions" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold">Current medications</Label>
            <Textarea className="text-xs min-h-[50px]" placeholder="Metformin, Lisinopril..." value={hist.medications ?? ''} onChange={(e) => setSection('history', 'medications', e.target.value)} disabled={disabled} aria-label="Medications" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold">Allergies</Label>
            <Input className="h-8 text-xs" placeholder="Penicillin, peanuts, latex..." value={hist.allergies ?? ''} onChange={(e) => setSection('history', 'allergies', e.target.value)} disabled={disabled} aria-label="Allergies" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold">Past surgeries</Label>
            <Input className="h-8 text-xs" placeholder="Appendectomy 2019..." value={hist.surgeries ?? ''} onChange={(e) => setSection('history', 'surgeries', e.target.value)} disabled={disabled} aria-label="Surgeries" />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-2">
          <label className="flex items-start gap-2 text-[11px]">
            <input type="checkbox" className="mt-0.5" checked={cons.hipaa === 'true'} onChange={(e) => setSection('consent', 'hipaa', String(e.target.checked))} disabled={disabled} aria-label="HIPAA consent" />
            <span>I acknowledge receipt of the Notice of Privacy Practices (HIPAA).</span>
          </label>
          <label className="flex items-start gap-2 text-[11px]">
            <input type="checkbox" className="mt-0.5" checked={cons.treatment === 'true'} onChange={(e) => setSection('consent', 'treatment', String(e.target.checked))} disabled={disabled} aria-label="Treatment consent" />
            <span>I consent to medical treatment as deemed necessary by the provider.</span>
          </label>
          <label className="flex items-start gap-2 text-[11px]">
            <input type="checkbox" className="mt-0.5" checked={cons.financialResponsibility === 'true'} onChange={(e) => setSection('consent', 'financialResponsibility', String(e.target.checked))} disabled={disabled} aria-label="Financial responsibility" />
            <span>I accept financial responsibility for services rendered.</span>
          </label>
          <div className="space-y-1 pt-1">
            <Label className="text-[10px] font-semibold flex items-center gap-1">
              <Lock className="size-2.5 text-emerald-600" /> Patient Signature (type full name)
            </Label>
            <Input className="h-8 text-xs font-mono" value={cons.signature ?? ''} onChange={(e) => setSection('consent', 'signature', e.target.value)} disabled={disabled} aria-label="Signature" />
          </div>
          {cons.signature && (
            <Button type="button" size="sm" className="h-7 text-xs w-full" disabled={disabled} onClick={() => setSection('consent', 'signedAt', new Date().toISOString())}>
              Submit Intake
            </Button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t">
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" disabled={step === 0 || disabled} onClick={() => setStep((s) => s - 1)}>
          <ChevronLeft className="size-3" /> Back
        </Button>
        <span className="text-[10px] text-muted-foreground">Step {step + 1} of {steps.length}</span>
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" disabled={step === steps.length - 1 || disabled} onClick={() => setStep((s) => s + 1)}>
          Next <ChevronRight className="size-3" />
        </Button>
      </div>
    </div>
  );
}

export default PatientIntake;
