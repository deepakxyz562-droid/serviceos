'use client';

import React, { useState } from 'react';
import { Droplets, Clock, Camera, MapPin } from 'lucide-react';
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
import { WidgetProps, str, num } from '../widget-props';

interface Part {
  name: string;
  qty: number;
}

interface PlumbingValue {
  issue: string;
  location: string;
  priority: 'low' | 'med' | 'high';
  parts: Part[];
  timeSpentMin: number;
  photos: string[];
}

export function PlumbingJobCard({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Plumbing job card');
  const defaultPriority = (str(config.priority, 'med') as PlumbingValue['priority']) || 'med';

  const [v, setV] = useState<PlumbingValue>(() => {
    const existing = value && typeof value === 'object' ? (value as PlumbingValue) : null;
    return {
      issue: existing?.issue ?? '',
      location: existing?.location ?? '',
      priority: existing?.priority ?? defaultPriority,
      parts: existing?.parts ?? [],
      timeSpentMin: existing?.timeSpentMin ?? 0,
      photos: existing?.photos ?? [],
    };
  });

  const emit = (next: Partial<PlumbingValue>) => {
    const merged = { ...v, ...next };
    setV(merged);
    onChange(merged);
  };

  const addPart = () => emit({ parts: [...v.parts, { name: '', qty: 1 }] });
  const updatePart = (idx: number, patch: Partial<Part>) => {
    const parts = v.parts.map((p, i) => (i === idx ? { ...p, ...patch } : p));
    emit({ parts });
  };
  const removePart = (idx: number) => emit({ parts: v.parts.filter((_, i) => i !== idx) });
  const addPhoto = () => emit({ photos: [...v.photos, `photo_${Date.now()}.jpg`] });

  const priorityTone =
    v.priority === 'high' ? 'destructive' : v.priority === 'med' ? 'secondary' : 'outline';
  const hours = Math.floor(v.timeSpentMin / 60);
  const mins = v.timeSpentMin % 60;

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-2">
        <Droplets className="size-4 text-sky-600" />
        <span className="text-xs font-semibold">Plumbing Job Card</span>
        <Badge variant={priorityTone} className="ml-auto text-[9px] uppercase">
          {v.priority} priority
        </Badge>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground">Issue / complaint</label>
        <Textarea
          value={v.issue}
          onChange={(e) => emit({ issue: e.target.value })}
          disabled={disabled}
          placeholder="e.g. Leaking kitchen tap under sink"
          className="text-xs min-h-[48px]"
          aria-label="Issue"
        />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
          <MapPin className="size-3" /> Location on site
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
          <label className="text-[11px] font-semibold text-muted-foreground">Priority</label>
          <Select value={v.priority} onValueChange={(p) => emit({ priority: p as PlumbingValue['priority'] })} disabled={disabled}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="med">Medium</SelectItem>
              <SelectItem value="high">High / emergency</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <Clock className="size-3" /> Time (min)
          </label>
          <Input
            type="number"
            min={0}
            value={v.timeSpentMin}
            onChange={(e) => emit({ timeSpentMin: Math.max(0, Number(e.target.value)) })}
            disabled={disabled}
            className="h-8 text-xs"
            aria-label="Time spent in minutes"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-semibold text-muted-foreground">Parts used</label>
          {!disabled && (
            <button type="button" onClick={addPart} className="text-[10px] text-sky-600 hover:underline">+ Add part</button>
          )}
        </div>
        <ul className="space-y-1">
          {v.parts.map((p, idx) => (
            <li key={idx} className="grid grid-cols-[1fr_50px_24px] gap-1 items-center">
              <Input
                value={p.name}
                onChange={(e) => updatePart(idx, { name: e.target.value })}
                disabled={disabled}
                placeholder="Part"
                className="h-7 text-[10px]"
                aria-label={`Part ${idx + 1}`}
              />
              <Input
                type="number"
                min={1}
                value={p.qty}
                onChange={(e) => updatePart(idx, { qty: Math.max(1, Number(e.target.value)) })}
                disabled={disabled}
                className="h-7 text-[10px]"
                aria-label={`Part ${idx + 1} qty`}
              />
              {!disabled && (
                <button type="button" onClick={() => removePart(idx)} className="text-rose-500 text-xs" aria-label="Remove">×</button>
              )}
            </li>
          ))}
          {v.parts.length === 0 && <li className="text-[10px] text-muted-foreground italic">No parts.</li>}
        </ul>
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addPhoto} className="text-[11px] h-7 gap-1">
          <Camera className="size-3" /> Add photo
        </Button>
        <span className="text-[10px] text-muted-foreground">{v.photos.length} attached</span>
        {v.timeSpentMin > 0 && (
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">
            ≈ {hours}h {mins}m
          </span>
        )}
      </div>
    </div>
  );
}

export default PlumbingJobCard;
