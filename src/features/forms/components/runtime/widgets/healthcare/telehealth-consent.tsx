'use client';

import React, { useState } from 'react';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Video, Lock, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface TelehealthValue {
  accepted: boolean;
  timestamp?: string;
  version?: string;
  location?: string;
  emergencyContact?: string;
  consents: {
    identityVerification: boolean;
    privacyRisks: boolean;
    technicalRequirements: boolean;
    emergencyPlan: boolean;
  };
}

const DEFAULT_CONSENTS = [
  { key: 'identityVerification', label: 'I will verify my identity using a government-issued ID at the start of the visit.' },
  { key: 'privacyRisks', label: 'I understand telehealth has privacy limitations and that, although encrypted, no transmission is 100% secure.' },
  { key: 'technicalRequirements', label: 'I confirm I have a stable internet connection, a working camera, and a private space for the visit.' },
  { key: 'emergencyPlan', label: 'I agree to provide my current physical location and a local emergency contact in case of disconnection or medical emergency.' },
] as const;

export function TelehealthConsent({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Telehealth consent');
  const version = str(config.version, '2024-09-01');
  const requireAll = bool(config.requireAll, true);
  const requireEmergencyContact = bool(config.requireEmergencyContact, true);

  const v: TelehealthValue = value && typeof value === 'object' ? (value as TelehealthValue) : {
    accepted: false,
    consents: { identityVerification: false, privacyRisks: false, technicalRequirements: false, emergencyPlan: false },
  };
  const consents = v.consents || { identityVerification: false, privacyRisks: false, technicalRequirements: false, emergencyPlan: false };

  const [open, setOpen] = useState(false);

  const setConsent = (key: keyof TelehealthValue['consents'], val: boolean) => {
    onChange({ ...v, consents: { ...consents, [key]: val } });
  };

  const setField = (key: keyof TelehealthValue, val: string) => {
    onChange({ ...v, [key]: val });
  };

  const allRequiredChecked = !requireAll || (consents.identityVerification && consents.privacyRisks && consents.technicalRequirements && consents.emergencyPlan);
  const canAccept = allRequiredChecked && (!requireEmergencyContact || !!str(v.emergencyContact, '').trim() && !!str(v.location, '').trim());

  const accept = (accepted: boolean) => {
    if (disabled) return;
    onChange({
      ...v,
      accepted,
      timestamp: accepted ? new Date().toISOString() : undefined,
      version: accepted ? version : undefined,
    });
  };

  const checkedCount = Object.values(consents).filter(Boolean).length;

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Video className="size-3.5 text-primary" />
        <span className="text-xs font-bold text-foreground">Telehealth visit consent</span>
        <Badge variant="outline" className="text-[9px] gap-0.5 ml-auto text-emerald-700 border-emerald-300">
          <Lock className="size-2.5" /> Encrypted
        </Badge>
      </div>

      {v.accepted ? (
        <div className="rounded-md border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-2 flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Telehealth consent recorded</p>
            {v.timestamp && (
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                {new Date(v.timestamp).toLocaleString()} · v{v.version}
              </p>
            )}
          </div>
          {!disabled && (
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => accept(false)}>Revoke</Button>
          )}
        </div>
      ) : (
        <>
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setOpen(true)} className="w-full text-xs h-8 gap-1.5">
            <FileText className="size-3.5" /> Read full telehealth policy
          </Button>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground">Acknowledgements</span>
              <Badge variant="outline" className="text-[9px] h-4">{checkedCount}/{DEFAULT_CONSENTS.length}</Badge>
            </div>
            {DEFAULT_CONSENTS.map((c) => (
              <div key={c.key} className="flex items-start gap-2">
                <Checkbox
                  id={`telehealth-${c.key}`}
                  checked={!!consents[c.key]}
                  disabled={disabled}
                  onCheckedChange={(val) => setConsent(c.key, val === true)}
                  className="mt-0.5"
                />
                <label htmlFor={`telehealth-${c.key}`} className="text-[11px] text-muted-foreground leading-relaxed cursor-pointer">
                  {c.label}
                </label>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-1 border-t border-border/60">
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">Current physical location</label>
              <input
                type="text"
                value={str(v.location, '')}
                disabled={disabled}
                onChange={(e) => setField('location', e.target.value)}
                placeholder="e.g. 123 Main St, Springfield IL"
                className="text-xs h-8 w-full rounded-md border border-border bg-background px-2"
                aria-label="Current location"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">Emergency contact (name + phone)</label>
              <input
                type="text"
                value={str(v.emergencyContact, '')}
                disabled={disabled}
                onChange={(e) => setField('emergencyContact', e.target.value)}
                placeholder="e.g. Jordan Lee, 555-867-5309"
                className="text-xs h-8 w-full rounded-md border border-border bg-background px-2"
                aria-label="Emergency contact"
              />
            </div>
          </div>

          {!canAccept && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-600 font-semibold">
              <AlertCircle className="size-3.5" /> Please complete all acknowledgements and contact info.
            </div>
          )}

          <Button
            type="button"
            size="sm"
            disabled={disabled || !canAccept}
            onClick={() => accept(true)}
            className="w-full text-xs h-8 gap-1.5"
          >
            <ShieldCheck className="size-3.5" /> I consent to telehealth
          </Button>
        </>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Telehealth policy"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div className="bg-background border border-border rounded-t-xl sm:rounded-xl w-full sm:max-w-md max-h-[70vh] p-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold flex items-center gap-1.5">
                <Video className="size-4" /> Telehealth Policy
              </h4>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>Close</Button>
            </div>
            <div className="flex-1 overflow-y-auto text-[11px] text-foreground/80 space-y-2 leading-relaxed">
              <p>Telehealth visits are conducted via secure, encrypted video. This is a placeholder policy — replace it with your organisation's actual telehealth consent text.</p>
              <p>You must verify your identity at the start of each visit and be in a private, well-lit location. If you experience a medical emergency during the visit, your provider will direct you to call 911 or go to the nearest emergency room.</p>
              <p>Telehealth may not be appropriate for all conditions; your provider will advise if an in-person visit is required.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TelehealthConsent;
