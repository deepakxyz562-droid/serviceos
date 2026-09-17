'use client';

import React, { useMemo, useState } from 'react';
import { ClipboardCheck, CheckCircle2, XCircle, CircleAlert, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { WidgetProps, str, bool } from '../widget-props';

type Status = 'pass' | 'fail' | 'n/a';

interface CheckItem {
  category: string;
  name: string;
  status: Status;
  notes?: string;
}

interface ChecklistValue {
  items: CheckItem[];
  photos: string[];
}

export function InspectionChecklistGeneric({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Inspection checklist');
  const allowPhotos = bool(config.allowPhotos, true);
  const allowAddRows = bool(config.allowAddRows, true);
  const cats =
    Array.isArray(config.categories) && config.categories.length
      ? (config.categories as Array<{ category?: string; items?: string[] }>).map((c, i) => ({
          category: str(c.category, `Category ${i + 1}`),
          items: Array.isArray(c.items) ? c.items.map((x) => str(x, 'Item')) : ['Item'],
        }))
      : [{ category: 'General', items: ['Visual condition', 'Functional test', 'Safety check'] }];

  const [v, setV] = useState<ChecklistValue>(() => {
    const existing = value && typeof value === 'object' ? (value as ChecklistValue) : null;
    if (existing?.items?.length) return existing;
    return {
      items: cats.flatMap((c) => c.items.map((name) => ({ category: c.category, name, status: 'n/a' as Status }))),
      photos: [],
    };
  });

  const grouped = useMemo(() => {
    const map = new Map<string, { item: CheckItem; idx: number }[]>();
    v.items.forEach((item, idx) => {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push({ item, idx });
    });
    return Array.from(map.entries());
  }, [v.items]);

  const setStatus = (idx: number, status: Status) => {
    if (disabled) return;
    const items = v.items.map((it, i) => (i === idx ? { ...it, status } : it));
    setV({ ...v, items });
    onChange({ ...v, items });
  };
  const setNotes = (idx: number, notes: string) => {
    if (disabled) return;
    const items = v.items.map((it, i) => (i === idx ? { ...it, notes } : it));
    setV({ ...v, items });
    onChange({ ...v, items });
  };
  const addItem = (category: string) => {
    if (disabled || !allowAddRows) return;
    const items = [...v.items, { category, name: 'New item', status: 'n/a' as Status }];
    setV({ ...v, items });
    onChange({ ...v, items });
  };
  const renameItem = (idx: number, name: string) => {
    if (disabled) return;
    const items = v.items.map((it, i) => (i === idx ? { ...it, name } : it));
    setV({ ...v, items });
    onChange({ ...v, items });
  };
  const addPhoto = () => {
    if (disabled || !allowPhotos) return;
    const photos = [...v.photos, `photo_${Date.now()}.jpg`];
    setV({ ...v, photos });
    onChange({ ...v, photos });
  };

  const pass = v.items.filter((i) => i.status === 'pass').length;
  const fail = v.items.filter((i) => i.status === 'fail').length;

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-2">
        <ClipboardCheck className="size-4 text-indigo-600" />
        <span className="text-xs font-semibold">Inspection Checklist</span>
        <Badge variant="outline" className="ml-auto text-[9px]">{pass} pass</Badge>
        <Badge variant={fail ? 'destructive' : 'outline'} className="text-[9px]">{fail} fail</Badge>
      </div>

      <div className="space-y-2.5">
        {grouped.map(([category, entries]) => (
          <div key={category} className="rounded-lg border border-border/70 bg-card p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {category}
              </p>
              {allowAddRows && !disabled && (
                <button type="button" onClick={() => addItem(category)} className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5">
                  <Plus className="size-2.5" /> Add item
                </button>
              )}
            </div>
            <ul className="space-y-1.5">
              {entries.map(({ item, idx }) => (
                <li key={idx} className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={item.name}
                      onChange={(e) => renameItem(idx, e.target.value)}
                      disabled={disabled}
                      className="h-7 text-xs flex-1"
                      aria-label={`Item ${idx + 1} name`}
                    />
                    <div className="flex items-center gap-0.5">
                      {(['pass', 'fail', 'n/a'] as Status[]).map((s) => {
                        const Icon = s === 'pass' ? CheckCircle2 : s === 'fail' ? XCircle : CircleAlert;
                        return (
                          <Button
                            key={s}
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={disabled}
                            onClick={() => setStatus(idx, s)}
                            aria-label={`${item.name} ${s}`}
                            className={
                              'h-6 w-7 p-0 ' + (item.status === s ? (s === 'fail' ? 'text-rose-600 bg-muted' : s === 'pass' ? 'text-emerald-600 bg-muted' : 'text-muted-foreground bg-muted') : 'text-muted-foreground/50')
                            }
                          >
                            <Icon className="size-3" />
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                  <Textarea
                    value={item.notes ?? ''}
                    onChange={(e) => setNotes(idx, e.target.value)}
                    disabled={disabled}
                    placeholder="Notes"
                    className="text-[10px] min-h-[30px] py-1"
                    aria-label={`${item.name} notes`}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {allowPhotos && (
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addPhoto} className="text-[11px] h-7 gap-1">
          <ClipboardCheck className="size-3" /> Add photo ({v.photos.length})
        </Button>
      )}
    </div>
  );
}

export default InspectionChecklistGeneric;
