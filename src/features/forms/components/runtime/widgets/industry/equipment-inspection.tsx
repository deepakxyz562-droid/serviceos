'use client';

import React, { useState } from 'react';
import { Cog, CheckCircle2, XCircle, CircleAlert, Battery, CalendarClock } from 'lucide-react';
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

type Condition = 'excellent' | 'good' | 'fair' | 'poor' | 'failed';
type Status = 'operational' | 'maintenance' | 'out_of_service';

interface EquipmentValue {
  assetId: string;
  assetName: string;
  location: string;
  condition: Condition;
  status: Status;
  hoursOperated: number;
  lastServiceDate?: string;
  nextServiceDue?: string;
  inspectorNotes?: string;
  photos: string[];
}

const CONDITIONS: Condition[] = ['excellent', 'good', 'fair', 'poor', 'failed'];
const STATUSES: Status[] = ['operational', 'maintenance', 'out_of_service'];

const CONDITION_TONE: Record<Condition, 'outline' | 'secondary' | 'destructive'> = {
  excellent: 'secondary',
  good: 'secondary',
  fair: 'outline',
  poor: 'outline',
  failed: 'destructive',
};

export function EquipmentInspection({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Equipment inspection');
  const allowPhotos = bool(config.allowPhotos, true);

  const [v, setV] = useState<EquipmentValue>(() => {
    const existing = value && typeof value === 'object' ? (value as EquipmentValue) : null;
    return {
      assetId: existing?.assetId ?? str(config.assetId, ''),
      assetName: existing?.assetName ?? str(config.assetName, ''),
      location: existing?.location ?? str(config.location, ''),
      condition: existing?.condition ?? (str(config.condition, 'good') as Condition),
      status: existing?.status ?? 'operational',
      hoursOperated: existing?.hoursOperated ?? num(config.hoursOperated, 0),
      lastServiceDate: existing?.lastServiceDate ?? str(config.lastServiceDate, ''),
      nextServiceDue: existing?.nextServiceDue ?? str(config.nextServiceDue, ''),
      inspectorNotes: existing?.inspectorNotes ?? '',
      photos: existing?.photos ?? [],
    };
  });

  const emit = (next: Partial<EquipmentValue>) => {
    const merged = { ...v, ...next };
    setV(merged);
    onChange(merged);
  };

  const addPhoto = () => {
    if (disabled || !allowPhotos) return;
    emit({ photos: [...v.photos, `photo_${Date.now()}.jpg`] });
  };

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-2">
        <Cog className="size-4 text-slate-600" />
        <span className="text-xs font-semibold">Equipment Inspection</span>
        <Badge variant={CONDITION_TONE[v.condition]} className="ml-auto text-[9px] capitalize">
          {v.condition}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground">Asset ID</label>
          <Input
            value={v.assetId}
            onChange={(e) => emit({ assetId: e.target.value })}
            disabled={disabled}
            placeholder="AST-001"
            className="h-8 text-xs font-mono"
            aria-label="Asset ID"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground">Asset name</label>
          <Input
            value={v.assetName}
            onChange={(e) => emit({ assetName: e.target.value })}
            disabled={disabled}
            placeholder="Compressor #3"
            className="h-8 text-xs"
            aria-label="Asset name"
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground">Location</label>
        <Input
          value={v.location}
          onChange={(e) => emit({ location: e.target.value })}
          disabled={disabled}
          placeholder="Plant room / floor"
          className="h-8 text-xs"
          aria-label="Location"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground">Condition</label>
          <Select value={v.condition} onValueChange={(x) => emit({ condition: x as Condition })} disabled={disabled}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground">Status</label>
          <Select value={v.status} onValueChange={(x) => emit({ status: x as Status })} disabled={disabled}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
          <Battery className="size-3" /> Hours operated
        </label>
        <Input
          type="number"
          min={0}
          value={v.hoursOperated}
          onChange={(e) => emit({ hoursOperated: Math.max(0, Number(e.target.value)) })}
          disabled={disabled}
          className="h-8 text-xs"
          aria-label="Hours operated"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <CalendarClock className="size-3" /> Last service
          </label>
          <Input
            type="date"
            value={v.lastServiceDate ?? ''}
            onChange={(e) => emit({ lastServiceDate: e.target.value })}
            disabled={disabled}
            className="h-8 text-xs"
            aria-label="Last service date"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <CalendarClock className="size-3" /> Next due
          </label>
          <Input
            type="date"
            value={v.nextServiceDue ?? ''}
            onChange={(e) => emit({ nextServiceDue: e.target.value })}
            disabled={disabled}
            className="h-8 text-xs"
            aria-label="Next service due"
          />
        </div>
      </div>

      <Textarea
        value={v.inspectorNotes ?? ''}
        onChange={(e) => emit({ inspectorNotes: e.target.value })}
        disabled={disabled}
        placeholder="Inspector notes / anomalies / recommended actions…"
        className="text-xs min-h-[60px]"
        aria-label="Inspector notes"
      />

      {allowPhotos && (
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addPhoto} className="text-[11px] h-7 gap-1">
          <Cog className="size-3" /> Add photo ({v.photos.length})
        </Button>
      )}
    </div>
  );
}

export default EquipmentInspection;
