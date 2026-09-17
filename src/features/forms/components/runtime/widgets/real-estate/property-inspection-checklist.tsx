'use client';

import React, { useState } from 'react';
import { ClipboardCheck, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str } from '../widget-props';
import { cn } from '@/lib/utils';

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  notes?: string;
}
interface ChecklistCategory {
  id: string;
  name: string;
  items: ChecklistItem[];
}
interface InspectionValue {
  inspectorName?: string;
  propertyAddress?: string;
  categories: ChecklistCategory[];
  completed: number;
  total: number;
  completedAt?: string;
}

interface CfgCat {
  name: string;
  items: string[];
}

const DEFAULT_CATEGORIES: CfgCat[] = [
  { name: 'Exterior', items: ['Roof condition', 'Gutters & downspouts', 'Siding & paint', 'Foundation cracks'] },
  { name: 'Interior', items: ['Walls & ceilings', 'Flooring', 'Doors & windows', 'Stairs & railings'] },
  { name: 'Plumbing', items: ['Water pressure', 'Drainage', 'Water heater', 'Visible leaks'] },
  { name: 'Electrical', items: ['Panel & breakers', 'Outlets & switches', 'Smoke detectors', 'Lighting fixtures'] },
  { name: 'HVAC', items: ['Furnace operation', 'AC condenser', 'Ductwork', 'Thermostat'] },
];

let _idCounter = 0;
const uid = (prefix: string) => `${prefix}-${++_idCounter}-${Math.random().toString(36).slice(2, 6)}`;

export function PropertyInspectionChecklist({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Property inspection checklist');
  const cfgCats = Array.isArray(config.categories) ? (config.categories as CfgCat[]) : DEFAULT_CATEGORIES;

  const v: InspectionValue = value && typeof value === 'object'
    ? (value as InspectionValue)
    : (() => {
        const categories = cfgCats.map((c) => ({
          id: uid('cat'),
          name: c.name,
          items: c.items.map((label) => ({ id: uid('item'), label, done: false })),
        }));
        const total = categories.reduce((s, c) => s + c.items.length, 0);
        return { categories, completed: 0, total };
      })();

  const [openCats, setOpenCats] = useState<Set<string>>(new Set(v.categories.map((c) => c.id)));

  const recompute = (categories: ChecklistCategory[]): InspectionValue => {
    const flat = categories.flatMap((c) => c.items);
    const completed = flat.filter((i) => i.done).length;
    const total = flat.length;
    return {
      ...v,
      categories,
      completed,
      total,
      completedAt: completed === total && total > 0 ? new Date().toISOString() : undefined,
    };
  };

  const toggleItem = (catId: string, itemId: string, done: boolean) => {
    const categories = v.categories.map((c) => c.id === catId
      ? { ...c, items: c.items.map((i) => i.id === itemId ? { ...i, done, notes: i.notes ?? '' } : i) }
      : c);
    onChange(recompute(categories));
  };

  const setItemNotes = (catId: string, itemId: string, notes: string) => {
    const categories = v.categories.map((c) => c.id === catId
      ? { ...c, items: c.items.map((i) => i.id === itemId ? { ...i, notes } : i) }
      : c);
    onChange(recompute(categories));
  };

  const toggleCat = (id: string) => {
    const next = new Set(openCats);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpenCats(next);
  };

  const allComplete = v.total > 0 && v.completed === v.total;

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ClipboardCheck className="size-3.5 text-primary" />
          <span className="text-xs font-semibold">Inspection checklist</span>
        </div>
        <Badge variant={allComplete ? 'default' : 'outline'} className="text-[9px]">
          {v.completed}/{v.total}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input
          value={v.propertyAddress ?? ''}
          onChange={(e) => onChange({ ...v, propertyAddress: e.target.value })}
          disabled={disabled}
          placeholder="Property address"
          aria-label="Property address"
          className="text-xs h-8"
        />
        <Input
          value={v.inspectorName ?? ''}
          onChange={(e) => onChange({ ...v, inspectorName: e.target.value })}
          disabled={disabled}
          placeholder="Inspector name"
          aria-label="Inspector name"
          className="text-xs h-8"
        />
      </div>

      <div className="space-y-1.5">
        {v.categories.map((cat) => {
          const done = cat.items.filter((i) => i.done).length;
          const open = openCats.has(cat.id);
          return (
            <div key={cat.id} className="rounded-md border border-border overflow-hidden">
              <button
                type="button"
                disabled={disabled}
                onClick={() => toggleCat(cat.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 bg-muted/50 hover:bg-muted"
                aria-label={`Toggle ${cat.name}`}
              >
                {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                <span className="text-xs font-semibold flex-1 text-left">{cat.name}</span>
                <Badge variant={done === cat.items.length ? 'default' : 'secondary'} className="text-[9px] h-4">
                  {done}/{cat.items.length}
                </Badge>
              </button>
              {open && (
                <div className="p-2 space-y-1.5">
                  {cat.items.map((item) => (
                    <div key={item.id} className="space-y-1">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={item.done}
                          disabled={disabled}
                          onCheckedChange={(c) => toggleItem(cat.id, item.id, c === true)}
                          className="mt-0.5"
                        />
                        <span className={cn('text-[11px] flex-1', item.done && 'line-through text-muted-foreground')}>
                          {item.label}
                        </span>
                        {item.done && <CheckCircle2 className="size-3 text-emerald-600" />}
                      </div>
                      {item.done && (
                        <Input
                          value={item.notes ?? ''}
                          onChange={(e) => setItemNotes(cat.id, item.id, e.target.value)}
                          disabled={disabled}
                          placeholder="Notes (optional)"
                          aria-label={`Notes for ${item.label}`}
                          className="text-[10px] h-7 ml-6"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {allComplete && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-2 flex items-center gap-1.5">
          <CheckCircle2 className="size-3.5 text-emerald-600" />
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
            All items inspected
          </span>
        </div>
      )}
    </div>
  );
}

export default PropertyInspectionChecklist;
