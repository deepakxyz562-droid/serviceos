'use client';

import React, { useState } from 'react';
import { Fan, Snowflake, Flame, Wrench, Clock, DollarSign } from 'lucide-react';
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
import { WidgetProps, str, num } from '../widget-props';

interface Part {
  name: string;
  qty: number;
  cost: number;
}

interface HvacValue {
  systemType: string;
  diagnosis: string;
  parts: Part[];
  laborHours: number;
  laborRate: number;
  photos: string[];
}

const SYSTEM_TYPES = ['Split AC', 'Central AC', 'Heat Pump', 'Furnace', 'Boiler', 'Mini-Split'];

export function HvacServiceReport({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'HVAC service report');
  const defaultLaborRate = num(config.defaultLaborRate, 95);

  const [v, setV] = useState<HvacValue>(() => {
    const existing = value && typeof value === 'object' ? (value as HvacValue) : null;
    return {
      systemType: existing?.systemType ?? 'Split AC',
      diagnosis: existing?.diagnosis ?? '',
      parts: existing?.parts ?? [],
      laborHours: existing?.laborHours ?? 0,
      laborRate: existing?.laborRate ?? defaultLaborRate,
      photos: existing?.photos ?? [],
    };
  });

  const emit = (next: Partial<HvacValue>) => {
    const merged = { ...v, ...next };
    setV(merged);
    onChange(merged);
  };

  const addPart = () => {
    if (disabled) return;
    emit({ parts: [...v.parts, { name: '', qty: 1, cost: 0 }] });
  };
  const updatePart = (idx: number, patch: Partial<Part>) => {
    if (disabled) return;
    const parts = v.parts.map((p, i) => (i === idx ? { ...p, ...patch } : p));
    emit({ parts });
  };
  const removePart = (idx: number) => {
    if (disabled) return;
    emit({ parts: v.parts.filter((_, i) => i !== idx) });
  };

  const partsTotal = v.parts.reduce((s, p) => s + p.qty * p.cost, 0);
  const laborTotal = v.laborHours * v.laborRate;
  const grand = partsTotal + laborTotal;
  const SystemIcon = v.systemType.includes('Heat') || v.systemType.includes('Furnace') ? Flame : v.systemType.includes('Boiler') ? Flame : Snowflake;

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-2">
        <Fan className="size-4 text-sky-600" />
        <span className="text-xs font-semibold">HVAC Service Report</span>
        <Badge variant="outline" className="ml-auto text-[9px] gap-1">
          <SystemIcon className="size-2.5" /> {v.systemType}
        </Badge>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground">System type</label>
        <Select value={v.systemType} onValueChange={(x) => emit({ systemType: x })} disabled={disabled}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SYSTEM_TYPES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground">Diagnosis</label>
        <Textarea
          value={v.diagnosis}
          onChange={(e) => emit({ diagnosis: e.target.value })}
          disabled={disabled}
          placeholder="Symptoms, root cause, recommendations…"
          className="text-xs min-h-[60px]"
          aria-label="Diagnosis"
        />
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
            <li key={idx} className="grid grid-cols-[1fr_50px_70px_24px] gap-1 items-center">
              <Input
                value={p.name}
                onChange={(e) => updatePart(idx, { name: e.target.value })}
                disabled={disabled}
                placeholder="Part name"
                className="h-7 text-[10px]"
                aria-label={`Part ${idx + 1} name`}
              />
              <Input
                type="number"
                value={p.qty}
                min={1}
                onChange={(e) => updatePart(idx, { qty: Math.max(1, Number(e.target.value)) })}
                disabled={disabled}
                className="h-7 text-[10px]"
                aria-label={`Part ${idx + 1} qty`}
              />
              <Input
                type="number"
                value={p.cost}
                min={0}
                step="0.01"
                onChange={(e) => updatePart(idx, { cost: Math.max(0, Number(e.target.value)) })}
                disabled={disabled}
                className="h-7 text-[10px]"
                aria-label={`Part ${idx + 1} cost`}
              />
              {!disabled && (
                <button type="button" onClick={() => removePart(idx)} className="text-rose-500 text-xs" aria-label={`Remove part ${idx + 1}`}>×</button>
              )}
            </li>
          ))}
          {v.parts.length === 0 && (
            <li className="text-[10px] text-muted-foreground italic">No parts added.</li>
          )}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-2">
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
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <DollarSign className="size-3" /> Rate / hr
          </label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={v.laborRate}
            onChange={(e) => emit({ laborRate: Math.max(0, Number(e.target.value)) })}
            disabled={disabled}
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div className="rounded-md bg-muted/40 p-2 text-[10px] flex items-center justify-between">
        <span className="text-muted-foreground flex items-center gap-1"><Wrench className="size-2.5" /> Parts + Labor</span>
        <span className="font-mono font-bold text-foreground">
          ${grand.toFixed(2)}
          <span className="text-muted-foreground font-normal ml-1">(${partsTotal.toFixed(2)} + ${laborTotal.toFixed(2)})</span>
        </span>
      </div>
    </div>
  );
}

export default HvacServiceReport;
