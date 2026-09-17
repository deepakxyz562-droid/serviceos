'use client';

import React, { useState } from 'react';
import { ShieldAlert, HardHat, Building2, Activity, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WidgetProps, str, bool, num } from '../widget-props';

type InjurySeverity = 'none' | 'first_aid' | 'medical' | 'hospitalized' | 'fatal';
type BodyPart = 'head' | 'upper_limbs' | 'torso' | 'lower_limbs' | 'multiple' | 'n/a';

interface SafetyValue {
  oshaForm: '301' | '300A';
  reportDate: string;
  establishment: string;
  description: string;
  injurySeverity: InjurySeverity;
  bodyPart: BodyPart;
  lostWorkDays: number;
  restrictedDays: number;
  rootCause: string;
  correctiveActions: string;
  ppeInvolved: string[];
  photos: string[];
}

const SEVERITIES: InjurySeverity[] = ['none', 'first_aid', 'medical', 'hospitalized', 'fatal'];
const BODY_PARTS: BodyPart[] = ['n/a', 'head', 'upper_limbs', 'torso', 'lower_limbs', 'multiple'];
const PPE_OPTIONS = ['Hard hat', 'Safety glasses', 'Hi-vis vest', 'Steel-toe boots', 'Gloves', 'Respirator', 'Harness', 'Hearing protection'];

export function SafetyIncidentReport({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Safety incident report (OSHA)');
  const allowPhotos = bool(config.allowPhotos, true);

  const [v, setV] = useState<SafetyValue>(() => {
    const existing = value && typeof value === 'object' ? (value as SafetyValue) : null;
    return {
      oshaForm: existing?.oshaForm ?? '301',
      reportDate: existing?.reportDate ?? new Date().toISOString().slice(0, 10),
      establishment: existing?.establishment ?? str(config.establishment, ''),
      description: existing?.description ?? '',
      injurySeverity: existing?.injurySeverity ?? (str(config.injurySeverity, 'none') as InjurySeverity),
      bodyPart: existing?.bodyPart ?? 'n/a',
      lostWorkDays: existing?.lostWorkDays ?? 0,
      restrictedDays: existing?.restrictedDays ?? 0,
      rootCause: existing?.rootCause ?? '',
      correctiveActions: existing?.correctiveActions ?? '',
      ppeInvolved: existing?.ppeInvolved ?? [],
      photos: existing?.photos ?? [],
    };
  });

  const emit = (next: Partial<SafetyValue>) => {
    const merged = { ...v, ...next };
    setV(merged);
    onChange(merged);
  };
  const togglePpe = (ppe: string) => {
    if (disabled) return;
    const ppeInvolved = v.ppeInvolved.includes(ppe)
      ? v.ppeInvolved.filter((p) => p !== ppe)
      : [...v.ppeInvolved, ppe];
    emit({ ppeInvolved });
  };
  const addPhoto = () => {
    if (disabled || !allowPhotos) return;
    emit({ photos: [...v.photos, `photo_${Date.now()}.jpg`] });
  };

  const sevTone =
    v.injurySeverity === 'fatal' || v.injurySeverity === 'hospitalized'
      ? 'destructive'
      : v.injurySeverity === 'medical'
        ? 'secondary'
        : 'outline';
  const recordable = ['medical', 'hospitalized', 'fatal'].includes(v.injurySeverity) || v.lostWorkDays > 0 || v.restrictedDays > 0;

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-2">
        <ShieldAlert className="size-4 text-rose-600" />
        <span className="text-xs font-semibold">OSHA Safety Incident</span>
        <Badge variant="outline" className="ml-auto text-[9px]">Form {v.oshaForm}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground">Report date</label>
          <Input
            type="date"
            value={v.reportDate}
            onChange={(e) => emit({ reportDate: e.target.value })}
            disabled={disabled}
            className="h-8 text-xs"
            aria-label="Report date"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <Building2 className="size-3" /> Establishment
          </label>
          <Input
            value={v.establishment}
            onChange={(e) => emit({ establishment: e.target.value })}
            disabled={disabled}
            placeholder="Facility name"
            className="h-8 text-xs"
            aria-label="Establishment"
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground">Incident description</label>
        <Textarea
          value={v.description}
          onChange={(e) => emit({ description: e.target.value })}
          disabled={disabled}
          placeholder="What happened? Step-by-step."
          className="text-xs min-h-[60px]"
          aria-label="Description"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground">Injury severity</label>
          <Select value={v.injurySeverity} onValueChange={(x) => emit({ injurySeverity: x as InjurySeverity })} disabled={disabled}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SEVERITIES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground">Body part</label>
          <Select value={v.bodyPart} onValueChange={(x) => emit({ bodyPart: x as BodyPart })} disabled={disabled}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BODY_PARTS.map((b) => <SelectItem key={b} value={b} className="capitalize">{b.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground">Days away from work</label>
          <Input
            type="number"
            min={0}
            value={v.lostWorkDays}
            onChange={(e) => emit({ lostWorkDays: Math.max(0, num(e.target.value, 0)) })}
            disabled={disabled}
            className="h-8 text-xs"
            aria-label="Lost work days"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground">Restricted days</label>
          <Input
            type="number"
            min={0}
            value={v.restrictedDays}
            onChange={(e) => emit({ restrictedDays: Math.max(0, num(e.target.value, 0)) })}
            disabled={disabled}
            className="h-8 text-xs"
            aria-label="Restricted days"
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground">Root cause</label>
        <Textarea
          value={v.rootCause}
          onChange={(e) => emit({ rootCause: e.target.value })}
          disabled={disabled}
          placeholder="Underlying cause (e.g. inadequate guarding…)"
          className="text-xs min-h-[40px]"
          aria-label="Root cause"
        />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground">Corrective actions</label>
        <Textarea
          value={v.correctiveActions}
          onChange={(e) => emit({ correctiveActions: e.target.value })}
          disabled={disabled}
          placeholder="Mitigations, training, engineering controls…"
          className="text-xs min-h-[40px]"
          aria-label="Corrective actions"
        />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
          <HardHat className="size-3" /> PPE involved
        </label>
        <div className="flex flex-wrap gap-1">
          {PPE_OPTIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => togglePpe(p)}
              disabled={disabled}
              className={
                'text-[10px] px-2 py-0.5 rounded-full border ' +
                (v.ppeInvolved.includes(p)
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                  : 'border-border text-muted-foreground')
              }
              aria-pressed={v.ppeInvolved.includes(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-md bg-muted/40 p-2 flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground flex items-center gap-1">
          <Activity className="size-2.5" /> Recordable on OSHA 300?
        </span>
        <Badge variant={recordable ? 'destructive' : 'secondary'} className="text-[9px]">
          {recordable ? 'Yes' : 'No'}
        </Badge>
      </div>

      {allowPhotos && (
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addPhoto} className="text-[11px] h-7 gap-1">
          <AlertTriangle className="size-3" /> Add photo ({v.photos.length})
        </Button>
      )}
    </div>
  );
}

export default SafetyIncidentReport;
