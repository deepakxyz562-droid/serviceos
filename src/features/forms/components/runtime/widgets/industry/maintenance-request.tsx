'use client';

import React, { useState } from 'react';
import { Wrench, MapPin, AlertTriangle, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WidgetProps, str, bool } from '../widget-props';

type Urgency = 'low' | 'medium' | 'high' | 'emergency';

interface MaintenanceValue {
  location: string;
  assetId?: string;
  issue: string;
  urgency: Urgency;
  reportedBy?: string;
  preferredTime?: string;
  accessNotes?: string;
  photos: string[];
}

const URGENCIES: Urgency[] = ['low', 'medium', 'high', 'emergency'];

const URGENCY_TONE: Record<Urgency, 'outline' | 'secondary' | 'destructive'> = {
  low: 'outline',
  medium: 'outline',
  high: 'secondary',
  emergency: 'destructive',
};

export function MaintenanceRequest({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Maintenance request');
  const allowPhotos = bool(config.allowPhotos, true);

  const [v, setV] = useState<MaintenanceValue>(() => {
    const existing = value && typeof value === 'object' ? (value as MaintenanceValue) : null;
    return {
      location: existing?.location ?? str(config.location, ''),
      assetId: existing?.assetId ?? str(config.assetId, ''),
      issue: existing?.issue ?? '',
      urgency: existing?.urgency ?? (str(config.urgency, 'medium') as Urgency),
      reportedBy: existing?.reportedBy ?? '',
      preferredTime: existing?.preferredTime ?? '',
      accessNotes: existing?.accessNotes ?? '',
      photos: existing?.photos ?? [],
    };
  });

  const emit = (next: Partial<MaintenanceValue>) => {
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
        <Wrench className="size-4 text-amber-600" />
        <span className="text-xs font-semibold">Maintenance Request</span>
        <Badge variant={URGENCY_TONE[v.urgency]} className="ml-auto text-[9px] uppercase flex items-center gap-1">
          <AlertTriangle className="size-2.5" /> {v.urgency}
        </Badge>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
          <MapPin className="size-3" /> Location
        </label>
        <Input
          value={v.location}
          onChange={(e) => emit({ location: e.target.value })}
          disabled={disabled}
          placeholder="Building / floor / room"
          className="h-8 text-xs"
          aria-label="Location"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground">Asset ID</label>
          <Input
            value={v.assetId ?? ''}
            onChange={(e) => emit({ assetId: e.target.value })}
            disabled={disabled}
            placeholder="Equipment tag"
            className="h-8 text-xs font-mono"
            aria-label="Asset ID"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground">Reported by</label>
          <Input
            value={v.reportedBy ?? ''}
            onChange={(e) => emit({ reportedBy: e.target.value })}
            disabled={disabled}
            placeholder="Your name"
            className="h-8 text-xs"
            aria-label="Reporter"
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
          <AlertTriangle className="size-3" /> Issue / problem
        </label>
        <Textarea
          value={v.issue}
          onChange={(e) => emit({ issue: e.target.value })}
          disabled={disabled}
          placeholder="Describe the issue, when it started, any error codes…"
          className="text-xs min-h-[60px]"
          aria-label="Issue"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground">Urgency</label>
          <Select value={v.urgency} onValueChange={(x) => emit({ urgency: x as Urgency })} disabled={disabled}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {URGENCIES.map((u) => <SelectItem key={u} value={u} className="capitalize">{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <Clock className="size-3" /> Preferred time
          </label>
          <Input
            type="datetime-local"
            value={v.preferredTime ?? ''}
            onChange={(e) => emit({ preferredTime: e.target.value })}
            disabled={disabled}
            className="h-8 text-xs"
            aria-label="Preferred time"
          />
        </div>
      </div>

      <Textarea
        value={v.accessNotes ?? ''}
        onChange={(e) => emit({ accessNotes: e.target.value })}
        disabled={disabled}
        placeholder="Access notes — keys, contact on site, parking…"
        className="text-xs min-h-[40px]"
        aria-label="Access notes"
      />

      {allowPhotos && (
        <button
          type="button"
          onClick={addPhoto}
          disabled={disabled}
          className="w-full inline-flex items-center justify-center gap-1 text-[11px] h-7 rounded-md border border-border bg-card hover:bg-muted/40"
        >
          <Wrench className="size-3" /> Attach photo ({v.photos.length})
        </button>
      )}
    </div>
  );
}

export default MaintenanceRequest;
