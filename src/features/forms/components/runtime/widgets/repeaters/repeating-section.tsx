'use client';

import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, FolderClosed, FolderOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { WidgetProps, str, num } from '../widget-props';

type Row = Record<string, unknown> & { id: string; title?: string; notes?: string };

export function RepeatingSection({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial: Row[] = Array.isArray(value)
    ? (value as Row[]).map((r, i) => ({ id: typeof r.id === 'string' ? r.id : `s_${i}`, ...r }))
    : [];
  const minRows = num(config.minRows, 1);
  const safeRows = initial.length >= minRows
    ? initial
    : [...initial, ...Array.from({ length: minRows - initial.length }, () => ({ id: `s_${Math.random().toString(36).slice(2, 8)}` }))];
  const [rows, setRows] = useState<Row[]>(safeRows);
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    safeRows.reduce((acc, r, i) => ({ ...acc, [r.id]: i === 0 }), {} as Record<string, boolean>),
  );
  const ariaLabel = str(field?.label, 'Repeating section');
  const titlePlaceholder = str(config.titlePlaceholder, 'Section title…');
  const notesPlaceholder = str(config.notesPlaceholder, 'Notes…');

  function commit(next: Row[]) {
    setRows(next);
    onChange(next as unknown as Record<string, unknown>[]);
  }
  function addRow() {
    const id = `s_${Math.random().toString(36).slice(2, 8)}`;
    commit([...rows, { id }]);
    setOpen((o) => ({ ...o, [id]: true }));
  }
  function removeRow(id: string) {
    if (rows.length <= minRows) return;
    commit(rows.filter((r) => r.id !== id));
  }
  function update(id: string, patch: Partial<Row>) {
    commit(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function toggle(id: string) {
    setOpen((o) => ({ ...o, [id]: !o[id] }));
  }

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      {rows.map((row, idx) => {
        const isOpen = !!open[row.id];
        return (
          <div key={row.id} className="rounded-xl border border-border/70 overflow-hidden bg-card">
            <div className="flex items-center gap-2 px-2.5 py-2 bg-muted/40">
              <button
                type="button"
                onClick={() => toggle(row.id)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={isOpen ? 'Collapse section' : 'Expand section'}
              >
                {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              </button>
              {isOpen ? <FolderOpen className="size-4 text-muted-foreground" /> : <FolderClosed className="size-4 text-muted-foreground" />}
              <span className="text-[10px] font-mono text-muted-foreground">#{idx + 1}</span>
              <Input
                value={row.title || ''}
                onChange={(e) => update(row.id, { title: e.target.value })}
                disabled={disabled}
                placeholder={titlePlaceholder}
                className="h-8 text-xs flex-1"
                aria-label={`Section ${idx + 1} title`}
              />
              {!disabled && rows.length > minRows && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                  onClick={() => removeRow(row.id)}
                  aria-label="Remove section"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
            {isOpen && (
              <div className="p-2.5 space-y-1.5 bg-card">
                <Input
                  value={row.notes ? String(row.notes) : ''}
                  onChange={(e) => update(row.id, { notes: e.target.value })}
                  disabled={disabled}
                  placeholder={notesPlaceholder}
                  className="h-8 text-xs"
                  aria-label={`Section ${idx + 1} notes`}
                />
              </div>
            )}
          </div>
        );
      })}
      {!disabled && (
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="text-xs h-7 gap-1.5">
          <Plus className="size-3.5" /> Add section
        </Button>
      )}
    </div>
  );
}

export default RepeatingSection;
