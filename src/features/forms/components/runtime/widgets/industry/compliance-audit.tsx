'use client';

import React, { useMemo, useState } from 'react';
import { Scale, CheckCircle2, XCircle, CircleAlert, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { WidgetProps, str, bool } from '../widget-props';

type Status = 'compliant' | 'non_compliant' | 'in_progress' | 'not_applicable';

interface AuditItem {
  regulation: string;
  reference?: string;
  status: Status;
  notes?: string;
  evidence?: string;
}

interface AuditValue {
  items: AuditItem[];
  auditor?: string;
  auditDate?: string;
  photos: string[];
}

const STATUS_TONE: Record<Status, string> = {
  compliant: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
  non_compliant: 'text-rose-600 bg-rose-50 dark:bg-rose-950/30',
  in_progress: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
  not_applicable: 'text-muted-foreground bg-muted/40',
};

const STATUS_LABEL: Record<Status, string> = {
  compliant: 'Compliant',
  non_compliant: 'Non-compliant',
  in_progress: 'In progress',
  not_applicable: 'N/A',
};

export function ComplianceAudit({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Compliance audit');
  const allowAddRows = bool(config.allowAddRows, true);
  const allowPhotos = bool(config.allowPhotos, true);

  const seed: AuditItem[] = Array.isArray(config.regulations)
    ? (config.regulations as Array<Partial<AuditItem>>).map((r, i) => ({
        regulation: str(r.regulation, `Regulation ${i + 1}`),
        reference: str(r.reference, ''),
        status: 'not_applicable' as Status,
        notes: '',
        evidence: '',
      }))
    : [
        { regulation: 'GDPR Article 32', reference: 'EU 2016/679', status: 'not_applicable' as Status, notes: '', evidence: '' },
        { regulation: 'HIPAA Security Rule', reference: '45 CFR 164', status: 'not_applicable' as Status, notes: '', evidence: '' },
        { regulation: 'PCI-DSS v4.0', reference: 'Requirement 3', status: 'not_applicable' as Status, notes: '', evidence: '' },
        { regulation: 'ISO 27001 A.9', reference: 'Access control', status: 'not_applicable' as Status, notes: '', evidence: '' },
      ];

  const [v, setV] = useState<AuditValue>(() => {
    const existing = value && typeof value === 'object' ? (value as AuditValue) : null;
    if (existing?.items?.length) return existing;
    return {
      items: seed,
      auditor: str(config.auditor, ''),
      auditDate: new Date().toISOString().slice(0, 10),
      photos: [],
    };
  });

  const grouped = useMemo(() => {
    const buckets: Record<Status, AuditItem[]> = {
      compliant: [],
      non_compliant: [],
      in_progress: [],
      not_applicable: [],
    };
    v.items.forEach((it) => buckets[it.status].push(it));
    return buckets;
  }, [v.items]);

  const setStatus = (idx: number, status: Status) => {
    if (disabled) return;
    const items = v.items.map((it, i) => (i === idx ? { ...it, status } : it));
    setV({ ...v, items });
    onChange({ ...v, items });
  };
  const setField = (idx: number, key: 'notes' | 'evidence' | 'regulation' | 'reference', val: string) => {
    if (disabled) return;
    const items = v.items.map((it, i) => (i === idx ? { ...it, [key]: val } : it));
    setV({ ...v, items });
    onChange({ ...v, items });
  };
  const addRow = () => {
    if (disabled || !allowAddRows) return;
    const items = [...v.items, { regulation: 'New regulation', reference: '', status: 'not_applicable' as Status, notes: '', evidence: '' }];
    setV({ ...v, items });
    onChange({ ...v, items });
  };
  const addPhoto = () => {
    if (disabled || !allowPhotos) return;
    const photos = [...v.photos, `photo_${Date.now()}.jpg`];
    setV({ ...v, photos });
    onChange({ ...v, photos });
  };

  const statuses: Status[] = ['compliant', 'non_compliant', 'in_progress', 'not_applicable'];

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-2">
        <Scale className="size-4 text-indigo-600" />
        <span className="text-xs font-semibold">Compliance Audit</span>
        <Badge variant="outline" className="ml-auto text-[9px]">
          {grouped.compliant.length}/{v.items.length} compliant
        </Badge>
      </div>

      <div className="grid grid-cols-4 gap-1 text-[9px]">
        {statuses.map((s) => (
          <div key={s} className="rounded-md bg-muted/40 p-1 text-center">
            <p className="font-mono font-bold text-foreground">{grouped[s].length}</p>
            <p className="text-muted-foreground">{STATUS_LABEL[s].split(' ')[0]}</p>
          </div>
        ))}
      </div>

      <ul className="space-y-2">
        {v.items.map((it, idx) => (
          <li key={idx} className="rounded-md border border-border/70 bg-card p-2 space-y-1">
            <div className="flex items-center gap-1.5">
              <Input
                value={it.regulation}
                onChange={(e) => setField(idx, 'regulation', e.target.value)}
                disabled={disabled}
                className="h-7 text-xs flex-1 font-medium"
                aria-label={`Regulation ${idx + 1} name`}
              />
              <Input
                value={it.reference ?? ''}
                onChange={(e) => setField(idx, 'reference', e.target.value)}
                disabled={disabled}
                placeholder="Ref"
                className="h-7 text-[10px] w-20 font-mono"
                aria-label={`Regulation ${idx + 1} reference`}
              />
            </div>
            <div className="flex items-center gap-0.5 flex-wrap">
              {statuses.map((s) => {
                const Icon = s === 'compliant' ? CheckCircle2 : s === 'non_compliant' ? XCircle : s === 'in_progress' ? CircleAlert : Scale;
                return (
                  <Button
                    key={s}
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    onClick={() => setStatus(idx, s)}
                    aria-label={`${it.regulation} ${STATUS_LABEL[s]}`}
                    className={
                      'h-6 px-2 text-[10px] gap-1 ' + (it.status === s ? STATUS_TONE[s] : 'text-muted-foreground/50')
                    }
                  >
                    <Icon className="size-2.5" /> {STATUS_LABEL[s]}
                  </Button>
                );
              })}
            </div>
            <Input
              value={it.evidence ?? ''}
              onChange={(e) => setField(idx, 'evidence', e.target.value)}
              disabled={disabled}
              placeholder="Evidence (doc ID, screenshot ref)"
              className="h-7 text-[10px] font-mono"
              aria-label={`${it.regulation} evidence`}
            />
            <Textarea
              value={it.notes ?? ''}
              onChange={(e) => setField(idx, 'notes', e.target.value)}
              disabled={disabled}
              placeholder="Auditor notes / findings"
              className="text-[10px] min-h-[30px] py-1"
              aria-label={`${it.regulation} notes`}
            />
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2">
        {allowAddRows && !disabled && (
          <Button type="button" variant="outline" size="sm" onClick={addRow} className="text-[11px] h-7 gap-1">
            <Plus className="size-3" /> Add regulation
          </Button>
        )}
        {allowPhotos && (
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addPhoto} className="text-[11px] h-7 gap-1 ml-auto">
            <Scale className="size-3" /> Add photo ({v.photos.length})
          </Button>
        )}
      </div>
    </div>
  );
}

export default ComplianceAudit;
