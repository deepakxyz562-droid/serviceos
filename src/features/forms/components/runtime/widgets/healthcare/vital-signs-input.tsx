'use client';

import React from 'react';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Lock, Activity, HeartPulse, Thermometer, Wind, Droplets } from 'lucide-react';

interface VitalsValue {
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  temperature?: number; // °F
  temperatureUnit?: 'F' | 'C';
  respiratoryRate?: number;
  oxygenSaturation?: number;
  timestamp?: string;
}

const RANGES: Record<keyof Omit<VitalsValue, 'timestamp' | 'temperatureUnit'>, { min: number; max: number; unit: string; warnLow?: number; warnHigh?: number; normal: string }> = {
  systolic: { min: 60, max: 250, unit: 'mmHg', warnLow: 90, warnHigh: 140, normal: '90-140' },
  diastolic: { min: 30, max: 150, unit: 'mmHg', warnLow: 60, warnHigh: 90, normal: '60-90' },
  heartRate: { min: 30, max: 220, unit: 'bpm', warnLow: 50, warnHigh: 100, normal: '60-100' },
  temperature: { min: 80, max: 110, unit: '°F', warnLow: 97, warnHigh: 99.5, normal: '97-99.5' },
  respiratoryRate: { min: 4, max: 60, unit: '/min', warnLow: 12, warnHigh: 20, normal: '12-20' },
  oxygenSaturation: { min: 50, max: 100, unit: '%', warnLow: 95, warnHigh: 100, normal: '95-100' },
};

function status(value: number | undefined, key: keyof typeof RANGES): 'normal' | 'warn' | 'danger' | 'unset' {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'unset';
  const r = RANGES[key];
  if (value < r.min || value > r.max) return 'danger';
  if ((r.warnLow !== undefined && value < r.warnLow) || (r.warnHigh !== undefined && value > r.warnHigh)) return 'warn';
  return 'normal';
}

const STATUS_COLOR: Record<string, string> = {
  normal: 'text-emerald-700 dark:text-emerald-300',
  warn: 'text-amber-700 dark:text-amber-300',
  danger: 'text-red-700 dark:text-red-300',
  unset: 'text-muted-foreground',
};

export function VitalSignsInput({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Vital signs input');
  const showTimestamp = bool(config.showTimestamp, true);
  const v: VitalsValue = value && typeof value === 'object' ? (value as VitalsValue) : {};

  const set = (p: Partial<VitalsValue>) => onChange({ ...v, ...p, timestamp: new Date().toISOString() });

  const numOrEmpty = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) ? String(n) : '');

  const bpStatus = (() => {
    const s = status(v.systolic, 'systolic');
    const d = status(v.diastolic, 'diastolic');
    if (s === 'danger' || d === 'danger') return 'danger';
    if (s === 'warn' || d === 'warn') return 'warn';
    if (s === 'normal' && d === 'normal') return 'normal';
    return 'unset';
  })();

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Lock className="size-3 text-amber-600" />
          <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold uppercase tracking-wider">Encrypted PHI</span>
        </div>
        {showTimestamp && v.timestamp && (
          <span className="text-[10px] text-muted-foreground font-mono">{new Date(v.timestamp).toLocaleString()}</span>
        )}
      </div>

      {/* Blood pressure — combined systolic/diastolic */}
      <VitalRow
        icon={<HeartPulse className="size-3.5" />}
        label="Blood pressure"
        unit="mmHg"
        status={bpStatus}
        normal={RANGES.systolic.normal}
      >
        <div className="flex items-center gap-1">
          <Input
            type="number"
            inputMode="numeric"
            value={numOrEmpty(v.systolic)}
            disabled={disabled}
            onChange={(e) => set({ systolic: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="120"
            className="text-xs h-8 w-16"
            aria-label="Systolic"
          />
          <span className="text-muted-foreground font-bold">/</span>
          <Input
            type="number"
            inputMode="numeric"
            value={numOrEmpty(v.diastolic)}
            disabled={disabled}
            onChange={(e) => set({ diastolic: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="80"
            className="text-xs h-8 w-16"
            aria-label="Diastolic"
          />
        </div>
      </VitalRow>

      <VitalRow
        icon={<Activity className="size-3.5" />}
        label="Heart rate"
        unit={RANGES.heartRate.unit}
        status={status(v.heartRate, 'heartRate')}
        normal={RANGES.heartRate.normal}
      >
        <NumberInput
          value={numOrEmpty(v.heartRate)}
          disabled={disabled}
          placeholder="72"
          ariaLabel="Heart rate"
          onChange={(n) => set({ heartRate: n })}
        />
      </VitalRow>

      <VitalRow
        icon={<Thermometer className="size-3.5" />}
        label="Temperature"
        unit={RANGES.temperature.unit}
        status={status(v.temperature, 'temperature')}
        normal={RANGES.temperature.normal}
      >
        <NumberInput
          value={numOrEmpty(v.temperature)}
          disabled={disabled}
          placeholder="98.6"
          step="0.1"
          ariaLabel="Temperature"
          onChange={(n) => set({ temperature: n })}
        />
      </VitalRow>

      <VitalRow
        icon={<Wind className="size-3.5" />}
        label="Respiratory rate"
        unit={RANGES.respiratoryRate.unit}
        status={status(v.respiratoryRate, 'respiratoryRate')}
        normal={RANGES.respiratoryRate.normal}
      >
        <NumberInput
          value={numOrEmpty(v.respiratoryRate)}
          disabled={disabled}
          placeholder="16"
          ariaLabel="Respiratory rate"
          onChange={(n) => set({ respiratoryRate: n })}
        />
      </VitalRow>

      <VitalRow
        icon={<Droplets className="size-3.5" />}
        label="Oxygen saturation"
        unit={RANGES.oxygenSaturation.unit}
        status={status(v.oxygenSaturation, 'oxygenSaturation')}
        normal={RANGES.oxygenSaturation.normal}
      >
        <NumberInput
          value={numOrEmpty(v.oxygenSaturation)}
          disabled={disabled}
          placeholder="98"
          ariaLabel="Oxygen saturation"
          onChange={(n) => set({ oxygenSaturation: n })}
        />
      </VitalRow>
    </div>
  );
}

interface VitalRowProps {
  icon: React.ReactNode;
  label: string;
  unit: string;
  status: 'normal' | 'warn' | 'danger' | 'unset';
  normal: string;
  children: React.ReactNode;
}

function VitalRow({ icon, label, unit, status: st, normal, children }: VitalRowProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 w-32 shrink-0">
        <span className={STATUS_COLOR[st]}>{icon}</span>
        <span className="text-[11px] font-semibold text-foreground">{label}</span>
      </div>
      {children}
      <div className="ml-auto flex items-center gap-1">
        <span className="text-[9px] text-muted-foreground font-mono">{unit}</span>
        <Badge variant="outline" className={cn('text-[9px] h-4 px-1', STATUS_COLOR[st])}>
          {st === 'unset' ? `n/a` : st}
        </Badge>
        <span className="text-[9px] text-muted-foreground hidden sm:inline">{normal}</span>
      </div>
    </div>
  );
}

interface NumberInputProps {
  value: string;
  disabled?: boolean;
  placeholder?: string;
  step?: string;
  ariaLabel: string;
  onChange: (n: number | undefined) => void;
}

function NumberInput({ value, disabled, placeholder, step, ariaLabel, onChange }: NumberInputProps) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
      placeholder={placeholder}
      className="text-xs h-8 w-20"
      aria-label={ariaLabel}
    />
  );
}

export default VitalSignsInput;
