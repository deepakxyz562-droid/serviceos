'use client';

import React, { useState } from 'react';
import { FileWarning, MapPin, Clock, Calendar, User, Users } from 'lucide-react';
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
import { WidgetProps, str, bool } from '../widget-props';

type Severity = 'minor' | 'moderate' | 'major' | 'critical';

interface Witness {
  name: string;
  contact?: string;
}

interface IncidentValue {
  incidentDate: string;
  incidentTime: string;
  location: string;
  severity: Severity;
  description: string;
  immediateAction?: string;
  reportedBy?: string;
  witnesses: Witness[];
  photos: string[];
}

const SEVERITIES: Severity[] = ['minor', 'moderate', 'major', 'critical'];
const SEVERITY_TONE: Record<Severity, 'outline' | 'secondary' | 'destructive'> = {
  minor: 'outline',
  moderate: 'secondary',
  major: 'secondary',
  critical: 'destructive',
};

export function IncidentReport({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Incident report');
  const allowPhotos = bool(config.allowPhotos, true);

  const [v, setV] = useState<IncidentValue>(() => {
    const existing = value && typeof value === 'object' ? (value as IncidentValue) : null;
    return {
      incidentDate: existing?.incidentDate ?? new Date().toISOString().slice(0, 10),
      incidentTime: existing?.incidentTime ?? new Date().toISOString().slice(11, 16),
      location: existing?.location ?? '',
      severity: existing?.severity ?? (str(config.severity, 'moderate') as Severity),
      description: existing?.description ?? '',
      immediateAction: existing?.immediateAction ?? '',
      reportedBy: existing?.reportedBy ?? '',
      witnesses: existing?.witnesses ?? [],
      photos: existing?.photos ?? [],
    };
  });

  const emit = (next: Partial<IncidentValue>) => {
    const merged = { ...v, ...next };
    setV(merged);
    onChange(merged);
  };

  const addWitness = () => emit({ witnesses: [...v.witnesses, { name: '' }] });
  const updateWitness = (idx: number, patch: Partial<Witness>) => {
    const witnesses = v.witnesses.map((w, i) => (i === idx ? { ...w, ...patch } : w));
    emit({ witnesses });
  };
  const removeWitness = (idx: number) => emit({ witnesses: v.witnesses.filter((_, i) => i !== idx) });
  const addPhoto = () => {
    if (disabled || !allowPhotos) return;
    emit({ photos: [...v.photos, `photo_${Date.now()}.jpg`] });
  };

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-2">
        <FileWarning className="size-4 text-rose-600" />
        <span className="text-xs font-semibold">Incident Report</span>
        <Badge variant={SEVERITY_TONE[v.severity]} className="ml-auto text-[9px] uppercase">
          {v.severity}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <Calendar className="size-3" /> Date
          </label>
          <Input
            type="date"
            value={v.incidentDate}
            onChange={(e) => emit({ incidentDate: e.target.value })}
            disabled={disabled}
            className="h-8 text-xs"
            aria-label="Incident date"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <Clock className="size-3" /> Time
          </label>
          <Input
            type="time"
            value={v.incidentTime}
            onChange={(e) => emit({ incidentTime: e.target.value })}
            disabled={disabled}
            className="h-8 text-xs"
            aria-label="Incident time"
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
          <MapPin className="size-3" /> Location
        </label>
        <Input
          value={v.location}
          onChange={(e) => emit({ location: e.target.value })}
          disabled={disabled}
          placeholder="Where did it happen?"
          className="h-8 text-xs"
          aria-label="Location"
        />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground">Severity</label>
        <Select value={v.severity} onValueChange={(x) => emit({ severity: x as Severity })} disabled={disabled}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SEVERITIES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground">Description</label>
        <Textarea
          value={v.description}
          onChange={(e) => emit({ description: e.target.value })}
          disabled={disabled}
          placeholder="What happened? Sequence of events…"
          className="text-xs min-h-[80px]"
          aria-label="Description"
        />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground">Immediate action taken</label>
        <Textarea
          value={v.immediateAction ?? ''}
          onChange={(e) => emit({ immediateAction: e.target.value })}
          disabled={disabled}
          placeholder="First aid, evacuation, shutdown…"
          className="text-xs min-h-[40px]"
          aria-label="Immediate action"
        />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
          <User className="size-3" /> Reported by
        </label>
        <Input
          value={v.reportedBy ?? ''}
          onChange={(e) => emit({ reportedBy: e.target.value })}
          disabled={disabled}
          placeholder="Reporter name"
          className="h-8 text-xs"
          aria-label="Reporter"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <Users className="size-3" /> Witnesses
          </label>
          {!disabled && (
            <button type="button" onClick={addWitness} className="text-[10px] text-sky-600 hover:underline">+ Add witness</button>
          )}
        </div>
        <ul className="space-y-1">
          {v.witnesses.map((w, idx) => (
            <li key={idx} className="grid grid-cols-[1fr_1fr_24px] gap-1 items-center">
              <Input value={w.name} onChange={(e) => updateWitness(idx, { name: e.target.value })} disabled={disabled} placeholder="Name" className="h-7 text-[10px]" aria-label={`Witness ${idx + 1} name`} />
              <Input value={w.contact ?? ''} onChange={(e) => updateWitness(idx, { contact: e.target.value })} disabled={disabled} placeholder="Contact" className="h-7 text-[10px]" aria-label={`Witness ${idx + 1} contact`} />
              {!disabled && <button type="button" onClick={() => removeWitness(idx)} className="text-rose-500 text-xs" aria-label="Remove">×</button>}
            </li>
          ))}
          {v.witnesses.length === 0 && <li className="text-[10px] text-muted-foreground italic">No witnesses added.</li>}
        </ul>
      </div>

      {allowPhotos && (
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addPhoto} className="text-[11px] h-7 gap-1">
          <FileWarning className="size-3" /> Add photo ({v.photos.length})
        </Button>
      )}
    </div>
  );
}

export default IncidentReport;
