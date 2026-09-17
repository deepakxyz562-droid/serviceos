'use client';

import React, { useMemo, useState } from 'react';
import { ListChecks, CheckCircle2, XCircle, CircleAlert, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { WidgetProps, str, bool } from '../widget-props';

type Verdict = 'pass' | 'fail' | 'rework';

interface QcItem {
  name: string;
  verdict: Verdict;
  notes?: string;
  measured?: string;
}

interface QcValue {
  items: QcItem[];
  inspector?: string;
  batchId?: string;
  photos: string[];
}

const VERDICT_TONE: Record<Verdict, string> = {
  pass: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
  fail: 'text-rose-600 bg-rose-50 dark:bg-rose-950/30',
  rework: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
};

export function QualityControlChecklist({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Quality control checklist');
  const allowPhotos = bool(config.allowPhotos, true);
  const allowAddRows = bool(config.allowAddRows, true);

  const seed: QcItem[] = Array.isArray(config.items)
    ? (config.items as Array<Partial<QcItem>>).map((it, i) => ({
        name: str(it.name, `Check ${i + 1}`),
        verdict: 'pass' as Verdict,
        notes: '',
        measured: '',
      }))
    : [
        { name: 'Dimensions', verdict: 'pass' as Verdict, notes: '', measured: '' },
        { name: 'Surface finish', verdict: 'pass' as Verdict, notes: '', measured: '' },
        { name: 'Functional test', verdict: 'pass' as Verdict, notes: '', measured: '' },
        { name: 'Packaging integrity', verdict: 'pass' as Verdict, notes: '', measured: '' },
      ];

  const [v, setV] = useState<QcValue>(() => {
    const existing = value && typeof value === 'object' ? (value as QcValue) : null;
    if (existing?.items?.length) return existing;
    return {
      items: seed,
      inspector: str(config.inspector, ''),
      batchId: str(config.batchId, ''),
      photos: [],
    };
  });

  const setVerdict = (idx: number, verdict: Verdict) => {
    if (disabled) return;
    const items = v.items.map((it, i) => (i === idx ? { ...it, verdict } : it));
    setV({ ...v, items });
    onChange({ ...v, items });
  };
  const setNotes = (idx: number, notes: string) => {
    if (disabled) return;
    const items = v.items.map((it, i) => (i === idx ? { ...it, notes } : it));
    setV({ ...v, items });
    onChange({ ...v, items });
  };
  const setMeasured = (idx: number, measured: string) => {
    if (disabled) return;
    const items = v.items.map((it, i) => (i === idx ? { ...it, measured } : it));
    setV({ ...v, items });
    onChange({ ...v, items });
  };
  const rename = (idx: number, name: string) => {
    if (disabled) return;
    const items = v.items.map((it, i) => (i === idx ? { ...it, name } : it));
    setV({ ...v, items });
    onChange({ ...v, items });
  };
  const addItem = () => {
    if (disabled || !allowAddRows) return;
    const items = [...v.items, { name: 'New check', verdict: 'pass' as Verdict, notes: '', measured: '' }];
    setV({ ...v, items });
    onChange({ ...v, items });
  };
  const addPhoto = () => {
    if (disabled || !allowPhotos) return;
    const photos = [...v.photos, `photo_${Date.now()}.jpg`];
    setV({ ...v, photos });
    onChange({ ...v, photos });
  };

  const stats = useMemo(() => {
    const pass = v.items.filter((i) => i.verdict === 'pass').length;
    const fail = v.items.filter((i) => i.verdict === 'fail').length;
    const rework = v.items.filter((i) => i.verdict === 'rework').length;
    return { pass, fail, rework };
  }, [v.items]);

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-2">
        <ListChecks className="size-4 text-emerald-600" />
        <span className="text-xs font-semibold">QC Checklist</span>
        <Badge variant="outline" className="ml-auto text-[9px]">{stats.pass} pass</Badge>
        <Badge variant={stats.fail ? 'destructive' : 'outline'} className="text-[9px]">{stats.fail} fail</Badge>
        {stats.rework > 0 && <Badge variant="secondary" className="text-[9px]">{stats.rework} rework</Badge>}
      </div>

      <ul className="space-y-2">
        {v.items.map((it, idx) => (
          <li key={idx} className="rounded-md border border-border/70 bg-card p-2 space-y-1">
            <div className="flex items-center gap-1.5">
              <Input
                value={it.name}
                onChange={(e) => rename(idx, e.target.value)}
                disabled={disabled}
                className="h-7 text-xs flex-1"
                aria-label={`Check ${idx + 1} name`}
              />
              <div className="flex items-center gap-0.5">
                {(['pass', 'fail', 'rework'] as Verdict[]).map((s) => {
                  const Icon = s === 'pass' ? CheckCircle2 : s === 'fail' ? XCircle : CircleAlert;
                  return (
                    <Button
                      key={s}
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={disabled}
                      onClick={() => setVerdict(idx, s)}
                      aria-label={`${it.name} ${s}`}
                      className={'h-6 w-7 p-0 ' + (it.verdict === s ? VERDICT_TONE[s] : 'text-muted-foreground/50')}
                    >
                      <Icon className="size-3" />
                    </Button>
                  );
                })}
              </div>
            </div>
            <Input
              value={it.measured ?? ''}
              onChange={(e) => setMeasured(idx, e.target.value)}
              disabled={disabled}
              placeholder="Measured value (e.g. 12.4 mm)"
              className="h-7 text-[10px] font-mono"
              aria-label={`${it.name} measured value`}
            />
            <Textarea
              value={it.notes ?? ''}
              onChange={(e) => setNotes(idx, e.target.value)}
              disabled={disabled}
              placeholder="Notes"
              className="text-[10px] min-h-[30px] py-1"
              aria-label={`${it.name} notes`}
            />
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2">
        {allowAddRows && !disabled && (
          <Button type="button" variant="outline" size="sm" onClick={addItem} className="text-[11px] h-7 gap-1">
            <Plus className="size-3" /> Add check
          </Button>
        )}
        {allowPhotos && (
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addPhoto} className="text-[11px] h-7 gap-1 ml-auto">
            <ListChecks className="size-3" /> Add photo ({v.photos.length})
          </Button>
        )}
      </div>
    </div>
  );
}

export default QualityControlChecklist;
