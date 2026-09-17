'use client';

import React, { useMemo, useState } from 'react';
import { WidgetProps, str, num } from '../widget-props';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Lock, Activity, AlertCircle } from 'lucide-react';

interface SymptomValue {
  bodyPart?: string;
  symptom?: string;
  severity?: number; // 1-10
  duration?: string;
}

const BODY_PARTS: Record<string, { label: string; symptoms: { id: string; label: string; defaultSeverity?: number }[] }> = {
  head: {
    label: 'Head & neck',
    symptoms: [
      { id: 'headache', label: 'Headache', defaultSeverity: 4 },
      { id: 'dizziness', label: 'Dizziness', defaultSeverity: 3 },
      { id: 'blurred-vision', label: 'Blurred vision', defaultSeverity: 5 },
      { id: 'sore-throat', label: 'Sore throat', defaultSeverity: 3 },
    ],
  },
  chest: {
    label: 'Chest',
    symptoms: [
      { id: 'chest-pain', label: 'Chest pain', defaultSeverity: 7 },
      { id: 'shortness-breath', label: 'Shortness of breath', defaultSeverity: 7 },
      { id: 'cough', label: 'Persistent cough', defaultSeverity: 4 },
      { id: 'palpitations', label: 'Palpitations', defaultSeverity: 5 },
    ],
  },
  abdomen: {
    label: 'Abdomen',
    symptoms: [
      { id: 'abdominal-pain', label: 'Abdominal pain', defaultSeverity: 5 },
      { id: 'nausea', label: 'Nausea', defaultSeverity: 4 },
      { id: 'vomiting', label: 'Vomiting', defaultSeverity: 4 },
      { id: 'diarrhea', label: 'Diarrhea', defaultSeverity: 3 },
    ],
  },
  limbs: {
    label: 'Arms & legs',
    symptoms: [
      { id: 'joint-pain', label: 'Joint pain', defaultSeverity: 4 },
      { id: 'swelling', label: 'Swelling', defaultSeverity: 3 },
      { id: 'numbness', label: 'Numbness/tingling', defaultSeverity: 5 },
      { id: 'muscle-weakness', label: 'Muscle weakness', defaultSeverity: 5 },
    ],
  },
};

const DURATIONS = ['Less than 24h', '1-3 days', '4-7 days', '1-2 weeks', 'More than 2 weeks'];

export function SymptomChecker({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Symptom checker');
  const maxSeverity = Math.max(2, num(config.maxSeverity, 10));

  const v: SymptomValue = value && typeof value === 'object' ? (value as SymptomValue) : {};
  const bodyPart = str(v.bodyPart, '');
  const symptom = str(v.symptom, '');
  const severity = typeof v.severity === 'number' ? v.severity : 0;
  const duration = str(v.duration, '');

  const symptoms = useMemo(() => (bodyPart ? BODY_PARTS[bodyPart]?.symptoms ?? [] : []), [bodyPart]);

  const patch = (p: Partial<SymptomValue>) => onChange({ ...v, ...p });

  const isUrgent = severity >= 7 || ['chest-pain', 'shortness-breath', 'blurred-vision'].includes(symptom);

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Lock className="size-3 text-amber-600" />
        <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold uppercase tracking-wider">Encrypted PHI</span>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] text-muted-foreground font-semibold">1. Where is the issue?</label>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(BODY_PARTS).map(([key, def]) => {
            const sel = bodyPart === key;
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => patch({ bodyPart: key, symptom: '', severity: 0 })}
                aria-pressed={sel}
                className={cn(
                  'rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors',
                  sel ? 'border-primary bg-primary/5 text-foreground' : 'border-border bg-card text-muted-foreground hover:bg-muted',
                )}
              >
                {def.label}
              </button>
            );
          })}
        </div>
      </div>

      {bodyPart && (
        <div className="space-y-1.5">
          <label className="text-[11px] text-muted-foreground font-semibold">2. What are you experiencing?</label>
          <div className="grid grid-cols-2 gap-1.5">
            {symptoms.map((s) => {
              const sel = symptom === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => patch({ symptom: s.id, severity: s.defaultSeverity ?? 3 })}
                  aria-pressed={sel}
                  className={cn(
                    'rounded-md border px-2 py-1.5 text-xs text-left transition-colors',
                    sel ? 'border-primary bg-primary/5 text-foreground' : 'border-border bg-card text-muted-foreground hover:bg-muted',
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {symptom && (
        <>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-muted-foreground font-semibold">3. Severity (1–{maxSeverity})</label>
              <Badge variant={isUrgent ? 'destructive' : 'secondary'} className="text-[10px] gap-0.5">
                <Activity className="size-2.5" />
                {severity > 0 ? `${severity} / ${maxSeverity}` : 'Not set'}
              </Badge>
            </div>
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: maxSeverity }).map((_, i) => {
                const n = i + 1;
                const sel = severity === n;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={disabled}
                    onClick={() => patch({ severity: n })}
                    aria-pressed={sel}
                    aria-label={`Severity ${n}`}
                    className={cn(
                      'aspect-square rounded-md border text-[10px] font-bold transition-all active:scale-95',
                      sel
                        ? isUrgent
                          ? 'bg-red-500 text-white border-transparent'
                          : 'bg-primary text-primary-foreground border-transparent'
                        : 'bg-card border-border text-muted-foreground hover:border-foreground/40',
                    )}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground font-semibold">4. How long?</label>
            <div className="flex flex-wrap gap-1">
              {DURATIONS.map((d) => {
                const sel = duration === d;
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={disabled}
                    onClick={() => patch({ duration: sel ? '' : d })}
                    aria-pressed={sel}
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors',
                      sel ? 'bg-primary text-primary-foreground border-transparent' : 'bg-card border-border text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {isUrgent && severity > 0 && (
        <div className="rounded-md border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-2 flex items-start gap-1.5">
          <AlertCircle className="size-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-700 dark:text-red-300 font-semibold">
            This combination of symptoms may require urgent medical attention. If this is an emergency, call 911 or go to the nearest emergency room.
          </p>
        </div>
      )}
    </div>
  );
}

export default SymptomChecker;
