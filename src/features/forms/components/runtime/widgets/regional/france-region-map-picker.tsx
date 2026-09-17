'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin } from 'lucide-react';
import { WidgetProps, str } from '../widget-props';

interface Region {
  code: string;
  label: string;
  x: number;
  y: number;
}

// 13 metropolitan regions (post-2016 reorganization) + 5 overseas.
const METRO: Region[] = [
  { code: 'ARA', label: 'Auvergne-Rhône-Alpes', x: 65, y: 55 },
  { code: 'BFC', label: 'Bourgogne-Franche-Comté', x: 70, y: 35 },
  { code: 'BRE', label: 'Bretagne', x: 20, y: 40 },
  { code: 'CVL', label: 'Centre-Val de Loire', x: 45, y: 50 },
  { code: 'COR', label: 'Corse', x: 80, y: 80 },
  { code: 'GES', label: 'Grand Est', x: 85, y: 30 },
  { code: 'HDF', label: 'Hauts-de-France', x: 55, y: 18 },
  { code: 'IDF', label: 'Île-de-France', x: 55, y: 38 },
  { code: 'NOR', label: 'Normandie', x: 30, y: 25 },
  { code: 'NAQ', label: 'Nouvelle-Aquitaine', x: 30, y: 70 },
  { code: 'OCC', label: 'Occitanie', x: 55, y: 75 },
  { code: 'PDL', label: 'Pays de la Loire', x: 25, y: 55 },
  { code: 'PAC', label: "Provence-Alpes-Côte d'Azur", x: 75, y: 65 },
];
const OVERSEAS: Region[] = [
  { code: 'GP', label: 'Guadeloupe', x: 10, y: 90 },
  { code: 'MQ', label: 'Martinique', x: 20, y: 90 },
  { code: 'GF', label: 'Guyane', x: 30, y: 90 },
  { code: 'RE', label: 'La Réunion', x: 40, y: 90 },
  { code: 'YT', label: 'Mayotte', x: 50, y: 90 },
];
const ALL = [...METRO, ...OVERSEAS];

export function FranceRegionMapPicker({ value, onChange, disabled, field }: WidgetProps) {
  const valStr = typeof value === 'string' ? value : '';
  const ariaLabel = str(field?.label, 'French region');

  function pick(code: string) {
    onChange(code === valStr ? '' : code);
  }

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      {/* Simple stylized map — buttons positioned over an SVG canvas */}
      <div className="border border-border/70 rounded-xl p-2 bg-muted/30">
        <svg viewBox="0 0 100 100" className="w-full h-44">
          <rect x="0" y="0" width="100" height="100" fill="none" />
          {ALL.map((r) => {
            const active = valStr === r.code;
            return (
              <g key={r.code} onClick={() => !disabled && pick(r.code)} className={disabled ? '' : 'cursor-pointer'}>
                <circle
                  cx={r.x}
                  cy={r.y}
                  r={4.5}
                  className={active ? 'fill-primary' : 'fill-background stroke-foreground/40'}
                  strokeWidth={0.6}
                />
                {active && <circle cx={r.x} cy={r.y} r={6.5} className="fill-none stroke-primary" strokeWidth={0.6} />}
                <text
                  x={r.x}
                  y={r.y - 6}
                  textAnchor="middle"
                  className="fill-foreground"
                  style={{ fontSize: '3px' }}
                >
                  {r.label.length > 14 ? r.label.slice(0, 12) + '…' : r.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {/* Fallback select for accessibility / precise selection */}
      <Select value={valStr} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger aria-label={ariaLabel} className="w-full">
          <span className="flex items-center gap-2">
            <MapPin className="size-3.5 text-muted-foreground" />
            <SelectValue placeholder="Select a region…" />
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {METRO.map((r) => (
              <SelectItem key={r.code} value={r.code}>
                {r.label}
              </SelectItem>
            ))}
            {OVERSEAS.map((r) => (
              <SelectItem key={r.code} value={r.code}>
                {r.label} (DROM)
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {valStr && (
        <div className="text-[11px] text-muted-foreground">
          Selected: <span className="font-semibold text-foreground">{ALL.find((r) => r.code === valStr)?.label}</span>
        </div>
      )}
    </div>
  );
}

export default FranceRegionMapPicker;
