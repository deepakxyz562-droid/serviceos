'use client';

import React, { useMemo } from 'react';
import { WidgetProps } from '../widget-props';

interface LikertMatrixValue {
  [statementId: string]: number; // 1-5
}

export function LikertMatrix({ value, onChange, config, disabled, field }: WidgetProps) {
  const statements = (config.statements as { id: string; text: string }[]) || [];
  const scaleLabels =
    (config.scaleLabels as string[]) || ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'];

  const current = (value as LikertMatrixValue) || {};

  const avg = useMemo(() => {
    const vals = statements.map((s) => current[s.id]).filter((v) => typeof v === 'number');
    if (!vals.length) return null;
    return vals.reduce((s, v) => s + (v as number), 0) / vals.length;
  }, [current, statements]);

  function setAnswer(statementId: string, v: number) {
    onChange({ ...current, [statementId]: v });
  }

  return (
    <div className="space-y-2" aria-label={String(field?.['label'] ?? 'Likert matrix')}>
      <div
        className="grid gap-2 text-[10px] font-bold text-muted-foreground pb-1 border-b border-border/60"
        style={{ gridTemplateColumns: `minmax(0, 1fr) repeat(${scaleLabels.length}, minmax(60px, 1fr))` }}
      >
        <div>Statement</div>
        {scaleLabels.map((lbl, i) => (
          <div key={i} className="text-center">
            {lbl}
            <div className="font-mono text-[9px]">({i + 1})</div>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        {statements.map((s) => (
          <div
            key={s.id}
            className="grid gap-2 items-center py-1.5 border-b border-border/30"
            style={{ gridTemplateColumns: `minmax(0, 1fr) repeat(${scaleLabels.length}, minmax(60px, 1fr))` }}
          >
            <div className="text-xs text-foreground font-medium">{s.text}</div>
            {Array.from({ length: scaleLabels.length }).map((_, i) => {
              const v = i + 1;
              const sel = current[s.id] === v;
              return (
                <div key={v} className="flex justify-center">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setAnswer(s.id, v)}
                    aria-pressed={sel}
                    aria-label={`${s.text}: ${scaleLabels[i]}`}
                    className={`h-6 w-6 rounded-full border-2 transition-all active:scale-95 ${
                      sel
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-border hover:border-emerald-400'
                    }`}
                  >
                    {sel && <span className="block h-2 w-2 mx-auto mt-[3px] bg-white rounded-full" />}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {avg !== null && (
        <div className="text-[11px] text-muted-foreground text-right pt-1">
          Average: <span className="font-bold text-foreground">{avg.toFixed(2)} / {scaleLabels.length}</span>
        </div>
      )}
    </div>
  );
}

export default LikertMatrix;
