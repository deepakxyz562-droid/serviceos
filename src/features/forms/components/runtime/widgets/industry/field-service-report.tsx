'use client';

import React, { useState } from 'react';
import { Wrench, MapPin, Clock, CheckCircle2 } from 'lucide-react';
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
import { WidgetProps, str, num, bool } from '../widget-props';

interface FieldServiceValue {
  jobType: string;
  location: string;
  workDone: string;
  materialsUsed: string;
  laborHours: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  customerSignature?: string;
  photos: string[];
}

const JOB_TYPES = ['Repair', 'Installation', 'Maintenance', 'Inspection', 'Consultation', 'Other'];
const STATUSES: FieldServiceValue['status'][] = ['scheduled', 'in-progress', 'completed', 'cancelled'];

export function FieldServiceReport({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Field service report');
  const allowSignature = bool(config.allowSignature, true);

  const [v, setV] = useState<FieldServiceValue>(() => {
    const existing = value && typeof value === 'object' ? (value as FieldServiceValue) : null;
    return {
      jobType: existing?.jobType ?? str(config.jobType, 'Repair'),
      location: existing?.location ?? '',
      workDone: existing?.workDone ?? '',
      materialsUsed: existing?.materialsUsed ?? '',
      laborHours: existing?.laborHours ?? 0,
      status: existing?.status ?? 'scheduled',
      customerSignature: existing?.customerSignature,
      photos: existing?.photos ?? [],
    };
  });

  const emit = (next: Partial<FieldServiceValue>) => {
    const merged = { ...v, ...next };
    setV(merged);
    onChange(merged);
  };

  const addPhoto = () => {
    if (disabled) return;
    emit({ photos: [...v.photos, `photo_${Date.now()}.jpg`] });
  };

  const sign = () => {
    if (disabled || !allowSignature) return;
    emit({ customerSignature: `sig_${Date.now()}`, status: 'completed' });
  };

  const statusTone =
    v.status === 'completed' ? 'secondary' : v.status === 'cancelled' ? 'destructive' : 'outline';

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-2">
        <Wrench className="size-4 text-sky-600" />
        <span className="text-xs font-semibold">Field Service Report</span>
        <Badge variant={statusTone} className="ml-auto text-[9px] uppercase">{v.status.replace('-', ' ')}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground">Job type</label>
          <Select value={v.jobType} onValueChange={(x) => emit({ jobType: x })} disabled={disabled}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {JOB_TYPES.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <Clock className="size-3" /> Labor hours
          </label>
          <Input
            type="number"
            min={0}
            step="0.25"
            value={v.laborHours}
            onChange={(e) => emit({ laborHours: Math.max(0, Number(e.target.value)) })}
            disabled={disabled}
            className="h-8 text-xs"
            aria-label="Labor hours"
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
          <MapPin className="size-3" /> Service location
        </label>
        <Input
          value={v.location}
          onChange={(e) => emit({ location: e.target.value })}
          disabled={disabled}
          placeholder="Address / site reference"
          className="h-8 text-xs"
          aria-label="Location"
        />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground">Work performed</label>
        <Textarea
          value={v.workDone}
          onChange={(e) => emit({ workDone: e.target.value })}
          disabled={disabled}
          placeholder="Describe work performed…"
          className="text-xs min-h-[60px]"
          aria-label="Work performed"
        />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground">Materials used</label>
        <Textarea
          value={v.materialsUsed}
          onChange={(e) => emit({ materialsUsed: e.target.value })}
          disabled={disabled}
          placeholder="Parts / consumables / quantities"
          className="text-xs min-h-[40px]"
          aria-label="Materials used"
        />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground">Status</label>
        <Select value={v.status} onValueChange={(x) => emit({ status: x as FieldServiceValue['status'] })} disabled={disabled}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace('-', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addPhoto} className="text-[11px] h-7 gap-1">
          <Wrench className="size-3" /> Add photo ({v.photos.length})
        </Button>
        {allowSignature && (
          <Button
            type="button"
            variant={v.customerSignature ? 'secondary' : 'outline'}
            size="sm"
            disabled={disabled}
            onClick={sign}
            className="ml-auto text-[11px] h-7 gap-1"
          >
            <CheckCircle2 className="size-3" />
            {v.customerSignature ? 'Signed' : 'Sign off'}
          </Button>
        )}
      </div>
    </div>
  );
}

export default FieldServiceReport;
